#!/usr/bin/env python3
"""Write config.yaml, .env and SOUL.md for every Hermes profile, creating
any profile that does not exist yet (the Reviewer is the sixth).

The model comes from this repo's root .env:

  MODEL_PROVIDER   nvidia | gemini | openrouter | anthropic | bedrock | fake
                   (unset: the first provider whose key is in .env)
  MODEL            model for the Orchestrator and the four teams
  MODEL_FAST       model for the Reviewer (defaults to MODEL)

plus that provider's key (NVIDIA_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY,
ANTHROPIC_API_KEY, or the AWS_* keys for Bedrock). `fake` needs no key: it
points every agent at harness/fake_model.py, a scripted stand-in for testing
the loop without spending anything.

Every profile gets memory switched off (company_brain is the memory, and one
set of agents serves many companies) and only the tools listed in
scripts/_profiles.py. Run once, and again after changing the model or keys;
then run sync_skills.py and scripts/start_agents.py.
"""

import argparse
import os
import secrets
import subprocess
from pathlib import Path

import yaml

from _env import ensure_keys
from _profiles import PROVIDERS, TEAMS, choose_provider, model_for, profile_home, require_known_team

REPO_ROOT = Path(__file__).resolve().parent.parent
ROOT_ENV = REPO_ROOT / ".env"
FAKE_MODEL_PORT = 8699

COMMON = """
The runner (harness/runner.py) sends you everything you need in each
message: the company_brain, your playbook, the business rules and the work.
Answer in exactly the format the message asks for. You never touch a
database and you never act in the outside world.
"""

SOUL = {
    "orchestrator": """\
You are the Orchestrator for Aloft. You are the only agent the founder
talks to. You plan and route. You never do Growth, Technical, Finance or
Design's work yourself, even when it would be faster. You follow the
planning playbook and the business rules on every message.
""",
    "growth": """\
You are the Growth team for Aloft: sales and marketing, as one team, for
one founder's company. Stay in your lane: messaging, outreach,
positioning. If the work belongs to another team, say so in your answer
instead of doing it.
""",
    "technical": """\
You are the Technical team for Aloft: product and engineering, for one
founder's company. Stay in your lane: scope, architecture, bug triage.
Never touch production. If the work belongs to another team, say so in
your answer instead of doing it.
""",
    "finance": """\
You are the Finance team for Aloft: runway, burn and unit economics, for
one founder's company. Show your arithmetic. Never a single-point
forecast. Never move money. If the work belongs to another team, say so in
your answer instead of doing it.
""",
    "design": """\
You are the Design team for Aloft: product design (software interface or
physical product, whichever the founder's company builds) plus brand and
visual identity. Direction and critique only: never code, never fabricated
image, vector or CAD output. Stay off wording; that is Growth's lane.
""",
    "reviewer": """\
You are the Reviewer for Aloft. You have no tools and form no opinions.
You check each draft against the review rubric and the business rules and
return a verdict. A draft that passes every check passes, however plain.
""",
}


def ensure_profile(team: str) -> Path:
    try:
        return profile_home(team)
    except subprocess.CalledProcessError:
        subprocess.run(["hermes", "profile", "create", team, "--no-skills"], check=True)
        print(f"[{team}] created Hermes profile")
        return profile_home(team)


def configure_team(team: str, env: dict, provider: str) -> None:
    home = ensure_profile(team)
    spec = PROVIDERS[provider]
    model = model_for(team, env)

    # Merge into the existing config.yaml rather than overwrite it: Hermes
    # writes its own settings (MCP registration, version) into this file.
    config_path = home / "config.yaml"
    config = (yaml.safe_load(config_path.read_text(encoding="utf-8")) if config_path.exists() else {}) or {}
    if provider == "fake":
        config["model"] = {"provider": "custom", "default": "fake",
                           "base_url": f"http://127.0.0.1:{FAKE_MODEL_PORT}/v1", "api_key": "fake"}
    else:
        config["model"] = {"default": model, "provider": provider}
        # Free tiers can take minutes per answer; do not give up before the runner does.
        providers = config.get("providers") or {}
        providers[provider] = {**(providers.get(provider) or {}),
                               "request_timeout_seconds": 600, "stale_timeout_seconds": 600}
        config["providers"] = providers
    config["memory"] = {**(config.get("memory") or {}), "memory_enabled": False}
    platform_toolsets = config.get("platform_toolsets") or {}
    platform_toolsets["api_server"] = TEAMS[team]["tools"] + ["no_mcp"]
    config["platform_toolsets"] = platform_toolsets
    config_path.write_text(yaml.safe_dump(config, sort_keys=False), encoding="utf-8")

    env_lines = [
        f"API_SERVER_PORT={TEAMS[team]['port']}",
        "API_SERVER_HOST=127.0.0.1",
        f"API_SERVER_KEY={env[f'{team.upper()}_API_SERVER_KEY']}",
    ]
    for key in spec["keys"]:
        if env.get(key):
            env_lines.append(f"{key}={env[key]}")
    (home / ".env").write_text("\n".join(env_lines) + "\n", encoding="utf-8")
    (home / "SOUL.md").write_text(SOUL[team] + COMMON, encoding="utf-8")
    shown = "fake model" if provider == "fake" else f"{provider} {model}"
    print(f"[{team}] configured at {home} (port {TEAMS[team]['port']}, {shown})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("team", nargs="*", help=f"Profiles to configure, from {list(TEAMS)}. Omit for all.")
    args = parser.parse_args()
    teams = args.team or list(TEAMS)
    for team in teams:
        require_known_team(team)

    defaults = {f"{t.upper()}_API_SERVER_KEY": secrets.token_urlsafe(32) for t in TEAMS}
    env = ensure_keys(ROOT_ENV, defaults)
    env.update({k: v for k, v in os.environ.items() if k in ("MODEL_PROVIDER", "MODEL", "MODEL_FAST")})
    provider = choose_provider(env)
    for team in teams:
        configure_team(team, env, provider)


if __name__ == "__main__":
    main()
