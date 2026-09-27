# Writing a skill

Skills are the product. They are read by a model, edited by a founder, and
tested by the eval harness. All three constrain how they are written.

## Shape

Every skill is a directory containing exactly one `SKILL.md`:

```
---
name: skill_name
description: One sentence on what it does and when it runs. This is what the
  Orchestrator matches against, so write it for routing, not for marketing.
---

# Title

One or two lines framing the agent's role in this specific job.

## Procedure

Numbered steps. Concrete. Each step is an action, not a principle.

## Hard rules

Absolute constraints. Never conditional.
```

## Procedure steps

- Number them. Order matters and the model follows it.
- One action per step. If a step contains "and", split it.
- Name the exact field being read: `company_brain.constraints.runway_months`,
  not "the founder's runway".
- Say what to do when the step fails. A step without a failure path is where
  agents start improvising.
- End with the return shape.

## Hard rules

- Absolute only. If it contains "generally", "where possible", or "try to",
  it is a procedure step, not a hard rule. Move it.
- Every hard rule must be checkable by the Reviewer without tools. A rule
  nobody can check is a wish.
- Write the failure, not the aspiration. "Never send" beats "only send when
  approved" — the first is unambiguous at 2am with a confusing work order.
- Include the rule that stops the most likely failure of *this* skill
  specifically. For outreach it is inventing a contact. For finance it is a
  bare number. Know your skill's characteristic failure and name it.

## Register

- Second person, addressed to the agent: "You are the Growth team."
- Present tense, active voice.
- Short sentences. This is read under load.
- No hedging, no politeness, no explanation of why unless the why changes the
  behaviour.

## Before committing

- Does every procedure step have a failure path?
- Is every hard rule checkable without tools?
- Does the description route correctly, and not overlap another skill's?
- Would a founder reading this understand what their team will do?
- Have you run `evals/` and recorded the delta?

## Anti-patterns

- **The essay.** Skills explaining agent theory. Say what to do.
- **The wish list.** Hard rules nobody can check.
- **The overlap.** Two skills whose descriptions both match the same request.
  The Orchestrator will pick wrong. Merge or narrow.
- **The polite hedge.** "Consider whether it might be appropriate to" — the
  model will consider, then do whatever it wanted.
- **The silent failure.** No instruction for missing data, so the agent
  invents some.
