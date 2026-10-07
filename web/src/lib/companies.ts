import { promises as fs } from "node:fs";
import path from "node:path";

// The companies on this install (D8). Each has its own folder under
// web/.data/companies/<slug>/ holding its database and its passcode, so no
// two companies share a table. The registry file lists names and ports only.

export const DATA_DIR = path.join(process.cwd(), ".data");
const REGISTRY = path.join(DATA_DIR, "companies.json");
/** The first company's database is served on this port; each new one takes the next. */
export const FIRST_PORT = 5434;

/** Header the proxy sets on every request inside a company. Clients cannot set it. */
export const COMPANY_HEADER = "x-fc-company";

export type Company = { slug: string; name: string; port: number; created_at: string };

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export function isSlug(value: string | null | undefined): value is string {
  return typeof value === "string" && SLUG.test(value);
}

export function companyDir(slug: string): string {
  if (!isSlug(slug)) throw new Error(`not a company: ${slug}`);
  return path.join(DATA_DIR, "companies", slug);
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return base || "company";
}

async function readRegistry(): Promise<Company[]> {
  try {
    return JSON.parse(await fs.readFile(REGISTRY, "utf8")) as Company[];
  } catch {
    return [];
  }
}

async function writeRegistry(list: Company[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(REGISTRY, JSON.stringify(list, null, 2), "utf8");
}

const g = globalThis as unknown as { fcMigration?: Promise<void> };

/**
 * One-time move from the single-company layout (web/.data/postgres and
 * web/.data/lock.json) into web/.data/companies/<slug>/, so the company that
 * was already set up keeps all its data.
 */
function migrateSingleCompany(): Promise<void> {
  g.fcMigration ??= (async () => {
    const oldDb = path.join(DATA_DIR, "postgres");
    const exists = await fs.stat(oldDb).then(() => true, () => false);
    if (!exists || (await readRegistry()).length) return;
    const { PGlite } = await import("@electric-sql/pglite");
    const db = await PGlite.create(oldDb);
    let name = "My company";
    try {
      const { rows } = await db.query<{ name: string | null }>(
        "select data->'company'->>'name' as name from company_brain where id = 1",
      );
      name = rows[0]?.name || name;
    } finally {
      await db.close();
    }
    const company: Company = { slug: slugify(name), name, port: FIRST_PORT, created_at: new Date().toISOString() };
    const dir = companyDir(company.slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.rename(oldDb, path.join(dir, "postgres"));
    await fs.rename(path.join(DATA_DIR, "lock.json"), path.join(dir, "lock.json")).catch(() => {});
    await writeRegistry([company]);
  })();
  return g.fcMigration;
}

export async function listCompanies(): Promise<Company[]> {
  await migrateSingleCompany();
  return readRegistry();
}

export async function getCompany(slug: string): Promise<Company | null> {
  if (!isSlug(slug)) return null;
  return (await listCompanies()).find((c) => c.slug === slug) ?? null;
}

export async function addCompany(name: string): Promise<Company> {
  const list = await listCompanies();
  const base = slugify(name);
  let slug = base;
  for (let n = 2; list.some((c) => c.slug === slug); n++) slug = `${base}-${n}`.slice(0, 40);
  const port = list.reduce((max, c) => Math.max(max, c.port), FIRST_PORT - 1) + 1;
  const company: Company = { slug, name, port, created_at: new Date().toISOString() };
  await fs.mkdir(companyDir(slug), { recursive: true });
  await writeRegistry([...list, company]);
  return company;
}

/** Keep the lobby's name in step with the company brain. */
export async function renameCompany(slug: string, name: string): Promise<void> {
  const list = await listCompanies();
  await writeRegistry(list.map((c) => (c.slug === slug ? { ...c, name } : c)));
}
