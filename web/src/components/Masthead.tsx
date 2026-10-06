import Link from "next/link";
import { cookies } from "next/headers";
import { lockOffice } from "@/app/actions";
import { attempt, getCompanyBrain, listLatestDrafts, listWorkOrders } from "@/lib/db";
import { SESSION_COOKIE, readLock, sessionValid } from "@/lib/lock";
import { NavLinks } from "./NavLinks";

export async function Masthead() {
  const locked = !(await sessionValid((await cookies()).get(SESSION_COOKIE)?.value));
  if (locked) {
    // Behind the lock, show nothing about the company.
    return (
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden>
            FC
          </span>
          <span>
            <span className="brand-name">Founders Corps</span>
            <span className="brand-sub">locked</span>
          </span>
        </span>
      </header>
    );
  }
  const hasLock = Boolean(await readLock());
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
      <Link href="/" className="brand" aria-label="Founders Corps home">
        <span className="brand-mark" aria-hidden>
          FC
        </span>
        <span>
          <span className="brand-name">Founders Corps</span>
          <span className="brand-sub">{company ? `${company} · self-hosted` : "self-hosted founder HQ"}</span>
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
        {hasLock && (
          <form action={lockOffice}>
            <button type="submit" className="pill lock-btn">
              Lock
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
