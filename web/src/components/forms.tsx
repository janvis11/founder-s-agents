"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  addDecision,
  approveDraft,
  declineDraft,
  markHandled,
  resolveContradiction,
  saveBrain,
  sendBrief,
  type FormState,
} from "@/app/actions";
import type { CompanyBrain } from "@/lib/db";

function Submit({ children, pending: label, quiet }: { children: React.ReactNode; pending: string; quiet?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={quiet ? "btn btn-quiet" : "btn"} disabled={pending}>
      {pending ? label : children}
    </button>
  );
}

function Status({ state }: { state: FormState }) {
  if (state?.error) return <p className="form-error" role="alert">{state.error}</p>;
  if (state?.message) return <p className="form-ok" role="status">{state.message}</p>;
  return null;
}

// Desk --------------------------------------------------------------------

export function BriefForm() {
  const [state, action] = useActionState(sendBrief, null);
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (form) => {
        await action(form);
      }}
      className="terminal"
      onSubmit={() => requestAnimationFrame(() => ref.current?.reset())}
    >
      <div className="terminal-bar">
        <span className="terminal-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="terminal-title">brief the orchestrator — it plans work orders, never does a team&rsquo;s work</span>
      </div>
      <div className="terminal-body">
        <label htmlFor="brief-body" className="prompt">
          founder@hq <b>~</b> $
        </label>
        <textarea
          id="brief-body"
          name="body"
          required
          placeholder="what needs doing, or what changed. one request per brief."
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ref.current?.requestSubmit();
          }}
        />
      </div>
      <div className="terminal-foot">
        <span className="mono muted" style={{ fontSize: 12 }}>
          ctrl + enter to send
        </span>
        <Submit pending="Waiting for the Orchestrator…">Send brief →</Submit>
      </div>
      {state?.error && (
        <div style={{ padding: "0 18px 14px" }}>
          <p className="form-error" role="alert">
            Broken: {state.error}
          </p>
        </div>
      )}
    </form>
  );
}

// Approvals -----------------------------------------------------------------

