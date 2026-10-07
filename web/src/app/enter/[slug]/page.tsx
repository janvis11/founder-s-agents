import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCompany } from "@/lib/companies";
import { readLock } from "@/lib/lock";
import { EnterForm } from "@/components/EnterForm";

export const metadata: Metadata = { title: "Enter · Founders Corps" };

export default async function Enter(props: PageProps<"/enter/[slug]">) {
  const { slug } = await props.params;
  const company = await getCompany(slug);
  if (!company) notFound();
  const hasPasscode = Boolean(await readLock(company.slug));

  return (
    <div className="unlock-wrap">
      <div className="page-head">
        <div>
          <div className="kicker">
            <Link href="/">Lobby</Link> · {company.name}
          </div>
          <h1 className="display">
            {company.name}{" "}
            <span className="accent">{hasPasscode ? "your passcode opens the office." : "set a passcode to open it."}</span>
          </h1>
        </div>
      </div>
      <EnterForm slug={company.slug} hasPasscode={hasPasscode} />
    </div>
  );
}
