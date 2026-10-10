"""One place that knows where each company's database is and how its
company_brain may change. Used by the runner and the MCP server.

Companies are listed in web/.data/companies.json (written by the dashboard).
The dashboard serves each company's database on its own port while it runs;
when the dashboard is stopped, no company is reachable.
"""

import json
import os
from datetime import date
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

REPO_ROOT = Path(__file__).resolve().parent.parent
COMPANIES_JSON = REPO_ROOT / "web" / ".data" / "companies.json"
SKILLS_DIR = REPO_ROOT / "skills"

# PGlite's socket server accepts any credentials; the template only fills the port.
URL_TEMPLATE = os.environ.get(
    "COMPANY_DATABASE_URL_TEMPLATE", "postgresql://postgres:postgres@127.0.0.1:{port}/postgres"
)

BRAIN_SECTIONS = {"company", "product", "icp", "positioning", "constraints"}


def companies() -> list[dict]:
    """Every company in the install: [{slug, name, port, ...}]."""
    if not COMPANIES_JSON.exists():
        return []
    return json.loads(COMPANIES_JSON.read_text(encoding="utf-8"))


def find_company(slug: str) -> dict | None:
    return next((c for c in companies() if c["slug"] == slug), None)


def connect(company: dict) -> psycopg.Connection:
    """Open one company's database. Raises psycopg.OperationalError when the
    dashboard is not serving it."""
    return psycopg.connect(
        URL_TEMPLATE.format(port=company["port"]),
        autocommit=True,
        row_factory=dict_row,
        connect_timeout=5,
        # PGlite serves every socket connection from one database session, so
        # psycopg's named prepared statements ("_pg3_0") collide between
        # connections. Never prepare.
        prepare_threshold=None,
    )


def read_brain(conn: psycopg.Connection) -> dict:
    row = conn.execute("select data from company_brain where id = 1").fetchone()
    return row["data"] if row else {}


def update_brain(conn: psycopg.Connection, updates: dict | None, new_decisions: list | None) -> dict:
    """Merge field updates into the brain's sections and append decisions.

    Decisions are append-only and each must carry reasoning and revisit_if,
    or nothing is written. Priorities are replaced whole, at most three.
    """
    updates = updates or {}
    new_decisions = new_decisions or []
    for decision in new_decisions:
        if not decision.get("decision") or not decision.get("reasoning") or not decision.get("revisit_if"):
            raise ValueError(
                f"decision {decision.get('decision')!r} is missing reasoning or revisit_if; not recorded"
            )
    unknown = set(updates) - BRAIN_SECTIONS - {"priorities"}
    if unknown:
        raise ValueError(f"unknown company_brain sections: {sorted(unknown)}")
    if "priorities" in updates:
        priorities = updates["priorities"]
        if not isinstance(priorities, list) or len(priorities) > 3:
            raise ValueError("priorities must be a list of at most three items")

    brain = read_brain(conn)
    for section, fields in updates.items():
        if section == "priorities":
            brain["priorities"] = [str(p) for p in fields]
        elif isinstance(fields, dict):
            brain[section] = {**(brain.get(section) or {}), **fields}
    existing = {(d.get("decision"), d.get("reasoning")) for d in brain.get("decisions") or []}
    new_decisions = [d for d in new_decisions if (d["decision"], d["reasoning"]) not in existing]
    if new_decisions:
        today = date.today().isoformat()
        brain["decisions"] = (brain.get("decisions") or []) + [
            {
                "decision": d["decision"],
                "reasoning": d["reasoning"],
                "date": d.get("date") or today,
                "revisit_if": d["revisit_if"],
            }
            for d in new_decisions
        ]
    conn.execute(
        "update company_brain set data = %s, updated_at = now() where id = 1",
        (json.dumps(brain),),
    )
    return brain


def log_receipt(
    conn: psycopg.Connection,
    agent: str,
    skill: str,
    step: str,
    *,
    work_order_id: str | None = None,
    inputs: dict | None = None,
    output: dict | None = None,
    verdict: str | None = None,
) -> None:
    conn.execute(
        """insert into agent_run_logs (agent, skill, work_order_id, step, inputs, output, verdict)
           values (%s, %s, %s, %s, %s, %s, %s)""",
        (agent, skill, work_order_id, step, json.dumps(inputs or {}), json.dumps(output or {}), verdict),
    )


def read_skill(path: str) -> str:
    """A playbook's text, e.g. read_skill('growth/outreach_draft')."""
    return (SKILLS_DIR / path / "SKILL.md").read_text(encoding="utf-8")


def skill_description(path: str) -> str:
    """The one-line description from a playbook's frontmatter."""
    for line in read_skill(path).splitlines():
        if line.startswith("description:"):
            return line.split(":", 1)[1].strip()
    return ""
