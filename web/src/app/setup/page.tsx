import Link from "next/link";
import type { Metadata } from "next";
import { attempt, getCompanyBrain } from "@/lib/db";
import { readLock } from "@/lib/lock";
import { Broken } from "@/components/Broken";
import { SetupForm } from "@/components/SetupForm";

export const metadata: Metadata = { title: "Set up · Founders Corps" };

export default async function Setup() {
  const state = await attempt(getCompanyBrain);
  if (!state.ok) return <Broken reason={state.reason} />;
  const brain = state.value?.data ?? {};
  const needsPasscode = !(await readLock());

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="display">
            Set up your office <span className="accent">the five things every team reads first.</span>
          </h1>
          <p>
            Start with the essentials. Runway, positioning, priorities and decisions can be added later in the{" "}
            <Link href="/brain">company brain</Link>.
          </p>
        </div>
      </div>
      <SetupForm
        needsPasscode={needsPasscode}
        defaults={{
          name: brain.company?.name,
          one_liner: brain.company?.one_liner,
          stage: brain.company?.stage,
          what_it_does: brain.product?.what_it_does,
          icp_who: brain.icp?.who,
        }}
      />
    </>
  );
}
