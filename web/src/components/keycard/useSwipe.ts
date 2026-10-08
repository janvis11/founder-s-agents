"use client";

import { useEffect, useState } from "react";
import type { FormState } from "@/app/actions";
import type { ReaderState } from "./Keycard";

/**
 * After a successful sign in or sign up: the card slides into the reader,
 * "Access granted" shows, then the office opens with a full page load (so the
 * header is drawn fresh for the signed-in founder).
 */
export function useSwipe(state: FormState, pending: boolean) {
  const [swiping, setSwiping] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!state?.ok || !state.next) return;
    const next = state.next;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = reduced
      ? [setTimeout(() => window.location.assign(next), 0)]
      : [
          setTimeout(() => setSwiping(true), 700),
          setTimeout(() => setGranted(true), 1300),
          setTimeout(() => window.location.assign(next), 2200),
        ];
    return () => timers.forEach(clearTimeout);
  }, [state]);

  const reader: ReaderState = granted ? "granted" : pending || state?.ok ? "reading" : state?.error ? "denied" : "idle";
  return { reader, swiping };
}
