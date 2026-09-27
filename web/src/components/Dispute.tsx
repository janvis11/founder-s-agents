import Link from "next/link";
import type { Draft } from "@/lib/db";
import { age } from "@/lib/format";
import { teamLabel } from "@/lib/teams";
import { ResolveForm } from "./forms";
import { ZONE_COLOR, type ZoneKey } from "./office/zones";

/**
 * A contradiction: both positions in their own terms, side by side at equal
 * weight, with what each depends on. No recommendation, no "however".
 */
export function Dispute({ draft }: { draft: Draft }) {
  const c = draft.contradiction!;
  const ours = teamLabel(draft.team);
  const theirs = teamLabel(c.with) || c.with;
  const heading = `${ours} and ${theirs} disagree${c.about ? ` on ${c.about}` : ""}`;

  return (
    <section className="dispute lands" aria-labelledby={`dispute-${draft.id}`}>
      <div className="dispute-kicker">CONTRADICTION · UNRESOLVED · YOUR CALL</div>
      <h2 className="display" id={`dispute-${draft.id}`}>
        {heading}
      </h2>
      <div className="dispute-meta">
        Raised by {ours} in{" "}
        <Link href={`/work-orders/${draft.work_order_id}`}>{draft.work_order_id}</Link> · {draft.skill} ·{" "}
        {age(draft.created_at)} ago · unresolved until you decide
      </div>
      <div className="dispute-sides">
        <div className="dispute-side" style={{ ["--side" as string]: ZONE_COLOR[c.with as ZoneKey] }}>
          <h3>{theirs}&rsquo;s position</h3>
          <p className="position">{c.their_position}</p>
          {c.their_depends_on && (
            <div className="depends">
              <span className="label">Depends on</span>
              <div>{c.their_depends_on}</div>
            </div>
          )}
        </div>
        <div className="dispute-side" style={{ ["--side" as string]: ZONE_COLOR[draft.team as ZoneKey] }}>
          <h3>{ours}&rsquo;s position</h3>
          <p className="position">{c.our_position}</p>
          {c.our_depends_on && (
            <div className="depends">
              <span className="label">Depends on</span>
              <div>{c.our_depends_on}</div>
            </div>
          )}
        </div>
      </div>
      <div className="dispute-why">
        <span className="label">Why {ours} raised it</span>
        <div>{c.why_it_matters}</div>
      </div>
      <details>
        <summary className="btn btn-quiet">Record your decision</summary>
        <ResolveForm draftId={draft.id} />
      </details>
    </section>
  );
}
