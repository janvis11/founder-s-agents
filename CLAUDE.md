# Founders Corps (repo: founder-agents)

Read this first in every session. It is the memory of this project: what
exists, how to run it, how Janvi wants work done, and what is pending.

Keep it current with every change, and update in place: rewrite the line or
section that the change affects so it states the new truth. Never add a new
point below an outdated one or leave superseded statements behind. This
file, `instructions/PROGRESS.md`, `web/CLAUDE.md` and `db/CLAUDE.md` must
always agree with each other and with the code.

## What it is

A self-hosted office for founders: four teams (Growth, Technical, Finance,
Design), each a Hermes agent, plus an Orchestrator the founder briefs and a
Reviewer that checks every draft against fixed rules. The dashboard (`web/`)
shows the office as an isometric miniature with a room per team. Product
name in the UI: **Founders Corps**. One install holds many companies (D8):
`/` is a lobby, each company has its own database and passcode.

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
| `harness/mcp_server.py` | MCP tools the agents use to read/write the database |
| `scripts/` | `configure_instances.py`, `sync_skills.py` for Hermes profiles |
| `cli.py` | Send a message to the Orchestrator from a terminal |

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

## How Janvi wants work done

- Commit one small logical change at a time, straight to `main`, and push.
  No pull requests, no side branches.
- Never add a Claude / co-author line to any commit.
- No em dashes in README, docs or commit messages.
- README stays short and all lowercase: only what the project is.
- Commit when asked ("commit something" means commit what is ready now,
  do not wait on long checks). `npx tsc --noEmit` takes minutes here; run it
  in the background.
- Keep changes small when asked for "something small".
- Explain plans in simple terms before big changes; she validates first.
- Keep these notes current by editing them in place (see top of file).
- Before each commit, check `git status` shows nothing else staged:
  earlier `git mv` / `git rm` stay staged and get swept into the next
  commit otherwise.

## Status (update every session)

`instructions/PROGRESS.md` holds the current state by area. Short version:

- Dashboard: built (lobby, create and enter a company, office at
  `/office`, approvals, work orders, playbooks with amendments, receipts,
  company brain, company essentials, per-company passcode lock, backup
  export).
- Database: one per company, served on its own port; root `.env`
  `DATABASE_URL` points at legro's (5434), so the MCP server serves legro.
- Live data: company **legro** set up by Janvi on 2026-10-07, passcode set,
  one brief sent (status broken because no agent is running). It lives in
  `web/.data/companies/legro/`.
- Agents: NOT running. AWS Bedrock keys are not in `.env` yet; Janvi will
  provide them later. Skip anything that needs a live model until then.

## Pending decisions

- None open. Many companies per install was approved and built (D8). Its
  last two parts are still to do: per-company playbook edits, and the MCP
  server choosing the right company per work order (see PROGRESS.md).
