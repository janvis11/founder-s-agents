"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { unlock } from "@/app/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "Checking…" : "Unlock the office"}
    </button>
  );
}

export function UnlockForm({ next }: { next: string }) {
  const [state, action] = useActionState(unlock, null);
  return (
    <form action={action} className="sheet sheet-body unlock">
      <input type="hidden" name="next" value={next} />
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="form-row">
        <label className="label" htmlFor="unlock-pass">
          Passcode
        </label>
        <input id="unlock-pass" name="passcode" type="password" className="input" required autoFocus autoComplete="current-password" />
      </div>
      <Submit />
      <p className="muted" style={{ margin: "14px 0 0", fontSize: 13 }}>
        Forgot it? On this machine, delete <span className="mono">web/.data/lock.json</span> and set a new one at setup.
      </p>
    </form>
  );
}
