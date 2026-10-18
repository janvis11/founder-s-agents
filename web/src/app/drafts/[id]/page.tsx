import Link from "next/link";
import { notFound } from "next/navigation";
import { attempt, getDraft, getWorkOrder, listDraftsFor } from "@/lib/db";
import { age, stamp } from "@/lib/format";
import { rubricChecks } from "@/lib/rubric";
import { INSTANCE_PLAYBOOKS, TIER_MEANING, teamLabel } from "@/lib/teams";
import { isOpen } from "@/lib/workOrders";
import { Broken } from "@/components/Broken";
import { Bounces } from "@/components/Bounces";
import { DraftContent } from "@/components/DraftContent";
import { Dispute } from "@/components/Dispute";
import { ApproveActions, HeldActions } from "@/components/forms";
import { StopWorkOrder } from "@/components/StopControls";

export async function generateMetadata(props: PageProps<"/drafts/[id]">) {
  const { id } = await props.params;
  return { title: `Draft ${id} · Aloft` };
}

function playbookSlug(team: string, skill: string) {
  return INSTANCE_PLAYBOOKS[team]?.find((p) => p.endsWith(`/${skill}`) || p === skill) ?? `${team}/${skill}`;
}

export default async function DraftPage(props: PageProps<"/drafts/[id]">) {
  const { id } = await props.params;
  const draftId = Number(id);
  if (!Number.isInteger(draftId)) notFound();
  const state = await attempt(async () => {
    const draft = await getDraft(draftId);
    if (!draft) return null;
    const [wo, attempts] = await Promise.all([getWorkOrder(draft.work_order_id), listDraftsFor(draft.work_order_id)]);
    return { draft, wo, attempts };
  });
  if (!state.ok) return <Broken reason={state.reason} />;
  if (!state.value) notFound();
  const { draft, wo, attempts } = state.value;
  const checks = await rubricChecks();
  const latest = attempts.at(-1);
  const isLatest = latest?.id === draft.id;
  const number = attempts.findIndex((d) => d.id === draft.id) + 1;

  const verdict =
    draft.verdict === "pass" ? "Passed review" : draft.verdict === "fail" ? "Failed review" : "Not reviewed yet";
  const decision =
    draft.founder_decision === "approved"
      ? "Approved by you"
      : draft.founder_decision === "declined"
        ? "Declined by you"
        : draft.tier === "blocked" && draft.decided_at
          ? "Handled by you"
          : null;
  const awaitingYou = isLatest && draft.tier === "approve" && draft.verdict === "pass" && !draft.founder_decision;
  const held = isLatest && draft.tier === "blocked" && !draft.decided_at;

  return (
    <div className="stack" style={{ maxWidth: 960 }}>
      <div className="draft-meta">
        <Link href="/approvals">← Approvals</Link>
        {wo && <Link href={`/work-orders/${wo.id}`}>Work order {wo.id}</Link>}
        <Link href="/activity">Activity</Link>
      </div>

      {!isLatest && latest && (
        <p className="live-paused">
          This is attempt {number} of {attempts.length}.{" "}
          <Link href={`/drafts/${latest.id}`}>Read the latest attempt →</Link>
        </p>
      )}

      {isLatest && draft.contradiction && !draft.contradiction_resolved_at && <Dispute draft={draft} />}

      <article className="sheet" data-tier={draft.tier === "auto" ? undefined : draft.tier}>
        <div className="sheet-head">
          <div>
            <div className="draft-meta">
              <span>{teamLabel(draft.team)}</span>
              <Link className="mono" href={`/playbooks/${playbookSlug(draft.team, draft.skill)}`}>
                {draft.skill}
              </Link>
              <span>
                Attempt {number} of {attempts.length}
              </span>
              <span>
                {stamp(draft.created_at)} · {age(draft.created_at)} ago
              </span>
            </div>
            <h1 className="display" style={{ fontSize: "clamp(24px, 3vw, 34px)", margin: "6px 0 0" }}>
              {draft.summary ?? `${teamLabel(draft.team)} draft`}
            </h1>
          </div>
          <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
            <span className="act-state" data-state={draft.verdict === "fail" ? "failed" : draft.verdict ? "done" : "running"}>
              {verdict}
            </span>
            {decision && <span className="mono muted">{decision}</span>}
            <span className="mono muted" style={{ fontSize: 12 }}>
              {draft.tier}: {TIER_MEANING[draft.tier]}
            </span>
          </div>
        </div>
        <div className="sheet-body">
          {wo && (
            <p className="muted" style={{ marginTop: 0 }}>
              Answers work order <Link href={`/work-orders/${wo.id}`}>{wo.id}</Link>: {wo.summary ?? wo.skill}
            </p>
          )}
          {draft.verdict === "fail" && <Bounces bounces={[draft]} checks={checks} showText={false} />}
          {draft.founder_decision === "declined" && draft.decision_note && (
            <p className="live-paused">Your note when declining: {draft.decision_note}</p>
          )}
          <DraftContent content={draft.content} />
        </div>
        {held && typeof draft.content.rule === "string" && (
          <div className="held-rule">
            <span className="label">Rule that holds it</span>
            <div>{draft.content.rule}</div>
          </div>
        )}
        {awaitingYou && <ApproveActions draftId={draft.id} team={teamLabel(draft.team)} />}
        {held && <HeldActions draftId={draft.id} />}
      </article>

      {wo && isOpen(wo) && wo.status !== "escalated" && (
        <div className="live-row">
          <span className="muted">
            {teamLabel(wo.team)} is still on this work order ({wo.status.replace("_", " ")}).
          </span>
          <StopWorkOrder workOrderId={wo.id} />
        </div>
      )}

      {attempts.length > 1 && (
        <section aria-labelledby="attempts">
          <h2 className="section-title" id="attempts">
            Every attempt <span className="count">{attempts.length}</span>
          </h2>
          <ol className="act-steps">
            {attempts.map((d, i) => (
              <li key={d.id} data-state={d.verdict === "fail" ? "failed" : "done"}>
                <span className="mono muted act-time">{stamp(d.created_at)}</span>
                <span className="live-dot" />
                <div>
                  {d.id === draft.id ? (
                    <b>Attempt {i + 1} (this one)</b>
                  ) : (
                    <Link href={`/drafts/${d.id}`}>Attempt {i + 1}</Link>
                  )}{" "}
                  <span className="muted">
                    {d.verdict === "pass" ? "passed" : d.verdict === "fail" ? `failed ${d.failed_checks.join(", ")}` : "not reviewed"}
                    {d.founder_decision ? `, ${d.founder_decision} by you` : ""}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
