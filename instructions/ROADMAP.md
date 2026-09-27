# Roadmap

Build in this order. Each phase is independently demonstrable. Do not start a
phase before the one above it works.

The most common way this project fails is building four teams at once and
having none of them reliable. Resist it.

---

## Phase 0 — Harness

Nothing intelligent yet. Just the loop.

- One Hermes instance running, gateway API enabled.
- Postgres with `company_brain`, `work_orders`, `drafts`, `agent_run_logs`.
- `scripts/sync-skills` copies `skills/` into Hermes home on boot.
- A CLI that sends a message and prints the response.

**Done when:** a message goes in, a skill runs, a receipt lands in the log.

---

## Phase 1 — One team, end to end

Growth only. Orchestrator plus one specialist plus the Reviewer.

- `orchestrator/planning` produces a work order.
- `growth/icp_definition` executes it.
- Reviewer applies `review_rubric` and can fail a draft.
- Failed draft bounces back once with `required_fixes`.

**Done when:** you can watch a bad draft get rejected and come back fixed.
This is the whole product in miniature. Everything after is repetition.

---

## Phase 2 — Eval harness

Before adding teams. Not after.

- Three fixture companies in `evals/`, each with 8–10 planted problems and a
  stated answer key.
- A runner that scores detection rate and false-positive rate per skill.
- Baseline numbers recorded in the README.

**Done when:** changing a skill produces a measurable delta you can quote.

---

## Phase 3 — Remaining teams

Technical, then Finance, then Design. One at a time, each with its own Hermes
instance, skill folder, and `review_rubric` section. Re-run evals after each.

**Done when:** all four teams pass their fixtures at a rate you would defend.

---

## Phase 4 — Cross-team coordination

The interesting part, and the reason this is not three tools in a trenchcoat.

- Every specialist reads `company_brain` before acting.
- Contradiction detection: a team whose output conflicts with a recorded
  decision or another team's position attaches a `contradiction` block.
- Orchestrator surfaces contradictions above deliverables, unresolved.

**Done when:** you can construct a scenario where Finance and Growth disagree
and the founder sees both positions rather than a blended compromise.

---

## Phase 5 — Dashboard

Next.js. Not before now — a UI over an unreliable agent loop is decoration.

- Brief input, company_brain editor.
- Approval inbox grouped by tier. Blocked items show as read-only with the
  reason.
- Skill browser: the founder reads and edits `SKILL.md` files in the UI. This
  is the differentiator. Give it real space, not a settings tab.
- Receipt timeline: which agent, which skill, what it produced, verdict.

**Done when:** a founder who has never seen the repo can run a week of work
through it without touching a terminal.

---

## Phase 6 — Packaging

- One-command setup. Self-hosting is the pitch and the barrier; every minute
  of setup friction spends the advantage.
- README: architecture diagram, 30-second demo, eval numbers, honest
  limitations section.

---

## Explicitly deferred

Not now, possibly never. Listed so they stop coming up.

- HR or hiring team
- Growth prediction from usage data
- Voice interface
- Marketplace or multi-tenant hosting
- Additional teams beyond the three
