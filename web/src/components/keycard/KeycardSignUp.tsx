"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUp } from "@/app/actions";
import { Keycard } from "./Keycard";
import { SignaturePad } from "./SignaturePad";
import { useSwipe } from "./useSwipe";

const CHARTER = [
  "Nothing leaves this office without my approval.",
  "Nothing on the blocked list happens at all: no money moved, nothing signed, filed or deployed, no hiring.",
  "Every step leaves a receipt.",
];

const STEPS = ["You", "Your company", "Sign the charter"] as const;

/**
 * Sign up prints the founder's keycard live: name, company and founding date
 * appear as they are typed, and signing the charter puts the signature on
 * the card. Then the new card swipes in and the office opens.
 */
export function KeycardSignUp() {
  const [state, action, pending] = useActionState(signUp, null);
  const { reader, swiping } = useSwipe(state, pending);
  const [step, setStep] = useState(0);
  const [v, setV] = useState({ name: "", email: "", password: "", password_again: "", company_name: "", one_liner: "", what_it_does: "", icp_who: "", stage: "" });
  const [signature, setSignature] = useState("");

  const set = (key: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV((old) => ({ ...old, [key]: e.target.value }));

  const stepDone = [
    Boolean(v.name && v.email && v.password.length >= 8 && v.password === v.password_again),
    Boolean(v.company_name && v.what_it_does),
    (signature.match(/L/g) ?? []).length >= 4,
  ];
  const progress = (Number(stepDone[0]) + Number(stepDone[1]) + Number(stepDone[2])) / 3;

  return (
    <div className="keydesk">
      <section className="keydesk-card" aria-label="Your keycard, printing">
        <Keycard
          name={v.name || null}
          company={v.company_name || null}
          role={v.stage ? `founder · ${v.stage}` : "founder"}
          holder={v.email || null}
          signature={signature || null}
          strip={state?.ok ? 1 : progress}
          reader={reader}
          swiping={swiping}
          message={reader === "granted" ? `Access granted · welcome, ${v.name.split(" ")[0] || "founder"}` : reader === "idle" ? "Printing your key" : undefined}
        />
      </section>

      <form action={action} className="sheet keydesk-form">
        <div className="kicker">
          Get your key printed · step {step + 1} of 3: {STEPS[step]}
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

        <fieldset hidden={step !== 0} className="key-step">
          <legend className="display keydesk-title">
            Whose key is it?<span className="accent">Your name goes on the card.</span>
          </legend>
          <div className="form-row">
            <label className="label" htmlFor="s-name">Your name</label>
            <input id="s-name" name="name" className="input" autoComplete="name" value={v.name} onChange={set("name")} />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="s-email">Email</label>
            <input id="s-email" name="email" type="email" className="input" autoComplete="username" value={v.email} onChange={set("email")} />
          </div>
          <div className="pair2">
            <div className="form-row">
              <label className="label" htmlFor="s-pass">Password (8 or more)</label>
              <input id="s-pass" name="password" type="password" className="input" autoComplete="new-password" minLength={8} value={v.password} onChange={set("password")} />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="s-pass2">Password again</label>
              <input id="s-pass2" name="password_again" type="password" className="input" autoComplete="new-password" value={v.password_again} onChange={set("password_again")} />
            </div>
          </div>
        </fieldset>

        <fieldset hidden={step !== 1} className="key-step">
          <legend className="display keydesk-title">
            Which office does it open?<span className="accent">Every team reads this first.</span>
          </legend>
          <div className="form-row">
            <label className="label" htmlFor="s-company">Company name</label>
            <input id="s-company" name="company_name" className="input" autoComplete="organization" value={v.company_name} onChange={set("company_name")} />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="s-one">In one line</label>
            <input id="s-one" name="one_liner" className="input" value={v.one_liner} onChange={set("one_liner")} />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="s-what">What the product does</label>
            <textarea id="s-what" name="what_it_does" className="textarea" value={v.what_it_does} onChange={set("what_it_does")} />
          </div>
          <div className="pair2">
            <div className="form-row">
              <label className="label" htmlFor="s-icp">Who it is for</label>
              <input id="s-icp" name="icp_who" className="input" value={v.icp_who} onChange={set("icp_who")} />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="s-stage">Stage</label>
              <select id="s-stage" name="stage" className="input" value={v.stage} onChange={set("stage")}>
                <option value="">Choose…</option>
                {["idea", "building", "launched", "revenue"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset hidden={step !== 2} className="key-step">
          <legend className="display keydesk-title">
            The founder&rsquo;s charter<span className="accent">Your signature makes it yours.</span>
          </legend>
          <ol className="charter-lines">
            {CHARTER.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <SignaturePad value={signature} onChange={setSignature} />
          <input type="hidden" name="signature" value={signature} />
          <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>
            Printed on your key and kept as your company&rsquo;s first receipt.
          </p>
        </fieldset>

        <div className="key-nav">
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
              {pending ? "Printing your key…" : "Sign and print my key →"}
            </button>
          )}
        </div>

        <p className="keydesk-foot muted">
          Already have a key? <Link href="/">Swipe in</Link>.
        </p>
      </form>
    </div>
  );
}
