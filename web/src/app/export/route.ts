import { cookies } from "next/headers";
import { connection } from "next/server";
import { query } from "@/lib/sql";
import { SESSION_COOKIE, sessionValid } from "@/lib/lock";
import { listPlaybooks, readPlaybook } from "@/lib/playbooks";

// GET /export: everything this office holds, as one JSON file the founder
// keeps. The data is theirs and leaves with them (PRODUCT.md, "Portable").
const TABLES = ["company_brain", "briefs", "work_orders", "drafts", "agent_run_logs", "playbook_amendments"];

export async function GET() {
  await connection();
  if (!(await sessionValid((await cookies()).get(SESSION_COOKIE)?.value))) {
    return new Response("The office is locked.", { status: 401 });
  }
  const tables: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    tables[table] = await query(`select * from ${table} order by 1`);
  }
  const playbooks: Record<string, string> = {};
  for (const ref of await listPlaybooks()) {
    const pb = await readPlaybook(ref.slug);
    if (pb) playbooks[pb.file] = pb.raw;
  }
  const exportedAt = new Date().toISOString();
  const body = JSON.stringify({ product: "founders-corps", exported_at: exportedAt, tables, playbooks }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="founders-corps-backup-${exportedAt.slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
