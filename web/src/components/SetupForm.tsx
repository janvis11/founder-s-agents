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

/** "create" opens another office for the signed-in founder; "edit" changes the current one. */
export function SetupForm({ defaults, mode }: { mode: "create" | "edit"; defaults: { name?: string | null; one_liner?: string | null; what_it_does?: string | null; icp_who?: string | null; stage?: string | null } }) {
  const [state, action] = useActionState(mode === "create" ? createCompany : setupCompany, null);
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
      <Submit label={mode === "create" ? "Open the office →" : "Save essentials →"} />
    </form>
  );
}
