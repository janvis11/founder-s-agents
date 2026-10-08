import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { revokeKeycardAction } from "@/app/actions";
import { currentAccount, listKeycards } from "@/lib/accounts";
import { stamp } from "@/lib/format";
import { IssueKeycard } from "@/components/keycard/IssueKeycard";

export const metadata: Metadata = { title: "Your keycards · Aloft" };

export default async function Keycards() {
  const account = await currentAccount();
  if (!account) redirect("/");
  const cards = await listKeycards(account.id);

  return (
    <div className="lobby">
      <div className="page-head">
        <div>
          <div className="kicker">
            <Link href="/">Your offices</Link> · keycards
          </div>
          <h1 className="display">
            Your keycards <span className="accent">a file plus a PIN opens your offices.</span>
          </h1>
          <p>
            Sign in on another browser without typing your email or password: drop the keycard file on the front door and
            type its PIN. Five wrong PINs switch a card off. Switch one off yourself any time.
          </p>
        </div>
      </div>

      <IssueKeycard />

      <h2 className="section-title" style={{ marginTop: 36 }}>
        Issued <span className="count">{cards.length}</span>
      </h2>
      {cards.length === 0 ? (
        <p className="empty">No keycards yet. Issue one above.</p>
      ) : (
        <ul className="filed-list">
          {cards.map((c) => (
            <li key={c.id}>
              <span className="mono">…{c.id.slice(-4)}</span>
              <span>{c.revoked_at ? "Switched off" : "Active"}</span>
              <span className="muted" style={{ fontSize: 14 }}>
                issued {stamp(c.created_at)}
                {c.last_used_at ? ` · last used ${stamp(c.last_used_at)}` : " · never used"}
              </span>
              {c.revoked_at ? (
                <span />
              ) : (
                <form action={revokeKeycardAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="link-btn">
                    Switch off
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
