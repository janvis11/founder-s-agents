import { connection } from "next/server";
import { currentCompany, query } from "@/lib/sql";
import { listPlaybooks, readPlaybook } from "@/lib/playbooks";

// GET /export: everything this office holds, as one JSON file the founder
// keeps. The data is theirs and leaves with them (PRODUCT.md, "Portable").
const TABLES = ["company_brain", "briefs", "work_orders", "drafts", "agent_run_logs", "playbook_amendments"];

export async function GET() {
  await connection();
  const slug = await currentCompany();
  // Signed in and a member of this company, or nothing (D9).
  if (!slug) {
    return new Response("Not found.", { status: 404 });
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
  const body = JSON.stringify({ product: "founders-corps", company: slug, exported_at: exportedAt, tables, playbooks }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="founders-corps-${slug}-${exportedAt.slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
