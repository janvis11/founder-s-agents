#!/usr/bin/env python3
"""The eval harness: practice companies with planted problems, scored.

  python evals/run.py                         every fixture, every team
  python evals/run.py --team finance          one team
  python evals/run.py --fixture thin_data_co  one practice company
  python evals/run.py --label "after runway_tracker edit"
  python evals/run.py --offline               scripted fake model: no agents, no network

Each team does its work orders on each practice company exactly as in the
product (harness/runner.py builds the same messages, with the same
playbooks), the Reviewer checks every draft with up to two retries, and the
final draft is marked against the answer key:

  caught        planted problems (must-flag) the draft raised
  made up       problems it raised that the data does not support, out of all it raised
  evidence      file:row and company_brain citations that point at something real
  knew to stop  refusals done right (provisional, no forecast, asks instead of guessing)

"Evidence" is checked by code. The rest is marked by a grader model that
sees the answer key, the data and the draft; its reasoning is kept with every
score. Results: evals/results/<run>.json (full drafts, not committed) and the
score table in evals/baselines.md (from evals/history.json).

Needs the six agents running (python scripts/start_agents.py --no-runner),
except with --offline. The grader calls the model directly (EVAL_GRADER_MODEL
in .env, default the Orchestrator's model).
"""

import argparse
import concurrent.futures
import csv
import io
import json
import re
import sys
import time
import urllib.request
from datetime import datetime
from pathlib import Path

EVALS = Path(__file__).resolve().parent
ROOT = EVALS.parent
sys.path[:0] = [str(ROOT / "harness"), str(ROOT / "scripts")]
import runner  # noqa: E402
from _profiles import ENDPOINTS, choose_provider, model_for  # noqa: E402

FIXTURES = EVALS / "fixtures"
RESULTS = EVALS / "results"
HISTORY = EVALS / "history.json"
BASELINES = EVALS / "baselines.md"
TEAMS = ("finance", "growth", "technical", "design")
DETECT = ("flag", "contradiction")


class EvalWatch:
    """Stands in for the runner's Watch: nothing to stop, just print notes."""

    def __init__(self, label: str):
        self.label = label

    def __call__(self) -> None:
        pass

    def note(self, detail: str) -> None:
        runner.say(f"{self.label}: {detail}")


# --- Fixtures -----------------------------------------------------------------


def load_fixture(name: str) -> dict:
    folder = FIXTURES / name
    return {
        "name": name,
        "brain": json.loads((folder / "company_brain.json").read_text(encoding="utf-8")),
        "work_orders": json.loads((folder / "work_orders.json").read_text(encoding="utf-8")),
        "key": json.loads((folder / "answer_key.json").read_text(encoding="utf-8")),
        "datasets": {p.name: p.read_text(encoding="utf-8") for p in sorted(folder.glob("*.csv"))},
    }


def make_work_order(fixture: dict, spec: dict) -> dict:
    inputs = dict(spec.get("inputs") or {})
    if spec.get("datasets"):
        inputs["datasets"] = {name: fixture["datasets"][name] for name in spec["datasets"]}
    return {
        "id": f"{fixture['name']}/{spec['team']}", "team": spec["team"], "skill": spec["skill"],
        "summary": spec["summary"], "tier": spec["tier"], "inputs": inputs,
        "acceptance_criteria": spec.get("acceptance_criteria") or [], "depends_on": [], "brief_id": None,
    }


# --- Doing the work, as the product does --------------------------------------


def run_team(fixture: dict, wo: dict, review: bool) -> list[dict]:
    """Draft, review, revise: the attempts, last one final."""
    company = fixture["brain"].get("company", {}).get("name") or fixture["name"]
    watch = EvalWatch(wo["id"])
    attempts, previous = [], None
    for attempt in range(runner.MAX_ATTEMPTS if review else 1):
        message, _ = runner.team_message(company, wo, fixture["brain"], previous=previous, failures=attempt)
        started = time.time()
        try:
            content, usage = runner.ask_json(wo["team"], message, watch)
        except ValueError:
            content, usage = dict(runner.UNREADABLE_DRAFT), {}
        content, contradiction, summary = runner.split_draft(content, wo["summary"])
        draft = {"attempt": attempt + 1, "tier": wo["tier"], "summary": summary, "content": content,
                 "contradiction": contradiction, "seconds": round(time.time() - started), "usage": usage}
        failed, fixes = runner.precheck(draft)
        if review and not failed:
            try:
                verdict, _ = runner.ask_json("reviewer", runner.review_message(company, wo, fixture["brain"], draft), watch)
            except ValueError:
                verdict = dict(runner.UNREADABLE_VERDICT)
            failed, fixes = runner.read_verdict(verdict)
        draft.update(verdict=("fail" if failed else "pass") if review else None,
                     failed_checks=failed, required_fixes=fixes)
        attempts.append(draft)
        runner.say(f"{wo['id']}: attempt {attempt + 1} {draft['verdict'] or 'drafted'}")
        if not failed or not review:
            break
        previous = draft
    return attempts


