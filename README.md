# Founder Agents

A self-hosted platform that gives a solo founder four working teams, each
running as its own Hermes agent instance.

- **Growth** — sales and marketing
- **Technical** — product and engineering
- **Finance** — runway, burn, unit economics
- **Design** — product design (software interface or physical product) and
  brand identity

The founder talks to one Orchestrator. It routes work, keeps the teams in
sync, and surfaces what needs a human decision.

> Your AI team, running on your infrastructure, with a playbook you can read
> and edit. Your company's knowledge stays yours.

## Read in this order

| File | What it covers |
|---|---|
| `PRODUCT.md` | What this is, who for, positioning, honest risks |
| `AGENTS.md` | Team topology, work order flow, `company_brain`, approval tiers |
| `CLAUDE.md` | Working conventions and non-negotiables |
| `ROADMAP.md` | Six build phases, in order |
| `docs/GLOSSARY.md` | Shared vocabulary — read before writing any skill |
| `docs/DECISIONS.md` | What was decided and why |
| `docs/EVALS.md` | How agent quality is measured |
| `docs/SKILL_AUTHORING.md` | How to write a skill file |

## Skills

Skills are the product. The code is the harness around them.

```
skills/
  business_rules/       global constraints, injected into every work order
  review_rubric/        the Reviewer's checklist
  orchestrator/
    planning/           routing and work order creation
  growth/
    outreach_draft/     one message, one real signal, never sent
    positioning_check/  tests positioning against evidence
  technical/
    scope_mvp/          subtraction, in founder-hours
  finance/
    runway_tracker/     burn and runway with visible arithmetic
  design/
    product_design_direction/   design direction and critique for the
                                 founder's own product
    brand_identity/     visual and verbal identity system

meta/                   build-time guidance for this repo, not synced to
                         any Hermes instance
  dashboard_design/
    ui_direction/       design direction for founder-agents' own dashboard
    interface_copy/     every word in founder-agents' own UI
```

## Dashboard

`web/` is the founder dashboard (Next.js): the desk, approvals, playbooks
(read and amend), receipts, and the company brain. Design rationale is in
`web/DESIGN.md`.

Look at it without Docker, on an embedded Postgres loaded with a demo
company (`db/seed_demo.sql`):

```
cd web
npm install
npm run demo
```

Then open http://127.0.0.1:3000. Delete `web/.pglite-demo` to reset the demo.

Against the real database (what the Hermes instances write to):

```
docker compose up -d
docker exec -i founder-agents-postgres psql -U founder_agents -d founder_agents < db/schema.sql
cd web && npm run dev
```

## Status

Specification. No implementation yet. Start at `ROADMAP.md` phase 0.
