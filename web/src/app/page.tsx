import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { companiesOf, currentAccount } from "@/lib/accounts";
import { getCompany } from "@/lib/companies";
import { buildOffice } from "@/lib/office";
import { Arrival } from "@/components/Arrival";

export const metadata: Metadata = { title: "Founders Corps" };

// Signed out: the front desk. Signed in: only this founder's own companies.
// Nothing about any other founder's company is ever read here (D9).
export default async function Home() {
  await connection();
  const account = await currentAccount();
  if (!account) {
    const { zones, disputes, flows, runwayMonths, companyName } = buildOffice([], [], [], [], null, "");
    return <Arrival office={{ zones, disputes, flows, runwayMonths, companyName }} />;
  }

  const mine = (await Promise.all((await companiesOf(account.id)).map(getCompany))).filter(
    (c): c is NonNullable<typeof c> => Boolean(c),
  );

  return (
    <div className="lobby">
      <div className="page-head">
        <div>
          <div className="kicker">Founders Corps · {account.name}</div>
          <h1 className="display">
            Your offices <span className="accent">only yours. No one else&rsquo;s exist here.</span>
          </h1>
        </div>
        <Link href="/new" className="btn">
          Open another office →
        </Link>
      </div>

      {mine.length === 0 ? (
        <div className="empty">
          <p>You have no office yet. Open one: it gets its own teams, its own data and its own receipts.</p>
          <Link href="/new" className="btn">
            Open an office →
          </Link>
        </div>
      ) : (
        <ul className="lobby-list">
          {mine.map((c) => (
            <li key={c.slug}>
              <a href={`/c/${c.slug}`} className="sheet lobby-card">
                <span className="lobby-mark" aria-hidden>
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="lobby-name">{c.name}</span>
                <span className="mono muted lobby-meta">
                  since {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="lobby-enter">Walk in →</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="muted" style={{ marginTop: 28, fontSize: 14 }}>
        Had an office before accounts existed? <Link href="/claim">Claim it with its old passcode</Link>.
      </p>
    </div>
  );
}