/** Approve or decline a draft. The sheet files itself away once decided. */
export function ApproveActions({ draftId, team }: { draftId: number; team: string }) {
  const [declining, setDeclining] = useState(false);
  const [filing, setFiling] = useState(false);
  const [, startTransition] = useTransition();
  const [state, decline] = useActionState(declineDraft, null);

  const file = (fn: () => Promise<unknown>) => {
    setFiling(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => startTransition(async () => void (await fn())), reduced ? 0 : 240);
  };

  return (
    <div className={filing ? "filing" : undefined} data-filing-target>
      {!declining ? (
        <div className="actions">
          <form
            action={(form) => file(() => approveDraft(form))}
          >
            <input type="hidden" name="draft_id" value={draftId} />
            <button type="submit" className="btn btn-amber">
              Approve draft
            </button>
          </form>
          <button type="button" className="btn btn-quiet" onClick={() => setDeclining(true)}>
            Decline and send back to {team}
          </button>
          <span className="note">Approving records your sign-off with a receipt. Nothing is sent from here — you send it.</span>
        </div>
      ) : (
        <form
          className="actions"
          action={(form) => {
            startTransition(async () => {
              await decline(form);
            });
          }}
          style={{ display: "block" }}
        >
          <input type="hidden" name="draft_id" value={draftId} />
          <Status state={state} />
          <div className="form-row">
            <label className="label" htmlFor={`note-${draftId}`}>
              What should {team} change?
            </label>
            <textarea id={`note-${draftId}`} name="note" className="textarea" required autoFocus />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Submit pending="Sending back…">Decline and send back to {team}</Submit>
            <button type="button" className="btn btn-quiet" onClick={() => setDeclining(false)}>
              Keep it waiting
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function HeldActions({ draftId }: { draftId: number }) {
  return (
    <form action={markHandled} style={{ padding: "0 20px 16px" }}>
      <input type="hidden" name="draft_id" value={draftId} />
      <button type="submit" className="link-btn" style={{ fontSize: 13.5 }}>
        I handled this myself — clear it from the desk
      </button>
    </form>
  );
}

// Decisions -----------------------------------------------------------------

function DecisionFields({ prefix }: { prefix: string }) {
  return (
    <>
      <div className="form-row">
        <label className="label" htmlFor={`${prefix}-decision`}>
          Decision
        </label>
        <input id={`${prefix}-decision`} name="decision" className="input" required />
      </div>
      <div className="form-row">
        <label className="label" htmlFor={`${prefix}-reasoning`}>
          Reasoning — why, not just what
        </label>
        <textarea id={`${prefix}-reasoning`} name="reasoning" className="textarea" required />
      </div>
      <div className="form-row">
        <label className="label" htmlFor={`${prefix}-revisit`}>
          Revisit if
        </label>
        <input
          id={`${prefix}-revisit`}
          name="revisit_if"
          className="input"
          required
          placeholder="The condition that would reopen this"
        />
      </div>
    </>
  );
}

export function ResolveForm({ draftId }: { draftId: number }) {
  const [state, action] = useActionState(resolveContradiction, null);
  return (
    <form action={action}>
      <input type="hidden" name="draft_id" value={draftId} />
      <Status state={state} />
      <DecisionFields prefix={`resolve-${draftId}`} />
      <Submit pending="Recording…">Record decision in the company brain</Submit>
    </form>
  );
}

export function DecisionForm() {
  const [state, action] = useActionState(addDecision, null);
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={action}>
      <Status state={state?.ok ? { message: "Decision recorded." } : state} />
      <DecisionFields prefix="new" />
      <Submit pending="Recording…">Record decision</Submit>
    </form>
  );
}

// Company brain -------------------------------------------------------------

function Field({
  name,
  label,
  value,
  long,
  type = "text",
}: {
  name: string;
  label: string;
  value: string | number | null | undefined;
  long?: boolean;
  type?: string;
}) {
  const id = `brain-${name}`;
  return (
    <div className="form-row">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {long ? (
        <textarea id={id} name={name} className="textarea" defaultValue={value ?? ""} />
      ) : (
        <input id={id} name={name} className="input" type={type} step="any" defaultValue={value ?? ""} />
      )}
    </div>
  );
}

export function BrainForm({ brain }: { brain: CompanyBrain }) {
  const [state, action] = useActionState(saveBrain, null);
  const p = brain.priorities ?? [];
  return (
    <form action={action}>
      <fieldset>
        <legend>Company</legend>
        <div className="pair">
          <Field name="company.name" label="Name" value={brain.company?.name} />
          <div className="form-row">
            <label className="label" htmlFor="brain-stage">
              Stage
            </label>
            <select id="brain-stage" name="company.stage" className="input" defaultValue={brain.company?.stage ?? "idea"}>
              {["idea", "building", "launched", "revenue"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Field name="company.one_liner" label="One line" value={brain.company?.one_liner} />
      </fieldset>
      <fieldset>
        <legend>Product</legend>
        <Field
          name="product.what_it_does"
          label="What it does — no team claims more than this"
          value={brain.product?.what_it_does}
          long
        />
        <Field name="product.current_state" label="Current state" value={brain.product?.current_state} long />
        <Field name="product.live_url" label="Live URL" value={brain.product?.live_url} type="url" />
      </fieldset>
      <fieldset>
        <legend>Ideal customer</legend>
        <Field name="icp.who" label="Who" value={brain.icp?.who} long />
        <Field name="icp.evidence" label="Evidence — why you believe this, not a guess" value={brain.icp?.evidence} long />
      </fieldset>
      <fieldset>
        <legend>Positioning</legend>
        <Field name="positioning.differentiation" label="Differentiation" value={brain.positioning?.differentiation} long />
        <Field name="positioning.messaging" label="Messaging" value={brain.positioning?.messaging} long />
      </fieldset>
      <fieldset>
        <legend>Constraints</legend>
        <div className="pair">
          <Field name="constraints.runway_months" label="Runway, months" value={brain.constraints?.runway_months} type="number" />
          <Field name="constraints.monthly_burn" label="Monthly net burn" value={brain.constraints?.monthly_burn} type="number" />
          <Field
            name="constraints.founder_hours_per_week"
            label="Your hours per week"
            value={brain.constraints?.founder_hours_per_week}
            type="number"
          />
        </div>
      </fieldset>
      <fieldset>
        <legend>Priorities, in order — at most three</legend>
        {[0, 1, 2].map((i) => (
          <div className="priority" key={i}>
            <span>{i + 1}</span>
            <label htmlFor={`brain-priority-${i}`} className="visually-hidden">
              Priority {i + 1}
            </label>
            <input id={`brain-priority-${i}`} name={`priorities.${i}`} className="input" defaultValue={p[i] ?? ""} />
          </div>
        ))}
      </fieldset>
      <Status state={state} />
      <Submit pending="Saving…">Save company brain</Submit>
    </form>
  );
}
