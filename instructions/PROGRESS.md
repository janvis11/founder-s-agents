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
  D1 to D9, GLOSSARY, EVALS, SKILL_AUTHORING, CLAUDE). Dashboard design
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
- Accounts database (D9): `web/.data/install/postgres`, opened in-process
  only, never served on a port. Tables: accounts (email, name, scrypt
  password hash), sessions (stored hashed, revoked on sign out),
  memberships (which account owns which company). Session cookies are
  signed with `web/.data/install/secret.key`.
- Live data:
  - **legro** (finance company, stage launched, product "growing and
    managing ledgers", customer "business"), set up 2026-10-07 before
    accounts, one brief sent (broken: no Orchestrator). Unclaimed: Janvi
    claims it at `/claim` with the name and its old passcode. Runway, burn,
    hours per week, priorities and decisions are still empty. A copy of the
    pre-move layout is in the temp folder (`fc-data-backup-*`).
  - **acel**, created through sign up on 2026-10-07 (not by Claude).
  - Test data to remove on the next restart (stop the server first): the
    accounts `founder-a@test.local` and `founder-b@test.local`, their
    companies `uy7vwjfragpo` and `zsp423u90ef3` ("Acme"), those folders and
    their entries in `web/.data/companies.json`.

## Dashboard (`web/`)

- Pages: `/` is the front desk when signed out ("Who's arriving?", one
  question at a time; the office lights come on) and "Your offices" when
  signed in (only this founder's companies); `/signup` builds the office
  live as the founder answers and ends with the founder's charter (three
  lines, recorded as the company's first receipt); `/new` opens another
  office; `/claim` claims an office from before accounts; `/c/<id>` steps
  into one of your companies; office `/office`, approvals, work order,
  playbooks (read and amend with diff plus required reason, amendment
  register), receipts, company brain (append-only decisions), company
  essentials `/setup`, backup export.
- Isolation (D9): a founder sees only their own companies. Other companies
  are invisible: no shared list, random company ids, and opening a company
  you do not own gives the same result as one that does not exist (tested
  with two founders who both named their company "Acme"). `src/proxy.ts`
  checks the signed session cookie and is the only place the account,
  session and company headers are set; the server then checks the session
  is live and the founder is a member (`currentCompany()` in `sql.ts`).
  Header shows the founder's name, Your offices and Sign out.
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

- D8: many companies per install, one database each. Supersedes D7.
- D9: founder accounts; a founder sees only their own companies. Company
  passcodes retired except to claim an office from before accounts.

## Not committed on purpose

- `web/public/assets/kenney/` (41 MB furniture images) and the unused old
  office scene `web/src/components/IsoScene.tsx`, `web/src/lib/officeLayout.ts`.
- `.claude/` (local preview config).

## Next steps

1. Janvi fills the rest of the company brain.
2. When AWS keys arrive: `python scripts/configure_instances.py`,
   `python scripts/sync_skills.py`, then start each gateway
   (`orchestrator gateway run`, then growth, technical, finance, design).
3. Remove the test accounts and companies (see Database).
4. Code without a live model, in this order: finish many companies
   (per-company playbook edits, MCP server company routing), eval harness
   (ROADMAP phase 2), prompts for empty company brain fields.
5. Code with a live model: the automatic loop (ROADMAP phase 1).

## Many companies and accounts (D8, D9): what is left

Built: accounts, sign in and sign up, your offices, a database per company
served for the agents, isolation between founders, claim for legro.

Still to do:
- Per-company playbook edits: `skills/` stays the shared default; a
  company's amendments are saved in its own folder and only change its own
  teams.
- MCP server company routing: every work order names its company and
  `harness/mcp_server.py` opens that company's database (its port is in
  `web/.data/companies.json`). Today the MCP server only reaches the company
  in `.env` `DATABASE_URL` (legro).
- Possibly later: invite a co-founder's account into a company.
- Out of scope: public internet hosting (needs HTTPS, email verification,
  edge rate limiting and a security review).
