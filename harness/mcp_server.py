#!/usr/bin/env python3
"""MCP tools over a company's database, for using an agent by hand (for
example `hermes -p finance` in a terminal). Every tool names its company
(the slug in web/.data/companies.json) and opens only that company's
database.

The gateways the office runs on do not load these tools (`no_mcp` in each
profile's platform_toolsets): there, harness/runner.py hands each agent what
it needs and writes what it returns, so work orders and drafts are created
only by the runner and every draft passes the Reviewer.
"""

import sys
from pathlib import Path

from mcp.server.fastmcp import FastMCP

sys.path.insert(0, str(Path(__file__).resolve().parent))
import store  # noqa: E402

mcp = FastMCP("founder-agents-harness")


def _open(company: str):
    found = store.find_company(company)
    if not found:
        raise ValueError(f"no company {company!r}")
    return store.connect(found)


@mcp.tool()
def read_company_brain(company: str) -> dict:
    """Read one company's company_brain in full."""
    with _open(company) as conn:
        return store.read_brain(conn)


@mcp.tool()
def write_company_brain(company: str, updates: dict | None = None, new_decisions: list | None = None) -> dict:
    """Merge field updates into sections (company, product, icp, positioning,
    constraints; priorities as a list of at most 3) and append decisions.
    Every decision needs 'decision', 'reasoning' and 'revisit_if' or nothing
    is written. Returns the updated brain."""
    with _open(company) as conn:
        return store.update_brain(conn, updates, new_decisions)


@mcp.tool()
def list_work_orders(company: str, open_only: bool = True) -> list:
    """One company's work orders, oldest first."""
    with _open(company) as conn:
        where = "where status <> 'done'" if open_only else ""
        rows = conn.execute(
            f"select id, team, skill, summary, tier, status, depends_on from work_orders {where} order by created_at"
        ).fetchall()
        return [dict(r) for r in rows]


@mcp.tool()
def log_agent_run(
    company: str, agent: str, skill: str, step: str,
    inputs: dict | None = None, output: dict | None = None,
    verdict: str | None = None, work_order_id: str | None = None,
) -> str:
    """Write a receipt: which agent, which skill, which step, inputs,
    output, verdict."""
    with _open(company) as conn:
        store.log_receipt(conn, agent, skill, step, work_order_id=work_order_id,
                          inputs=inputs, output=output, verdict=verdict)
    return "logged"


if __name__ == "__main__":
    mcp.run()
