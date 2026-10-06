import type { Metadata } from "next";
import { attempt, getCompanyBrain } from "@/lib/db";
import { stamp } from "@/lib/format";
import { Broken } from "@/components/Broken";
import { BrainForm, DecisionForm } from "@/components/forms";

export const metadata: Metadata = { title: "Company brain · Founders Corps" };

export default async function Brain() {
  const state = await attempt(getCompanyBrain);
  if (!state.ok) return <Broken reason={state.reason} />;
  const brain = state.value?.data ?? {};
  const decisions = [...(brain.decisions ?? [])].reverse();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="display">
            Company brain <span className="accent">— what every team reads first.</span>
          </h1>
          <p>
            The one document every team reads before it acts. If a field a work order needs is empty, the Orchestrator asks
            you instead of letting a team guess.
          </p>
        </div>
        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
          {state.value && (
            <span className="mono muted" style={{ fontSize: 12.5 }}>
              updated {stamp(state.value.updated_at)}
            </span>
          )}
          <a href="/export" className="btn btn-quiet" download>
            Download a backup
          </a>
        </div>
      </div>

      <div className="brain">
        <section className="sheet sheet-body" aria-label="Company brain fields">
          <BrainForm brain={brain} />
        </section>

        <section aria-labelledby="decisions-title">
          <h2 className="section-title" id="decisions-title">
            Decisions <span className="count">{decisions.length}</span>
          </h2>
          <p className="muted" style={{ margin: "-6px 0 10px", fontSize: 14 }}>
            Append-only. Each one keeps its reasoning and the condition that would reopen it.
          </p>
          <div className="sheet sheet-body" style={{ marginBottom: 24 }}>
            <h3 className="section-title" style={{ fontSize: 16 }}>
              Record a decision
            </h3>
            <DecisionForm />
          </div>
          {decisions.length === 0 ? (
            <p className="empty">No decisions recorded.</p>
          ) : (
            <ol className="decisions" style={{ borderTop: "2px solid var(--ink)" }}>
              {decisions.map((d, i) => (
                <li key={`${d.date}-${i}`}>
                  <div className="mono muted" style={{ fontSize: 12 }}>
                    {d.date}
                  </div>
                  <div className="decision">{d.decision}</div>
                  <dl>
                    <dt>Why</dt>
                    <dd>{d.reasoning}</dd>
                    <dt>Revisit if</dt>
                    <dd>{d.revisit_if}</dd>
                  </dl>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
