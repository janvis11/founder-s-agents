import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentAccount } from "@/lib/accounts";
import { KeycardSignUp } from "@/components/keycard/KeycardSignUp";

export const metadata: Metadata = { title: "Get your key · Aloft" };

export default async function SignUp() {
  if (await currentAccount()) redirect("/");
  return <KeycardSignUp />;
}
