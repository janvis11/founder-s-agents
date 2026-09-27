# Founder Agents — architecture

A self-hosted platform that gives a solo founder four working teams, run as
separate Hermes agent instances. The founder owns the infrastructure and the
skills. Nothing is a black box.

## Teams

| Instance | Role | Owns |
|---|---|---|
| Orchestrator | The only agent the founder talks to. Plans, routes, never does specialist work. | `company_brain`, work order queue |
| Growth | Sales and marketing as one team. | ICP, positioning, outreach, content |
| Technical | Product and engineering. | Scope, architecture notes, bug triage |
| Finance | Money. | Runway, burn, pricing, unit economics |
| Design | Product design for the founder's own product — software interface or physical object — plus brand and visual identity. | Design direction, design critique, brand/visual identity system |

Five Hermes processes. Separate instances, not one agent with many skills —
skill folders stay coherent, and one team can be restarted or upgraded without
touching the others.

## Flow

```
Founder message
  → Orchestrator reads company_brain + current state
  → Orchestrator produces WorkOrders (team, skill, inputs, acceptance criteria)
  → Team specialist executes its SKILL.md procedure
  → Specialist returns a typed Draft
  → Reviewer applies review_rubric + business_rules
      fail → bounce back with required_fixes (max 2 retries)
      pass → surface to founder for approval
  → Founder approves → action executes → receipt logged
  → company_brain updated → next decision reads the new state
```

The Reviewer is a checklist, not a second opinion. It has no tools and no
discretion. It only checks whether the Draft satisfies stated rules.

## company_brain

One document, owned by the Orchestrator, read by every specialist before it
acts. This is what keeps three teams from contradicting each other.

```yaml
company:
  name: string
  one_liner: string
  stage: idea | building | launched | revenue
product:
  what_it_does: string
  current_state: string
  live_url: string | null
icp:
  who: string
  evidence: string          # why we believe this, not a guess
positioning:
  differentiation: string
  messaging: string
constraints:
  runway_months: number
  monthly_burn: number
  founder_hours_per_week: number
decisions:
  - decision: string
    reasoning: string       # required — the why, not just the what
    date: date
    revisit_if: string      # the condition that would reopen this
priorities:
  - string                  # max 3, ordered
```

`decisions[].reasoning` and `revisit_if` are mandatory. Recording what was
decided without why is how a founder relitigates the same argument in month six.

## Approval tiers

Every WorkOrder carries a tier. The tier decides what happens after review.

- **auto** — internal research, analysis, drafts saved to state. No approval.
- **approve** — anything the outside world sees. Outreach, published content,
  customer-facing copy. Batched for founder approval.
- **blocked** — money movement, contract signature, legal filing, production
  deploy, anything hiring-related. Agent may draft and recommend. Agent may
  never execute. Routes to the founder with no approve button.

The blocked tier is not a setting. It is enforced in `business_rules` and
checked by the Reviewer on every single Draft.

## Stack

- Hermes Agent — five instances, gateway API enabled, one port each
- Next.js — founder dashboard: brief input, approval inbox, skill browser
- Postgres or Supabase — `company_brain`, `work_orders`, `drafts`, `receipts`,
  `agent_run_logs`
- `scripts/sync-skills` — copies `skills/` into each Hermes home on boot

## Eval harness

`evals/` holds fixture companies with planted problems. Each fixture states the
issues a competent team should catch. Score detection rate and false-positive
rate per team. Run before every skills change.

This is the part most agent projects skip. Do not skip it.
