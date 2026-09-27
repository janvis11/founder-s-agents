# Decisions

Append-only. Every entry states the reasoning and the condition that would
reopen it. A decision without a `revisit_if` is not recorded.

---

## D1 — Three teams, not four. No HR.

**Decision.** Growth, Technical, Finance. No HR team.

**Reasoning.** HR's core function is hiring, which is on the blocked list —
an agent may never take hiring action. A team whose entire output is blocked
is not a team, it is a document generator. Cutting it removes a whole
instance and its review surface.

**Revisit if.** The product moves upmarket to companies with existing
headcount, where HR work is policy and onboarding rather than hiring.

---

## D2 — Separate Hermes instances per team, not one agent with many skills.

**Decision.** Four processes: Orchestrator, Growth, Technical, Finance.

**Reasoning.** A single skill folder spanning finance and marketing becomes
incoherent — the model loses the thread of which frame it is in. Separate
instances keep each folder tight and let one team be restarted or upgraded
independently.

**Revisit if.** Running four instances proves too heavy for the target
self-hosting setup. Measure before changing.

---

## D3 — No growth prediction.

**Decision.** The product diagnoses current state and projects scenarios with
stated formulas. It does not forecast growth from usage data.

**Reasoning.** Early-stage companies have thin, noisy data. A model prompted
to predict from it produces confident nonsense, and the failure is invisible
to the founder — the worst kind. Deterministic arithmetic with visible inputs
is defensible; prediction is not.

**Revisit if.** A customer accumulates 18+ months of clean data and asks for
it explicitly, with the limitation stated in the interface.

---

## D4 — The Reviewer is a checklist, not a second model opinion.

**Decision.** The Reviewer has no tools, no research ability, and no
discretion. It checks stated rules and returns a verdict.

**Reasoning.** A reviewing model that forms opinions produces disagreement
without ground truth, and its failures are unpredictable. A checklist fails
predictably and can be evaluated. Reliability comes from determinism at the
gate, not from more intelligence.

**Revisit if.** Never for the hard-rule checks. A separate advisory critic
could be added alongside, but it does not gate.

---

## D5 — Self-hosting and editable skills are the differentiator.

**Decision.** Lead on data sovereignty and readable playbooks. Do not compete
on onboarding polish or voice UX.

**Reasoning.** The category has funded incumbents with better consumer design
and distribution. Competing there loses. Self-hosting and an inspectable,
editable, portable playbook are things a closed SaaS structurally cannot
offer, and they matter specifically to technical founders and anyone with
sensitive data.

**Revisit if.** An incumbent ships genuine self-hosting with editable
playbooks. Then the differentiator is gone and the product needs a new one.

---

## D6 — Add a fourth team: Design. Supersedes D1's team count, not its reasoning.

**Decision.** Four teams, not three: Growth, Technical, Finance, Design.
Design covers product design for the founder's own product — software
interface or physical object — plus brand and visual identity. A fifth
Hermes process, its own `skills/design/` folder, its own `review_rubric`
section.

**Reasoning.** D1 rejected a fourth team on the specific grounds that HR's
entire output is blocked-tier hiring action, making it a document generator
rather than a team. That reasoning does not apply to design: design
direction and critique are `auto`-or-`approve` tier work like every other
team's output, never blocked. A founder building a product needs a design
point of view as much as a technical or financial one, and folding it into
Technical conflates two different kinds of judgment — Technical scopes and
builds, Design directs how something looks, works, or is experienced. Kept
separate, the same way pricing splits into Finance computing the number and
Growth communicating it.

**Revisit if.** In practice most work orders routed to Design turn out to
need no more than a paragraph a founder could get from Technical or Growth
directly — i.e., the discipline does not carry enough distinct judgment to
justify its own instance and skill folder.
