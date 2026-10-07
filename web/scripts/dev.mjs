// `npm run dev`: starts the dashboard on http://127.0.0.1:3000.
//
// Each company's database (web/.data/companies/<slug>/postgres) is opened
// by the dashboard the first time someone enters that company, and served
// on the company's port from web/.data/companies.json (the first company on
// 5434) so the agents' MCP server can reach it. See src/lib/sql.ts.
//
// Set FOUNDER_AGENTS_DB=postgres in the root .env to use the Docker database
// at DATABASE_URL instead.
import { spawn } from "node:child_process";
import path from "node:path";

const WEB = path.resolve(import.meta.dirname, "..");
const next = spawn("npx", ["next", "dev", "-H", "127.0.0.1"], { cwd: WEB, stdio: "inherit", shell: true });

const stop = () => next.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
next.on("exit", (code) => process.exit(code ?? 0));
