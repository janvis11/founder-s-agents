"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUp } from "@/app/actions";
import { Office, type OfficeProps } from "./office/Office";
import { useLightsOn } from "./Arrival";

const CHARTER = [
  "Nothing leaves this office without my approval.",
  "Nothing on the blocked list happens at all: no money moved, nothing signed, filed or deployed, no hiring.",
  "Every step leaves a receipt.",
];

const STEPS = ["You", "Your company", "The charter"] as const;

/**
 * Sign up builds the founder's office live: every answer turns on another
 * room, the company name goes up on the plaque, and the charter seals it.
 */
export function BuildOffice({ office }: { office: Omit<OfficeProps, "arrival" | "children"> }) {
  const [state, action, pending] = useActionState(signUp, null);
  const [step, setStep] = useState(0);
  const [v, setV] = useState({ name: "", email: "", password: "", password_again: "", company_name: "", one_liner: "", what_it_does: "", icp_who: "", stage: "" });
  const [charter, setCharter] = useState([false, false, false]);
  const [lit, setLit] = useState(0);
  useLightsOn(state, setLit);

  const set = (key: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV((old) => ({ ...old, [key]: e.target.value }));

  // One room per answer: you, the company, what it does, who it is for,
  // its stage, the charter half signed, the charter signed.
  const answered =
    Number(Boolean(v.name)) +
    Number(Boolean(v.company_name)) +
    Number(Boolean(v.what_it_does)) +
    Number(Boolean(v.icp_who)) +
    Number(Boolean(v.stage)) +
    Number(charter.filter(Boolean).length >= 2) +
    Number(charter.every(Boolean));
  const shownLit = state?.ok ? lit : answered;

  const stepDone = [
    v.name && v.email && v.password.length >= 8 && v.password === v.password_again,
    v.company_name && v.what_it_does,
    charter.every(Boolean),
  ];

  return (
    <div className="arrival">
      <div className="arrival-scene">
        <Office {...office} arrival={{ lit: shownLit }}>
          <div className="plaque" aria-live="polite">
            <span className="kicker">Founders Corps</span>
            <strong>{v.company_name || "Your company"}</strong>
            <span>{v.name ? `${v.name}'s office` : "under construction"}</span>
          </div>
        </Office>
      </div>

      <form action={action} className="sheet arrival-card">
        <div className="kicker">
          Build your office · step {step + 1} of 3: {STEPS[step]}
        </div>
        <ol className="steps" aria-hidden>
          {STEPS.map((s, i) => (
            <li key={s} data-on={i <= step || undefined} />
          ))}
        </ol>

        {state?.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}

        <fieldset hidden={step !== 0} className="arrival-step">
          <legend className="display arrival-title">
            Who&rsquo;s the founder?<span className="accent">Your name goes on the desk.</span>
          </legend>
          <div className="form-row">
            <label className="label" htmlFor="b-name">Your name</label>
            <input id="b-name" name="name" className="input" autoComplete="name" value={v.name} onChange={set("name")} />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="b-email">Email</label>
            <input id="b-email" name="email" type="email" className="input" autoComplete="username" value={v.email} onChange={set("email")} />
          </div>
          <div className="pair2">
            <div className="form-row">
              <label className="label" htmlFor="b-pass">Password (8 or more)</label>
              <input id="b-pass" name="password" type="password" className="input" autoComplete="new-password" minLength={8} value={v.password} onChange={set("password")} />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="b-pass2">Password again</label>
              <input id="b-pass2" name="password_again" type="password" className="input" autoComplete="new-password" value={v.password_again} onChange={set("password_again")} />
            </div>
          </div>
        </fieldset>

        <fieldset hidden={step !== 1} className="arrival-step">
          <legend className="display arrival-title">
            What are we building?<span className="accent">Every team reads this first.</span>
          </legend>
          <div className="form-row">
            <label className="label" htmlFor="b-company">Company name</label>
            <input id="b-company" name="company_name" className="input" autoComplete="organization" value={v.company_name} onChange={set("company_name")} />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="b-one">In one line</label>
            <input id="b-one" name="one_liner" className="input" value={v.one_liner} onChange={set("one_liner")} />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="b-what">What the product does</label>
            <textarea id="b-what" name="what_it_does" className="textarea" value={v.what_it_does} onChange={set("what_it_does")} />
          </div>
          <div className="pair2">
            <div className="form-row">
              <label className="label" htmlFor="b-icp">Who it is for</label>
              <input id="b-icp" name="icp_who" className="input" value={v.icp_who} onChange={set("icp_who")} />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="b-stage">Stage</label>
              <select id="b-stage" name="stage" className="input" value={v.stage} onChange={set("stage")}>
                <option value="">Choose…</option>
                {["idea", "building", "launched", "revenue"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset hidden={step !== 2} className="arrival-step">
          <legend className="display arrival-title">
            The founder&rsquo;s charter<span className="accent">Three lines your teams work by.</span>
          </legend>
          <ul className="charter">
            {CHARTER.map((line, i) => (
              <li key={line}>
                <label>
                  <input
                    type="checkbox"
                    name={`charter_${i}`}
                    checked={charter[i]}
                    onChange={(e) => setCharter((c) => c.map((x, j) => (j === i ? e.target.checked : x)))}
                  />
                  <span>{line}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="muted" style={{ fontSize: 13.5, margin: "4px 0 0" }}>
            Signing it is recorded as your company&rsquo;s first receipt.
          </p>
        </fieldset>

        <div className="arrival-nav">
          {step > 0 && (
            <button type="button" className="btn btn-quiet" onClick={() => setStep(step - 1)}>
              ← Back
            </button>
          )}
          {step < 2 ? (
            <button type="button" className="btn" disabled={!stepDone[step]} onClick={() => setStep(step + 1)}>
              Next →
            </button>
          ) : (
            <button type="submit" className="btn" disabled={!stepDone.every(Boolean) || pending || state?.ok}>
              {pending ? "Opening your office…" : "Sign and open the office →"}
            </button>
          )}
        </div>

        <p className="arrival-foot muted">
          Already have an office? <Link href="/">Sign in</Link>.
        </p>
      </form>
    </div>
  );
}
