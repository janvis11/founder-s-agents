"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-reads the page every few seconds while the runner has work in flight,
 *  so briefs, drafts and reviews appear without a reload. */
export function LiveRefresh({ active, every = 4000 }: { active: boolean; every?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), every);
    return () => clearInterval(timer);
  }, [active, every, router]);
  return null;
}
