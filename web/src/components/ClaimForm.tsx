"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { claimCompany } from "@/app/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "Checking…" : "Claim this office →"}
    </button>
  );
}

export function ClaimForm() {
  const [state, action] = useActionState(claimCompany, null);
  return (
    <form action={action} className="sheet sheet-body unlock">
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="form-row">
        <label className="label" htmlFor="claim-name">
          Company name
        </label>
        <input id="claim-name" name="company_name" className="input" required autoFocus autoComplete="off" />
      </div>
      <div className="form-row">
        <label className="label" htmlFor="claim-pass">
          Old passcode
        </label>
        <input id="claim-pass" name="passcode" type="password" className="input" required autoComplete="off" />
      </div>
      <Submit />
    </form>
  );
}
