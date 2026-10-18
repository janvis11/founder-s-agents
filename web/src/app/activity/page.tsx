import Link from "next/link";
import type { Metadata } from "next";
import { attempt, listActivity, listBriefs, listWorkOrders, type Activity } from "@/lib/db";
import { stamp } from "@/lib/format";
import { teamLabel } from "@/lib/teams";
import { holder, isOpen } from "@/lib/workOrders";
import { Broken } from "@/components/Broken";
import { LiveBar, elapsed } from "@/components/LiveBar";
import { StopBrief, StopWorkOrder } from "@/components/StopControls";
import { ZONE_COLOR, type ZoneKey } from "@/components/office/zones";

export const metadata: Metadata = { title: "Activity · Aloft" };

const BRIEF_STATE: Record<string, string> = {
  sent: "Waiting for the Orchestrator",
  working: "Teams working",
  answered: "Answered",
  broken: "Broken",
  stopped: "Stopped by you",
};

const STEP_STATE: Record<Activity["status"], string> = {
  running: "working",
  done: "done",
  failed: "problem",
  stopped: "stopped",
};

export default async function ActivityPage() {
  const state = await attempt(() => Promise.all([listBriefs(15), listWorkOrders(), listActivity(600)]));
  if (!state.ok) return <Broken reason={state.reason} />;
  const [briefs, orders, steps] = state.value;
  const working = briefs.some((b) => b.status === "sent" || b.status === "working");

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="display">
            Activity <span className="accent">what every agent did, step by step.</span>
          </h1>
          <p>
            Each brief, newest first: the Orchestrator&apos;s plan, every draft and review, how long each took, and what
            went wrong with the model, in plain words. Stop a brief or one work order at any point.
          </p>
        </div>
      </div>

      <LiveBar alsoActive={working} />

      {briefs.length === 0 && <p className="empty">No briefs yet. Send one from the Office.</p>}

      <div className="stack" style={{ marginTop: 24 }}>
        {briefs.map((brief) => {
          const own = orders.filter((o) => o.brief_id === brief.id).sort((a, b) => a.id.localeCompare(b.id));
          const timeline = steps.filter((s) => s.brief_id === brief.id).reverse();
          const open = brief.status === "sent" || brief.status === "working";
          return (
            <article key={brief.id} className="sheet" aria-labelledby={`brief-${brief.id}`}>
              <div className="sheet-head">
                <div>
                  <div className="draft-meta">
                    <span className="mono">Brief {brief.id}</span>
                    <span>{stamp(brief.created_at)}</span>
                    <span className="act-state" data-state={brief.status}>
                      {BRIEF_STATE[brief.status] ?? brief.status}
                    </span>
                  </div>
                  <h2 className="draft-title" id={`brief-${brief.id}`}>
                    “{brief.body.length > 220 ? `${brief.body.slice(0, 220)}…` : brief.body}”
                  </h2>
                </div>
                {open && <StopBrief briefId={brief.id} />}
              </div>
              <div className="sheet-body">
                {brief.response && (
                  <div className="act-answer">
                    <span className="label">{brief.status === "answered" ? "Orchestrator's answer" : "Orchestrator's plan"}</span>
                    <p>{brief.response}</p>
                  </div>
                )}
                {brief.error && <p className="broken">Broken: {brief.error}</p>}

                {own.length > 0 && (
                  <ul className="act-orders">
                    {own.map((o) => (
                      <li key={o.id}>
                        <span className="live-dot" style={{ background: ZONE_COLOR[o.team as ZoneKey] }} />
                        <Link className="mono" href={`/work-orders/${o.id}`}>
                          {o.id}
                        </Link>
                        <span>{teamLabel(o.team)}</span>
                        <span className="act-order-sum">{o.summary ?? o.skill}</span>
                        <span className="muted">{holder(o, orders).text}</span>
                        {isOpen(o) && o.status !== "escalated" && <StopWorkOrder workOrderId={o.id} />}
                      </li>
                    ))}
                  </ul>
                )}

                {timeline.length > 0 ? (
                  <ol className="act-steps">
                    {timeline.map((s) => (
                      <li key={s.id} data-state={s.status}>
                        <span className="mono muted act-time">{stamp(s.started_at)}</span>
                        <span className="live-dot" style={{ background: ZONE_COLOR[s.agent as ZoneKey] ?? "var(--auto)" }} />
                        <div>
                          <div>
                            {s.action}{" "}
                            <span className="act-state" data-state={s.status}>
                              {STEP_STATE[s.status]}
                            </span>
                            <span className="mono muted">
                              {" "}
                              · {elapsed(s.started_at, s.finished_at ?? new Date())}
                              {s.model ? ` · ${s.model}` : ""}
                            </span>
                          </div>
                          {s.detail && <div className="act-detail">{s.detail}</div>}
                          {s.draft_id && (
                            <Link href={`/drafts/${s.draft_id}`} className="act-link">
                              Read the draft →
                            </Link>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>
                    {brief.status === "sent" ? "Not picked up yet. Is the runner on?" : "No steps recorded for this brief."}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
