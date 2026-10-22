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
  D1 to D10, GLOSSARY, EVALS, SKILL_AUTHORING, CLAUDE). Dashboard design
  guidance in `meta/`.

## Agents (Hermes)

- Six Hermes profiles on this machine: orchestrator, growth, technical,
  finance, design and reviewer (ports 8642 to 8647, `scripts/_profiles.py`).
  Every profile has memory off and only the tools listed there: teams may
  use web search (no search backend installed yet, so in practice none),
  the Orchestrator and the Reviewer have no tools. No agent gets a terminal,
  files, code execution or the database (`no_mcp`).
- Model: NVIDIA free tier (`NVIDIA_API_KEY` in `.env`), moonshotai/kimi-k3
  for the Orchestrator and teams, z-ai/glm-5.3-flash for the Reviewer.
  `scripts/configure_instances.py` takes any provider (nvidia, gemini,
  openrouter, anthropic, bedrock, or `fake` for testing);
  `scripts/check_model.py` lists what a key reaches. Free-tier calls take
  1 to 4 minutes and sometimes drop; timeouts are 10 to 15 minutes.
- The loop works end to end (ROADMAP phase 1): `harness/runner.py` takes a
  brief, has the Orchestrator plan work orders, runs each team, has the
  Reviewer check every draft (two retries, then escalated), sends declined
  drafts back with the founder's note, and writes the Orchestrator's answer.
  The runner puts the playbook text into every message, so dashboard edits
  to `skills/` apply on the next step. It records every step in `activity`,
  checks for stop and pause every few seconds, and turns Hermes log warnings
  into plain words. Tested on the fake model (`harness/fake_model.py`) on
  the Acme test company, and live on acel with NVIDIA (planning and a
  Finance draft worked; the Reviewer stalled on a dropped NVIDIA
  connection, which led to the live bar and Stop). The stop, pause and live
  bar code has not been run yet.
- Start: `python scripts/configure_instances.py`, then
  `python scripts/start_agents.py --company <slug>` (acel is
  `cxgo5c7magqm`); the dashboard must be running. Logs in `harness/logs/`.

## Evals (ROADMAP phase 2)

- Built, not yet run on a real model: `evals/run.py` with three practice
  companies in `evals/fixtures/` (burnrate_co, thin_data_co,
  contradiction_co), each with a brain, datasets with row ids, the work
  orders every team gets, and an answer key (35 planted items across the
  four teams). The teams work exactly as in the product (same messages and
  playbooks, Reviewer with two retries); a grader model marks the final
  draft; evidence citations are checked by code. Scores go to
  `evals/baselines.md` and `evals/history.json`; full drafts to
  `evals/results/` (not committed). Checked end to end with
  `--offline` (fake model). See `instructions/EVALS.md`.
- First real baseline still to run: `python scripts/start_agents.py
  --no-runner`, then `python evals/run.py --label "first baseline"` (about
  one to two hours on the free tier).

## Database

- One schema file, `db/schema.sql`, idempotent, applied on every start.
- One database per company in `web/.data/companies/<slug>/postgres`,
  listed in `web/.data/companies.json` (names and ports only). The dashboard
  opens every company's database when it starts and serves each on its own
  port (legro on 5434, new companies on the next free port) so the runner
  and the MCP server can reach it. Root `.env` `DATABASE_URL` points at legro.
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
  - **acel** (`cxgo5c7magqm`), created through sign up on 2026-10-07 (not
    by Claude). Janvi's test company for the live loop: two briefs, one
    Finance work order.
  - Test data to remove on the next restart (stop the server first): the
    accounts `founder-a@test.local` and `founder-b@test.local`, their
    companies `uy7vwjfragpo` and `zsp423u90ef3` ("Acme"), those folders and
    their entries in `web/.data/companies.json`. `uy7vwjfragpo` also holds
    the fake-model test runs (briefs 1 to 3).

## Dashboard (`web/`)

