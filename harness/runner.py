#!/usr/bin/env python3
"""The runner: moves work between the agents, for every company.

The dashboard only saves a brief. This loop does the rest, one step at a
time, with the database as the only state (so it can stop and restart at
any point):

  brief (sent)        -> Orchestrator plans work orders        -> brief working
  work order pending  -> its team writes a draft
  draft               -> Reviewer checks it against the rubric
      pass            -> work order done (approve tier waits on the founder)
      fail            -> work order bounced, team revises (max 2 retries,
                         then escalated to the founder)
  draft declined      -> back to its team with the founder's note
  all work orders in  -> Orchestrator writes one answer -> brief answered

The founder can stop a brief or a work order (status 'stopped') and pause
the office (office_state.paused) from the dashboard. While an agent is
working the runner checks every few seconds: a stopped step is dropped and
its answer discarded. Every step is recorded in `activity` (what is
happening now, in plain words, including what goes wrong with the model) and
leaves a receipt in agent_run_logs. harness/logs/runner.heartbeat says the
runner is alive.

The agents never touch a database. The runner gives them what they need in
the message (company_brain, the playbook, the work order) and writes what
they return.

Run: harness/.venv/Scripts/python harness/runner.py   (or scripts/start_agents.py)
"""

import argparse
import json
import os
import re
import sys
import threading
import traceback
import time
import urllib.error
import urllib.request
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import store  # noqa: E402
from _env import read_env  # noqa: E402
from _profiles import TEAMS, model_for  # noqa: E402

WORK_TEAMS = ("growth", "technical", "finance", "design")
TIERS = ("auto", "approve", "blocked")
OPEN = ("pending", "in_progress", "bounced")
MAX_WORK_ORDERS = 5
MAX_ATTEMPTS = 3  # first draft plus two retries, then escalated
CALL_TIMEOUT = 900  # free-tier models can take minutes per answer
WATCH_EVERY = 3  # seconds between stop checks while an agent works

LOGS = store.REPO_ROOT / "harness" / "logs"
HEARTBEAT = LOGS / "runner.heartbeat"
ENV = read_env(store.REPO_ROOT / ".env")
MIN_GAP = float(ENV.get("RUNNER_MIN_GAP_SECONDS", "2"))
COOLDOWN = 60  # seconds to wait after an agent failed before trying again
_last_call = 0.0
_cooling: dict[str, float] = {}  # company slug -> time to try again


def say(message: str) -> None:
    print(f"[runner {time.strftime('%H:%M:%S')}] {message}", flush=True)


def beat() -> None:
    """Tell the dashboard the runner is alive. A file, not a database row, so
    a long call for one company never makes another company's office look
    offline."""
    try:
        LOGS.mkdir(parents=True, exist_ok=True)
        HEARTBEAT.write_text(json.dumps({"at": time.time(), "pid": os.getpid()}), encoding="utf-8")
    except OSError:
        pass


def model_name(role: str) -> str | None:
    try:
        return model_for(role, ENV)
    except SystemExit:
        return None


def label(agent: str) -> str:
    return agent.title()


# --- Activity: what is happening now ---------------------------------------


class Stopped(Exception):
    """The founder stopped this step from the dashboard."""


class AgentError(Exception):
    def __init__(self, message: str, retryable: bool = False):
        super().__init__(message)
        self.retryable = retryable  # the agent is down or overloaded: try again later


def begin(conn, agent: str, action: str, *, brief_id=None, work_order_id=None, draft_id=None) -> int:
    say(action)
    return conn.execute(
        """insert into activity (brief_id, work_order_id, draft_id, agent, action, model)
           values (%s, %s, %s, %s, %s, %s) returning id""",
        (brief_id, work_order_id, draft_id, agent, action, model_name(agent)),
    ).fetchone()["id"]


def note(conn, activity_id: int, detail: str) -> None:
    conn.execute("update activity set detail = %s where id = %s", (detail, activity_id))


def end(conn, activity_id: int, status: str, detail: str | None = None) -> None:
    conn.execute(
        "update activity set status = %s, finished_at = now(), detail = coalesce(%s, detail) where id = %s",
        (status, detail, activity_id),
    )


