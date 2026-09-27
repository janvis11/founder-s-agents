import type { DiffLine } from "@/lib/diff";

export function DiffView({ lines, label }: { lines: DiffLine[]; label: string }) {
  return (
    <div className="diff" role="region" aria-label={label} tabIndex={0}>
      {lines.map((l, i) => (
        <div key={i} className={l.kind === "same" ? undefined : l.kind}>
          {l.kind === "del" && <span className="visually-hidden">Removed: </span>}
          {l.kind === "add" && <span className="visually-hidden">Added: </span>}
          {l.text || " "}
        </div>
      ))}
    </div>
  );
}
