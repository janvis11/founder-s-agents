"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { signIn, type FormState } from "@/app/actions";
import { Office, type OfficeProps } from "./office/Office";

/**
 * Turn on every room one after another, then walk in. A full page load, so
 * the header is drawn fresh for the signed-in founder.
 */
function useLightsOn(state: FormState, setLit: (n: number) => void) {
  useEffect(() => {
    if (!state?.ok || !state.next) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      window.location.assign(state.next);
      return;
    }
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      setLit(n);
      if (n >= 7) {
        clearInterval(timer);
        setTimeout(() => window.location.assign(state.next!), 500);
      }
    }, 180);
    return () => clearInterval(timer);
  }, [state, setLit]);
}

export { useLightsOn };

/** Sign in: "Arrive at the building". The founder's desk lights up as you go. */
export function Arrival({ office }: { office: Omit<OfficeProps, "arrival" | "children"> }) {
  const [state, action, pending] = useActionState(signIn, null);
  const [step, setStep] = useState<"who" | "key">("who");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lit, setLit] = useState(0);
  const keyRef = useRef<HTMLInputElement>(null);
  useLightsOn(state, setLit);

  const shownLit = state?.ok ? lit : (email ? 1 : 0) + (password ? 1 : 0);

  return (
    <div className="arrival">
      <div className="arrival-scene">
        <Office {...office} arrival={{ lit: shownLit }} />
      </div>
      <form
        action={action}
        className="sheet arrival-card"
        onSubmit={(e) => {
          if (step === "who") {
            e.preventDefault();
            if (email.trim()) {
              setStep("key");
              requestAnimationFrame(() => keyRef.current?.focus());
            }
          }
        }}
      >
        <div className="kicker">Founders Corps · front desk</div>
        <h1 className="display arrival-title">
          {state?.ok ? "Lights on." : step === "who" ? "Who's arriving?" : "Your key?"}
          <span className="accent">
            {state?.ok ? "Walking you in." : step === "who" ? "The building is dark until you do." : "Then the lights come on."}
          </span>
        </h1>

        {state?.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}

        <div className="form-row" hidden={step !== "who"}>
          <label className="label" htmlFor="arrive-email">
            Email
          </label>
          <input
            id="arrive-email"
            name="email"
            type="email"
            className="input"
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-row" hidden={step !== "key"}>
          <label className="label" htmlFor="arrive-key">
            Password
          </label>
          <input
            ref={keyRef}
            id="arrive-key"
            name="password"
            type="password"
            className="input"
            autoComplete="current-password"
            required={step === "key"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="link-btn arrival-back" onClick={() => setStep("who")}>
            Not {email || "you"}?
          </button>
        </div>

        <button type="submit" className="btn" disabled={pending || state?.ok}>
          {step === "who" ? "Continue →" : pending ? "Checking your key…" : "Turn on the lights →"}
        </button>

        <p className="arrival-foot muted">
          New here? <Link href="/signup">Build your office</Link>. It takes about a minute.
        </p>
      </form>
    </div>
  );
}
