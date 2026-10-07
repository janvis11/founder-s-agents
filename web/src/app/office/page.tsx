import Link from "next/link";
import {
  attempt,
  getCompanyBrain,
  listAllDrafts,
  listBriefs,
  listLatestDrafts,
  listOpenContradictions,
  listReceipts,
  listWorkOrders,
} from "@/lib/db";
import { buildOffice } from "@/lib/office";
import { stamp } from "@/lib/format";
import { Broken } from "@/components/Broken";
import { Dispute } from "@/components/Dispute";
import { Manifest } from "@/components/Manifest";
import { Wire } from "@/components/Wire";
import { BriefForm } from "@/components/forms";
import { Office } from "@/components/office/Office";

function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function Home() {
  const state = await attempt(() =>
    Promise.all([
      listOpenContradictions(),
      listWorkOrders(),
      listBriefs(4),
      listReceipts({ limit: 30 }),
      listLatestDrafts(),
      listAllDrafts(),
      getCompanyBrain(),
    ]),
  );
  if (!state.ok) return <Broken reason={state.reason} />;
  const [contradictions, orders, briefs, receipts, latest, allDrafts, brain] = state.value;

  const company = brain?.data.company?.name ?? "Your company";
  // A fresh install: no company described yet, so no team has anything to read.
  const unset = !brain?.data.company?.name && !brain?.data.product?.what_it_does;
  const runway = brain?.data.constraints?.runway_months ?? null;
  const office = buildOffice(orders, latest, allDrafts, contradictions, runway, company);
  const { waiting, held } = office.zones.founder;
  const inFlight = office.zones.orchestrator.inFlight;

  return (
    <div className="stack">
      <Office {...office}>
        <div className="hero">
          <div className="kicker">Founders Corps · {unset ? "new office" : company} · {stamp(new Date())}</div>
          <h1 className="display">
            {greeting()}, founder.
            <span className="accent">
              {inFlight ? "Your teams are at their desks." : "The office is quiet. Brief it."}
            </span>
          </h1>
          {unset ? (
            <div className="setup">
              <p>
                Your teams have nothing to read yet. Describe the company first: what it is, what the product does, who
                it is for. Every team reads this before it acts.
              </p>
              <Link href="/setup" className="btn">
                Set up your office →
              </Link>
            </div>
          ) : (
            <p>
              Every room is live. Desks light up when a team is working, drafts travel to your desk, and nothing leaves
              the building without you. Click a room.
            </p>
          )}
        </div>
        <div className="stat-row">
          <Link href="/approvals" className="stat" data-tone={waiting ? "approve" : undefined}>
            <b>{waiting}</b>
            <span>to approve</span>
          </Link>
          <Link href="/approvals#held" className="stat" data-tone={held ? "blocked" : undefined}>
            <b>{held}</b>
            <span>held</span>
          </Link>
          <div className="stat">
            <b>{inFlight}</b>
            <span>in flight</span>
          </div>
          <Link href="/brain" className="stat">
            <b>{runway ?? "—"}</b>
            <span>runway mo</span>
          </Link>
        </div>
      </Office>

      {contradictions.map((d) => (
        <Dispute key={d.id} draft={d} />
      ))}

      <div className="desk">
        <div className="stack">
          <BriefForm />

          {briefs.length > 0 && (
            <section aria-labelledby="dispatch-log">
              <h2 className="section-title" id="dispatch-log">
                Recent briefs
              </h2>
              <ol className="dispatch-log">
                {briefs.map((b) => (
                  <li key={b.id}>
                    <span className="mono muted">{stamp(b.created_at)}</span>
                    <span className="brief-body">“{b.body}”</span>
                    {b.status === "answered" && b.response && <span className="brief-answer">{b.response}</span>}
                    {b.status === "sent" && <span className="brief-answer">Waiting for the Orchestrator.</span>}
                    {b.status === "broken" && <span className="broken">Broken: {b.error}</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-labelledby="work-orders">
            <h2 className="section-title" id="work-orders">
              Work orders <span className="count">{orders.length}</span>
            </h2>
            {orders.length ? (
              <Manifest orders={orders} />
            ) : (
              <div className="empty">
                <p>No work orders yet. The Orchestrator issues them from a brief — one team, one playbook, one tier each.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="wire" aria-labelledby="wire-title">
          <h2 className="section-title" id="wire-title">
            The wire
            <Link href="/ledger" className="count">
              all receipts →
            </Link>
          </h2>
          <div className="wire-box">
            <div className="terminal-bar">
              <span className="terminal-dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className="terminal-title">tail -f agent_run_logs</span>
            </div>
            {receipts.length ? (
              <Wire receipts={receipts} />
            ) : (
              <p className="empty" style={{ margin: 14 }}>
                Every step a team, the Reviewer or you take lands here as a receipt.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
