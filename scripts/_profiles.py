"""Shared team -> Hermes profile mapping, used by sync_skills.py and
configure_instances.py. Profile homes are resolved by asking `hermes`
itself (`hermes profile show <team>`) rather than guessing a path, since the
install location differs by OS and install method.
"""

import re
import subprocess
from pathlib import Path

TEAMS = {
    "orchestrator": {
        "skills": ["business_rules", "review_rubric", "orchestrator/planning"],
        "port": 8642,
    },
    "growth": {
        "skills": ["business_rules", "growth/outreach_draft", "growth/positioning_check"],
        "port": 8643,
    },
    "technical": {
        "skills": ["business_rules", "technical/scope_mvp"],
        "port": 8644,
    },
    "finance": {
        "skills": ["business_rules", "finance/runway_tracker"],
        "port": 8645,
    },
    "design": {
        "skills": ["business_rules", "design/product_design_direction", "design/brand_identity"],
        "port": 8646,
    },
}

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
