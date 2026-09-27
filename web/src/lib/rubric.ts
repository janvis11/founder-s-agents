import { readPlaybook } from "./playbooks";

/** Check id -> its line in skills/review_rubric, so a bounce names its rule. */
export async function rubricChecks(): Promise<Record<string, string>> {
  const rubric = await readPlaybook("review_rubric");
  const checks: Record<string, string> = {};
  if (!rubric) return checks;
  for (const match of rubric.raw.matchAll(/^- `([A-Z]\d+)` (.+(?:\n {2,}.+)*)/gm)) {
    checks[match[1]] = match[2].replace(/`/g, "").replace(/\s+/g, " ").trim();
  }
  return checks;
}
