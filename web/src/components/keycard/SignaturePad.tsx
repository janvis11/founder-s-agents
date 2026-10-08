"use client";

import { useRef, useState, type PointerEvent } from "react";

/**
 * Sign with mouse, pen or finger. Produces an SVG path of straight segments
 * in a 300 x 90 box, the same box the keycard prints it in.
 */
export function SignaturePad({ value, onChange }: { value: string; onChange: (path: string) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState(false);

  const point = (e: PointerEvent<SVGSVGElement>) => {
    const r = ref.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 300;
    const y = ((e.clientY - r.top) / r.height) * 90;
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  };

  return (
    <div className="sign-pad">
      <svg
        ref={ref}
        viewBox="0 0 300 90"
        role="img"
        aria-label="Signature pad. Draw your signature."
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDrawing(true);
          onChange(`${value} M${point(e)}`.trim());
        }}
        onPointerMove={(e) => drawing && onChange(`${value} L${point(e)}`)}
        onPointerUp={() => setDrawing(false)}
        onPointerCancel={() => setDrawing(false)}
      >
        <line x1="10" y1="72" x2="290" y2="72" className="sign-baseline" />
        {value && <path d={value} />}
      </svg>
      <div className="sign-tools">
        <span className="muted">{value ? "Signed." : "Sign above with your mouse or finger."}</span>
        {value && (
          <button type="button" className="link-btn" onClick={() => onChange("")}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
