import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { listCompanies } from "@/lib/companies";
import { readLock } from "@/lib/lock";

export const metadata: Metadata = { title: "Founders Corps" };

// The lobby: every company on this install. Shows names only; everything
// inside a company sits behind that company's passcode.
export default async function Lobby() {
  await connection();
  const companies = await listCompanies();
  const locked = await Promise.all(companies.map(async (c) => Boolean(await readLock(c.slug))));

  return (
    <div className="lobby">
      <div className="page-head">
        <div>
          <div className="kicker">Founders Corps · lobby</div>
          <h1 className="display">
            Choose an office <span className="accent">each company has its own teams, data and passcode.</span>
          </h1>
        </div>
        <Link href="/new" className="btn">
          Create a new company →
        </Link>
      </div>

      {companies.length === 0 ? (
        <div className="empty">
          <p>No companies yet. Create the first one: it gets its own office, its own database and its own passcode.</p>
          <Link href="/new" className="btn">
            Create a company →
          </Link>
        </div>
      ) : (
        <ul className="lobby-list">
          {companies.map((c, i) => (
            <li key={c.slug}>
              <Link href={`/enter/${c.slug}`} className="sheet lobby-card">
                <span className="lobby-mark" aria-hidden>
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="lobby-name">{c.name}</span>
                <span className="mono muted lobby-meta">
                  {locked[i] ? "passcode set" : "no passcode yet"} · since{" "}
                  {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="lobby-enter">Enter →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
