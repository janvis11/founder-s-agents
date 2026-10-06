import Link from "next/link";
import type { Metadata } from "next";
import { attempt, listBouncesByWorkOrder, listLatestDrafts, type Draft } from "@/lib/db";
import { age, stamp } from "@/lib/format";
import { rubricChecks } from "@/lib/rubric";
import { teamLabel } from "@/lib/teams";
import { Broken } from "@/components/Broken";
import { Bounces } from "@/components/Bounces";
import { DraftContent } from "@/components/DraftContent";
import { ApproveActions, HeldActions } from "@/components/forms";

export const metadata: Metadata = { title: "Approvals · Founders Corps" };

export default async function Approvals() {
  const state = await attempt(() => Promise.all([listLatestDrafts(), listBouncesByWorkOrder()]));
  if (!state.ok) return <Broken reason={state.reason} />;
  const [drafts, bounces] = state.value;
  const checks = await rubricChecks();

  const byNewest = (a: Draft, b: Draft) => +new Date(b.created_at) - +new Date(a.created_at);
  const waiting = drafts.filter((d) => d.tier === "approve" && d.verdict === "pass" && !d.founder_decision).sort(byNewest);
  const held = drafts.filter((d) => d.tier === "blocked" && !d.decided_at).sort(byNewest);
  const filed = drafts.filter((d) => d.tier === "auto" && d.verdict === "pass").sort(byNewest);
  const decided = drafts.filter((d) => d.founder_decision || (d.tier === "blocked" && d.decided_at)).sort(byNewest);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="display">
            Approvals <span className="accent">— your signature, or nothing leaves.</span>
          </h1>
          <p>
            Drafts that passed review. Canary copies need your signature before they leave. Pink copies are held: no team
            can do what they describe, and neither can this screen.
          </p>
        </div>
      </div>

      <div className="approvals">
        <section aria-labelledby="waiting">
          <h2 className="section-title" id="waiting">
            Waiting on you <span className="count">{waiting.length}</span>
          </h2>
          {waiting.length === 0 && (
            <div className="empty">
              <p>No drafts waiting. Anything the outside world would see arrives here after the Reviewer passes it.</p>
              <Link href="/" className="btn btn-quiet">
                Dispatch work from the desk
              </Link>
            </div>
          )}
          <div className="stack">
            {waiting.map((d) => (
              <article key={d.id} className="sheet lands" data-tier="approve" aria-labelledby={`draft-${d.id}`}>
                <div className="sheet-head">
                  <div>
                    <div className="draft-meta">
                      <span>{teamLabel(d.team)}</span>
                      <span>{d.skill}</span>
                      <Link href={`/work-orders/${d.work_order_id}`}>{d.work_order_id}</Link>
                      <span>waiting {age(d.created_at)}</span>
                    </div>
                    <h3 className="draft-title" id={`draft-${d.id}`}>
                      {d.summary ?? `${teamLabel(d.team)} draft`}
                    </h3>
                  </div>
                  <span className="mono" style={{ fontSize: 12 }}>
                    Reviewer: pass{d.retry_count ? ` on attempt ${d.retry_count + 1}` : ""}
                  </span>
                </div>
                <div className="sheet-body">
                  <Bounces bounces={bounces[d.work_order_id] ?? []} checks={checks} showText={false} />
                  <DraftContent content={d.content} />
                </div>
                <ApproveActions draftId={d.id} team={teamLabel(d.team)} />
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="held" id="held">
          <h2 className="section-title" id="held-title">
            Held for you <span className="count">{held.length}</span>
          </h2>
          {held.length === 0 && (
            <div className="empty">
              <p>
                Nothing held. Money, contracts, filings, production deploys and hiring land here as recommendations, never
                as actions.
              </p>
            </div>
          )}
          <div className="stack">
            {held.map((d) => (
              <article key={d.id} className="sheet" data-tier="blocked" aria-labelledby={`held-${d.id}`}>
                <div className="sheet-head" style={{ borderBottomColor: "#9e213966" }}>
                  <div>
                    <div className="held-banner">Held — only you can do this, outside this system</div>
                    <div className="draft-meta" style={{ marginTop: 4 }}>
                      <span>{teamLabel(d.team)}</span>
                      <span>{d.skill}</span>
                      <Link href={`/work-orders/${d.work_order_id}`}>{d.work_order_id}</Link>
                      <span>{stamp(d.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="sheet-body">
                  <h3 className="draft-title" id={`held-${d.id}`} style={{ marginBottom: 12 }}>
                    {typeof d.content.blocked_action === "string" ? d.content.blocked_action : d.summary}
                  </h3>
                  <DraftContent content={d.content} />
                </div>
                {typeof d.content.rule === "string" && (
                  <div className="held-rule">
                    <span className="label">Rule that holds it</span>
                    <div>{d.content.rule}</div>
                  </div>
                )}
                <HeldActions draftId={d.id} />
              </article>
            ))}
          </div>
        </section>
      </div>

      <section aria-labelledby="filed" style={{ marginTop: 48 }}>
        <h2 className="section-title" id="filed">
          Filed without approval <span className="count">{filed.length}</span>
        </h2>
        <p className="muted" style={{ margin: "-6px 0 12px", fontSize: 14 }}>
          Internal analysis and research, tier auto. Passed review and went straight into the record.
        </p>
        {filed.length ? (
          <ul className="filed-list">
            {filed.map((d) => (
              <li key={d.id}>
                <Link className="mono" href={`/work-orders/${d.work_order_id}`}>
                  {d.work_order_id}
                </Link>
                <span>{teamLabel(d.team)}</span>
                <span className="serif" style={{ fontSize: 16 }}>
                  {d.summary ?? d.skill}
                </span>
                <span className="mono muted" style={{ fontSize: 12 }}>
                  {stamp(d.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">Nothing filed yet.</p>
        )}
      </section>

      {decided.length > 0 && (
        <section aria-labelledby="decided" style={{ marginTop: 40 }}>
          <h2 className="section-title" id="decided">
            Decided <span className="count">{decided.length}</span>
          </h2>
          <ul className="filed-list">
            {decided.map((d) => (
              <li key={d.id}>
                <Link className="mono" href={`/work-orders/${d.work_order_id}`}>
                  {d.work_order_id}
                </Link>
                <span>
                  {d.founder_decision === "approved"
                    ? "Approved"
                    : d.founder_decision === "declined"
                      ? "Declined"
                      : "Handled by you"}
                </span>
                <span className="serif" style={{ fontSize: 16 }}>
                  {d.summary ?? d.skill}
                  {d.decision_note && d.founder_decision === "declined" && (
                    <span className="muted" style={{ display: "block", fontSize: 14 }}>
                      Your note: {d.decision_note}
                    </span>
                  )}
                </span>
                <span className="mono muted" style={{ fontSize: 12 }}>
                  {d.decided_at ? stamp(d.decided_at) : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
