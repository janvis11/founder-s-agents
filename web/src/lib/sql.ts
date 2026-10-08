import { promises as fs } from "node:fs";
import path from "node:path";
import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import type { PGlite } from "@electric-sql/pglite";
import { COMPANY_HEADER, companyDir, getCompany, isSlug } from "./companies";
import { currentAccount, isMember } from "./accounts";

// Every company has its own database (D8): web/.data/companies/<slug>/postgres,
// opened in this process for the dashboard and served on the company's port
// (see companies.json) for that company's agents. db/schema.sql is applied
// on open, so every database always has the current tables.
//
// FOUNDER_AGENTS_DB=postgres uses the one server at DATABASE_URL instead
// (e.g. Docker). That mode holds a single company.

const REPO_ROOT = path.resolve(process.cwd(), "..");
export const usingDocker = process.env.FOUNDER_AGENTS_DB === "postgres";

type Driver = (text: string, params: unknown[]) => Promise<unknown[]>;

const g = globalThis as unknown as { fcDrivers?: Map<string, Promise<Driver>>; fcDocker?: Promise<Driver> };
const drivers = (g.fcDrivers ??= new Map());

/**
 * The company the current request is inside: the one the proxy passed on
 * from the founder's cookie, and only if the signed-in founder is a member
 * of it (D9). Anything else is treated as no company at all.
 */
export const currentCompany = cache(async (): Promise<string | null> => {
  let slug: string | null;
  try {
    slug = (await headers()).get(COMPANY_HEADER);
  } catch {
    return null;
  }
  if (!isSlug(slug)) return null;
  const account = await currentAccount();
  if (!account || !(await isMember(account.id, slug))) return null;
  return (await getCompany(slug)) ? slug : null;
});

/** Query the database of the company the current request is inside. */
export async function query(text: string, params: unknown[] = []): Promise<unknown[]> {
  const slug = await currentCompany();
  // Not signed in, not a member, or no such company: all look the same.
  if (!slug) redirect("/");
  return queryFor(slug, text, params);
}

export async function queryFor(slug: string, text: string, params: unknown[] = []): Promise<unknown[]> {
  if (usingDocker) {
    g.fcDocker ??= openDocker();
    return (await g.fcDocker)(text, params);
  }
  let driver = drivers.get(slug);
  if (!driver) {
    driver = openCompany(slug);
    drivers.set(slug, driver);
    driver.catch(() => drivers.delete(slug));
  }
  return (await driver)(text, params);
}

async function openDocker(): Promise<Driver> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
  return async (text, params) => (await pool.query(text, params)).rows;
}

async function openCompany(slug: string): Promise<Driver> {
  const company = await getCompany(slug);
  if (!company) throw new Error(`There is no company "${slug}" on this install.`);
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.join(companyDir(slug), "postgres");
  await fs.mkdir(dir, { recursive: true });
  const db: PGlite = await PGlite.create(dir);
  await db.exec(await fs.readFile(path.join(REPO_ROOT, "db", "schema.sql"), "utf8"));
  // Serve it for the agents' MCP server. The dashboard keeps working if the
  // port is taken; only the agents would miss it.
  try {
    const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");
    await new PGLiteSocketServer({ db, host: "127.0.0.1", port: company.port, maxConnections: 10 }).start();
  } catch (error) {
    console.error(`[aloft] could not serve ${slug} on port ${company.port}:`, error);
  }
  return async (text, params) => (await db.query(text, params)).rows;
}
