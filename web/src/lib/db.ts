import { connection } from "next/server";
import { query as run } from "./sql";
import type { Tier } from "./teams";

export type WorkOrderStatus = "pending" | "in_progress" | "done" | "bounced" | "escalated" | "stopped";

export type WorkOrder = {
  id: string;
  team: string;
  skill: string;
  summary: string | null;
  brief_id: number | null;
  tier: Tier;
  status: WorkOrderStatus;
  inputs: Record<string, unknown>;
  acceptance_criteria: string[];
  depends_on: string[];
  created_at: Date;
  updated_at: Date;
  // Derived: the latest draft's state, so the manifest can say who holds it.
  latest_verdict: "pass" | "fail" | null;
  latest_decision: "approved" | "declined" | null;
  attempts: number;
};

export type Contradiction = {
  with: string;
  about?: string;
  their_position: string;
  their_depends_on?: string;
  our_position: string;
  our_depends_on?: string;
  why_it_matters: string;
};

export type Draft = {
  id: number;
  work_order_id: string;
  team: string;
  skill: string;
  summary: string | null;
  content: Record<string, unknown>;
  tier: Tier;
  verdict: "pass" | "fail" | null;
  failed_checks: string[];
  required_fixes: string[];
  retry_count: number;
  contradiction: Contradiction | null;
  contradiction_resolved_at: Date | null;
  founder_decision: "approved" | "declined" | null;
  decision_note: string | null;
  decided_at: Date | null;
  created_at: Date;
};

export type Receipt = {
  id: number;
  agent: string;
  skill: string;
  work_order_id: string | null;
  step: string;
  inputs: Record<string, unknown>;
  output: Record<string, unknown>;
  verdict: string | null;
  created_at: Date;
};

export type Brief = {
  id: number;
  body: string;
  status: "sent" | "working" | "answered" | "broken" | "stopped";
  response: string | null;
  error: string | null;
  created_at: Date;
  answered_at: Date | null;
};

export type Decision = {
  decision: string;
  reasoning: string;
  date: string;
  revisit_if: string;
};

export type CompanyBrain = {
  company?: { name?: string | null; one_liner?: string | null; stage?: string | null };
  product?: { what_it_does?: string | null; current_state?: string | null; live_url?: string | null };
  icp?: { who?: string | null; evidence?: string | null };
  positioning?: { differentiation?: string | null; messaging?: string | null };
  constraints?: {
    runway_months?: number | null;
    monthly_burn?: number | null;
    founder_hours_per_week?: number | null;
  };
  decisions?: Decision[];
  priorities?: string[];
};

export type Amendment = {
  id: number;
  skill_path: string;
  reason: string;
  before_text: string;
  after_text: string;
  created_at: Date;
};

/** A query that could not reach Postgres. Rendered as "broken", never as an empty state. */
export class DatabaseUnavailable extends Error {}

async function q<T>(text: string, params: unknown[] = []): Promise<T[]> {
  await connection();
  try {
    return (await run(text, params)) as T[];
  } catch (error) {
    const code = (error as { code?: string }).code;
    // Connection-level failures (refused, timeout, unknown host, missing
    // relation from an unapplied schema) are infrastructure, not data.
    if (
      code === "ECONNREFUSED" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND" ||
      code === "42P01" ||
      code === "42703" ||
      /timeout|ECONNREFUSED|connect/i.test(String(error))
    ) {
      throw new DatabaseUnavailable(describe(error));
    }
    throw error;
  }
}

function describe(error: unknown): string {
  const code = (error as { code?: string }).code;
  if (code === "42P01" || code === "42703") {
    return "The database is missing tables or columns the dashboard needs. Apply db/schema.sql.";
  }
  const target = process.env.DATABASE_URL?.replace(/\/\/[^@]*@/, "//") ?? "DATABASE_URL (unset)";
  return `Postgres is not answering at ${target}.`;
}

