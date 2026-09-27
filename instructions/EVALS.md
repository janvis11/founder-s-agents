# Evals

Build this in phase 2, before adding teams. Not after.

An agent system without an eval harness cannot be improved deliberately — you
change a skill, the output feels different, and you have no idea whether it
got better. This is the difference between a demo and a product.

## Method

Fixture companies with planted problems. Each fixture is a complete
`company_brain` plus datasets, containing a known set of issues a competent
team should catch. The answer key lives beside it.

```
evals/
  fixtures/
    burnrate_co/
      company_brain.yaml
      expenses.csv
      revenue.csv
      answer_key.yaml
    thin_data_co/
    contradiction_co/
  runner.py
  baselines.md
```

## Answer key shape

```yaml
planted:
  - id: p1
    team: finance
    issue: single vendor is 34% of monthly burn
    must_flag: true
    evidence_row: expenses.csv:47
  - id: p2
    team: growth
    issue: stated ICP is enterprise, all paying customers are solo
    must_flag: true
    evidence_row: customers.csv
  - id: p3
    team: finance
    issue: only six weeks of expense data
    must_flag: true
    expected_behaviour: declares figures provisional, does not project
```

## Metrics

- **Detection rate** — planted issues flagged / planted issues present
- **False positive rate** — flagged issues not in the key / total flags
- **Evidence compliance** — flags citing a real row / total flags
- **Refusal correctness** — on thin-data fixtures, does the team decline to
  project rather than inventing confidence

The fourth metric matters most and is the one most systems fail. A team that
catches everything but also hallucinates three issues is worse than a team
that catches most and stays quiet.

## Required fixtures

- **burnrate_co** — healthy data, several real financial problems
- **thin_data_co** — six weeks of sparse data. Correct behaviour is to
  decline most analysis. A team that produces confident findings here fails,
  regardless of whether they sound plausible.
- **contradiction_co** — Growth's ICP and Finance's paying-customer data
  disagree. Tests whether the contradiction surfaces or gets averaged away.

## Discipline

- Run before and after every skill change. Record the delta in `baselines.md`.
- Never tune a skill against a single fixture. Regressions elsewhere are the
  usual cost.
- When a fixture stops catching regressions, it is spent. Write a new one.
- Baselines go in the README. They are the most credible thing in the repo.
