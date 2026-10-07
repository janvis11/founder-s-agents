"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createCompany, setupCompany } from "@/app/actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

/** "create" opens a new company (with its passcode); "edit" changes the current one. */
export function SetupForm({ defaults, mode }: { mode: "create" | "edit"; defaults: { name?: string | null; one_liner?: string | null; what_it_does?: string | null; icp_who?: string | null; stage?: string | null } }) {
  const [state, action] = useActionState(mode === "create" ? createCompany : setupCompany, null);
  const needsPasscode = mode === "create";
  return (
    <form action={action} className="sheet sheet-body" style={{ maxWidth: 720 }}>
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="form-row">
        <label className="label" htmlFor="setup-name">
          Company name
        </label>
        <input id="setup-name" name="name" className="input" required autoFocus defaultValue={defaults.name ?? ""} />
      </div>
      <div className="form-row">
        <label className="label" htmlFor="setup-one-liner">
          In one line
        </label>
        <input id="setup-one-liner" name="one_liner" className="input" defaultValue={defaults.one_liner ?? ""} />
      </div>
      <div className="form-row">
        <label className="label" htmlFor="setup-what">
          What the product does
        </label>
        <textarea id="setup-what" name="what_it_does" className="textarea" required defaultValue={defaults.what_it_does ?? ""} />
      </div>
      <div className="form-row">
        <label className="label" htmlFor="setup-icp">
          Who it is for
        </label>
        <input id="setup-icp" name="icp_who" className="input" defaultValue={defaults.icp_who ?? ""} />
      </div>
      <div className="form-row">
        <label className="label" htmlFor="setup-stage">
          Stage
        </label>
        <select id="setup-stage" name="stage" className="input" defaultValue={defaults.stage ?? "idea"}>
          {["idea", "building", "launched", "revenue"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {needsPasscode && (
        <fieldset style={{ border: 0, borderTop: "1px solid var(--line)", padding: "16px 0 0", margin: "6px 0 14px" }}>
          <legend className="label" style={{ padding: "0 8px 0 0" }}>
            Office passcode
          </legend>
          <p className="muted" style={{ margin: "0 0 12px", fontSize: 14 }}>
            Locks the office so nobody else on this machine or network can approve, brief or edit. At least 6
            characters.
          </p>
          <div className="pair" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0 14px" }}>
            <div className="form-row">
              <label className="label" htmlFor="setup-pass">
                Passcode
              </label>
              <input id="setup-pass" name="passcode" type="password" className="input" required minLength={6} autoComplete="new-password" />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="setup-pass2">
                Passcode again
              </label>
              <input id="setup-pass2" name="passcode_again" type="password" className="input" required minLength={6} autoComplete="new-password" />
            </div>
          </div>
        </fieldset>
      )}
      <Submit label={mode === "create" ? "Open the office →" : "Save essentials →"} />
    </form>
  );
}
