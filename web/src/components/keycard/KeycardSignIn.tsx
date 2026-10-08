"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, signInWithKeycard } from "@/app/actions";
import { Keycard } from "./Keycard";
import { useSwipe } from "./useSwipe";

/**
 * Sign in: your keycard. Type email and password (the access strip fills as
 * you type) or drop your keycard file and its PIN. On success the card is
 * printed with your name, slides into the reader and the door opens.
 * Nothing about any account is shown until the founder has proved who they are.
 */
export function KeycardSignIn() {
  const [mode, setMode] = useState<"password" | "file">("password");
  const [pwState, pwAction, pwPending] = useActionState(signIn, null);
  const [keyState, keyAction, keyPending] = useActionState(signInWithKeycard, null);
  const state = mode === "password" ? pwState : keyState;
  const pending = mode === "password" ? pwPending : keyPending;
  const { reader, swiping } = useSwipe(state, pending);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keyFile, setKeyFile] = useState<{ name: string; text: string } | null>(null);
  const [pin, setPin] = useState("");
  const [dragging, setDragging] = useState(false);

  const card = state?.ok ? state.card : null;
  const strip = card ? 1 : mode === "password" ? Math.min(1, password.length / 12) : keyFile ? Math.min(1, 0.4 + pin.length / 10) : 0;

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setKeyFile({ name: file.name, text: (await file.text()).slice(0, 2000) });
  };

  return (
    <div className="keydesk">
      <section className="keydesk-card" aria-label="Your keycard">
        <Keycard
          name={card?.name}
          company={card?.company}
          since={card?.since}
          signature={card?.signature}
          holder={mode === "password" ? email || null : keyFile ? `key file · ${keyFile.name}` : null}
          strip={strip}
          reader={reader}
          swiping={swiping}
          message={reader === "granted" && card ? `Access granted · welcome, ${card.name.split(" ")[0]}` : undefined}
        />
      </section>

      <section className="sheet keydesk-form">
        <div className="kicker">Aloft · front door</div>
        <h1 className="display keydesk-title">
          Show your key
          <span className="accent">Your office opens to you, and only you.</span>
        </h1>

        <div className="key-tabs" role="tablist" aria-label="How to sign in">
          <button type="button" role="tab" aria-selected={mode === "password"} onClick={() => setMode("password")}>
            Email &amp; password
          </button>
          <button type="button" role="tab" aria-selected={mode === "file"} onClick={() => setMode("file")}>
            Keycard file
          </button>
        </div>

        {state?.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}

        {mode === "password" ? (
          <form action={pwAction} className="key-form">
            <div className="form-row">
              <label className="label" htmlFor="kc-email">
                Email
              </label>
              <input id="kc-email" name="email" type="email" className="input" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="kc-pass">
                Password
              </label>
              <input id="kc-pass" name="password" type="password" className="input" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn" disabled={pwPending || pwState?.ok}>
              {pwPending ? "Reading your key…" : "Swipe in →"}
            </button>
          </form>
        ) : (
          <form action={keyAction} className="key-form">
            <label
              className="drop"
              data-dragging={dragging || undefined}
              data-loaded={keyFile ? true : undefined}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void readFile(e.dataTransfer.files[0]);
              }}
            >
              <input type="file" accept=".fckey,application/json" className="visually-hidden" onChange={(e) => void readFile(e.target.files?.[0])} />
              <strong>{keyFile ? keyFile.name : "Drop your keycard file here"}</strong>
              <span>{keyFile ? "Key loaded. Now its PIN." : "or click to choose it (.fckey)"}</span>
            </label>
            <input type="hidden" name="keycard" value={keyFile?.text ?? ""} />
            <div className="form-row">
              <label className="label" htmlFor="kc-pin">
                PIN
              </label>
              <input
                id="kc-pin"
                name="pin"
                className="input pin"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                pattern="\d{6}"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <button type="submit" className="btn" disabled={!keyFile || pin.length !== 6 || keyPending || keyState?.ok}>
              {keyPending ? "Reading your key…" : "Swipe in →"}
            </button>
          </form>
        )}

        <p className="keydesk-foot muted">
          New here? <Link href="/signup">Get your key printed</Link>. It takes about a minute.
        </p>
      </section>
    </div>
  );
}
