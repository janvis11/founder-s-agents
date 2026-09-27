import { promises as fs } from "node:fs";
import path from "node:path";

// skills/ lives at the repo root, one level above web/.
export const SKILLS_ROOT = path.resolve(process.cwd(), "..", "skills");

export type PlaybookRef = {
  /** Path under skills/, e.g. "growth/outreach_draft". */
  slug: string;
  /** "growth", or "shared" for top-level playbooks like business_rules. */
  group: string;
  name: string;
  description: string;
  title: string;
};

export type Section = { heading: string | null; body: string };

export type Playbook = PlaybookRef & {
  raw: string;
  /** Repo-relative file path, shown as record. */
  file: string;
  /** Text between the title and the first "## " heading. */
  lead: string;
  sections: Section[];
};

export const GROUP_ORDER = ["shared", "orchestrator", "growth", "technical", "finance", "design"];

/** Resolve a slug to its SKILL.md, refusing anything outside skills/. */
export function skillFile(slug: string): string {
  if (!/^[a-z0-9_]+(\/[a-z0-9_]+)?$/.test(slug)) {
    throw new Error(`not a playbook path: ${slug}`);
  }
  const file = path.resolve(SKILLS_ROOT, slug, "SKILL.md");
  if (!file.startsWith(SKILLS_ROOT + path.sep)) {
    throw new Error(`not a playbook path: ${slug}`);
  }
  return file;
}

export function parseFrontmatter(raw: string): { meta: Record<string, string>; rest: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, rest: raw };
  const meta: Record<string, string> = {};
  let key: string | null = null;
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (field) {
      key = field[1];
      meta[key] = field[2].trim();
    } else if (key && /^\s+\S/.test(line)) {
      // Folded continuation line.
      meta[key] = `${meta[key]} ${line.trim()}`.trim();
    }
  }
  return { meta, rest: raw.slice(match[0].length) };
}

export function parsePlaybook(slug: string, raw: string): Playbook {
  const { meta, rest } = parseFrontmatter(raw);
  const lines = rest.split(/\r?\n/);
  let title = meta.name ?? slug;
  const titleIndex = lines.findIndex((l) => /^# /.test(l));
  if (titleIndex >= 0) title = lines[titleIndex].replace(/^# /, "").trim();
  const body = titleIndex >= 0 ? lines.slice(titleIndex + 1) : lines;

  const sections: Section[] = [];
  const lead: string[] = [];
  let current: Section | null = null;
  let inFence = false;
  for (const line of body) {
    if (/^```/.test(line)) inFence = !inFence;
    if (!inFence && /^## /.test(line)) {
      current = { heading: line.replace(/^## /, "").trim(), body: "" };
      sections.push(current);
      continue;
    }
    if (current) current.body += `${line}\n`;
    else lead.push(line);
  }
  for (const s of sections) s.body = s.body.trim();

  return {
    slug,
    group: slug.includes("/") ? slug.split("/")[0] : "shared",
    name: meta.name ?? slug.split("/").pop()!,
    description: meta.description ?? "",
    title,
    raw,
    file: `skills/${slug}/SKILL.md`,
    lead: lead.join("\n").trim(),
    sections,
  };
}

export async function readPlaybook(slug: string): Promise<Playbook | null> {
  try {
    return parsePlaybook(slug, await fs.readFile(skillFile(slug), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writePlaybook(slug: string, text: string): Promise<void> {
  await fs.writeFile(skillFile(slug), text, "utf8");
}

/** Every SKILL.md under skills/, one or two levels deep. */
export async function listPlaybooks(): Promise<PlaybookRef[]> {
  const refs: PlaybookRef[] = [];
  const entries = await fs.readdir(SKILLS_ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const top = path.join(SKILLS_ROOT, entry.name);
    const children = await fs.readdir(top, { withFileTypes: true });
    if (children.some((c) => c.isFile() && c.name === "SKILL.md")) {
      const pb = await readPlaybook(entry.name);
      if (pb) refs.push(strip(pb));
    }
    for (const child of children) {
      if (!child.isDirectory()) continue;
      const pb = await readPlaybook(`${entry.name}/${child.name}`);
      if (pb) refs.push(strip(pb));
    }
  }
  return refs.sort(
    (a, b) =>
      GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.slug.localeCompare(b.slug),
  );
}

function strip(pb: Playbook): PlaybookRef {
  const { slug, group, name, description, title } = pb;
  return { slug, group, name, description, title };
}

/** Headings of sections whose text differs between two versions of a playbook. */
export function changedSections(before: string, after: string): Set<string> {
  const a = parsePlaybook("x", before);
  const b = parsePlaybook("x", after);
  const beforeBy = new Map(a.sections.map((s) => [s.heading ?? "", s.body]));
  const changed = new Set<string>();
  for (const s of b.sections) {
    if (beforeBy.get(s.heading ?? "") !== s.body) changed.add(s.heading ?? "");
  }
  if (a.lead !== b.lead || a.title !== b.title || a.description !== b.description) changed.add("");
  return changed;
}
