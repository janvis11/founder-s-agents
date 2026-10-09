"""Shared team -> Hermes profile mapping, used by sync_skills.py and
configure_instances.py. Profile homes are resolved by asking `hermes`
itself (`hermes profile show <team>`) rather than guessing a path, since the
install location differs by OS and install method.
"""

import re
import subprocess
from pathlib import Path

# Every agent is a Hermes profile. `tools` is the gateway's whole toolset
# (platform_toolsets.api_server): the runner (harness/runner.py) gives each
# agent what it needs in the message and writes its answers to the database,
# so no agent gets a terminal, files, code execution, memory or the database.
# Teams may search the web for dated public signals; the Orchestrator and the
# Reviewer get nothing (D4: the Reviewer is a checklist with no tools).
TEAMS = {
    "orchestrator": {
        "skills": ["business_rules", "orchestrator/planning"],
        "port": 8642,
        "tools": [],
    },
    "growth": {
        "skills": ["business_rules", "growth/outreach_draft", "growth/positioning_check"],
        "port": 8643,
        "tools": ["web"],
    },
    "technical": {
        "skills": ["business_rules", "technical/scope_mvp"],
        "port": 8644,
        "tools": ["web"],
    },
    "finance": {
        "skills": ["business_rules", "finance/runway_tracker"],
        "port": 8645,
        "tools": ["web"],
    },
    "design": {
        "skills": ["business_rules", "design/product_design_direction", "design/brand_identity"],
        "port": 8646,
        "tools": ["web"],
    },
    "reviewer": {
        "skills": ["business_rules", "review_rubric"],
        "port": 8647,
        "tools": [],
    },
}

# Provider -> the key(s) it needs and sensible default models. Model ids
# change; scripts/check_model.py lists what a key can actually reach.
PROVIDERS = {
    # Timed on the free tier (2026-10-08): kimi-k3 about 155s a call,
    # glm-5.3-flash about 77s, both reviewed correctly; glm-5.3 timed out.
    "nvidia": {"keys": ["NVIDIA_API_KEY"], "model": "moonshotai/kimi-k3", "fast": "z-ai/glm-5.3-flash"},
    "gemini": {"keys": ["GEMINI_API_KEY"], "model": "gemini-3-flash", "fast": None},
    "openrouter": {"keys": ["OPENROUTER_API_KEY"], "model": "anthropic/claude-sonnet-4.5",
                   "fast": "anthropic/claude-haiku-4.5"},
    "anthropic": {"keys": ["ANTHROPIC_API_KEY"], "model": "claude-sonnet-4-5", "fast": "claude-haiku-4-5"},
    # Bare Bedrock id, no "bedrock/" prefix: Hermes passes it straight to
    # boto3's Converse call, and a prefixed id is rejected.
    "bedrock": {"keys": ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN", "AWS_REGION"],
                "model": "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
                "fast": "us.anthropic.claude-haiku-4-5-20251001-v1:0"},
    "fake": {"keys": [], "model": "fake", "fast": None},
}


def choose_provider(env: dict) -> str:
    chosen = env.get("MODEL_PROVIDER", "").strip()
    if chosen:
        if chosen not in PROVIDERS:
            raise SystemExit(f"MODEL_PROVIDER={chosen!r} is not one of {list(PROVIDERS)}")
        return chosen
    for name in ("nvidia", "gemini", "openrouter", "anthropic", "bedrock"):
        if env.get(PROVIDERS[name]["keys"][0]):
            return name
    raise SystemExit(
        "No model key in .env. Add one of NVIDIA_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, "
        "ANTHROPIC_API_KEY or the AWS keys, or set MODEL_PROVIDER=fake to test without a model."
    )


_PATH_RE = re.compile(r"^Path:\s*(.+)$", re.MULTILINE)


def profile_home(team: str) -> Path:
    result = subprocess.run(
        ["hermes", "profile", "show", team],
        capture_output=True, text=True, check=True,
    )
    match = _PATH_RE.search(result.stdout)
    if not match:
        raise RuntimeError(f"could not parse profile path for {team!r} from:\n{result.stdout}")
    return Path(match.group(1).strip())


def require_known_team(team: str) -> None:
    if team not in TEAMS:
        raise SystemExit(f"unknown team {team!r}, expected one of {list(TEAMS)}")


def model_for(role: str, env: dict) -> str:
    """The model a profile runs, as configure_instances.py sets it."""
    provider = choose_provider(env)
    spec = PROVIDERS[provider]
    model = env.get("MODEL") or spec["model"]
    if role == "reviewer":
        model = env.get("MODEL_FAST") or spec["fast"] or model
    return model
