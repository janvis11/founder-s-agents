import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentAccount } from "@/lib/accounts";
import { ClaimForm } from "@/components/ClaimForm";

export const metadata: Metadata = { title: "Claim an office · Founders Corps" };

// Lists nothing: the founder types the name and old passcode of an office set
// up before accounts. Every kind of miss gets the same answer (D9).
export default async function Claim() {
  if (!(await currentAccount())) redirect("/");
  return (
    <div className="unlock-wrap">
      <div className="page-head">
        <div>
          <div className="kicker">
            <Link href="/">Your offices</Link> · claim
          </div>
          <h1 className="display">
            Claim an office <span className="accent">set up before accounts existed.</span>
          </h1>
          <p>Type the company name and the passcode it had. It becomes yours, and the old passcode is retired.</p>
        </div>
      </div>
      <ClaimForm />
    </div>
  );
}
