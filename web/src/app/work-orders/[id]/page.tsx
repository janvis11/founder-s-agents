import Link from "next/link";
import { notFound } from "next/navigation";
import { attempt, getWorkOrder, listDraftsFor, listReceipts, listWorkOrders } from "@/lib/db";
import { age, stamp } from "@/lib/format";
import { rubricChecks } from "@/lib/rubric";
import { INSTANCE_PLAYBOOKS, TIER_MEANING, teamLabel } from "@/lib/teams";
import { holder } from "@/lib/workOrders";
import { Broken } from "@/components/Broken";
import { Bounces } from "@/components/Bounces";
import { DraftContent } from "@/components/DraftContent";
import { Dispute } from "@/components/Dispute";
import { Wire } from "@/components/Wire";

export async function generateMetadata(props: PageProps<"/work-orders/[id]">) {
  const { id } = await props.params;
  return { title: `${id} · Founders Corps` };
}

function playbookSlug(team: string, skill: string) {
  return INSTANCE_PLAYBOOKS[team]?.find((p) => p.endsWith(`/${skill}`) || p === skill) ?? `${team}/${skill}`;
}

export default async function WorkOrderPage(props: PageProps<"/work-orders/[id]">) {
  const { id } = await props.params;
  const state = await attempt(async () => {
    const wo = await getWorkOrder(id);
    if (!wo) return null;
    const [drafts, receipts, all] = await Promise.all([
      listDraftsFor(id),
      listReceipts({ workOrderId: id, limit: 100 }),
      listWorkOrders(),
    ]);
    return { wo, drafts, receipts, all };
  });
  if (!state.ok) return <Broken reason={state.reason} />;
  if (!state.value) notFound();
  const { wo, drafts, receipts, all } = state.value;
  const checks = await rubricChecks();
  const bounces = drafts.filter((d) => d.verdict === "fail");
  const latest = drafts.at(-1);
  const current = latest && latest.verdict !== "fail" ? latest : null;
  const h = holder(wo, all);

  return (
    <div className="desk">
      <div className="stack">
        {current?.contradiction && !current.contradiction_resolved_at && <Dispute draft={current} />}

        <article className="sheet" data-tier={wo.tier === "auto" ? undefined : wo.tier}>
          <div className="sheet-head">
            <span className="mono" style={{ fontWeight: 600 }}>
              Work order {wo.id}
            </span>
            <span className="mono muted" style={{ fontSize: 12 }}>
              issued {stamp(wo.created_at)} · {age(wo.created_at)} ago
            </span>
          </div>
          <div className="sheet-body">
            <h1 className="display" style={{ fontSize: "clamp(24px, 3vw, 34px)", margin: "0 0 18px" }}>
              {wo.summary ?? wo.skill}
            </h1>
            <div className="fields">
              <div className="field">
                <span className="label">Team</span>
                <span className="field-value">{teamLabel(wo.team)}</span>
              </div>
              <div className="field">
                <span className="label">Playbook</span>
                <Link className="field-value mono" href={`/playbooks/${playbookSlug(wo.team, wo.skill)}`}>
                  {wo.skill}
                </Link>
              </div>
              <div className="field">
                <span className="label">Tier</span>
                <span className="field-value">
                  <span className="mono">{wo.tier}</span> — {TIER_MEANING[wo.tier]}
                </span>
              </div>
              <div className="field">
                <span className="label">With</span>
                <span className="field-value" style={{ fontWeight: h.onYou ? 700 : 400 }}>
                  {h.text}
                </span>
              </div>
              {wo.brief_id && (
                <div className="field">
                  <span className="label">From brief</span>
                  <span className="field-value mono">{wo.brief_id}</span>
                </div>
              )}
              {wo.depends_on.length > 0 && (
                <div className="field">
                  <span className="label">Waits on</span>
                  <span className="field-value">
                    {wo.depends_on.map((d, i) => (
                      <span key={d}>
                        {i > 0 && ", "}
                        <Link className="mono" href={`/work-orders/${d}`}>
                          {d}
                        </Link>
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>

            <h2 className="section-title" style={{ marginTop: 24 }}>
              Done when
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {wo.acceptance_criteria.map((c) => (
                <li key={c} style={{ padding: "6px 0 6px 22px", borderBottom: "1px solid var(--rule)", position: "relative" }}>
                  <span aria-hidden style={{ position: "absolute", left: 0, top: 11, width: 11, height: 11, border: "1.5px solid var(--ink)" }} />
                  {c}
                </li>
              ))}
            </ul>

            {Object.keys(wo.inputs).length > 0 && (
              <>
                <h2 className="section-title" style={{ marginTop: 24 }}>
                  Inputs
                </h2>
                <pre className="mono" style={{ whiteSpace: "pre-wrap", fontSize: 12.5, margin: 0 }}>
                  {JSON.stringify(wo.inputs, null, 2)}
                </pre>
              </>
            )}
          </div>
        </article>

        <section aria-labelledby="attempts">
          <h2 className="section-title" id="attempts">
            Drafts <span className="count">{drafts.length}</span>
          </h2>
          {drafts.length === 0 && (
            <p className="empty">{teamLabel(wo.team)} has not returned a draft yet.</p>
          )}
          <Bounces bounces={bounces} checks={checks} />
          {current && (
            <article className="sheet" data-tier={current.tier === "auto" ? undefined : current.tier}>
              <div className="sheet-head">
                <div>
                  <div className="draft-meta">
                    <span>Attempt {current.retry_count + 1}</span>
                    <span>Reviewer: {current.verdict ?? "not reviewed yet"}</span>
                    {current.founder_decision && <span>{current.founder_decision === "approved" ? "Approved by you" : "Declined by you"}</span>}
                  </div>
                  <h3 className="draft-title">{current.summary ?? "Current draft"}</h3>
                </div>
                {current.tier === "approve" && current.verdict === "pass" && !current.founder_decision && (
                  <Link href="/approvals" className="btn">
                    Review in approvals
                  </Link>
                )}
              </div>
              <div className="sheet-body">
                <DraftContent content={current.content} />
              </div>
            </article>
          )}
        </section>
      </div>

      <aside className="wire" aria-labelledby="wo-receipts">
        <h2 className="section-title" id="wo-receipts">
          Receipts for {wo.id}
        </h2>
        {receipts.length ? <Wire receipts={receipts} /> : <p className="empty">No receipts yet.</p>}
      </aside>
    </div>
  );
}
