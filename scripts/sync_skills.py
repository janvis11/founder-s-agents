#!/usr/bin/env python3
"""Copy this repo's skills/ into each Hermes profile's skills/ directory.

Run on boot, before starting a Hermes instance. See AGENTS.md for the team
topology and README.md for the skills/ layout this reads from.
"""

import argparse
import json
import shutil
from pathlib import Path

from _profiles import TEAMS, profile_home, require_known_team

REPO_ROOT = Path(__file__).resolve().parent.parent
SKILLS_ROOT = REPO_ROOT / "skills"
MANIFEST_NAME = ".sync-skills-manifest.json"


def sync_team(team: str) -> None:
    dest_skills = profile_home(team) / "skills"
    dest_skills.mkdir(parents=True, exist_ok=True)

    manifest_path = dest_skills / MANIFEST_NAME
    previous = set(json.loads(manifest_path.read_text())) if manifest_path.exists() else set()
    current = set()

    for rel in TEAMS[team]["skills"]:
        src = SKILLS_ROOT / rel
        if not src.is_dir():
            raise FileNotFoundError(f"{team}: expected skill directory {src}")
        name = rel.split("/")[-1]
        current.add(name)
        dest = dest_skills / name
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(src, dest)

    # Remove skills we synced before but no longer own — never touch
    # anything outside `current | previous`, so agent-authored skills
    # (not in this manifest) are left alone.
    for stale in previous - current:
        stale_dir = dest_skills / stale
        if stale_dir.exists():
            shutil.rmtree(stale_dir)

    manifest_path.write_text(json.dumps(sorted(current)))
    print(f"[{team}] synced {sorted(current)} -> {dest_skills}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "team", nargs="*",
        help=f"Team(s) to sync, from {list(TEAMS)}. Omit to sync all five.",
    )
    args = parser.parse_args()
    teams = args.team or list(TEAMS)
    for team in teams:
        require_known_team(team)
        sync_team(team)


if __name__ == "__main__":
    main()
