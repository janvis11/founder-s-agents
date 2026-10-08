"use client";

import { useRef, type PointerEvent } from "react";
import { Logo } from "../Logo";

export type ReaderState = "idle" | "reading" | "granted" | "denied";

export type CardProps = {
  name?: string | null;
  company?: string | null;
  role?: string;
  since?: string | null;
  /** What the founder is typing as the key holder line, before the card is known. */
  holder?: string | null;
  /** SVG path in a 300 x 90 box. */
  signature?: string | null;
  /** How full the access strip is, 0 to 1. */
  strip?: number;
  reader: ReaderState;
  /** Card slides into the reader. */
  swiping?: boolean;
  message?: string;
};

function formatSince(since?: string | null) {
  const d = since ? new Date(since) : new Date();
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

/** The founder's keycard above its reader. Tilts a little under the pointer. */
export function Keycard({ name, company, role = "founder", since, holder, signature, strip = 0, reader, swiping, message }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const segments = 14;
  const filled = Math.round(Math.max(0, Math.min(1, strip)) * segments);

  const tilt = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || swiping || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 12).toFixed(2)}deg`);
    el.style.setProperty("--sx", `${(x + 0.5) * 100}%`);
  };
  const reset = () => {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="card-stage" data-swiping={swiping || undefined}>
      <div className="card-tilt" ref={ref} onPointerMove={tilt} onPointerLeave={reset}>
        <div className="keycard" aria-label={name ? `Keycard of ${name}` : "Your keycard"}>
          <div className="kc-sheen" aria-hidden />
          <div className="kc-top">
            <span className="kc-brand">
              <Logo size={26} />
              Aloft
            </span>
            <span className="kc-kind">Founder key</span>
          </div>
          <div className="kc-chip" aria-hidden />
          <div className="kc-name" data-empty={!name || undefined}>
            {name || "Your name"}
          </div>
          <div className="kc-line">
            {company ? `${company} · ${role}` : holder ? <span className="kc-holder">{holder}</span> : "Your company · founder"}
          </div>
          <div className="kc-bottom">
            <div className="kc-sign">
              <span>Signature</span>
              <svg viewBox="0 0 300 90" preserveAspectRatio="xMinYMid meet" aria-hidden>
                {signature ? <path d={signature} /> : <line x1="6" y1="70" x2="294" y2="70" className="kc-sign-line" />}
              </svg>
            </div>
            <div className="kc-meta">
              <span>since {formatSince(since)}</span>
              <div className="kc-strip" aria-hidden>
                {Array.from({ length: segments }, (_, i) => (
                  <i key={i} data-on={i < filled || undefined} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="reader" data-state={reader}>
        <div className="reader-slot" aria-hidden />
        <div className="reader-face">
          <span className="reader-led" aria-hidden />
          <span className="reader-text" role="status">
            {message ??
              (reader === "granted" ? "Access granted" : reader === "reading" ? "Reading key…" : reader === "denied" ? "Not recognised" : "Card reader")}
          </span>
        </div>
      </div>
    </div>
  );
}
