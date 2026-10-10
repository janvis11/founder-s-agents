#!/usr/bin/env python3
"""Start the whole office: the six Hermes gateways (Orchestrator, four teams,
Reviewer) and the runner that moves work between them. Ctrl+C stops all.

  python scripts/start_agents.py          the model in .env
  python scripts/start_agents.py --fake   also start harness/fake_model.py
                                          (configure with MODEL_PROVIDER=fake first)

The dashboard (cd web && npm run dev) must be running too: it serves each
company's database for the runner. Logs go to harness/logs/<name>.log.
"""

import argparse
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from _profiles import TEAMS

REPO_ROOT = Path(__file__).resolve().parent.parent
LOGS = REPO_ROOT / "harness" / "logs"
VENV_PY = REPO_ROOT / "harness" / ".venv" / "Scripts" / "python.exe"
PYTHON = str(VENV_PY) if VENV_PY.exists() else sys.executable


def start(name: str, command: list[str]) -> subprocess.Popen:
    LOGS.mkdir(parents=True, exist_ok=True)
    log = open(LOGS / f"{name}.log", "a", encoding="utf-8")
    log.write(f"\n--- started {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
    log.flush()
    env = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUNBUFFERED": "1"}
    return subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT, cwd=REPO_ROOT, env=env)


def wait_until_up(team: str, seconds: int = 90) -> bool:
    url = f"http://127.0.0.1:{TEAMS[team]['port']}/health"
    deadline = time.time() + seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2):
                return True
        except Exception:
            time.sleep(1)
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--fake", action="store_true", help="Also start the scripted fake model.")
    parser.add_argument("--company", help="Run work for this company only (slug).")
    args = parser.parse_args()

    processes: dict[str, subprocess.Popen] = {}
    try:
        if args.fake:
            processes["fake_model"] = start("fake_model", [PYTHON, "harness/fake_model.py"])
        for team in TEAMS:
            processes[team] = start(team, ["hermes", "-p", team, "gateway", "run"])
        for team in TEAMS:
            up = wait_until_up(team)
            print(f"{team:>12}: {'up' if up else 'NOT UP, see harness/logs/' + team + '.log'}"
                  f" on port {TEAMS[team]['port']}", flush=True)
        processes["runner"] = start(
            "runner", [PYTHON, "harness/runner.py"] + (["--company", args.company] if args.company else [])
        )
        print("runner: started.", flush=True)
        print(
            "\nThe ports above are for the runner to talk to the agents, not web pages: opening them in a\n"
            "browser shows 404, which is normal. Use the dashboard at http://127.0.0.1:3000 (Office, Activity).\n"
            "Logs: harness/logs/. Leave this window open; Ctrl+C stops the agents and the runner.",
            flush=True,
        )
        while True:
            time.sleep(2)
            for name, process in processes.items():
                if process.poll() is not None:
                    raise SystemExit(f"{name} stopped (exit {process.returncode}); see harness/logs/{name}.log")
    except KeyboardInterrupt:
        pass
    finally:
        for process in processes.values():
            if process.poll() is None:
                process.terminate()
        for process in processes.values():
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
        print("Agents and runner stopped. The dashboard keeps running on its own.", flush=True)


if __name__ == "__main__":
    main()
