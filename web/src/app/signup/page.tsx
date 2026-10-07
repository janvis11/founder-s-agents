import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentAccount } from "@/lib/accounts";
import { buildOffice } from "@/lib/office";
import { BuildOffice } from "@/components/BuildOffice";

export const metadata: Metadata = { title: "Build your office · Founders Corps" };

export default async function SignUp() {
  if (await currentAccount()) redirect("/");
  const { zones, disputes, flows, runwayMonths, companyName } = buildOffice([], [], [], [], null, "");
  return <BuildOffice office={{ zones, disputes, flows, runwayMonths, companyName }} />;
}
