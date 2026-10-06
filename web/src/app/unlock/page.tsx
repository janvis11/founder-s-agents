import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { readLock } from "@/lib/lock";
import { UnlockForm } from "@/components/UnlockForm";

export const metadata: Metadata = { title: "Locked · Founders Corps" };

export default async function Unlock(props: PageProps<"/unlock">) {
  // No passcode set yet: there is nothing to unlock.
  if (!(await readLock())) redirect("/setup");
  const { next } = await props.searchParams;
  return (
    <div className="unlock-wrap">
      <div className="page-head">
        <div>
          <h1 className="display">
            The office is locked <span className="accent">your passcode opens it.</span>
          </h1>
        </div>
      </div>
      <UnlockForm next={typeof next === "string" ? next : "/"} />
    </div>
  );
}
