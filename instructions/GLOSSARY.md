# Glossary

One word per concept, used identically in skills, code, database, and UI. If
a term is not here, it does not get invented in a skill file — add it here
first.

## Core

**Orchestrator** — the single agent the founder talks to. Plans and routes.
Never does specialist work.

**Team** — one Hermes instance with its own skill folder and memory. Growth,
Technical, Finance, Design. Never called an "agent" in the interface.

**Specialist** — a team executing a skill against a work order. Internal term;
does not appear in the UI.

**Reviewer** — the deterministic checklist that gates every draft. Has no
tools and forms no opinions.

**Work order** — one unit of dispatched work. One team, one skill, one tier.
Never spans teams.

**Draft** — a specialist's output, before review and before approval. Every
external-facing artifact is a draft until the founder approves it.

**Verdict** — the Reviewer's output: `pass` or `fail`.

**Bounce** — a failed draft returning to its specialist with `required_fixes`.
Normal and expected, not an error.

**Receipt** — the immutable record of an action taken. Written after approval.

**Playbook** — a `SKILL.md` file, as the founder sees it. Say "playbook" in
the UI, "skill" in the codebase.

**company_brain** — the single shared state document every team reads before
acting.

**Contradiction** — two teams, or a team and a recorded decision, holding
incompatible positions. Surfaced to the founder, never auto-resolved.

## Tiers

**auto** — internal work. No approval needed.

**approve** — anything the outside world sees. Founder approves before it
leaves.

**blocked** — money, contracts, filings, deploys, hiring. An agent may draft
and recommend. It may never execute. Not a permission setting; a hard rule.

## Banned words

Do not use these anywhere — skills, code, or UI:

- "AI team", "AI-powered", "intelligent", "smart" — say what it does instead
- "user" — this product has one person and they are the **founder**
- "task" — use **work order**
- "reject" — use **bounce** (Reviewer) or **decline** (founder)
- "output" as a noun for a draft — use **draft**
- "agent" in founder-facing text — use the team's name
