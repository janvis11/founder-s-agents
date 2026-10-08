"use client";

import { useActionState, useEffect, useState } from "react";
import { issueKeycardAction } from "@/app/actions";

/** Choose a PIN, get a keycard file. The file downloads straight away. */
export function IssueKeycard() {
  const [state, action, pending] = useActionState(issueKeycardAction, null);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");

  useEffect(() => {
    if (!state?.ok || !state.file || !state.filename) return;
    const url = URL.createObjectURL(new Blob([state.file], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = state.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const digits = (fn: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => fn(e.target.value.replace(/\D/g, "").slice(0, 6));

  return (
    <form action={action} className="sheet sheet-body unlock">
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="form-ok" role="status">
          Your keycard file downloaded ({state.filename}). Keep it somewhere safe; it opens your offices together with its PIN.
        </p>
      )}
      <div className="pair2">
        <div className="form-row">
          <label className="label" htmlFor="ik-pin">
            Choose a 6-digit PIN
          </label>
          <input id="ik-pin" name="pin" className="input pin" inputMode="numeric" autoComplete="off" maxLength={6} required value={pin} onChange={digits(setPin)} />
        </div>
        <div className="form-row">
          <label className="label" htmlFor="ik-pin2">
            PIN again
          </label>
          <input id="ik-pin2" name="pin_again" className="input pin" inputMode="numeric" autoComplete="off" maxLength={6} required value={pin2} onChange={digits(setPin2)} />
        </div>
      </div>
      <button type="submit" className="btn" disabled={pin.length !== 6 || pin !== pin2 || pending}>
        {pending ? "Cutting your key…" : "Issue a keycard file →"}
      </button>
    </form>
  );
}
