---
name: ui_direction
description: Design direction for the founder dashboard. Use before writing any component, page, or style. Produces a deliberate token system and a signature element rather than a templated agent dashboard.
---

# UI direction

Approach this as the design lead at a small studio known for interfaces that
could not be mistaken for anyone else's work. The brief has already rejected
templated proposals. Make opinionated choices specific to *this* product, and
take one real aesthetic risk you can defend.

Never start with a component library's defaults and decorate outward. Start
with the subject.

## The subject

A founder sits at a desk. Three teams work on their company. Work is
dispatched, executed, checked against rules, and either approved or bounced
back. Every action leaves a receipt.

That is not a chat app and it is not a SaaS analytics dashboard. It is closer
to a **dispatch desk**, a **newsroom wire**, a **shipping manifest**, a
**court docket**. Work arrives, gets routed, gets stamped, gets filed.

The vocabulary of this world is already in the product: work order, dispatch,
receipt, review, verdict, playbook, ledger, bounce, escalation, tier. Design
from that vernacular. A work order should feel like a document that exists,
not a card in a grid.

Audience: technical solo founders who chose self-hosting on purpose. They
read logs. They will open the skill files. Do not condescend with a friendly
consumer wrapper — respect for their attention *is* the tone.

## Defaults to refuse

AI-built agent dashboards in 2026 cluster hard. If your design lands on any of
these, you defaulted rather than chose:

- Indigo or violet gradient sidebar, white content area, three stat cards
  across the top
- Sparkle, wand, or star iconography to signify "AI"
- A chat panel pinned right, main content left
- Untouched shadcn defaults: same radius, same border, same muted grays
- Inter for everything
- Near-black background with one acid-green or vermilion accent
- Cream background (#F4F1EA range) with a high-contrast serif and a terracotta
  accent near #D97757 — reads as a tell
- Agents rendered as avatar circles with names and little status dots
- Pulsing "thinking" animations as ambient decoration

Any of these is defensible if the brief demands it. This brief does not.

## Process

Two passes. Plan first, build second. Do not write code during the plan.

### Pass 1 — the plan

Produce a compact token system:

**Color.** 4–6 named hex values. Name them for what they mean in this product,
not for their hue: `dispatch`, `held`, `cleared`, `bounced`, `blocked`. The
approval tiers (`auto`, `approve`, `blocked`) are the one place color must
carry real meaning — a founder should read tier from across the room. Do not
spend color anywhere else.

**Type.** Faces for three roles:
- Display — used with restraint, carries the personality
- Body — comfortable at length, this is a reading interface
- Utility — monospace or a technical face for receipts, IDs, timestamps,
  skill filenames

The utility face matters more than usual here. Half this interface is
machine-generated record. Let it look like record.

**Layout.** One-sentence description plus an ASCII wireframe for each of the
three core screens. Compare at least two structural options before choosing.

**Signature.** The one element this interface is remembered by. It should
embody something true about the product. Candidates worth exploring — do not
just take the first:
- The work order as a physical docket that gets visibly stamped
- A live wire of receipts, everything the teams did, scrolling as record
- The bounce: a rejected draft returning with its failures marked on it
- The playbook reader that makes editing a skill feel like amending a rulebook

### Pass 2 — critique the plan

Before any code: work through the same brief as if you were producing a
generic answer. If you arrive somewhere close to your plan, the plan is a
default. Revise it and state what changed and why.

Then build, deriving every value from the revised plan.

## The three screens

**Dispatch** — the founder's input and what is currently in flight. Where work
originates. This is the home screen; treat it as the thesis.

**Approvals** — drafts waiting on the founder, grouped by tier. `blocked`
items are read-only and must look categorically different, not just a
different badge color — the founder can never act on them here, and the
interface should make that obvious before they try.

**Playbook** — the skill browser and editor. This is the differentiator. It
gets the most design attention, not a settings tab. A founder reading
`outreach_draft/SKILL.md` should feel they are reading their company's own
manual, and editing it should feel consequential.

## Hard rules

- No design work begins before the token plan exists and has been critiqued.
- Color encodes approval tier and nothing else. Everything else earns its
  place through type, space, and structure.
- Structural devices must encode something true. Numbered markers only where
  order carries information. No decorative eyebrows, no dividers for rhythm.
- Motion serves comprehension: a bounce returning, a verdict landing, a
  receipt filing. No ambient animation. No pulsing to signal activity.
- Spend boldness once. The signature element is the memorable thing;
  everything around it stays quiet. Then remove one accessory.
- Quality floor, unannounced: responsive to mobile, visible keyboard focus,
  `prefers-reduced-motion` respected, contrast checked.
- Contradictions between teams get their own visual treatment. They are the
  most important thing this product surfaces and must never render as a
  generic warning banner.
- Screenshot and critique your own work as you build. Do not ship the first
  pass.