def explain(line: str) -> str | None:
    """A Hermes log line about the model, in plain words (None to ignore)."""
    if "WARNING agent." not in line and "ERROR" not in line:
        return None
    tries = re.search(r"attempt (\d+)/(\d+)", line)
    retry = f" Retrying (try {tries.group(1)} of {tries.group(2)})." if tries else ""
    if "EmptyStreamError" in line or "empty stream" in line:
        elapsed = re.search(r"elapsed=([\d.]+)s", line)
        after = f" after {float(elapsed.group(1)) / 60:.0f} min" if elapsed else ""
        return f"The model sent back an empty answer{after}.{retry}"
    if "Connection error" in line or "APIConnectionError" in line:
        return f"The model's server dropped the connection.{retry}"
    if " 429" in line or "rate limit" in line.lower() or "RateLimit" in line:
        return f"The model's free tier is rate limiting. Waiting, then retrying.{retry}"
    if "timed out" in line.lower() or "TimeoutError" in line:
        return f"The model is taking too long to answer.{retry}"
    if "Retrying API call" in line:
        return None
    text = line.split(": ", 1)[-1].strip()
    return text[:200] or None


class Watch:
    """Called every few seconds while an agent works: keeps the heartbeat,
    surfaces the agent's model troubles, and raises Stopped when the founder
    stops the work."""

    def __init__(self, conn, activity_id: int, agent: str, *, brief_id=None, work_order_id=None):
        self.conn, self.activity_id, self.agent = conn, activity_id, agent
        self.brief_id, self.work_order_id = brief_id, work_order_id
        self.log = LOGS / f"{agent}.log"
        self.offset = self.log.stat().st_size if self.log.exists() else 0
        self.last = None

    def __call__(self) -> None:
        beat()
        self._read_log()
        if self.work_order_id:
            row = self.conn.execute("select status from work_orders where id = %s", (self.work_order_id,)).fetchone()
            if row and row["status"] == "stopped":
                raise Stopped()
        if self.brief_id:
            row = self.conn.execute("select status from briefs where id = %s", (self.brief_id,)).fetchone()
            if row and row["status"] == "stopped":
                raise Stopped()

    def _read_log(self) -> None:
        if not self.log.exists():
            return
        try:
            with open(self.log, "rb") as handle:
                handle.seek(self.offset)
                chunk = handle.read()
                self.offset = handle.tell()
        except OSError:
            return
        for line in chunk.decode("utf-8", errors="replace").splitlines():
            detail = explain(line)
            if detail and detail != self.last:
                self.last = detail
                note(self.conn, self.activity_id, detail)
                say(f"{self.agent}: {detail}")


# --- Talking to the agents ---------------------------------------------------


