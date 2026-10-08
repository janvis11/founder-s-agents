# Product

## What this is

Everything a founder needs in one place: four working teams, each running as
its own Hermes agent instance, sharing one company.

- **Growth**: sales and marketing
- **Technical**: product and engineering
- **Finance**: runway, burn, unit economics
- **Design**: product design (software interface or physical product) and
  brand identity

The founder talks to one Orchestrator. It routes work, keeps the teams in
sync, and surfaces the things that need a human decision. All four teams
stay in the product (D10). They grow in depth one at a time; none is cut.

## Who it is for

Solo founders and two-person teams who are pre-hire and need every function
covered before they can afford people for it. Technical founders who want to
self-host, and anyone handling data they will not put into a third-party
SaaS, use the self-hosted door.

Not for: large teams with real headcount in these functions. They have humans
and the coordination problem is different.

## The pitch

> Your whole company in one place: four teams that share one memory, one
> decision log and one approval inbox. Every playbook is yours to read and
> edit, and your company's knowledge stays yours.

## Positioning

The category is crowded. CoFounder.AI launched June 2026 with a large
waitlist. Sintra, Marblism, Motion and Lindy sell "AI employees" to small
businesses for $24 to $200 a month. Anthropic, OpenAI and Google shipped
agents with connectors and scheduled tasks in 2026, and Claude Skills use
the same `SKILL.md` format as our playbooks. Being first is not available.
Being different is.

What a single assistant or a bundle of separate helpers cannot do, and what
a customer can actually see and feel:

1. **One company, shared by every team.** Every team reads the same
   `company_brain`, the same decisions (each with its reasoning and
   `revisit_if`) and the same receipts. When Finance and Growth disagree, the
   founder sees both positions instead of a quiet compromise. This is the
   lead differentiator: four tools, or one chat window, cannot do it.

2. **Trust built in.** Nothing reaches the outside world without the
   founder's approval. Money, contracts, legal filings, production deploys
   and hiring are blocked: drafted, never executed. Every action leaves a
   receipt. Numbers show their arithmetic, and teams refuse to make claims
   from thin data. The category churns on trust; we lead on it.

3. **Readable, editable, portable playbooks.** The founder can open
   `outreach_draft/SKILL.md`, see exactly how the Growth team decides, and
   change it. The format is compatible with Claude Skills, so their
   ecosystem feeds ours. Leaving means taking a folder of markdown.

4. **Two doors.** Hosted (sign up and go) or self-hosted (one command, any
   model key, data never leaves the founder's machine). Same product.

### What we do not compete on

Voice UX and consumer-cute design. Onboarding is different: it must be
near-zero-thought, because a team that knows nothing about the company
produces generic work.

## How the limitations are overcome

Each is a known reason this category churns. None is solved by cutting a
team.

- **Drafts, not outcomes.** Every team gets real hands through MCP
  connectors (Growth: email, LinkedIn, website; Technical: GitHub, issue
  tracker; Finance: Stripe, bank CSV, accounting; Design: Figma, image
  generation). After approval the action runs and a receipt is logged.
- **Generic output from thin context.** Onboarding ingests the company: the
  founder gives a website, a pitch deck and connections to Stripe and
  GitHub; the teams fill `company_brain` and the founder confirms it.
- **Review burden.** One daily briefing from the Orchestrator with the few
  things that need the founder, batched. A playbook whose drafts are
  approved unedited many times may be offered `auto` for internal work. The
  blocked tier never moves.
- **Setup friction.** Two doors, and any model key: Anthropic API,
  OpenRouter, AWS Bedrock or a local model.
- **Cost.** A cheap model for routing and review, the strong model only for
  team work; `company_brain` cached; a team's process runs only when it has
  work. One price for the whole office, set against the separate tools a
  founder pays for today.
- **Reliability across four teams.** Every team ships working at a basic
  level; depth comes one team per cycle, each with its own evals (D10).
- **Unverifiable value.** A weekly "what your office did" report built from
  receipts: messages sent, issues filed, runway updated, decisions recorded,
  contradictions caught.
- **Liability.** Finance and legal output is always "for your accountant or
  lawyer, here is what to ask". Outbound content carries an AI disclosure.
  No team drafts reviews or testimonials.

## Flagship workflows

Jobs no single tool can do, because they need several teams on one brain.
The Orchestrator runs each as one plan of single-team work orders.

- **Fundraise prep**: Finance computes runway and metrics, Growth writes the
  narrative, Design makes the deck, and the result is a data room
  checklist. The first one to build: it touches every team and founders
  care about it intensely.
- **Launch**: Technical scopes, Design sets the look, Growth writes the
  launch copy, Finance checks pricing.
- **Weekly founder briefing**: every team reports into one page.

## What this is not

- Not autonomous. Every external-facing action is founder-approved.
- Not a predictor. It diagnoses current state and projects scenarios with
  stated formulas. It does not forecast growth from thin data.
- Not an HR team. Hiring decisions stay human. Explicitly out of scope.
- Not a replacement for a lawyer or an accountant. Drafts and flags only.

## Honest risks

- **Platform overlap.** The labs keep shipping agents, memory and
  connectors. Our ground is the shared company across teams and the trust
  machinery; generic workflows are theirs.
- **Data thinness.** Early startups have noisy, sparse data. Agents that
  analyse it will sometimes pattern-match on nothing. Mitigate by refusing to
  make claims below a stated data threshold, and saying so.
- **Breadth versus depth.** Four teams built by a small team. Mitigated by
  shipping all four at a basic level and deepening one per cycle, with evals.
- **Unit economics.** Several agents per work order cost more than one chat.
  Watch cost per work order from the first live run.

## Success criteria for v1

Not revenue. Not users. One founder uses it for four consecutive weeks, all
four teams do real work in that time, and the `company_brain` at the end
reflects a company the agents actually understand.

If that fails, nothing downstream matters.
