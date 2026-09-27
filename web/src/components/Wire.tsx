import Link from "next/link";
import type { Receipt } from "@/lib/db";
import { stamp } from "@/lib/format";
import { teamLabel } from "@/lib/teams";

/** The wire: every receipt, newest first, as plain record. */
export function Wire({ receipts }: { receipts: Receipt[] }) {
  return (
    <ol>
      {receipts.map((r) => (
        <li key={r.id}>
          <time dateTime={new Date(r.created_at).toISOString()}>{stamp(r.created_at)}</time>
          <span>
            <span className="who" data-agent={r.agent}>{teamLabel(r.agent)}</span> {r.skill}
            {r.work_order_id && (
              <>
                {" "}
                <Link href={`/work-orders/${r.work_order_id}`}>{r.work_order_id}</Link>
              </>
            )}
            <br />
            <span className={r.verdict ? `verdict-${r.verdict}` : undefined}>{r.step}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
