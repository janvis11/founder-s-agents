import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import type { PGlite } from "@electric-sql/pglite";

// Two drivers behind one query function:
//
// - Local (default): Postgres compiled to WASM, running in this process,
//   stored in web/.data/postgres. No Docker needed. db/schema.sql is applied
//   on every start, so the store always has the current tables.
// - Postgres (FOUNDER_AGENTS_DB=postgres): the server at DATABASE_URL, e.g.
//   the docker-compose database the Hermes instances and
//   harness/mcp_server.py write to.

const REPO_ROOT = path.resolve(process.cwd(), "..");
const LOCAL_DIR = path.join(process.cwd(), ".data", "postgres");

export const usingLocalStore = process.env.FOUNDER_AGENTS_DB !== "postgres";

type Driver = (text: string, params: unknown[]) => Promise<unknown[]>;

// Cached on globalThis so dev hot reloads reuse one pool / one database.
const g = globalThis as unknown as { faDriver?: Promise<Driver> };

export function query(text: string, params: unknown[] = []): Promise<unknown[]> {
  g.faDriver ??= usingLocalStore ? openLocal() : openPostgres();
  return g.faDriver.then((driver) => driver(text, params));
}

async function openPostgres(): Promise<Driver> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
  return async (text, params) => (await pool.query(text, params)).rows;
}

async function openLocal(): Promise<Driver> {
  const { PGlite } = await import("@electric-sql/pglite");
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  const db: PGlite = await PGlite.create(LOCAL_DIR);
  await db.exec(await fs.readFile(path.join(REPO_ROOT, "db", "schema.sql"), "utf8"));
  return async (text, params) => (await db.query(text, params)).rows;
}
