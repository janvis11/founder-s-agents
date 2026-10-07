import Link from "next/link";
import type { Metadata } from "next";
import { SetupForm } from "@/components/SetupForm";

export const metadata: Metadata = { title: "New company · Founders Corps" };

export default function NewCompany() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">
            <Link href="/">Lobby</Link> · new company
          </div>
          <h1 className="display">
            Open a new office <span className="accent">its own teams, its own data, its own passcode.</span>
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
