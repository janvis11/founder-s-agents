// `npm run demo` — the dashboard on an embedded Postgres with demo data, no
// Docker needed. See src/lib/sql.ts. Delete web/.pglite-demo to reset.
import { spawn } from "node:child_process";

const child = spawn("npx", ["next", "dev", "-H", "127.0.0.1"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, FOUNDER_AGENTS_DB: "pglite" },
});
child.on("exit", (code) => process.exit(code ?? 0));
