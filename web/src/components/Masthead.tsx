import Link from "next/link";
import { signOut } from "@/app/actions";
import { currentAccount } from "@/lib/accounts";
import { attempt, getCompanyBrain, listLatestDrafts, listWorkOrders } from "@/lib/db";
import { currentCompany } from "@/lib/sql";
import { NavLinks } from "./NavLinks";

export async function Masthead() {
  const account = await currentAccount();
  const slug = account ? await currentCompany() : null;
  const you = account && (
    <>
      <span className="pill">{account.name}</span>
      <form action={signOut}>
        <button type="submit" className="pill lock-btn">
          Sign out
        </button>
      </form>
    </>
  );
  if (!slug) {
    // Signed out, or signed in but not inside one of your offices.
    return (
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Founders Corps home">
          <span className="brand-mark" aria-hidden>
            FC
          </span>
          <span>
            <span className="brand-name">Founders Corps</span>
            <span className="brand-sub">{account ? "your offices" : "self-hosted founder HQ"}</span>
          </span>
        </Link>
        {you && <div className="topbar-status">{you}</div>}
      </header>
    );
  }

  const state = await attempt(async () => {
    const [brain, drafts, orders] = await Promise.all([getCompanyBrain(), listLatestDrafts(), listWorkOrders()]);
    return {
      name: brain?.data.company?.name ?? null,
      waiting: drafts.filter((d) => d.tier === "approve" && d.verdict === "pass" && !d.founder_decision).length,
      held: drafts.filter((d) => d.tier === "blocked" && !d.decided_at).length,
      inFlight: orders.filter((w) => w.status === "pending" || w.status === "in_progress").length,
    };
  });
  const company = state.ok ? state.value.name : null;

  return (
    <header className="topbar">
      <Link href="/office" className="brand" aria-label="Founders Corps office">
        <span className="brand-mark" aria-hidden>
          FC
        </span>
        <span>
          <span className="brand-name">Founders Corps</span>
          <span className="brand-sub">{company ?? slug}</span>
        </span>
      </Link>
      <NavLinks />
      <div className="topbar-status">
        {state.ok ? (
          <>
            <Link href="/approvals" className="pill" data-tone={state.value.waiting ? "approve" : undefined}>
              <span className="dot" /> {state.value.waiting} to approve
            </Link>
            <Link href="/approvals#held" className="pill" data-tone={state.value.held ? "blocked" : undefined}>
              <span className="dot" /> {state.value.held} held
            </Link>
            <span className="pill" data-tone="auto">
              <span className="dot" /> {state.value.inFlight} in flight
            </span>
          </>
        ) : (
          <span className="pill" data-tone="blocked">
            <span className="dot" /> no database
          </span>
        )}
        <Link href="/" className="pill">
          ← Your offices
        </Link>
        {you}
      </div>
    </header>
  );
}