def _post(role: str, message: str) -> tuple[str, dict]:
    """One message to an agent's Hermes gateway; return (text, usage).
    Retries on rate limits and server errors with a growing wait."""
    global _last_call
    port = TEAMS[role]["port"]
    key = ENV.get(f"{role.upper()}_API_SERVER_KEY", "")
    body = json.dumps(
        {"model": "default", "messages": [{"role": "user", "content": message}], "stream": False}
    ).encode()
    for attempt in range(4):
        wait = _last_call + MIN_GAP - time.time()
        if wait > 0:
            time.sleep(wait)
        _last_call = time.time()
        request = urllib.request.Request(
            f"http://127.0.0.1:{port}/v1/chat/completions",
            data=body,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=CALL_TIMEOUT) as response:
                payload = json.loads(response.read())
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors="replace")[:300]
            if error.code in (429, 500, 502, 503, 504) and attempt < 3:
                time.sleep(10 * (attempt + 1))
                continue
            raise AgentError(f"{label(role)} answered with an error ({error.code}): {detail}") from error
        except (urllib.error.URLError, TimeoutError, ConnectionError) as error:
            raise AgentError(
                f"{label(role)} is not reachable on port {port}. Start the agents with scripts/start_agents.py",
                retryable=True,
            ) from error
        try:
            text = payload["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError) as error:
            raise AgentError(f"{label(role)} answered without a message") from error
        usage = dict(payload.get("usage") or {})
        usage["model"] = model_name(role)
        return text, usage
    raise AgentError(f"{label(role)} kept failing", retryable=True)


def ask(role: str, message: str, watch: Watch) -> tuple[str, dict]:
    """_post() in the background while `watch` runs every few seconds. If
    the founder stops the work, Stopped is raised and the answer, whenever
    it arrives, is dropped."""
    result: dict = {}

    def work():
        try:
            result["value"] = _post(role, message)
        except Exception as error:  # handed back to the caller below
            result["error"] = error

    thread = threading.Thread(target=work, daemon=True)
    thread.start()
    while thread.is_alive():
        thread.join(WATCH_EVERY)
        watch()
    watch()
    if "error" in result:
        raise result["error"]
    return result["value"]


def parse_json(text: str) -> dict:
    """The JSON object inside an agent's reply, fenced or bare."""
    candidates = [text.strip()]
    candidates += re.findall(r"```(?:json)?\s*(.*?)```", text, flags=re.S)
    start, end_ = text.find("{"), text.rfind("}")
    if start != -1 and end_ > start:
        candidates.append(text[start : end_ + 1])
    for candidate in candidates:
        try:
            value = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value
    raise ValueError("the reply was not a JSON object")


def ask_json(role: str, message: str, watch: Watch) -> tuple[dict, dict]:
    """ask(), parsed as JSON. One second chance if the reply is not JSON."""
    text, usage = ask(role, message, watch)
    try:
        return parse_json(text), usage
    except ValueError:
        note(watch.conn, watch.activity_id, "The answer was not in the expected format; asking once more.")
        retry = message + "\n\nYour previous reply was not a single valid JSON object. Reply again with only the JSON object."
        text, usage2 = ask(role, retry, watch)
        return parse_json(text), merge_usage(usage, usage2)


def merge_usage(a: dict, b: dict) -> dict:
    out = dict(a)
    for key in ("prompt_tokens", "completion_tokens", "total_tokens"):
        out[key] = (a.get(key) or 0) + (b.get(key) or 0)
    return out


def section(title: str, body) -> str:
    if not isinstance(body, str):
        body = json.dumps(body, indent=2, default=str)
    return f"=== {title} ===\n{body.strip()}\n"


# --- Planning ----------------------------------------------------------------


def team_catalogue() -> dict:
    """team -> {skill name: description}, from scripts/_profiles.py."""
    out = {}
    for team in WORK_TEAMS:
        out[team] = {
            path.split("/")[-1]: store.skill_description(path)
            for path in TEAMS[team]["skills"]
            if path != "business_rules"
        }
    return out


def skill_path(team: str, skill: str) -> str | None:
    for path in TEAMS[team]["skills"]:
        if path.split("/")[-1] == skill and path != "business_rules":
            return path
    return None


PLAN_CONTRACT = """Reply with one JSON object and nothing else:
{
  "classification": "execute" | "decide" | "status" | "update",
  "reply": "what to tell the founder now, in plain words. Required when there are no work orders; otherwise one line on what you dispatched and why",
  "brain_updates": {"<section>": {"<field>": "<value>"}},
  "new_decisions": [{"decision": "...", "reasoning": "...", "revisit_if": "..."}],
  "work_orders": [
    {"ref": "a", "team": "growth|technical|finance|design", "skill": "<one skill from the catalogue>",
     "summary": "one line, in the founder's terms", "inputs": {}, "acceptance_criteria": ["checkable"],
     "tier": "auto|approve|blocked", "depends_on": ["<ref of another work order in this list>"]}
  ]
}
brain_updates sections: company, product, icp, positioning, constraints, priorities (a list of at most 3).
Only record a decision when the founder gave its reasoning and what would reopen it.
At most 5 work orders. One team per work order. Use only skills listed in the catalogue.
If the brief needs company facts the brain lacks, issue no work orders and ask for them in "reply"."""


def plan_brief(conn, company: dict, brief: dict) -> None:
    activity = begin(conn, "orchestrator", f"Orchestrator is planning brief {brief['id']}", brief_id=brief["id"])
    watch = Watch(conn, activity, "orchestrator", brief_id=brief["id"])
    try:
        plan, usage = _plan(conn, company, brief, watch)
    except Stopped:
        end(conn, activity, "stopped", "Stopped by you.")
        return
    except AgentError as error:
        if not error.retryable:
            mark_broken(conn, activity, brief, error)
            return
        end(conn, activity, "failed", f"{error} The brief waits and is tried again in a minute.")
        conn.execute("update briefs set status = 'sent' where id = %s and status = 'working'", (brief["id"],))
        _cooling[company["slug"]] = time.time() + COOLDOWN
        return
    except ValueError as error:
        mark_broken(conn, activity, brief, error)
        return

    try:
        store.update_brain(conn, plan.get("brain_updates"), plan.get("new_decisions"))
    except ValueError as error:
        plan["reply"] = (plan.get("reply") or "") + f"\n\nNot recorded in the company brain: {error}."

    orders = plan.get("work_orders") or []
    ids = {o["ref"]: f"wo_{brief['id']}_{n}" for n, o in enumerate(orders, start=1)}
    if orders:
        values = [
            (
                ids[o["ref"]], o["team"], o["skill"], o.get("summary") or "", brief["id"],
                json.dumps(o.get("inputs") or {}), json.dumps(o.get("acceptance_criteria") or []),
                o["tier"], json.dumps([ids[r] for r in o.get("depends_on") or []]),
            )
            for o in orders
        ]
        with conn.cursor() as cur:
            cur.executemany(
                """insert into work_orders
                   (id, team, skill, summary, brief_id, inputs, acceptance_criteria, tier, depends_on)
                   values (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                values,
            )
    store.log_receipt(
        conn, "orchestrator", "planning", "plan",
        inputs={"brief_id": brief["id"]},
        output={"classification": plan.get("classification"), "work_orders": list(ids.values()),
                "reply": plan.get("reply"), "usage": usage},
        verdict="planned",
    )
    if orders:
        conn.execute("update briefs set response = %s where id = %s", (plan.get("reply"), brief["id"]))
        teams = ", ".join(label(o["team"]) for o in orders)
        end(conn, activity, "done", f"Planned {len(orders)} work order(s): {teams}.")
    else:
        conn.execute(
            "update briefs set status = 'answered', response = %s, answered_at = now() where id = %s",
            (plan.get("reply") or "Noted.", brief["id"]),
        )
        end(conn, activity, "done", "Answered without sending work to any team.")


def mark_broken(conn, activity: int, brief: dict, error: Exception) -> None:
    end(conn, activity, "failed", str(error))
    conn.execute("update briefs set status = 'broken', error = %s where id = %s", (str(error), brief["id"]))
    store.log_receipt(conn, "orchestrator", "planning", "plan", inputs={"brief_id": brief["id"]},
                      output={"error": str(error)}, verdict="broken")


def _plan(conn, company: dict, brief: dict, watch: Watch) -> tuple[dict, dict]:
    brain = store.read_brain(conn)
    open_orders = conn.execute(
        "select id, team, skill, summary, status, tier from work_orders"
        " where status not in ('done', 'stopped') order by created_at"
    ).fetchall()
    base = "\n".join(
        [
            f"You are the Orchestrator for {company['name']}. Plan the founder's brief below.",
            section("YOUR PLAYBOOK: orchestrator/planning", store.read_skill("orchestrator/planning")),
            section("BUSINESS RULES", store.read_skill("business_rules")),
            section("COMPANY BRAIN", brain),
            section("OPEN WORK ORDERS", open_orders or "none"),
            section("TEAM CATALOGUE (team -> skill -> what it does)", team_catalogue()),
            section("FOUNDER'S BRIEF", brief["body"]),
            section("HOW TO ANSWER", PLAN_CONTRACT),
        ]
    )
    message, usage, problems = base, {}, []
    for _ in range(2):
        plan, call_usage = ask_json("orchestrator", message, watch)
        usage = merge_usage(usage, call_usage) if usage else call_usage
        problems = validate_plan(plan)
        if not problems:
            return plan, usage
        note(conn, watch.activity_id, "The plan broke a rule (" + "; ".join(problems) + "). Asking for a fixed plan.")
        message = base + "\n" + section("YOUR LAST PLAN WAS REJECTED. FIX THESE AND REPLY AGAIN", "\n".join(problems))
    raise AgentError("the Orchestrator's plan was invalid: " + "; ".join(problems))


def validate_plan(plan: dict) -> list[str]:
    problems = []
    orders = plan.get("work_orders") or []
    if not isinstance(orders, list):
        return ["work_orders must be a list"]
    if len(orders) > MAX_WORK_ORDERS:
        problems.append(f"{len(orders)} work orders; at most {MAX_WORK_ORDERS}")
    if not orders and not (plan.get("reply") or "").strip():
        problems.append("no work orders and no reply to the founder")
    refs = [o.get("ref") for o in orders if isinstance(o, dict)]
    if len(set(refs)) != len(refs) or None in refs:
        problems.append("every work order needs a unique ref")
    for o in orders:
        if not isinstance(o, dict):
            problems.append("every work order must be an object")
            continue
        ref = o.get("ref")
        if o.get("team") not in WORK_TEAMS:
            problems.append(f"{ref}: team must be one of {', '.join(WORK_TEAMS)}")
        elif not skill_path(o["team"], o.get("skill") or ""):
            problems.append(f"{ref}: {o.get('team')} has no skill {o.get('skill')!r}")
        if o.get("tier") not in TIERS:
            problems.append(f"{ref}: tier must be auto, approve or blocked")
        for dep in o.get("depends_on") or []:
            if dep not in refs or dep == ref:
                problems.append(f"{ref}: depends_on {dep!r} is not another work order in this plan")
    return problems


# --- Team work and review ----------------------------------------------------


DRAFT_CONTRACT = """Reply with one JSON object and nothing else:
{
  "status": "ok" or the stop code your playbook names (for example "no_signal_found"),
  "summary": "one line: what this draft is",
  "body": "the draft itself, in markdown",
  "citations": [{"claim": "...", "source": "company_brain.<field> or a dataset row or a dated public source"}],
  "limitations": "what is missing or thin and how it limits this draft, or null",
  "contradiction": null or {"with": "<team or decision>", "about": "...", "their_position": "...",
                            "their_depends_on": "...", "our_position": "...", "our_depends_on": "...",
                            "why_it_matters": "..."}
}
Optional fields when your playbook calls for them: "recipient", "signal": {"what", "date", "source"},
"word_count", "blocked_action" and "rule" (for blocked work: what the founder must do, and the rule that blocks it).
You draft only. Never say you sent, published, paid, filed, signed or deployed anything. Never invent
names, emails, numbers or quotes."""

REVIEW_CONTRACT = """Reply with one JSON object and nothing else:
{"verdict": "pass" | "fail", "failed_checks": ["<check id>"], "required_fixes": ["<one concrete instruction per failed check>"]}"""


def latest_draft(conn, work_order_id: str) -> dict | None:
    return conn.execute(
        "select * from drafts where work_order_id = %s order by created_at desc, id desc limit 1",
        (work_order_id,),
    ).fetchone()


def count_failures(conn, work_order_id: str) -> int:
    """Failed reviews since the founder last declined (a decline starts over)."""
    return conn.execute(
        "select count(*) as n from drafts where work_order_id = %s and verdict = 'fail'"
        " and created_at > coalesce((select max(decided_at) from drafts where work_order_id = %s"
        " and founder_decision = 'declined'), 'epoch')",
        (work_order_id, work_order_id),
    ).fetchone()["n"]


def claim(conn, wo: dict) -> bool:
    """Mark a work order in progress, unless the founder stopped it meanwhile."""
    return conn.execute(
        "update work_orders set status = 'in_progress', updated_at = now()"
        " where id = %s and status in ('pending', 'bounced') returning id",
        (wo["id"],),
    ).fetchone() is not None


def run_work_order(conn, company: dict, wo: dict) -> None:
    if not claim(conn, wo):
        return
    previous = latest_draft(conn, wo["id"])
    failures = count_failures(conn, wo["id"])
    if previous and previous["verdict"] is None and previous["founder_decision"] is None:
        # Drafted before the runner stopped, never reviewed: review it now.
        review(conn, company, wo, previous, failures)
        return

    team, path = wo["team"], skill_path(wo["team"], wo["skill"])
    upstream = []
    for dep in wo["depends_on"] or []:
        d = latest_draft(conn, dep)
        if d:
            upstream.append({"work_order": dep, "team": d["team"], "summary": d["summary"],
                             "body": d["content"].get("body")})
    parts = [
        f"You are the {label(team)} team at {company['name']}. Do the work order below.",
        section(f"YOUR PLAYBOOK: {path}", store.read_skill(path)),
        section("BUSINESS RULES", store.read_skill("business_rules")),
        section("COMPANY BRAIN", store.read_brain(conn)),
        section(f"WORK ORDER {wo['id']}", {
            "summary": wo["summary"], "skill": wo["skill"], "tier": wo["tier"],
            "inputs": wo["inputs"], "acceptance_criteria": wo["acceptance_criteria"],
        }),
    ]
    if upstream:
        parts.append(section("RESULTS OF EARLIER WORK ORDERS THIS ONE DEPENDS ON", upstream))
    redo = ""
    if previous and previous["founder_decision"] == "declined":
        redo = " (revising after you declined it)"
        parts.append(section("THE FOUNDER DECLINED YOUR LAST DRAFT. THEIR NOTE",
                             previous["decision_note"] or "(no note)"))
        parts.append(section("YOUR DECLINED DRAFT", previous["content"]))
    elif previous and previous["verdict"] == "fail":
        redo = f" (attempt {failures + 1}, fixing what the Reviewer found)"
        parts.append(section("THE REVIEWER FAILED YOUR LAST DRAFT. REQUIRED FIXES", previous["required_fixes"]))
        parts.append(section("YOUR FAILED DRAFT", previous["content"]))
    parts.append(section("HOW TO ANSWER", DRAFT_CONTRACT))

    activity = begin(conn, team, f"{label(team)} is drafting {wo['id']}: {wo['summary']}{redo}",
                     brief_id=wo["brief_id"], work_order_id=wo["id"])
    watch = Watch(conn, activity, team, brief_id=wo["brief_id"], work_order_id=wo["id"])
    try:
        try:
            content, usage = ask_json(team, "\n".join(parts), watch)
        except ValueError:
            content, usage = {"status": "unreadable", "summary": "The team's reply was not readable",
                              "body": "", "limitations": "The reply was not a JSON object."}, {}
    except Stopped:
        end(conn, activity, "stopped", "Stopped by you. Nothing was saved.")
        return
    except AgentError as error:
        end(conn, activity, "failed", str(error))
        conn.execute("update work_orders set status = 'pending' where id = %s and status = 'in_progress'", (wo["id"],))
        raise

    contradiction = content.pop("contradiction", None) or None
    summary = str(content.pop("summary", "") or wo["summary"] or "")[:300]
    draft = conn.execute(
        """insert into drafts (work_order_id, team, skill, summary, content, tier, contradiction, retry_count)
           values (%s, %s, %s, %s, %s, %s, %s, %s) returning *""",
        (wo["id"], team, wo["skill"], summary, json.dumps(content), wo["tier"],
         json.dumps(contradiction) if contradiction else None, failures),
    ).fetchone()
    conn.execute("update activity set draft_id = %s where id = %s", (draft["id"], activity))
    end(conn, activity, "done", f"Draft ready: {summary}")
    store.log_receipt(conn, team, wo["skill"], "draft", work_order_id=wo["id"],
                      inputs={"attempt": failures + 1}, output={"draft_id": draft["id"], "summary": summary,
                                                                "status": content.get("status"), "usage": usage},
                      verdict="drafted")
    review(conn, company, wo, draft, failures)


def precheck(draft: dict) -> tuple[list[str], list[str]]:
    """Deterministic checks the runner applies before the Reviewer."""
    content, failed, fixes = draft["content"], [], []
    if content.get("status") == "unreadable":
        failed.append("U5")
        fixes.append("Reply with one JSON object in the shape the work order asked for.")
    elif content.get("status", "ok") == "ok" and not str(content.get("body") or "").strip():
        failed.append("U5")
        fixes.append("The draft has no body. Write the draft the work order asks for.")
    c = draft["contradiction"]
    if c and not all(c.get(k) for k in ("their_position", "our_position", "why_it_matters")):
        failed.append("U5")
        fixes.append("A contradiction block needs their_position, our_position and why_it_matters.")
    return failed, fixes


def review(conn, company: dict, wo: dict, draft: dict, failures: int) -> None:
    activity = begin(conn, "reviewer", f"Reviewer is checking {label(wo['team'])}'s draft for {wo['id']}",
                     brief_id=wo["brief_id"], work_order_id=wo["id"], draft_id=draft["id"])
    failed, fixes = precheck(draft)
    usage = {}
    if failed:
        note(conn, activity, "Failed the runner's own checks before the Reviewer saw it.")
    else:
        message = "\n".join([
            f"You are the Reviewer for {company['name']}. Check the draft below. You have no tools.",
            section("YOUR RUBRIC: review_rubric", store.read_skill("review_rubric")),
            section("BUSINESS RULES", store.read_skill("business_rules")),
            section("COMPANY BRAIN", store.read_brain(conn)),
            section(f"WORK ORDER {wo['id']} ({wo['team']}, {wo['skill']}, tier {wo['tier']})", {
                "summary": wo["summary"], "inputs": wo["inputs"],
                "acceptance_criteria": wo["acceptance_criteria"]}),
            section("DRAFT", {"tier": draft["tier"], "summary": draft["summary"],
                              "content": draft["content"], "contradiction": draft["contradiction"]}),
            section("HOW TO ANSWER", REVIEW_CONTRACT),
        ])
        watch = Watch(conn, activity, "reviewer", brief_id=wo["brief_id"], work_order_id=wo["id"])
        try:
            try:
                verdict, usage = ask_json("reviewer", message, watch)
            except ValueError:
                verdict = {"verdict": "fail", "failed_checks": ["U5"],
                           "required_fixes": ["The Reviewer could not read this draft; resubmit it unchanged."]}
        except Stopped:
            end(conn, activity, "stopped", "Stopped by you. The draft stays unreviewed.")
            return
        except AgentError as error:
            end(conn, activity, "failed", str(error))
            conn.execute("update work_orders set status = 'pending' where id = %s and status = 'in_progress'",
                         (wo["id"],))
            raise
        failed = [str(c) for c in verdict.get("failed_checks") or []]
        fixes = [str(f) for f in verdict.get("required_fixes") or []]
        if verdict.get("verdict") != "pass" and not failed:
            failed = ["U5"]
            fixes = fixes or ["The Reviewer failed this draft without naming a check; resubmit it."]
    outcome = "fail" if failed else "pass"
    conn.execute(
        "update drafts set verdict = %s, failed_checks = %s, required_fixes = %s where id = %s",
        (outcome, json.dumps(failed), json.dumps(fixes), draft["id"]),
    )
    if outcome == "pass":
        status = "done"
    elif failures + 1 >= MAX_ATTEMPTS:
        status = "escalated"
    else:
        status = "bounced"
    conn.execute("update work_orders set status = %s, updated_at = now() where id = %s and status <> 'stopped'",
                 (status, wo["id"]))
    store.log_receipt(conn, "reviewer", "review_rubric", "review", work_order_id=wo["id"],
                      inputs={"draft_id": draft["id"]},
                      output={"failed_checks": failed, "required_fixes": fixes, "usage": usage},
                      verdict=outcome)
    if outcome == "pass":
        end(conn, activity, "done", "Passed every check." + (" Waiting on you in Approvals." if wo["tier"] != "auto" else ""))
    else:
        then = "Escalated to you after three tries." if status == "escalated" else f"Back to {label(wo['team'])} to fix."
        end(conn, activity, "done", f"Failed {', '.join(failed)}. {then}")


# --- Answering the founder ---------------------------------------------------


def answer_brief(conn, company: dict, brief: dict, orders: list[dict]) -> None:
    results = []
    for wo in orders:
        d = latest_draft(conn, wo["id"])
        results.append({
            "work_order": wo["id"], "team": wo["team"], "summary": wo["summary"], "tier": wo["tier"],
            "status": wo["status"],
            "draft": d and {"summary": d["summary"], "verdict": d["verdict"],
                            "failed_checks": d["failed_checks"], "contradiction": d["contradiction"]},
        })
    message = "\n".join([
        f"You are the Orchestrator for {company['name']}. The teams have finished the founder's brief. "
        "Follow steps 8 and 9 of your playbook: one response to the founder, contradictions first and "
        "unresolved, not team reports stapled together.",
        section("YOUR PLAYBOOK: orchestrator/planning", store.read_skill("orchestrator/planning")),
        section("FOUNDER'S BRIEF", brief["body"]),
        section("RESULTS", results),
        section("HOW TO ANSWER",
                "Plain text for the founder, under 150 words. Say which drafts wait on them in Approvals "
                "(tier approve or blocked, review passed), which were escalated after two bounces, and "
                "which the founder stopped."),
    ])
    activity = begin(conn, "orchestrator", f"Orchestrator is writing the answer to brief {brief['id']}",
                     brief_id=brief["id"])
    watch = Watch(conn, activity, "orchestrator", brief_id=brief["id"])
    try:
        text, usage = ask("orchestrator", message, watch)
    except Stopped:
        end(conn, activity, "stopped", "Stopped by you.")
        return
    except AgentError as error:
        end(conn, activity, "failed", str(error))
        raise
    conn.execute(
        "update briefs set status = 'answered', response = %s, answered_at = now() where id = %s and status = 'working'",
        (text.strip(), brief["id"]),
    )
    store.log_receipt(conn, "orchestrator", "planning", "answer", inputs={"brief_id": brief["id"]},
                      output={"reply": text.strip(), "usage": usage}, verdict="answered")
    end(conn, activity, "done", "Answered.")


# --- The loop ------------------------------------------------------------------


def recover(conn) -> None:
    """Undo half-finished steps from a runner that stopped mid-way."""
    conn.execute("update work_orders set status = 'pending' where status = 'in_progress'")
    conn.execute(
        "update briefs set status = 'sent' where status = 'working'"
        " and not exists (select 1 from work_orders w where w.brief_id = briefs.id)"
    )
    conn.execute(
        "update activity set status = 'failed', finished_at = now(),"
        " detail = 'The runner stopped while this was running; it picks the work up again.'"
        " where status = 'running'"
    )


def paused(conn) -> bool:
    row = conn.execute("select paused from office_state where id = 1").fetchone()
    return bool(row and row["paused"])


def hold(conn, wo: dict, reason: str, status: str) -> None:
    conn.execute("update work_orders set status = %s, updated_at = now() where id = %s", (status, wo["id"]))
    store.log_receipt(conn, "orchestrator", "planning", "hold", work_order_id=wo["id"],
                      output={"reason": reason}, verdict=status)
    activity = begin(conn, "orchestrator", f"Orchestrator set {wo['id']} aside",
                     brief_id=wo["brief_id"], work_order_id=wo["id"])
    end(conn, activity, "done", reason)


def step(conn, company: dict) -> bool:
    """Do one unit of work for a company. Returns True if anything happened."""
    if paused(conn) or _cooling.get(company["slug"], 0) > time.time():
        return False
    brief = conn.execute(
        "update briefs set status = 'working' where id = ("
        "select id from briefs where status = 'sent' order by id limit 1) returning *"
    ).fetchone()
    if brief:
        plan_brief(conn, company, brief)
        return True

    # Declined drafts go back to their team with the founder's note.
    conn.execute(
        """update work_orders w set status = 'pending', updated_at = now()
           where w.status = 'done' and (select founder_decision from drafts d where d.work_order_id = w.id
                                        order by created_at desc, id desc limit 1) = 'declined'"""
    )

    for wo in conn.execute(
        "select * from work_orders where status in ('pending', 'bounced') order by created_at, id"
    ).fetchall():
        deps = wo["depends_on"] or []
        if deps:
            states = [r["status"] for r in conn.execute(
                "select status from work_orders where id = any(%s)", (deps,)
            ).fetchall()]
            if "escalated" in states:
                hold(conn, wo, "A work order this one depends on was escalated to you.", "escalated")
                return True
            if "stopped" in states:
                hold(conn, wo, "You stopped a work order this one depends on.", "stopped")
                return True
            if states.count("done") < len(deps):
                continue
        try:
            run_work_order(conn, company, wo)
        except AgentError as error:
            say(f"{company['slug']}: {wo['id']} waits {COOLDOWN}s: {error}")
            _cooling[company["slug"]] = time.time() + COOLDOWN
            return False
        return True

    for brief in conn.execute("select * from briefs where status = 'working' order by id").fetchall():
        orders = conn.execute(
            "select * from work_orders where brief_id = %s order by id", (brief["id"],)
        ).fetchall()
        if not orders or not all(o["status"] in ("done", "escalated", "stopped") for o in orders):
            continue
        if all(o["status"] == "stopped" for o in orders):
            conn.execute("update briefs set status = 'stopped' where id = %s", (brief["id"],))
            return True
        try:
            answer_brief(conn, company, brief, orders)
        except AgentError as error:
            say(f"{company['slug']}: answer for brief {brief['id']} waits {COOLDOWN}s: {error}")
            _cooling[company["slug"]] = time.time() + COOLDOWN
            return False
        return True
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--company", help="Only this company (slug).")
    parser.add_argument("--once", action="store_true", help="Work until nothing is left, then exit.")
    parser.add_argument("--interval", type=float, default=3.0, help="Seconds between idle checks.")
    args = parser.parse_args()

    recovered = set()
    say("watching for briefs")
    while True:
        beat()
        busy = False
        for company in store.companies():
            if args.company and company["slug"] != args.company:
                continue
            try:
                with store.connect(company) as conn:
                    if company["slug"] not in recovered:
                        recover(conn)
                        recovered.add(company["slug"])
                    if step(conn, company):
                        busy = True
            except psycopg.OperationalError:
                continue  # dashboard not serving this company right now
            except Exception as error:  # never let one bad step stop the office
                say(f"{company['slug']}: unexpected error, tidying up and trying again in {COOLDOWN}s:")
                traceback.print_exc()
                recovered.discard(company["slug"])  # undo the half-finished step on the next pass
                _cooling[company["slug"]] = time.time() + COOLDOWN
        if args.once and not busy:
            return
        if not busy:
            time.sleep(args.interval)


if __name__ == "__main__":
    main()
