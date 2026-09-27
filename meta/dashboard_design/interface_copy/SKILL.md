---
name: interface_copy
description: Writing standards for every word in the founder dashboard — labels, buttons, empty states, errors, agent-facing summaries. Use whenever adding or changing UI text.
---

# Interface copy

Words in an interface exist to make it easier to use. They are design
material, not decoration. Generic copy makes a design feel templated as fast
as a generic layout does.

## Procedure

1. Before writing, state what this element needs the person to understand or
   do. One sentence. If you cannot, the element may not be needed.

2. Name things by what the founder controls, never by how the system is
   built. They review a draft, not a `draft_object`. They edit a playbook, not
   a `SKILL.md` — though the filename can appear as record.

3. Write the action, not the abstraction. "Send to customers" beats "Submit".
   "Send back to Growth" beats "Reject".

4. Keep the action's name constant through the whole flow. A button that says
   "Approve and send" produces a receipt that says "Approved and sent". Never
   "Success!".

5. Read it back as a sentence a person would say out loud. If it sounds like
   software talking about itself, rewrite.

## The product's voice

Plain, exact, unhurried. This audience reads logs and edits config files.
Precision is the courtesy; enthusiasm is the insult.

- Sentence case everywhere. No title case, no all-caps labels.
- Active voice. Present tense.
- No exclamation marks. No emoji. No "Oops".
- Never call the agents "your AI team" in the interface. They are Growth,
  Technical, and Finance. Named things need no category label.
- Never describe output as "intelligent", "smart", or "powered by AI". The
  founder knows. Saying it reads as insecurity.

## Empty states

An empty screen is an invitation to act, not a mood.

- Say what belongs here and how the first one arrives.
- Give the single next action, as a control.
- No illustrations of empty boxes. No "Nothing here yet!".

Example, approvals: "No drafts waiting. Growth and Finance are idle. Dispatch
work from the desk." — followed by the dispatch control.

## Failures

Errors explain what happened and what fixes it. They do not apologize and
they are never vague.

- Name the thing that failed and why: "Finance could not read burn — no
  expense data for June."
- Give the fix as an action, not a suggestion.
- Distinguish three failure kinds and word them differently:
  - **Bounced** — the Reviewer rejected a draft. Normal, expected, show the
    failed checks by name.
  - **Blocked** — an agent tried something in the blocked tier. Not an error.
    State the rule and that this needs the founder directly.
  - **Broken** — a tool or model failed. Say so plainly. Never dress it up as
    an agent decision.

Never let a system failure read as agent judgment. That distinction is trust.

## Showing agent work

- Attribute every output to its team by name.
- Show the skill that produced it as record, in the utility face.
- Cited numbers link to their source in `company_brain` or the dataset row.
- When an agent declined for missing data, say what was missing. "Insufficient
  data" is not an answer; "no expense rows after 12 June" is.

## Contradictions

The highest-stakes copy in the product. When two teams disagree:

- State both positions in their own terms. Do not summarize them into
  agreement.
- Name what each depends on, so the founder can judge which premise holds.
- Never recommend a resolution. Never use "however" to tilt toward one side.
- The heading names the tension plainly: "Growth and Finance disagree on
  pricing" — not "Attention needed".

## Hard rules

- No word appears twice for the same concept. Pick "draft" or "output" and
  hold it everywhere, including in receipts and logs.
- No filler: "please", "simply", "just", "easily", "seamlessly".
- No feature marketing inside the product. The founder already bought it.
- Every label does exactly one job. A label labels; an example demonstrates;
  nothing does double duty.
