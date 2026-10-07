# Progress

The record of what has been built, decided and left open. Newest at the
bottom of each section. Update it whenever work lands.

## Before the dashboard (Janvi's own work)

- Playbooks: business_rules, review_rubric, orchestrator/planning,
  growth/outreach_draft, growth/positioning_check, technical/scope_mvp,
  finance/runway_tracker, design/product_design_direction,
  design/brand_identity.
- Product docs in `instructions/`, dashboard design guidance in `meta/`.
- Phase 0 harness pieces: `db/schema.sql`, `docker-compose.yml`,
  `harness/mcp_server.py`, `scripts/configure_instances.py`,
  `scripts/sync_skills.py`, `cli.py`. Five Hermes profiles exist on this
  machine (orchestrator, growth, technical, finance, design) with skills
  synced and the MCP server registered. Never run end to end: no AWS keys.

## Dashboard, 2026-09-27 to 2026-10-07

1. Built the Next.js 16 dashboard in `web/`: office home, approvals,
   work order page, playbook browser with amendments (diff plus required
   reason, kept in a register), receipts ledger, company brain editor with
   append-only decisions, brief box that calls the Orchestrator gateway.
2. Schema additions: Design team allowed, briefs table, draft decisions and
   contradictions, playbook_amendments. Schema stays idempotent.
3. Design went through several rounds at Janvi's request. Final state:
   white theme, a large edge-to-edge isometric office where every object
   has real colour, a room per team with its own colour (Growth orange,
   Technical sky blue, Finance green, Design purple, Orchestrator blue,
   Reviewer slate, founder desk amber). Clicking a room opens a drawer that
   slides in from the right edge (fixed, so it is visible at any scroll).
   Rejected along the way: plain paper look ("boring"), rainbow team colours
   on dark blue, pure black and white, glows.
4. Demo data (fictional "Tallyroom") existed for a while, then was removed:
   the dashboard is the real app now and starts empty.
5. Product name set to **Founders Corps** (header, tab titles, greeting).
6. First-run setup screen at `/setup` (name, one line, what the product
   does, who it is for, stage, office passcode).
7. Decision D7 recorded: one install per founder. (May be superseded, see
   below.)
8. Office passcode lock: scrypt hash in `web/.data/lock.json`, session
   cookie, `src/proxy.ts` guards every page, every server action re-checks,
   header hides company data while locked, Lock button.
9. Backup: `/export` downloads all tables plus playbooks as one JSON file;
   button on the Brain page.
10. Shared database: `npm run dev` serves the local database on port 5434 so
    the dashboard and the agents' MCP server use the same data. Root `.env`
    `DATABASE_URL` updated to it. Verified from Python (psycopg) on
    2026-10-07.
11. Persistent project memory: root `CLAUDE.md`, this file,
    `web/CLAUDE.md`, `db/CLAUDE.md`.

## Not committed on purpose

- `web/public/assets/kenney/` (41 MB furniture images) and the old unused
  office scene `web/src/components/IsoScene.tsx`, `web/src/lib/officeLayout.ts`.
- `.claude/` (local preview config).

## Next steps

1. Janvi fills the rest of the company brain (runway, burn, hours per week,
   priorities, positioning, ICP evidence).
2. When Janvi provides AWS keys: `python scripts/configure_instances.py`,
   `python scripts/sync_skills.py`, then start each gateway
   (`orchestrator gateway run`, and growth, technical, finance, design).
3. Code: the automatic loop (ROADMAP phase 1): Orchestrator issues work
   orders, a team drafts, the Reviewer passes or bounces, founder approves.
   Needs a live model.
4. Eval harness (ROADMAP phase 2): fixtures in `evals/`, runner, baselines.

## Plan awaiting validation: many companies per install

Janvi wants many organisations to use one install. Proposed, not built:

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
