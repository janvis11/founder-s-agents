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
  D1 to D7, GLOSSARY, EVALS, SKILL_AUTHORING, CLAUDE). Dashboard design
  guidance in `meta/`.

## Agents (Hermes)

- Five Hermes profiles exist on this machine: orchestrator, growth,
  technical, finance, design, with skills synced and the MCP server
  (`harness/mcp_server.py`) registered.
- Not running: AWS Bedrock keys are not in `.env`. Janvi will provide them
  later. Nothing that needs a live model can be built or tested until then.

## Database

- One schema file, `db/schema.sql`, idempotent, applied on every start.
- Data lives in `web/.data/postgres`. `npm run dev` serves it on
  127.0.0.1:5434 so the dashboard and the MCP server share it; root `.env`
  `DATABASE_URL` points there. Verified from Python (psycopg).
- Docker Postgres (port 5433) is the optional alternative
  (`FOUNDER_AGENTS_DB=postgres`). Docker Desktop does not work on Janvi's
  machine.
- Live data: company **legro** (finance company, stage launched, product
  "growing and managing ledgers", customer "business"), set up 2026-10-07,
  passcode set, one brief sent (status broken: no Orchestrator running).
  Runway, burn, hours per week, priorities and decisions are still empty.

## Dashboard (`web/`)

- Pages: office home, approvals, work order, playbooks (read and amend with
  diff plus required reason, amendment register), receipts, company brain
  (append-only decisions), first-run setup, unlock, backup export.
- Office passcode lock: scrypt hash in `web/.data/lock.json`, session
  cookie, `src/proxy.ts` guards every page, every server action re-checks,
  header hides company data while locked, Lock button. Forgot passcode:
  delete `web/.data/lock.json` and set a new one at `/setup`.
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

- D7: one install per founder, one company per install. A plan to replace
  it with many companies per install is awaiting validation (below).

## Not committed on purpose

- `web/public/assets/kenney/` (41 MB furniture images) and the unused old
  office scene `web/src/components/IsoScene.tsx`, `web/src/lib/officeLayout.ts`.
- `.claude/` (local preview config).

## Next steps

1. Janvi fills the rest of the company brain.
2. When AWS keys arrive: `python scripts/configure_instances.py`,
   `python scripts/sync_skills.py`, then start each gateway
   (`orchestrator gateway run`, then growth, technical, finance, design).
3. Code without a live model, options offered to Janvi: many companies per
   install (after validation), eval harness (ROADMAP phase 2), prompts for
   empty company brain fields.
4. Code with a live model: the automatic loop (ROADMAP phase 1).

## Plan awaiting validation: many companies per install

- `/` becomes a lobby listing companies, each with Enter, plus Create a
  new company. Each company has its own passcode.
- One database per company: `.data/companies/<slug>/`. Physically separate,
  so one company can never read another's data; backup or delete is one
  folder. A small registry file lists names only.
- Pages move under `/c/<slug>/...`; header gets Back to lobby.
- `skills/` stays the shared default; a company's playbook amendments are
  stored in its own folder and only change its own teams.
- One shared set of agents; every work order names its company and the MCP
  server opens that company's database.
- Order: record D8 (supersedes D7), registry plus lobby, move legro into its
  own folder, per-company routes and passcodes, per-company playbooks, MCP
  server company routing.
- Out of scope: public internet hosting (needs accounts, HTTPS, hosting).
