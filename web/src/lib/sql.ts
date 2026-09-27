import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import type { PGlite } from "@electric-sql/pglite";

// Two drivers behind one query function:
//
// - Postgres (default): DATABASE_URL, the docker-compose database the Hermes
//   instances and harness/mcp_server.py also write to.
// - Embedded (FOUNDER_AGENTS_DB=pglite, set by `npm run demo`): Postgres
//   compiled to WASM, running in this process, loaded with db/schema.sql and
//   db/seed_demo.sql. For looking at the dashboard without Docker. The teams
//   cannot see this database.

const REPO_ROOT = path.resolve(process.cwd(), "..");
const EMBEDDED_DIR = path.join(process.cwd(), ".pglite-demo");

export const embedded = process.env.FOUNDER_AGENTS_DB === "pglite";

type Driver = (text: string, params: unknown[]) => Promise<unknown[]>;

// Cached on globalThis so dev hot reloads reuse one pool / one database.
const g = globalThis as unknown as { faDriver?: Promise<Driver> };

export function query(text: string, params: unknown[] = []): Promise<unknown[]> {
  g.faDriver ??= embedded ? openEmbedded() : openPostgres();
  return g.faDriver.then((driver) => driver(text, params));
}

async function openPostgres(): Promise<Driver> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
  return async (text, params) => (await pool.query(text, params)).rows;
}

async function openEmbedded(): Promise<Driver> {
  const { PGlite } = await import("@electric-sql/pglite");
  const db: PGlite = await PGlite.create(EMBEDDED_DIR);
  // schema.sql is idempotent; applying it every start keeps the embedded
  // database on the current schema.
  await db.exec(await fs.readFile(path.join(REPO_ROOT, "db", "schema.sql"), "utf8"));
  const [{ n }] = (await db.query<{ n: number }>("select count(*)::int as n from agent_run_logs")).rows;
  if (n === 0) {
    await db.exec(await fs.readFile(path.join(REPO_ROOT, "db", "seed_demo.sql"), "utf8"));
  }
  return async (text, params) => (await db.query(text, params)).rows;
}
