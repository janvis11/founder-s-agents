// `npm run dev`: one command for the whole office.
//
// 1. Opens the local database in web/.data/postgres and applies db/schema.sql.
// 2. Serves it as a Postgres server on 127.0.0.1:5434, so the dashboard AND
//    the agents' MCP server (harness/mcp_server.py) read and write the same
//    data. Point them there with DATABASE_URL in the root .env.
// 3. Starts the dashboard on http://127.0.0.1:3000.
//
// Set FOUNDER_AGENTS_DB=postgres in .env to use the Docker database instead;
// then this script only starts the dashboard.
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

const WEB = path.resolve(import.meta.dirname, "..");
const ROOT = path.resolve(WEB, "..");
dotenv.config({ path: path.join(ROOT, ".env"), quiet: true });

const PORT = Number(process.env.LOCAL_DB_PORT ?? 5434);
const LOCAL_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres`;

let stopDb = async () => {};
const env = { ...process.env };

if (process.env.FOUNDER_AGENTS_DB !== "postgres") {
  const { PGlite } = await import("@electric-sql/pglite");
  const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");
  const dir = path.join(WEB, ".data", "postgres");
  await mkdir(dir, { recursive: true });
  const db = await PGlite.create(dir);
  await db.exec(await readFile(path.join(ROOT, "db", "schema.sql"), "utf8"));
  const server = new PGLiteSocketServer({ db, host: "127.0.0.1", port: PORT, maxConnections: 10 });
  await server.start();
  console.log(`[founders-corps] database ready at ${LOCAL_URL}`);
  stopDb = async () => {
    await server.stop();
    await db.close();
  };
  env.FOUNDER_AGENTS_DB = "postgres";
  env.DATABASE_URL = LOCAL_URL;
}

const next = spawn("npx", ["next", "dev", "-H", "127.0.0.1"], { cwd: WEB, stdio: "inherit", shell: true, env });

const shutdown = async (code = 0) => {
  next.kill();
  await stopDb();
  process.exit(code);
};
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
next.on("exit", (code) => shutdown(code ?? 0));
