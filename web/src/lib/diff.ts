import { diffLines } from "diff";

export type DiffLine = { kind: "add" | "del" | "same" | "gap"; text: string };

/** Line diff with unchanged runs collapsed to `context` lines either side. */
export function lineDiff(before: string, after: string, context = 2): DiffLine[] {
  const lines: DiffLine[] = [];
  for (const part of diffLines(before, after)) {
    const kind = part.added ? "add" : part.removed ? "del" : "same";
    const rows = part.value.replace(/\n$/, "").split("\n");
    for (const text of rows) lines.push({ kind, text });
  }
  const keep = lines.map(() => false);
  lines.forEach((l, i) => {
    if (l.kind === "same") return;
    for (let j = Math.max(0, i - context); j <= Math.min(lines.length - 1, i + context); j++) keep[j] = true;
  });
  const out: DiffLine[] = [];
  let skipped = 0;
  lines.forEach((l, i) => {
    if (keep[i]) {
      if (skipped) out.push({ kind: "gap", text: `${skipped} unchanged ${skipped === 1 ? "line" : "lines"}` });
      skipped = 0;
      out.push(l);
    } else skipped++;
  });
  if (skipped && out.length) out.push({ kind: "gap", text: `${skipped} unchanged ${skipped === 1 ? "line" : "lines"}` });
  return out;
}

export function diffCounts(lines: DiffLine[]) {
  return {
    added: lines.filter((l) => l.kind === "add").length,
    removed: lines.filter((l) => l.kind === "del").length,
  };
}
