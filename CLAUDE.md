# Aloft (repo: founder-agents)

Read this first in every session. It is the memory of this project: what
exists, how to run it, how Janvi wants work done, and what is pending.

Keep it current with every change, and update in place: rewrite the line or
section that the change affects so it states the new truth. Never add a new
point below an outdated one or leave superseded statements behind. This
file, `instructions/PROGRESS.md`, `web/CLAUDE.md` and `db/CLAUDE.md` must
always agree with each other and with the code.

## What it is

Everything a founder needs in one place (D10): four teams (Growth,
Technical, Finance, Design), each a Hermes agent, sharing one company, plus an Orchestrator the founder briefs and a
Reviewer that checks every draft against fixed rules. The dashboard (`web/`)
shows the office as an isometric miniature with a room per team. Product
name in the UI: **Aloft**, tagline **Founders Corps**. One install serves many founders (D8,
D9): each founder has an account (email and password) and sees only their
own companies; every other company is invisible. Each company has its own
database.

Product intent, architecture and rules live in `instructions/`
(PRODUCT, AGENTS, ROADMAP, DECISIONS, GLOSSARY, EVALS, SKILL_AUTHORING) and
`instructions/CLAUDE.md` (working conventions for the agents and skills).

## Map

| Path | What |
|---|---|
| `skills/` | Team playbooks (`SKILL.md`), synced into each Hermes profile |
| `meta/` | Design guidance for the dashboard itself (not synced) |
| `instructions/` | Product docs, decision log, roadmap, `PROGRESS.md` |
| `db/schema.sql` | The whole database schema, idempotent. See `db/CLAUDE.md` |
| `web/` | Next.js 16 dashboard. See `web/CLAUDE.md` |
| `harness/runner.py` | The loop: brief, plan, team drafts, review, answer; activity, stop, pause |
| `harness/store.py` | Opens a company's database, brain updates, receipts |
| `harness/fake_model.py` | Scripted stand-in model for testing the loop for free |
| `harness/mcp_server.py` | MCP tools over a named company, for using an agent by hand |
| `scripts/` | `configure_instances.py` (model, tools, profiles), `sync_skills.py`, `start_agents.py`, `check_model.py` |
| `evals/` | Practice companies with planted problems; `run.py` scores every team. See `instructions/EVALS.md` |
| `cli.py` | Send a raw message to the Orchestrator gateway (bypasses the runner) |

## Run it

```
cd web
npm run dev
```

Starts the dashboard on http://127.0.0.1:3000 (use 127.0.0.1, not
localhost, on this Windows machine). It opens every company's database
(`web/.data/companies/<slug>/postgres`) and serves each on its own port for
the agents (listed in `web/.data/companies.json`; the first company, legro,
is on 5434). Docker is not needed; Docker Desktop does not work on Janvi's
machine right now.

Then, in a second terminal, the agents and the runner:

```
python scripts/configure_instances.py
python scripts/start_agents.py --company cxgo5c7magqm
```

The model key lives in `.env` (`NVIDIA_API_KEY`, free tier). The gateway
ports 8642 to 8647 are not web pages (404 in a browser is normal).

## How Janvi wants work done

- Do not commit or push until Janvi says so. Leave work uncommitted and
  report it as ready. When she asks: one small logical commit at a time,
  straight to `main`, then push. No pull requests, no side branches.
- Never add a Claude / co-author line to any commit.
- No em dashes in README, docs or commit messages.
- README stays short and all lowercase: only what the project is.
- When she asks to commit ("commit something" means commit what is ready
  now), do not wait on long checks. `npx tsc --noEmit` takes minutes here; run it
  in the background.
- Keep changes small when asked for "something small".
- Explain plans in simple terms before big changes; she validates first.
- Keep these notes current by editing them in place (see top of file).
- Before each commit, check `git status` shows nothing else staged:
  earlier `git mv` / `git rm` stay staged and get swept into the next
  commit otherwise.

## Status (update every session)

`instructions/PROGRESS.md` holds the current state by area. Short version:

- Dashboard: built (sign in "arrive at the building", sign up "build your
  office" with the founder's charter, your offices, open another office,
  claim an office from before accounts, office at `/office`, approvals,
  work orders, playbooks with amendments, receipts, company brain, company
  essentials, backup export).
- Database: one per company, served on its own port; the runner and the
  MCP server find each company in `web/.data/companies.json`.
- Live data: company **legro** (from before accounts, unclaimed: claim it
  at `/claim` with its name and old passcode); company **acel** created
  through sign up on 2026-10-07, not by Claude. Test accounts
  `founder-a@test.local` and `founder-b@test.local` with their two "Acme"
  companies are still in the data; remove them on the next server restart
  (see PROGRESS.md).
- Agents: six Hermes profiles (the Reviewer is the sixth) on the NVIDIA
  free tier, moved by `harness/runner.py`. The loop works end to end; stop,
  pause, the live bar, Activity and draft pages are built but not yet run.
  Janvi starts the agents herself: give her the commands, do not run them.
- Evals (ROADMAP phase 2): `evals/run.py` and three practice companies are
  built and checked offline; the first real baseline is not run yet.
- Direction (D10, 2026-10-07): all four teams stay and deepen one at a
  time; lead on one company shared by every team, then trust, then
  editable playbooks; two doors, hosted and self-hosted. Build order in
  `instructions/ROADMAP.md`; no new dashboard surface until the loop
  behind it works.

## Pending decisions

- Developer observability (traces, evals) agreed for later; Arize Phoenix
  or an `/ops` page still to choose (PROGRESS.md, next steps). D10 approved
  on 2026-10-07. Still to do for many companies: per-company playbook
  edits.
