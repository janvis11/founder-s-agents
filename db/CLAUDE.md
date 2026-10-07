# Database notes (db/)

- `schema.sql` is the only schema file. It is idempotent: `create ... if not
  exists`, `alter ... add column if not exists`, constraints dropped and
  re-added. The dashboard applies it on every start, so add changes at the
  bottom in the same style and never write a destructive migration.
- One database per company (D8), all with this same schema. Tables:
  `company_brain` (exactly one row, id 1), `briefs`, `work_orders`,
  `drafts`, `agent_run_logs` (receipts), `playbook_amendments`.
- Teams allowed: growth, technical, finance, design. Work order status:
  pending, in_progress, done, bounced, escalated. Tiers: auto, approve,
  blocked.
- Decisions in `company_brain.data.decisions` must carry `reasoning` and
  `revisit_if`; the dashboard and `harness/mcp_server.py` both reject
  decisions without them.
- The accounts database is separate: `web/.data/install/postgres`
  (accounts, sessions, memberships), schema inside `web/src/lib/accounts.ts`,
  opened only by the dashboard process and never served on a port.
- Where company data lives: `web/.data/companies/<id>/postgres`, one folder
  per company, listed with its port in `web/.data/companies.json`. The
  dashboard serves each on its port while it runs (legro on 5434). Docker
  Postgres on port 5433 is the alternative (`FOUNDER_AGENTS_DB=postgres`),
  which holds a single company.
- Read live data from Python the way the agents do:
  `harness/.venv/Scripts/python.exe` with psycopg and
  `postgresql://postgres:postgres@127.0.0.1:<port>/postgres` (5434 for
  legro).
