"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { enterCompany } from "@/app/actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "Checking…" : label}
    </button>
  );
}

export function EnterForm({ slug, hasPasscode }: { slug: string; hasPasscode: boolean }) {
  const [state, action] = useActionState(enterCompany, null);
  return (
    <form action={action} className="sheet sheet-body unlock">
      <input type="hidden" name="company" value={slug} />
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="form-row">
        <label className="label" htmlFor="enter-pass">
          {hasPasscode ? "Passcode" : "New passcode (at least 6 characters)"}
        </label>
        <input
          id="enter-pass"
          name="passcode"
          type="password"
          className="input"
          required
          autoFocus
          minLength={hasPasscode ? undefined : 6}
          autoComplete={hasPasscode ? "current-password" : "new-password"}
        />
      </div>
      {!hasPasscode && (
        <div className="form-row">
          <label className="label" htmlFor="enter-pass2">
            Passcode again
          </label>
          <input id="enter-pass2" name="passcode_again" type="password" className="input" required minLength={6} autoComplete="new-password" />
        </div>
      )}
      <Submit label={hasPasscode ? "Enter the office →" : "Set passcode and enter →"} />
      {hasPasscode && (
        <p className="muted" style={{ margin: "14px 0 0", fontSize: 13 }}>
          Forgot it? On this machine, delete <span className="mono">web/.data/companies/{slug}/lock.json</span> and set a
          new one here.
        </p>
      )}
    </form>
  );
}
