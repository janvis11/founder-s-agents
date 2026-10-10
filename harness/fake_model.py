#!/usr/bin/env python3
"""A scripted stand-in for a model provider, to test the whole loop for free.

OpenAI-compatible (POST /v1/chat/completions, streaming or not) on port 8699.
Point the Hermes profiles at it with MODEL_PROVIDER=fake and
scripts/configure_instances.py. It reads the runner's message and answers
the way an agent would, with one planted mistake so a bounce can be watched:

  Orchestrator plan  -> Finance runway (auto), then Growth positioning check
                        (approve) that depends on it. A brief containing
                        "remember" is an update instead: no work orders, one
                        decision recorded.
  Team draft         -> Growth's first draft calls the product "the best";
                        once the Reviewer's fixes arrive, it drops the word.
  Reviewer           -> fails G3 on "the best", passes everything else.
  Orchestrator answer-> a short plain summary.
"""

import json
import os
import re
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 8699


def last_user_text(messages: list) -> str:
    for message in reversed(messages):
        if message.get("role") == "user":
            content = message.get("content")
            if isinstance(content, list):
                return "\n".join(p.get("text", "") for p in content if isinstance(p, dict))
            return content or ""
    return ""


def answer(text: str) -> str:
    if "Plan the founder's brief" in text:
        brief = text.split("=== FOUNDER'S BRIEF ===", 1)[-1].split("===", 1)[0].lower()
        if "remember" in brief:
            return json.dumps({
                "classification": "update",
                "reply": "Recorded the decision in the company brain.",
                "brain_updates": {"priorities": ["Win the first ten paying customers"]},
                "new_decisions": [{
                    "decision": "Focus on small accounting firms first",
                    "reasoning": "They asked for it in every interview so far",
                    "revisit_if": "Fewer than 3 of 10 firms convert after a trial",
                }],
                "work_orders": [],
            })
        return "```json\n" + json.dumps({
            "classification": "execute",
            "reply": "Finance checks runway first, then Growth checks positioning against it.",
            "brain_updates": {},
            "new_decisions": [],
            "work_orders": [
                {"ref": "a", "team": "finance", "skill": "runway_tracker",
                 "summary": "Work out burn and runway from what we know",
                 "inputs": {}, "acceptance_criteria": ["Every figure shows its formula"],
                 "tier": "auto", "depends_on": []},
                {"ref": "b", "team": "growth", "skill": "positioning_check",
                 "summary": "Check our positioning against the evidence",
                 "inputs": {}, "acceptance_criteria": ["Each claim traced to evidence"],
                 "tier": "approve", "depends_on": ["a"]},
            ],
        }) + "\n```"
    if "Do the work order below" in text:
        team = re.search(r"You are the (\w+) team", text).group(1).lower()
        if team == "growth":
            fixed = "REQUIRED FIXES" in text
            body = ("Our positioning says we help small businesses keep their ledgers. "
                    + ("" if fixed else "We are the best ledger tool. ")
                    + "Evidence for the ICP is thin: no interviews are recorded yet.")
            return json.dumps({
                "status": "ok", "summary": "Positioning holds, evidence is thin",
                "body": body,
                "citations": [{"claim": "helps small businesses keep ledgers",
                               "source": "company_brain.product.what_it_does"}],
                "limitations": "No customer interviews recorded in the company brain.",
                "contradiction": None,
            })
        return json.dumps({
            "status": "ok", "summary": f"{team.title()} draft",
            "body": "| Figure | Formula | Value |\n|---|---|---|\n| Runway | cash / net burn | not computable: "
                    "monthly_burn is empty in the company brain |",
            "citations": [{"claim": "monthly burn unknown", "source": "company_brain.constraints.monthly_burn"}],
            "limitations": "No expense or revenue data yet; every figure is provisional.",
            "contradiction": None,
        })
    if "Check the draft below" in text:
        draft = text.split("=== DRAFT", 1)[-1].lower()
        if "the best" in draft:
            return json.dumps({"verdict": "fail", "failed_checks": ["G3"],
                               "required_fixes": ["Remove the unsubstantiated superlative 'the best'."]})
        return json.dumps({"verdict": "pass", "failed_checks": [], "required_fixes": []})
    if "The teams have finished" in text:
        return ("Finance could not compute runway yet because burn is missing; it says so. "
                "Growth's positioning check passed review on its second attempt and waits on you in Approvals.")
    return "ok"


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # quiet
        pass

    def _json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.rstrip("/").endswith("/models"):
            self._json(200, {"object": "list", "data": [{"id": "fake", "object": "model", "owned_by": "aloft"}]})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        request = json.loads(self.rfile.read(length) or b"{}")
        tools = [t.get("function", {}).get("name") for t in request.get("tools") or []]
        print(f"request with {len(tools)} tool(s): {', '.join(tools) or 'none'}", flush=True)
        text = answer(last_user_text(request.get("messages") or []))
        time.sleep(float(os.environ.get("FAKE_DELAY", "0")))  # act like a slow free model
        cid, now = f"chatcmpl-{uuid.uuid4().hex[:12]}", int(time.time())
        usage = {"prompt_tokens": len(json.dumps(request)) // 4, "completion_tokens": len(text) // 4,
                 "total_tokens": (len(json.dumps(request)) + len(text)) // 4}
        if not request.get("stream"):
            self._json(200, {
                "id": cid, "object": "chat.completion", "created": now, "model": "fake",
                "choices": [{"index": 0, "message": {"role": "assistant", "content": text},
                             "finish_reason": "stop"}],
                "usage": usage,
            })
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        chunks = [
            {"delta": {"role": "assistant", "content": text}, "finish_reason": None},
            {"delta": {}, "finish_reason": "stop"},
        ]
        for n, choice in enumerate(chunks):
            event = {"id": cid, "object": "chat.completion.chunk", "created": now, "model": "fake",
                     "choices": [{"index": 0, **choice}]}
            if n == len(chunks) - 1:
                event["usage"] = usage
            self.wfile.write(f"data: {json.dumps(event)}\n\n".encode())
        self.wfile.write(b"data: [DONE]\n\n")
        self.wfile.flush()


if __name__ == "__main__":
    print(f"fake model on http://127.0.0.1:{PORT}/v1", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