# --- Marking --------------------------------------------------------------------


CSV_REF = re.compile(r"([A-Za-z_][\w-]*\.csv)\s*(?::|#|,)?\s*(?:rows?\s*)?(\d+)(?:\s*(?:-|to|–)\s*(\d+))?")
BRAIN_REF = re.compile(r"company_brain\.([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*|\[\d+\])*)")


def check_evidence(draft: dict, fixture: dict) -> dict:
    """Every file:row and company_brain reference in the draft, checked against the fixture."""
    text = json.dumps({"content": draft["content"], "contradiction": draft["contradiction"]})
    rows = {}
    for name, body in fixture["datasets"].items():
        rows[name] = {r["row"] for r in csv.DictReader(io.StringIO(body))}
    real, fake = [], []
    for name, start, end in CSV_REF.findall(text):
        span = range(int(start), int(end or start) + 1) if (not end or int(end) - int(start) < 100) else [int(start), int(end)]
        ok = name in rows and all(str(n) in rows[name] for n in span)
        (real if ok else fake).append(f"{name}:{start}{'-' + end if end else ''}")
    for path in BRAIN_REF.findall(text):
        node, ok = fixture["brain"], True
        for part in re.findall(r"[A-Za-z_]\w*|\[\d+\]", path):
            if part.startswith("["):
                index = int(part[1:-1])
                ok = isinstance(node, list) and index < len(node)
                node = node[index] if ok else None
            else:
                ok = isinstance(node, dict) and part in node
                node = node.get(part) if ok else None
            if not ok:
                break
        (real if ok else fake).append(f"company_brain.{path}")
    total = len(real) + len(fake)
    return {"real": real, "not_found": fake, "score": (len(real) / total) if total else None}


GRADE_CONTRACT = """Reply with one JSON object and nothing else:
{"items": [{"id": "<planted id>", "met": true or false, "quote": "a short quote from the draft that shows it, or empty"}],
 "extra_flags": [{"claim": "a problem or claim the draft raises that is not in the key", "supported": true or false, "why": "short"}],
 "notes": "one or two sentences on the draft overall"}"""


def grade_message(fixture: dict, wo: dict, draft: dict, items: list[dict]) -> str:
    s = runner.section
    return "\n".join([
        "You are grading one draft from an AI team against an answer key. Be strict and literal: an item is met "
        "only if the draft itself clearly does it. Different wording is fine; a vaguer or partial version is not.",
        s(f"ANSWER KEY FOR THE {wo['team'].upper()} TEAM", [
            {k: i[k] for k in ("id", "kind", "must", "issue")} for i in items]),
        s("HOW TO MARK EACH KIND",
          "flag: the draft raises this specific problem.\n"
          "contradiction: the draft surfaces both positions (a contradiction block or an explicit two-sided "
          "statement) and does not settle it itself.\n"
          "refusal: the draft behaves as described (declines, labels figures provisional, asks instead of guessing). "
          "If it does the thing it should have declined, the item is not met."),
        s("COMPANY BRAIN", fixture["brain"]),
        *[s(f"DATASET {name}", body) for name, body in (wo["inputs"].get("datasets") or {}).items()],
        s("THE WORK ORDER", {"summary": wo["summary"], "skill": wo["skill"]}),
        s("THE DRAFT", {"summary": draft["summary"], "content": draft["content"], "contradiction": draft["contradiction"]}),
        s("EXTRA FLAGS",
          "List every other problem, risk or factual claim about the company that the draft raises and that is not "
          "covered by the key. supported = the brain or data backs it; false if it is wrong or made up."),
        s("HOW TO ANSWER", GRADE_CONTRACT),
    ])


