import Link from "next/link";
import type { Metadata } from "next";
import { attempt, listReceiptAgents, listReceipts, type Receipt } from "@/lib/db";
import { day } from "@/lib/format";
import { teamLabel } from "@/lib/teams";
import { Broken } from "@/components/Broken";

export const metadata: Metadata = { title: "Receipts · Aloft" };

export default async function Ledger(props: PageProps<"/ledger">) {
  const { agent } = await props.searchParams;
  const filter = typeof agent === "string" ? agent : undefined;
  const state = await attempt(() => Promise.all([listReceipts({ agent: filter, limit: 500 }), listReceiptAgents()]));
  if (!state.ok) return <Broken reason={state.reason} />;
  const [receipts, agents] = state.value;

  const days: { label: string; items: Receipt[] }[] = [];
  for (const r of receipts) {
    const label = day(r.created_at);
    if (days.at(-1)?.label !== label) days.push({ label, items: [] });
    days.at(-1)!.items.push(r);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="display">
            Receipts <span className="accent">— every step, on the record.</span>
          </h1>
          <p>
            Every step a team, the Reviewer or you took, in order. Receipts are never edited or removed.
          </p>
        </div>
        <nav className="filters" aria-label="Filter by who acted">
          <Link href="/ledger" aria-current={!filter ? "page" : undefined}>
            Everyone
          </Link>
          {agents.map((a) => (
            <Link key={a.agent} href={`/ledger?agent=${a.agent}`} aria-current={filter === a.agent ? "page" : undefined}>
              {teamLabel(a.agent)} <span className="mono">{a.count}</span>
            </Link>
          ))}
        </nav>
      </div>

      {days.length === 0 && (
        <p className="empty">
          {filter ? `${teamLabel(filter)} has no receipts.` : "No receipts yet. The first brief you send writes one."}
        </p>
      )}

      {days.map((d) => (
        <section key={d.label} className="ledger-day" aria-label={d.label}>
          <h2>{d.label}</h2>
          <ol className="ledger">
            {d.items.map((r) => (
              <li key={r.id}>
                <time className="muted" dateTime={new Date(r.created_at).toISOString()}>
                  {new Date(r.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </time>
                <span style={{ fontWeight: 600 }}>{teamLabel(r.agent)}</span>
                <span>{r.skill}</span>
                <span>
                  {r.work_order_id ? <Link href={`/work-orders/${r.work_order_id}`}>{r.work_order_id}</Link> : ""}
                </span>
                <span className="serif" style={{ fontSize: 15 }}>
                  {r.step}
                </span>
                <span style={{ fontWeight: r.verdict === "fail" ? 700 : 400 }}>
                  {r.verdict === "fail" ? "bounced" : (r.verdict ?? "")}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}
