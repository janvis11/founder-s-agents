# Evals

Built in phase 2 (`evals/`), before deepening any team.

An agent system without an eval harness cannot be improved deliberately: you
change a skill, the output feels different, and you have no idea whether it
got better. This is the difference between a demo and a product.

## Method

Fixture companies with planted problems. Each fixture is a complete
`company_brain` plus datasets, containing a known set of issues a competent
team should catch, and the work orders each team receives. The answer key
lives beside it.

```
evals/
  fixtures/
    burnrate_co/          healthy data, real money problems, a stale brain
      company_brain.json
      expenses.csv        every dataset has a `row` column; drafts cite file:row
      revenue.csv
      work_orders.json    what each team is asked to do
      answer_key.json     the planted problems
    thin_data_co/         six weeks of sparse data: the right answer is mostly to decline
    contradiction_co/     the stated ICP is enterprise, every paying customer is tiny
  run.py                  runs the teams, marks the drafts, updates the table
  baselines.md            the score table (written by run.py)
  history.json            every recorded run's scores (written by run.py)
  results/                full drafts and marks per run (not committed)
```

Every team sits at least one fixture: Finance and Growth all three,
Technical all three, Design two (thin_data_co, contradiction_co).

## Answer key shape

```json
{
  "fixture": "burnrate_co",
  "about": "what this fixture tests",
  "planted": [
    {"id": "f1", "team": "finance", "kind": "flag", "must": true,
     "issue": "Studio Nine is 42.6% of September gross burn, above the 20% single-vendor threshold.",
     "evidence": ["expenses.csv:48"]},
    {"id": "r2", "team": "finance", "kind": "refusal", "must": true,
     "issue": "Declines to name the month MRR reaches $10k: no forecast from six weeks of data."}
  ]
}
```

Kinds: `flag` (raise this problem), `contradiction` (surface both positions,
do not settle it), `refusal` (decline, label provisional, or ask). `must:
false` items are worth catching but do not count against a team that misses
them, and are not counted as made up when raised.

## Running

```
python scripts/start_agents.py --no-runner     the six agents, no company work
python evals/run.py                            every fixture, every team
python evals/run.py --team finance --label "after runway_tracker edit"
python evals/run.py --offline                  scripted fake model, checks the harness only
```

`run.py` builds each team's message with the same code as the runner
(`team_message`, `review_message` in `harness/runner.py`), runs the Reviewer
with up to two retries, and marks the final draft. On the NVIDIA free tier a
full run takes roughly one to two hours; run one team or one fixture while
iterating. Offline runs are never recorded.

## Metrics

- **Caught** (detection rate): must-flag and must-contradiction items met /
  those present.
- **Made up** (false positive rate): problems raised that the data does not
  support / everything raised (planted items met plus extra flags).
- **Evidence** (evidence compliance): `file:row` and `company_brain.<field>`
  references that point at something real / all references. Checked by code,
  not by a model.
- **Knew to stop** (refusal correctness): must-refusal items met / those
  present.

Caught, made up and knew to stop are marked by a grader model that sees the
answer key, the data and the draft (`EVAL_GRADER_MODEL` in `.env`, default
the Orchestrator's model, called directly rather than through Hermes). Its
quote for every item and its notes are kept in `evals/results/`, so a
surprising score can be checked by hand. The grader can be wrong; the answer
keys are written by hand and are the ground truth.

The fourth metric matters most and is the one most systems fail. A team that
catches everything but also makes up three issues is worse than a team that
catches most and stays quiet.

## Discipline

- Run before and after every skill change, with `--label` saying what
  changed. The table shows the change against the last run on the same
  fixtures.
- Never tune a skill against a single fixture. Regressions elsewhere are the
  usual cost.
- When a fixture stops catching regressions, it is spent. Write a new one.
- The baseline table lives in `evals/baselines.md` (the README stays short).