const WORK_ORDER_SELECT = `
  select w.id, w.team, w.skill, w.summary, w.brief_id, w.tier, w.status, w.inputs,
         w.acceptance_criteria, w.depends_on, w.created_at, w.updated_at,
         d.verdict as latest_verdict, d.founder_decision as latest_decision,
         coalesce(n.attempts, 0)::int as attempts
    from work_orders w
    left join lateral (
      select verdict, founder_decision from drafts
       where work_order_id = w.id order by created_at desc, id desc limit 1
    ) d on true
    left join lateral (
      select count(*) as attempts from drafts where work_order_id = w.id
    ) n on true`;

export function listWorkOrders(): Promise<WorkOrder[]> {
  return q<WorkOrder>(`${WORK_ORDER_SELECT} order by w.created_at desc, w.id desc limit 50`);
}

export async function getWorkOrder(id: string): Promise<WorkOrder | null> {
  const rows = await q<WorkOrder>(`${WORK_ORDER_SELECT} where w.id = $1`, [id]);
  return rows[0] ?? null;
}

export function listDraftsFor(workOrderId: string): Promise<Draft[]> {
  return q<Draft>(
    "select * from drafts where work_order_id = $1 order by created_at asc, id asc",
    [workOrderId],
  );
}

export function listAllDrafts(): Promise<Draft[]> {
  return q<Draft>("select * from drafts order by created_at asc, id asc");
}

/** The latest draft of every work order — what is actually in front of the founder. */
export function listLatestDrafts(): Promise<Draft[]> {
  return q<Draft>(`
    select distinct on (work_order_id) *
      from drafts
     order by work_order_id, created_at desc, id desc`);
}

export async function listBouncesByWorkOrder(): Promise<Record<string, Draft[]>> {
  const rows = await q<Draft>(
    "select * from drafts where verdict = 'fail' order by created_at asc, id asc",
  );
  const grouped: Record<string, Draft[]> = {};
  for (const draft of rows) (grouped[draft.work_order_id] ??= []).push(draft);
  return grouped;
}

export function listOpenContradictions(): Promise<Draft[]> {
  return q<Draft>(`
    select * from drafts
     where contradiction is not null and contradiction_resolved_at is null
     order by created_at desc`);
}

export function listReceipts(opts: { limit?: number; agent?: string; workOrderId?: string } = {}): Promise<Receipt[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.agent) {
    params.push(opts.agent);
    where.push(`agent = $${params.length}`);
  }
  if (opts.workOrderId) {
    params.push(opts.workOrderId);
    where.push(`work_order_id = $${params.length}`);
  }
  params.push(opts.limit ?? 200);
  return q<Receipt>(
    `select * from agent_run_logs ${where.length ? `where ${where.join(" and ")}` : ""}
      order by created_at desc, id desc limit $${params.length}`,
    params,
  );
}

export function listReceiptAgents(): Promise<{ agent: string; count: number }[]> {
  return q(`select agent, count(*)::int as count from agent_run_logs group by agent order by agent`);
}

export function listBriefs(limit = 8): Promise<Brief[]> {
  return q<Brief>("select * from briefs order by created_at desc, id desc limit $1", [limit]);
}

export async function getCompanyBrain(): Promise<{ data: CompanyBrain; updated_at: Date } | null> {
  const rows = await q<{ data: CompanyBrain; updated_at: Date }>(
    "select data, updated_at from company_brain where id = 1",
  );
  return rows[0] ?? null;
}

export function listAmendments(skillPath?: string): Promise<Amendment[]> {
  return skillPath
    ? q<Amendment>(
        "select * from playbook_amendments where skill_path = $1 order by created_at desc, id desc",
        [skillPath],
      )
    : q<Amendment>("select * from playbook_amendments order by created_at desc, id desc");
}

export async function lastAmendedBySkill(): Promise<Record<string, Date>> {
  const rows = await q<{ skill_path: string; at: Date }>(
    "select skill_path, max(created_at) as at from playbook_amendments group by skill_path",
  );
  return Object.fromEntries(rows.map((r) => [r.skill_path, r.at]));
}

/** Run a loader; turn an unreachable database into a value the page can render. */
export async function attempt<T>(load: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; reason: string }> {
  try {
    return { ok: true, value: await load() };
  } catch (error) {
    if (error instanceof DatabaseUnavailable) return { ok: false, reason: error.message };
    throw error;
  }
}
