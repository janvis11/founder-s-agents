#!/usr/bin/env python3
"""Write config.yaml and .env for each Hermes profile, and refresh SOUL.md.

Model provider is AWS Bedrock. Auth is explicit long-lived/temporary AWS
keys from this repo's root .env (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
/ AWS_SESSION_TOKEN), copied into each profile's own .env — not the
ambient ~/.aws profile chain. Run once (or after changing
model/ports/region/keys), then run sync_skills.py, then start each
instance with `<team> gateway run` (the wrapper alias `hermes profile
create` generated) or `hermes -p <team> gateway run`.
"""

import argparse
import os
import secrets
from pathlib import Path

import yaml

from _env import ensure_keys
from _profiles import TEAMS, profile_home, require_known_team

REPO_ROOT = Path(__file__).resolve().parent.parent
ROOT_ENV = REPO_ROOT / ".env"

# Bare model id — no "bedrock/" prefix. Unlike the anthropic/openrouter
# providers, Hermes's Bedrock transport passes model.default straight
# through to boto3's Converse call without stripping a provider prefix;
# a prefixed id fails with "the provided model identifier is invalid."
DEFAULT_MODEL = os.environ.get("HERMES_BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-5-20250929-v1:0")

SOUL = {
    "orchestrator": """\
You are the Orchestrator for founder-agents. You are the only agent the
founder talks to. You plan and route. You never do Growth, Technical,
Finance, or Design's work yourself, even when it would be faster.

Follow skills/orchestrator/planning/SKILL.md for every message. Apply
skills/business_rules/SKILL.md to everything you route. Apply
skills/review_rubric/SKILL.md to every draft before it reaches the founder.
""",
    "growth": """\
You are the Growth team for founder-agents: sales and marketing, as one
team, for one founder's company.

Follow the procedure in your skills/ folder exactly. Apply
skills/business_rules/SKILL.md to everything you produce. Stay in your lane
— messaging, outreach, positioning. Return misrouted work to the
Orchestrator with a reason instead of doing it anyway.
""",
    "technical": """\
You are the Technical team for founder-agents: product and engineering, for
one founder's company.

Follow the procedure in your skills/ folder exactly. Apply
skills/business_rules/SKILL.md to everything you produce. Stay in your lane
— scope, architecture, bug triage. Never touch production. Return misrouted
work to the Orchestrator with a reason instead of doing it anyway.
""",
    "finance": """\
You are the Finance team for founder-agents: runway, burn, and unit
economics, for one founder's company.

Follow the procedure in your skills/ folder exactly. Apply
skills/business_rules/SKILL.md to everything you produce. Show your
arithmetic. Never a single-point forecast. Never move money. Return
misrouted work to the Orchestrator with a reason instead of doing it anyway.
""",
    "design": """\
You are the Design team for founder-agents: product design — software
interface or physical product, whichever the founder's company builds —
plus brand and visual identity.

Follow the procedure in your skills/ folder exactly. Apply
skills/business_rules/SKILL.md to everything you produce. Direction and
critique only — never code, never fabricated image/vector/CAD output. Stay
off wording; that is Growth's lane. Return misrouted work to the
Orchestrator with a reason instead of doing it anyway.
""",
}


def configure_team(team: str, root_env: dict) -> None:
    home = profile_home(team)
    port = TEAMS[team]["port"]
    api_key = root_env[f"{team.upper()}_API_SERVER_KEY"]

    # Merge into any existing config.yaml rather than overwrite it —
    # `hermes mcp add` writes MCP server/tool registration into this same
    # file, and a blind overwrite here silently deletes it.
    config_path = home / "config.yaml"
    config = yaml.safe_load(config_path.read_text()) if config_path.exists() else {}
    config = config or {}
    config["model"] = {"default": DEFAULT_MODEL, "provider": "bedrock"}
    config_path.write_text(yaml.safe_dump(config, sort_keys=False))

    # AWS auth: explicit keys from root .env, copied into this profile's
    # own .env (aws_sdk auth_type reads these as plain env vars — no
    # ~/.aws/credentials involved).
    access_key = root_env.get("AWS_ACCESS_KEY_ID", "")
    secret_key = root_env.get("AWS_SECRET_ACCESS_KEY", "")
    if not access_key or not secret_key:
        print(
            f"[{team}] WARNING: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY "
            f"not set in .env — this profile will not be able to call Bedrock "
            f"until you add them and rerun this script."
        )

    env_lines = [
        f"API_SERVER_PORT={port}",
        "API_SERVER_HOST=127.0.0.1",
        f"API_SERVER_KEY={api_key}",
        f"AWS_ACCESS_KEY_ID={access_key}",
        f"AWS_SECRET_ACCESS_KEY={secret_key}",
        f"AWS_REGION={root_env.get('AWS_REGION', 'us-east-1')}",
    ]
    if root_env.get("AWS_SESSION_TOKEN"):
        env_lines.append(f"AWS_SESSION_TOKEN={root_env['AWS_SESSION_TOKEN']}")
    (home / ".env").write_text("\n".join(env_lines) + "\n")

    (home / "SOUL.md").write_text(SOUL[team])
    print(f"[{team}] configured at {home} (port {port})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("team", nargs="*", help=f"Team(s) to configure, from {list(TEAMS)}.")
    args = parser.parse_args()
    teams = args.team or list(TEAMS)
    for team in teams:
        require_known_team(team)

    defaults = {f"{t.upper()}_API_SERVER_KEY": secrets.token_urlsafe(32) for t in TEAMS}
    root_env = ensure_keys(ROOT_ENV, defaults)

    for team in teams:
        configure_team(team, root_env)


if __name__ == "__main__":
    main()
