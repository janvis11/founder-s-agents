#!/usr/bin/env python3
"""MCP server exposing company_brain / work_orders / drafts / agent_run_logs
as tools, backed by Postgres. See AGENTS.md for the schema these encode and
CLAUDE.md's "Skills are prose, not code" — this is where the deterministic
logic a skill calls into actually lives.
"""

import json
import sys
from pathlib import Path

import psycopg
from mcp.server.fastmcp import FastMCP

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))
from _env import read_env  # noqa: E402

_env = read_env(REPO_ROOT / ".env")
DATABASE_URL = _env.get("DATABASE_URL", "postgresql://founder_agents:founder_agents@localhost:5433/founder_agents")

mcp = FastMCP("founder-agents-harness")


def _connect():
    return psycopg.connect(DATABASE_URL, autocommit=True)


@mcp.tool()
def read_company_brain() -> dict:
    """Read the current company_brain document in full."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("select data from company_brain where id = 1")
        row = cur.fetchone()
        return row[0] if row else {}


@mcp.tool()
def write_company_brain(patch: dict) -> dict:
    """Shallow-merge `patch` into company_brain's top-level fields and
    return the updated document. To append a decision, include it under
    patch['decisions'] as the FULL desired decisions array (read first,
    append, then write) — every decision must carry 'reasoning' and
    'revisit_if' or this call is rejected."""
    for decision in patch.get("decisions", []):
        if not decision.get("reasoning") or not decision.get("revisit_if"):
            raise ValueError(
                f"decision {decision.get('decision')!r} is missing reasoning "
                f"or revisit_if — not recorded"
            )
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("select data from company_brain where id = 1")
        row = cur.fetchone()
        current = row[0] if row else {}
        current.update(patch)
        cur.execute(
            "update company_brain set data = %s, updated_at = now() where id = 1",
            (json.dumps(current),),
        )
        return current


@mcp.tool()
def create_work_order(
    id: str, team: str, skill: str, tier: str,
    inputs: dict | None = None, acceptance_criteria: list | None = None,
    depends_on: list | None = None,
) -> dict:
    """Create a work order. team must be growth|technical|finance|design.
    tier must be auto|approve|blocked."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """insert into work_orders
               (id, team, skill, inputs, acceptance_criteria, tier, depends_on)
               values (%s, %s, %s, %s, %s, %s, %s)
               returning id, team, skill, inputs, acceptance_criteria, tier,
                         depends_on, status, created_at""",
            (
                id, team, skill, json.dumps(inputs or {}),
                json.dumps(acceptance_criteria or []), tier,
                json.dumps(depends_on or []),
            ),
        )
        columns = [c.name for c in cur.description]
        return dict(zip(columns, cur.fetchone()))


@mcp.tool()
def write_draft(
    work_order_id: str, team: str, skill: str, content: dict, tier: str,
) -> dict:
    """Record a specialist's draft output against a work order, before
    review and before founder approval."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """insert into drafts (work_order_id, team, skill, content, tier)
               values (%s, %s, %s, %s, %s)
               returning id, work_order_id, team, skill, content, tier,
                         verdict, created_at""",
            (work_order_id, team, skill, json.dumps(content), tier),
        )
        columns = [c.name for c in cur.description]
        return dict(zip(columns, cur.fetchone()))


@mcp.tool()
def log_agent_run(
    agent: str, skill: str, step: str,
    inputs: dict | None = None, output: dict | None = None,
    verdict: str | None = None, work_order_id: str | None = None,
) -> dict:
    """Write a receipt: which agent, which skill, which step, inputs,
    output, verdict. Call this after every skill step, pass or fail."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """insert into agent_run_logs
               (agent, skill, work_order_id, step, inputs, output, verdict)
               values (%s, %s, %s, %s, %s, %s, %s)
               returning id, agent, skill, work_order_id, step, inputs,
                         output, verdict, created_at""",
            (
                agent, skill, work_order_id, step,
                json.dumps(inputs or {}), json.dumps(output or {}), verdict,
            ),
        )
        columns = [c.name for c in cur.description]
        return dict(zip(columns, cur.fetchone()))


if __name__ == "__main__":
    mcp.run()