- Pages: `/` is the front door when signed out ("Show your key": the
  founder's keycard above a card reader; email and password, or a keycard
  file plus its 6-digit PIN; on success the card slides into the reader,
  "Access granted", office opens) and "Your offices" when signed in (only
  this founder's companies); `/signup` "Get your key printed": the keycard
  fills in live (name, company, founded date, stage) and the founder signs
  the charter with a drawn signature that is printed on the card and kept
  as the company's first receipt; `/key` issues and switches off keycard
  files (5 wrong PINs switch a card off); `/new` opens another
  office; `/claim` claims an office from before accounts; `/c/<id>` steps
  into one of your companies; office `/office`, approvals, work order,
  playbooks (read and amend with diff plus required reason, amendment
  register), receipts, company brain (append-only decisions), company
  essentials `/setup`, backup export, `/activity` (each brief as a timeline
  of steps with durations, errors in plain words, Stop buttons) and
  `/drafts/<id>` (one draft in full with its review, every attempt, and
  Approve, Decline or Stop; Approvals and work orders link to it instead of
  showing drafts inline). Approvals also lists drafts the Reviewer is
  checking now (In review), refreshing itself until they land.
- Live bar (`LiveBar.tsx`) on the office, under the stat tiles, and on
  Activity: runner on or off (heartbeat file), which agents answer on their
  port, what is running now with timer and model, the model's latest trouble,
  Pause office. Sending a brief only saves it; the office refreshes itself
  while work is in flight.
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
- Product name in the UI: **Aloft**, tagline **Founders Corps**. The dashboard starts empty;
  there is no demo data.
- Brand: logo is an isometric office block (ink walls, amber roof),
  `src/components/Logo.tsx`; no blue in the interface chrome (structure is
  ink, `--blue` tokens now hold ink). The office keeps its room colours.
- Home office fits one screen on landscape displays: the card is one
  viewport tall, the drawing scales to fit, greeting and numbers sit beside
  the building.
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
- D10: all four teams stay; everything a founder needs in one place. Depth
  comes one team per cycle, never by cutting a team. Lead differentiator is
  one company shared by every team; trust second; editable playbooks third.
  Two doors: hosted and self-hosted with any model key. Supersedes D5's
  lead differentiator.

## Not committed on purpose

- `web/public/assets/kenney/` (41 MB furniture images) and the unused old
  office scene `web/src/components/IsoScene.tsx`, `web/src/lib/officeLayout.ts`.
- `.claude/` (local preview config).

## Next steps

Follow ROADMAP.md (rewritten for D10). In order:

1. Janvi tests stop, pause, the live bar, Activity and draft pages on acel,
   and fills acel's ICP and messaging so Growth and Design get work.
2. Remove the test accounts and companies (see Database).
3. Developer observability, agreed for later and never visible to founders:
   trace every model call with OpenTelemetry (prompt, answer, model,
   latency, tokens, retries, nested brief > work order > call). Still to
   choose: Arize Phoenix running locally (traces plus evals, no Docker) or
   an `/ops` page in Aloft behind an operator key. Before hosting other
   founders, decide whether traces may hold company data.
4. Run the first eval baseline (see Evals), then improve the weakest
   team's playbook against it. Also: per-company playbook edits, and a free
   web search backend for the teams (ddgs).
5. Then ROADMAP phases 3 to 6: onboarding that ingests the company,
   connectors one team per cycle (Finance first), cross-team coordination
   with fundraise prep as the first flagship workflow, and the two doors.
   No new dashboard surface until the loop behind it works.

## Many companies and accounts (D8, D9): what is left

Built: accounts, sign in and sign up, your offices, a database per company
served for the agents, isolation between founders, claim for legro, and
company routing (the runner and every MCP tool name their company).

Still to do:
- Per-company playbook edits: `skills/` stays the shared default; a
  company's amendments are saved in its own folder and only change its own
  teams.
- Possibly later: invite a co-founder's account into a company.
- Hosted door (D10, ROADMAP phase 6), not started: needs HTTPS, email
  verification, edge rate limiting, a security review, and a database setup
  that scales past one embedded PGlite per company in the dashboard
  process.
