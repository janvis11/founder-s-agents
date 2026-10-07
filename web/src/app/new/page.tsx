import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentAccount } from "@/lib/accounts";
import { SetupForm } from "@/components/SetupForm";

export const metadata: Metadata = { title: "Open another office · Founders Corps" };

export default async function NewCompany() {
  if (!(await currentAccount())) redirect("/");
  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">
            <Link href="/">Your offices</Link> · new office
          </div>
          <h1 className="display">
            Open another office <span className="accent">its own teams, its own data, its own receipts.</span>
          </h1>
          <p>
            Start with the essentials. Runway, positioning, priorities and decisions can be added later in the company
            brain.
          </p>
        </div>
      </div>
      <SetupForm mode="create" defaults={{}} />
    </>
  );
}
