# Database notes (db/)

- `schema.sql` is the only schema file. It is idempotent: `create ... if not
  exists`, `alter ... add column if not exists`, constraints dropped and
  re-added. The dashboard applies it on every start, so add changes at the
  bottom in the same style and never write a destructive migration.
- Tables: `company_brain` (exactly one row, id 1), `briefs`, `work_orders`,
  `drafts`, `agent_run_logs` (receipts), `playbook_amendments`.
- Teams allowed: growth, technical, finance, design. Work order status:
  pending, in_progress, done, bounced, escalated. Tiers: auto, approve,
  blocked.
- Decisions in `company_brain.data.decisions` must carry `reasoning` and
  `revisit_if`; the dashboard and `harness/mcp_server.py` both reject
  decisions without them.
- Where the data lives: `web/.data/postgres` (local, served on port 5434 by
  `npm run dev`). Docker Postgres on port 5433 is the alternative
  (`FOUNDER_AGENTS_DB=postgres`).
- Read live data from Python the way the agents do:
  `harness/.venv/Scripts/python.exe` with psycopg and
  `postgresql://postgres:postgres@127.0.0.1:5434/postgres`.
