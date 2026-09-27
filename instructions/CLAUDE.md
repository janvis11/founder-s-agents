# CLAUDE.md

Working context for this repository. Read `PRODUCT.md` for why, `AGENTS.md`
for the architecture, this file for how to work here.

## What this repo is

A self-hosted multi-agent platform. Five Hermes instances (Orchestrator,
Growth, Technical, Finance, Design), a Next.js dashboard, Postgres for state,
and a `skills/` folder of markdown playbooks that define how each agent
decides.

The skills are the product. The code is the harness around them.

## Layout

```
AGENTS.md              architecture, company_brain schema, approval tiers
PRODUCT.md             what we are building and why
ROADMAP.md             build order — follow it, do not skip ahead
skills/                agent playbooks, synced into each Hermes home
  business_rules/      global constraints, injected into every work order
  review_rubric/       reviewer checklist
  orchestrator/        planning and routing
  growth/              sales and marketing skills
  technical/           product and engineering skills
  finance/             money skills
  design/              product design and brand identity skills
meta/                  build-time guidance for this repo itself, not synced
  dashboard_design/    design direction for founder-agents' own Next.js UI
web/                   Next.js dashboard
evals/                 fixture companies with planted problems
scripts/               skill sync, health checks
```

## Conventions

**Skills**

- One skill per directory, always named `SKILL.md`.
- Every skill has three parts: frontmatter (`name`, `description`), a
  numbered `## Procedure`, and a `## Hard rules` section.
- Hard rules are absolute. Never write a hard rule with "generally" or
  "where possible" in it. If it is not absolute it belongs in the procedure.
- Skills are prose, not code. If a step needs deterministic logic, that logic
  lives in the harness and the skill calls it.

**Work orders**

- One team per work order. Never span teams.
- Every work order carries a tier: `auto`, `approve`, or `blocked`.
- Every work order has checkable `acceptance_criteria`.

**State**

- `company_brain` is the single source of truth. No team keeps a private copy.
- Every recorded decision needs `reasoning` and `revisit_if`. Reject writes
  that omit them.
- Every agent action writes a receipt to `agent_run_logs`: which agent, which
  skill, which step, inputs, output, verdict.

## Non-negotiables

These are enforced in `skills/business_rules/SKILL.md` and checked by the
Reviewer. Do not weaken them for convenience during development.

- No agent moves money, signs anything, files anything, deploys to
  production, or takes hiring action. Draft and recommend only.
- Nothing external-facing sends without founder approval.
- No invented metrics, names, emails, or quotes. Uncited number → rejected.
- Contradictions between teams surface to the founder. Never auto-resolved.

## When making changes

- Changing a skill? Run `evals/` before and after. Record the delta.
- Adding a team? It needs its own Hermes instance, its own skill folder, and
  its own section in `review_rubric`. Not a folder inside an existing team.
- Adding a tool with side effects? Default it to `blocked` and justify any
  downgrade in the PR description.

## Things not to do

- Do not build an HR team. Out of scope by decision, not by omission.
- Do not add growth prediction or forecasting from usage data. Diagnosis and
  scenario maths only — see `PRODUCT.md`.
- Do not let the Reviewer use tools or form opinions. It is a checklist.
- Do not let the Orchestrator do specialist work, even when it would be
  faster than dispatching.
- Do not add features before the eval harness exists. The harness is what
  makes everything else assessable.
