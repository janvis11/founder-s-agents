import type { Draft } from "@/lib/db";
import { stamp } from "@/lib/format";
import { teamLabel } from "@/lib/teams";
import { DraftContent } from "./DraftContent";

/** Earlier attempts that the Reviewer bounced, with the failed checks marked on them. */
export function Bounces({
  bounces,
  checks,
  showText = true,
}: {
  bounces: Draft[];
  checks: Record<string, string>;
  showText?: boolean;
}) {
  if (!bounces.length) return null;
  return (
    <div>
      {bounces.map((b) => (
        <div className="bounce" key={b.id}>
          <div className="bounce-head">
            Attempt {b.retry_count + 1} bounced by the Reviewer{" "}
            <span className="mono muted" style={{ fontWeight: 400 }}>
              {stamp(b.created_at)}
            </span>
          </div>
          <ul>
            {b.failed_checks.map((id, i) => (
              <li key={id}>
                <span className="check-id" title={checks[id]}>
                  {id}
                </span>
                <span>
                  {b.required_fixes[i] ?? checks[id]}
                  {checks[id] && b.required_fixes[i] && (
                    <span className="muted" style={{ display: "block", fontSize: 13 }}>
                      Rule: {checks[id]}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {showText && <DraftContent content={b.content} struck />}
          <div className="mono muted" style={{ fontSize: 12, marginTop: 6 }}>
            Sent back to {teamLabel(b.team)} with {b.required_fixes.length} required{" "}
            {b.required_fixes.length === 1 ? "fix" : "fixes"}
          </div>
        </div>
      ))}
    </div>
  );
}
