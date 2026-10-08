# Roadmap

Build in this order. Each phase is independently demonstrable. Do not start a
phase before the one above it works.

All four teams stay in the product (D10). The order decides which team gets
deep first, never which team exists. The most common way this project fails
is four teams that are all shallow and none reliable; the answer is depth one
team at a time, not fewer teams.

Already built ahead of this order: the dashboard (office, approvals, work
orders, playbooks with amendments, receipts, company brain, backup) and
founder accounts with one database per company (D8, D9). From here on, no
new dashboard surface until the loop behind it works.

---

## Phase 1: Live loop, all four teams at a basic level

- Any model key: Anthropic API, OpenRouter, AWS Bedrock or a local model,
  chosen in `.env`. Bedrock-only is the biggest setup barrier today.
- Orchestrator produces work orders; each of Growth, Technical, Finance and
  Design runs at least one skill end to end; the Reviewer applies
  `review_rubric` and can fail a draft, which comes back once with
  `required_fixes`.
- Each brief names its company, and `harness/mcp_server.py` opens that
  company's database (ports in `web/.data/companies.json`).
- Cheap model for routing and review, strong model for team work. Cost per
  work order logged from the first run.

**Done when:** a brief to each team produces a reviewed draft, you can watch
a bad draft get rejected and come back fixed, and the cost of each run is in
the receipts.

---

## Phase 2: Eval harness

- Fixture companies in `evals/` with planted problems for every team, and a
  stated answer key (see EVALS.md).
- A runner that scores detection rate, false-positive rate, evidence
  compliance and refusal correctness per skill.
- Baseline numbers recorded in the README.

**Done when:** changing a skill produces a measurable delta you can quote.

---

## Phase 3: Onboarding that ingests the company

- The founder gives a website, a pitch deck, and connections to Stripe and
  GitHub. The teams fill `company_brain` from them; the founder confirms
  each field.
- Prompts for any field still empty.

**Done when:** a new founder's teams start from real facts, not a blank
brain, without the founder typing the brain by hand.

---

## Phase 4: Connectors, so approved work executes

One team per cycle, each cycle adding skills, connectors and evals for that
team. Order: Finance (Stripe, bank CSV, accounting), Growth (email,
LinkedIn, website), Technical (GitHub, issue tracker), Design (Figma, image
generation).

- MCP connectors. Every connector with side effects defaults to `blocked`
  and is downgraded to `approve` only with a written reason.
- After approval the action runs and a receipt is logged.
- Playbooks importable from the Claude Skills format.

**Done when:** an approved draft from every team leads to a real action and
a receipt, with no copy and paste by the founder.

---

## Phase 5: Cross-team coordination

The reason this is one office and not four tools.

- Every specialist reads `company_brain` before acting.
- Contradiction detection: a team whose output conflicts with a recorded
  decision or another team's position attaches a `contradiction` block.
  Orchestrator surfaces contradictions above deliverables, unresolved.
- Daily briefing: the few things that need the founder, batched.
- Weekly "what your office did" report built from receipts.
- Flagship workflows run as one plan: fundraise prep first, then launch,
  then the weekly founder briefing.
- Earned trust: a playbook whose drafts are approved unedited many times may
  be offered `auto` for internal work. Blocked never moves.

**Done when:** fundraise prep runs across all four teams from one brief, and
a constructed Finance versus Growth disagreement reaches the founder as two
positions rather than a blended compromise.

---

## Phase 6: Two doors

- **Self-hosted:** one command, any model key. Every minute of setup
  friction spends the advantage.
- **Hosted:** sign up and go. Needs what D9 lists for the public internet
  (HTTPS, email verification, edge rate limiting, a security review), a
  database setup that scales past one embedded PGlite per company inside the
  dashboard process, and clear data-processing terms.
- One price for the whole office.
- README: architecture diagram, 30-second demo, eval numbers, honest
  limitations section.

**Done when:** a founder who has never seen the repo can run a week of work
through either door without touching a terminal.

---

## Explicitly deferred

Not now, possibly never. Listed so they stop coming up.

- HR or hiring team
- Growth prediction from usage data
- Voice interface
- A public marketplace of playbooks
