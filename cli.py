#!/usr/bin/env python3
"""Send a founder message to the Orchestrator and print its response.

Phase 0 harness driver — see ROADMAP.md. Talks to the Orchestrator's
Hermes gateway over its OpenAI-compatible API (POST /v1/chat/completions).
"""

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "scripts"))
from _env import read_env  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("message", nargs="?", help="Message to send. Omit to read stdin.")
    args = parser.parse_args()

    message = args.message or sys.stdin.read()
    if not message.strip():
        raise SystemExit("no message given (pass as an argument or pipe via stdin)")

    env = read_env(REPO_ROOT / ".env")
    port = env.get("ORCHESTRATOR_API_SERVER_PORT")
    key = env.get("ORCHESTRATOR_API_SERVER_KEY")
    if not port or not key:
        raise SystemExit(
            "missing ORCHESTRATOR_API_SERVER_PORT/KEY in .env — "
            "run scripts/configure_instances.py first"
        )

    url = f"http://127.0.0.1:{port}/v1/chat/completions"
    body = json.dumps({
        "model": "default",
        "messages": [{"role": "user", "content": message}],
        "stream": False,
    }).encode()

    request = urllib.request.Request(
        url, data=body, method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            payload = json.load(response)
    except urllib.error.URLError as error:
        raise SystemExit(
            f"could not reach the Orchestrator gateway at {url}: {error}\n"
            f"Is it running? Start it with: orchestrator gateway run"
        ) from error

    print(payload["choices"][0]["message"]["content"])


if __name__ == "__main__":
    main()