def ask_grader(message: str, offline: bool) -> dict:
    if offline:
        import fake_model
        return runner.parse_json(fake_model.answer(message))
    env = runner.ENV
    provider = choose_provider(env)
    if provider not in ENDPOINTS:
        # No direct endpoint for this provider: grade through the Orchestrator's gateway.
        return runner.ask_json("orchestrator", message, EvalWatch("grader"))[0]
    base, key_name = ENDPOINTS[provider]
    model = env.get("EVAL_GRADER_MODEL") or model_for("orchestrator", env)
    body = json.dumps({"model": model, "messages": [{"role": "user", "content": message}], "max_tokens": 4000}).encode()
    headers = {"Content-Type": "application/json"}
    if key_name:
        headers["Authorization"] = f"Bearer {env[key_name]}"
    for attempt in range(3):
        try:
            request = urllib.request.Request(f"{base}/chat/completions", data=body, headers=headers)
            with urllib.request.urlopen(request, timeout=runner.CALL_TIMEOUT) as response:
                text = json.loads(response.read())["choices"][0]["message"]["content"] or ""
            return runner.parse_json(text)
        except (ValueError, OSError) as error:
            runner.say(f"grader: {error}; trying again" if attempt < 2 else f"grader gave up: {error}")
            time.sleep(10 * (attempt + 1))
    return {"items": [], "extra_flags": [], "notes": "The grader did not answer; nothing could be marked."}


def grade(fixture: dict, wo: dict, draft: dict, offline: bool) -> dict:
    items = [i for i in fixture["key"]["planted"] if i["team"] == wo["team"]]
    marks = ask_grader(grade_message(fixture, wo, draft, items), offline)
    met = {m.get("id"): bool(m.get("met")) for m in marks.get("items") or []}
    quotes = {m.get("id"): m.get("quote") for m in marks.get("items") or []}
    extras = marks.get("extra_flags") or []
    detect = [i for i in items if i["kind"] in DETECT and i["must"]]
    refuse = [i for i in items if i["kind"] == "refusal" and i["must"]]
    raised = sum(1 for i in items if i["kind"] in DETECT and met.get(i["id"])) + len(extras)
    made_up = sum(1 for e in extras if not e.get("supported"))
    return {
        "items": [{"id": i["id"], "kind": i["kind"], "must": i["must"], "met": met.get(i["id"], False),
                   "quote": quotes.get(i["id"])} for i in items],
        "extra_flags": extras,
        "notes": marks.get("notes"),
        "evidence": check_evidence(draft, fixture),
        "counts": {
            "caught": sum(1 for i in detect if met.get(i["id"])), "of_caught": len(detect),
            "made_up": made_up, "of_raised": raised,
            "stopped": sum(1 for i in refuse if met.get(i["id"])), "of_stopped": len(refuse),
        },
    }


# --- Scores and the baseline table ---------------------------------------------


def team_scores(jobs: list[dict]) -> dict:
    out = {}
    for team in TEAMS:
        mine = [j for j in jobs if j["team"] == team and j.get("grade")]
        if not mine:
            continue
        c = {k: sum(j["grade"]["counts"][k] for j in mine) for k in mine[0]["grade"]["counts"]}
        real = sum(len(j["grade"]["evidence"]["real"]) for j in mine)
        refs = real + sum(len(j["grade"]["evidence"]["not_found"]) for j in mine)
        out[team] = {
            "caught": [c["caught"], c["of_caught"]],
            "made_up": [c["made_up"], c["of_raised"]],
            "evidence": [real, refs],
            "stopped": [c["stopped"], c["of_stopped"]],
            "passed_review": sum(1 for j in mine if j["attempts"][-1]["verdict"] == "pass"),
            "drafts": len(mine),
        }
    return out


def ratio(pair) -> str:
    n, d = pair
    return f"{n}/{d} ({100 * n / d:.0f}%)" if d else "n/a"


def pct(pair):
    n, d = pair
    return 100 * n / d if d else None


def delta(now, before, lower_is_better=False) -> str:
    a, b = pct(now), pct(before) if before else None
    if a is None or b is None:
        return ""
    change = a - b
    if abs(change) < 0.5:
        return " (=)"
    better = change < 0 if lower_is_better else change > 0
    return f" ({'+' if change > 0 else ''}{change:.0f} pts, {'better' if better else 'worse'})"


