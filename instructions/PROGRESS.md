# Progress

The current state of the project, one section per area. When something
changes, edit the section that describes it so it states the new truth. Do
not append a new entry below an outdated one, and do not keep superseded
statements. Last updated 2026-10-07.

## Playbooks and product docs

- Playbooks in `skills/`: business_rules, review_rubric,
  orchestrator/planning, growth/outreach_draft, growth/positioning_check,
  technical/scope_mvp, finance/runway_tracker,
  design/product_design_direction, design/brand_identity.
- Product docs in `instructions/` (PRODUCT, AGENTS, ROADMAP, DECISIONS
  D1 to D8, GLOSSARY, EVALS, SKILL_AUTHORING, CLAUDE). Dashboard design
  guidance in `meta/`.

## Agents (Hermes)

- Five Hermes profiles exist on this machine: orchestrator, growth,
  technical, finance, design, with skills synced and the MCP server
  (`harness/mcp_server.py`) registered.
- Not running: AWS Bedrock keys are not in `.env`. Janvi will provide them
  later. Nothing that needs a live model can be built or tested until then.

## Database

- One schema file, `db/schema.sql`, idempotent, applied on every start.
- One database per company in `web/.data/companies/<slug>/postgres`,
  listed in `web/.data/companies.json` (names and ports only). The dashboard
  opens every company's database when it starts and serves each on its own
  port (legro on 5434, new companies on the next free port) so the agents'
  MCP server can reach it. Root `.env` `DATABASE_URL` points at legro.
  Verified from Python (psycopg) after a restart.
- Docker Postgres (port 5433) is the optional alternative
  (`FOUNDER_AGENTS_DB=postgres`). Docker Desktop does not work on Janvi's
  machine.
- Live data: company **legro** (finance company, stage launched, product
  "growing and managing ledgers", customer "business"), set up 2026-10-07,
  passcode set, one brief sent (status broken: no Orchestrator running).
  Runway, burn, hours per week, priorities and decisions are still empty.
  It was moved into `web/.data/companies/legro/` with all its data; a copy
  of the old layout was kept in the temp folder (`fc-data-backup-*`).

## Dashboard (`web/`)

- Pages: lobby `/` (all companies, Enter, Create a new company), `/new`
  (create a company with its passcode), `/enter/<slug>` (passcode), office
  `/office`, approvals, work order, playbooks (read and amend with diff plus
  required reason, amendment register), receipts, company brain
  (append-only decisions), company essentials `/setup`, backup export.
- Per-company lock: scrypt hash in `web/.data/companies/<slug>/lock.json`,
  a session cookie per company plus a cookie naming the company you
  entered. `src/proxy.ts` sends you to the lobby unless that company's
  session is valid, and is the only place the company header is set; every
  server action re-checks. Header has Back to lobby and Lock. Forgot a
  passcode: delete that company's `lock.json`; the next person to enter it
  sets a new one.
- Backup: "Download a backup" on the Brain page, all tables plus playbooks
  as one JSON file.
- Product name in the UI: **Founders Corps**. The dashboard starts empty;
  there is no demo data.
- Design: white theme, large edge-to-edge isometric office, every object
  coloured, each room its own colour (Growth orange, Technical sky blue,
  Finance green, Design purple, Orchestrator blue, Reviewer slate, founder
  desk amber). Clicking a room opens a drawer fixed to the right edge.
  Janvi rejected: plain paper look, rainbow team colours on dark blue, pure
  black and white, bluish dark themes, glows.

## Decisions in force

- D8: many companies per install, one database and passcode each.
  Supersedes D7.

## Not committed on purpose

- `web/public/assets/kenney/` (41 MB furniture images) and the unused old
  office scene `web/src/components/IsoScene.tsx`, `web/src/lib/officeLayout.ts`.
- `.claude/` (local preview config).

## Next steps

1. Janvi fills the rest of the company brain.
2. When AWS keys arrive: `python scripts/configure_instances.py`,
   `python scripts/sync_skills.py`, then start each gateway
   (`orchestrator gateway run`, then growth, technical, finance, design).
3. Code without a live model, in this order: finish many companies
   (per-company playbook edits, MCP server company routing), eval harness
   (ROADMAP phase 2), prompts for empty company brain fields.
4. Code with a live model: the automatic loop (ROADMAP phase 1).

## Many companies per install (D8): what is left

Built: lobby, create and enter a company, a database and passcode per
company, office at `/office`, Back to lobby, legro moved into its own
folder, every company's database served for the agents.

Still to do:
- Per-company playbook edits: `skills/` stays the shared default; a
  company's amendments are saved in its own folder and only change its own
  teams.
- MCP server company routing: every work order names its company and
  `harness/mcp_server.py` opens that company's database (its port is in
  `web/.data/companies.json`). Today the MCP server only reaches the company
  in `.env` `DATABASE_URL` (legro).
- Out of scope: public internet hosting (needs accounts, HTTPS, hosting).
