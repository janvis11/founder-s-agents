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

---

## D7: One install per founder. No shared, multi-company hosting. Superseded by D8.

**Decision.** Each founder runs their own copy of Founders Corps, with its
own database and its own `skills/` folder. One install holds exactly one
company: `company_brain` stays a single row. A second founder gets a second
install, not an account on the first one.

**Reasoning.** The product leads on data staying on the founder's machine
and on a playbook the founder can take away as a folder (D5). Hosting many
companies in one install means accounts, logins, a company column on every
table and a filter on every query, and one missed filter leaks one
founder's data to another. That is a large build that spends the
differentiator. ROADMAP already defers multi-tenant hosting.

**Revisit if.** Founders ask to run more than one company themselves, in
which case add a company switcher for a single owner first; or the product
moves to a hosted offering, in which case multi-tenancy needs its own
decision and its own security review.

---

## D8: Many companies per install. Supersedes D7. Lobby and company passcodes superseded by D9.

**Decision.** One install can hold many companies. `/` is a lobby listing
them; each company has its own passcode and its own database folder
(`web/.data/companies/<slug>/`), so companies are physically separate. The
company you entered is remembered in a cookie; pages keep their paths.
`skills/` stays the shared default rulebook. One set of agents serves the
install.

**Reasoning.** Janvi wants the product to serve many organisations, not one
founder per install (D7). A separate database per company keeps D5's
promise in a weaker but still real form: no shared tables, so one company's
screens cannot read another's data, and a company leaves by taking its
folder. Hosting on the public internet is still out of scope.

**Revisit if.** The product is hosted publicly for strangers (then it needs
real accounts, HTTPS and a security review), or the number of companies per
install makes one database server per company too heavy to run.

---

## D9: Founder accounts. A founder sees only their own companies.

**Decision.** Founders sign up and sign in with email and password. Each
company belongs to the account that created it. A signed-in founder sees
only their own companies; nothing about any other company is visible: no
shared lobby, no names, no counts, and an address for a company they do not
own gives the same "nothing here" page as one that does not exist.
Companies get random internal ids, never derived from their names. Company
passcodes are retired; a company from before accounts is claimed once with
its old passcode. Sign in is "Arrive at the building" (the office lights
come on); sign up builds the founder's office live and ends with the
founder's charter, recorded as the company's first receipt.

**Reasoning.** Janvi wants one install to serve many founders, each with
their own dedicated office, and the existence of other companies must stay
invisible (D8 listed every company in a lobby). Passwords are stored only as
salted scrypt hashes; sessions are random tokens checked on the server.
Email and password work offline on a self-hosted machine, unlike sign-in
through an outside provider.

**Revisit if.** The install is put on the public internet (needs HTTPS,
rate limiting at the edge, email verification and a security review), or
founders ask to share a company with a co-founder (add invitations).