def write_baselines(history: list[dict]) -> None:
    lines = [
        "# Eval baselines",
        "",
        "Written by `python evals/run.py` from `evals/history.json`; do not edit by hand.",
        "Each change is against the last run that covered the same practice companies.",
        "Caught: planted problems found (higher is better). Made up: raised problems the data",
        "does not support, out of everything raised (lower is better). Evidence: citations that",
        "point at a real row or brain field. Knew to stop: refusals done right.",
        "",
        "| Run | Label | Practice companies | Team | Caught | Made up | Evidence | Knew to stop | Passed review |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for i, run in enumerate(history):
        for team, s in run["scores"].items():
            before = next((r["scores"].get(team) for r in reversed(history[:i])
                           if r["fixtures"] == run["fixtures"] and team in r["scores"]), None)
            lines.append(
                f"| {run['run']} | {run['label'] or ''} | {', '.join(run['fixtures'])} | {team} "
                f"| {ratio(s['caught'])}{delta(s['caught'], before and before['caught'])} "
                f"| {ratio(s['made_up'])}{delta(s['made_up'], before and before['made_up'], True)} "
                f"| {ratio(s['evidence'])}{delta(s['evidence'], before and before['evidence'])} "
                f"| {ratio(s['stopped'])}{delta(s['stopped'], before and before['stopped'])} "
                f"| {s['passed_review']}/{s['drafts']} |"
            )
    BASELINES.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--fixture", action="append", help="Practice company to run (repeatable). Default: all.")
    parser.add_argument("--team", action="append", choices=TEAMS, help="Team to run (repeatable). Default: all.")
    parser.add_argument("--label", default="", help="What changed since the last run, for the baseline table.")
    parser.add_argument("--no-review", action="store_true", help="Mark the first draft; skip the Reviewer.")
    parser.add_argument("--offline", action="store_true", help="Use the scripted fake model; nothing is recorded.")
    parser.add_argument("--parallel", type=int, default=4, help="Work orders at once (default 4).")
    args = parser.parse_args()

    if args.offline:
        import fake_model
        runner._post = lambda role, message: (fake_model.answer(message), {"model": "fake"})
        runner.MIN_GAP = 0

    names = args.fixture or sorted(p.name for p in FIXTURES.iterdir() if (p / "answer_key.json").exists())
    fixtures = [load_fixture(n) for n in names]
    jobs = [
        {"fixture": f, "team": spec["team"], "wo": make_work_order(f, spec)}
        for f in fixtures for spec in f["work_orders"]
        if not args.team or spec["team"] in args.team
    ]
    if not jobs:
        raise SystemExit("Nothing to run: no work order matches those practice companies and teams.")
    started = time.time()
    runner.say(f"running {len(jobs)} work order(s) on {', '.join(names)}"
               + (" with the fake model" if args.offline else ""))

    def work(job):
        try:
            job["attempts"] = run_team(job["fixture"], job["wo"], review=not args.no_review)
            job["grade"] = grade(job["fixture"], job["wo"], job["attempts"][-1], args.offline)
        except runner.AgentError as error:
            job["error"] = str(error)
            runner.say(f"{job['wo']['id']}: {error}")
        return job

    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.parallel)) as pool:
        jobs = list(pool.map(work, jobs))

    run_id = datetime.now().strftime("%Y-%m-%d %H:%M")
    scores = team_scores(jobs)
    print(f"\nEval run {run_id}{' (offline, not recorded)' if args.offline else ''}, "
          f"{(time.time() - started) / 60:.0f} min")
    print(f"{'team':<10} {'caught':<14} {'made up':<14} {'evidence':<14} {'knew to stop':<14} passed review")
    for team, s in scores.items():
        print(f"{team:<10} {ratio(s['caught']):<14} {ratio(s['made_up']):<14} {ratio(s['evidence']):<14} "
              f"{ratio(s['stopped']):<14} {s['passed_review']}/{s['drafts']}")
    for job in jobs:
        if job.get("error"):
            print(f"  {job['wo']['id']}: not marked ({job['error']})")
            continue
        missed = [i["id"] for i in job["grade"]["items"] if i["must"] and not i["met"]]
        if missed:
            print(f"  {job['wo']['id']}: missed {', '.join(missed)}")

    if args.offline:
        return
    RESULTS.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M")
    detail = [{"work_order": j["wo"]["id"], "team": j["team"], "skill": j["wo"]["skill"],
               "attempts": j.get("attempts"), "grade": j.get("grade"), "error": j.get("error")} for j in jobs]
    (RESULTS / f"{stamp}.json").write_text(json.dumps({"run": run_id, "label": args.label, "fixtures": names,
                                                       "jobs": detail}, indent=2), encoding="utf-8")
    history = json.loads(HISTORY.read_text(encoding="utf-8")) if HISTORY.exists() else []
    history.append({"run": run_id, "label": args.label, "fixtures": names,
                    "teams": sorted({j["team"] for j in jobs}), "scores": scores,
                    "models": {"teams": runner.model_name("growth"), "reviewer": runner.model_name("reviewer"),
                               "grader": runner.ENV.get("EVAL_GRADER_MODEL") or runner.model_name("orchestrator")},
                    "details": f"evals/results/{stamp}.json"})
    HISTORY.write_text(json.dumps(history, indent=2) + "\n", encoding="utf-8")
    write_baselines(history)
    print(f"\nFull drafts and marks: evals/results/{stamp}.json. Table: evals/baselines.md")


if __name__ == "__main__":
    main()
