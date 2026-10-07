"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { addCompany, getCompany, renameCompany } from "@/lib/companies";
import { COMPANY_COOKIE, COOKIE_OPTIONS, checkPasscode, readLock, sessionCookie, sessionValid, setPasscode } from "@/lib/lock";
import { currentCompany, query, queryFor } from "@/lib/sql";
import { sendToOrchestrator } from "@/lib/gateway";
import { readPlaybook, writePlaybook } from "@/lib/playbooks";
import type { CompanyBrain, Decision, Draft } from "@/lib/db";
import { teamLabel } from "@/lib/teams";

// The dashboard binds to 127.0.0.1 (package.json) and, once a passcode is
// set, every action below checks the office lock itself: the proxy alone is
// not enough (Next docs, Data Security). Every action writes a receipt.

export type FormState = { ok?: boolean; error?: string; message?: string } | null;

async function receipt(
  skill: string,
  step: string,
  opts: { workOrderId?: string | null; inputs?: object; output?: object; company?: string } = {},
) {
  const run = opts.company ? (t: string, p: unknown[]) => queryFor(opts.company!, t, p) : query;
  await run(
    `insert into agent_run_logs (agent, skill, work_order_id, step, inputs, output)
     values ('founder', $1, $2, $3, $4, $5)`,
    [skill, opts.workOrderId ?? null, step, JSON.stringify(opts.inputs ?? {}), JSON.stringify(opts.output ?? {})],
  );
}

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function refreshAll() {
  revalidatePath("/", "layout");
}

/** Throws unless the caller holds the session of the company it is inside. */
async function requireFounder(): Promise<string> {
  const slug = await currentCompany();
  const jar = await cookies();
  if (!slug || !(await sessionValid(slug, jar.get(sessionCookie(slug))?.value))) {
    throw new Error("The office is locked. Enter it from the lobby with its passcode.");
  }
  return slug;
}

async function openSession(slug: string, token: string) {
  const jar = await cookies();
  jar.set(sessionCookie(slug), token, COOKIE_OPTIONS);
  jar.set(COMPANY_COOKIE, slug, COOKIE_OPTIONS);
}

function passcodeProblem(form: FormData): string | null {
  const passcode = String(form.get("passcode") ?? "");
  if (passcode.length < 6) return "Choose a passcode of at least 6 characters. It locks the office.";
  if (passcode !== String(form.get("passcode_again") ?? "")) return "The two passcodes do not match.";
  return null;
}

// Lobby -----------------------------------------------------------------------

/** Enter a company with its passcode, or set one if the company has none yet. */
export async function enterCompany(_prev: FormState, form: FormData): Promise<FormState> {
  const company = await getCompany(text(form, "company"));
  if (!company) return { error: "That company is not on this install." };
  const passcode = String(form.get("passcode") ?? "");
  let token: string | null;
  if (await readLock(company.slug)) {
    token = await checkPasscode(company.slug, passcode);
    if (!token) {
      // A small delay makes guessing slow without locking the founder out.
      await new Promise((r) => setTimeout(r, 800));
      return { error: "That passcode is not right." };
    }
  } else {
    const problem = passcodeProblem(form);
    if (problem) return { error: problem };
    token = await setPasscode(company.slug, passcode);
    await receipt("lock", "Set the office passcode", { company: company.slug });
  }
  await openSession(company.slug, token);
  redirect("/office");
}

/** Create a company: its own folder, database and passcode, then step inside. */
export async function createCompany(_prev: FormState, form: FormData): Promise<FormState> {
  const name = text(form, "name");
  const whatItDoes = text(form, "what_it_does");
  if (!name) return { error: "Give the company a name." };
  if (!whatItDoes) return { error: "Say what the product does. No team claims more than this." };
  const problem = passcodeProblem(form);
  if (problem) return { error: problem };

  const company = await addCompany(name);
  const brain: CompanyBrain = {
    company: { name, one_liner: text(form, "one_liner") || null, stage: text(form, "stage") || "idea" },
    product: { what_it_does: whatItDoes, current_state: null, live_url: null },
    icp: { who: text(form, "icp_who") || null, evidence: null },
    positioning: { differentiation: null, messaging: null },
    constraints: { runway_months: null, monthly_burn: null, founder_hours_per_week: null },
    decisions: [],
    priorities: [],
  };
  await queryFor(company.slug, "update company_brain set data = $1, updated_at = now() where id = 1", [JSON.stringify(brain)]);
  await receipt("company_brain", `Set up the company: ${name}`, { company: company.slug });
  const token = await setPasscode(company.slug, String(form.get("passcode")));
  await receipt("lock", "Set the office passcode", { company: company.slug });
  await openSession(company.slug, token);
  redirect("/office");
}

/** Lock this company's office and go back to the lobby. */
export async function lockOffice(): Promise<void> {
  const slug = await currentCompany();
  const jar = await cookies();
  if (slug) jar.delete(sessionCookie(slug));
  jar.delete(COMPANY_COOKIE);
  redirect("/");
}

// Desk --------------------------------------------------------------------

export async function sendBrief(_prev: FormState, form: FormData): Promise<FormState> {
  await requireFounder();
  const body = text(form, "body");
  if (!body) return { error: "Write the brief first." };

  const [brief] = (await query("insert into briefs (body) values ($1) returning id", [body])) as { id: number }[];
  await receipt("brief", `Sent brief ${brief.id} to the Orchestrator`, { inputs: { brief_id: brief.id } });

  const result = await sendToOrchestrator(body);
  if (result.ok) {
    await query("update briefs set status = 'answered', response = $2, answered_at = now() where id = $1", [
      brief.id,
      result.content,
    ]);
  } else {
    await query("update briefs set status = 'broken', error = $2 where id = $1", [brief.id, result.error]);
  }
  refreshAll();
  return result.ok ? { ok: true, message: `Brief ${brief.id} answered.` } : { error: result.error };
}

// Approvals -----------------------------------------------------------------

async function loadDraft(id: number): Promise<Draft | null> {
  const rows = (await query(
    `select d.*, (d.id = (select id from drafts x where x.work_order_id = d.work_order_id
                           order by created_at desc, id desc limit 1)) as is_latest
       from drafts d where d.id = $1`,
    [id],
  )) as (Draft & { is_latest: boolean })[];
  const draft = rows[0];
  return draft?.is_latest ? draft : null;
}

export async function approveDraft(form: FormData): Promise<void> {
  await requireFounder();
  const draft = await loadDraft(Number(form.get("draft_id")));
  // The blocked tier is enforced here as well as hidden in the interface.
  if (!draft || draft.tier !== "approve" || draft.verdict !== "pass" || draft.founder_decision) {
    throw new Error("This draft cannot be approved: it is not the latest passed draft awaiting approval.");
  }
  await query("update drafts set founder_decision = 'approved', decided_at = now() where id = $1", [draft.id]);
  await query("update work_orders set status = 'done', updated_at = now() where id = $1", [draft.work_order_id]);
  await receipt(draft.skill, "Approved draft", { workOrderId: draft.work_order_id, inputs: { draft_id: draft.id } });
  refreshAll();
}

export async function declineDraft(_prev: FormState, form: FormData): Promise<FormState> {
  await requireFounder();
  const draft = await loadDraft(Number(form.get("draft_id")));
  const note = text(form, "note");
  if (!draft || draft.tier !== "approve" || draft.founder_decision) {
    return { error: "This draft is no longer waiting on you." };
  }
  if (!note) return { error: `Say what ${teamLabel(draft.team)} should change.` };
  await query(
    "update drafts set founder_decision = 'declined', decision_note = $2, decided_at = now() where id = $1",
    [draft.id, note],
  );
  await query("update work_orders set status = 'pending', updated_at = now() where id = $1", [draft.work_order_id]);
  await receipt(draft.skill, `Declined draft, sent back to ${teamLabel(draft.team)}`, {
    workOrderId: draft.work_order_id,
    inputs: { draft_id: draft.id, note },
  });
  refreshAll();
  return { ok: true };
}

/** Blocked drafts are never executed here. This only records that the founder dealt with it elsewhere. */
export async function markHandled(form: FormData): Promise<void> {
  await requireFounder();
  const draft = await loadDraft(Number(form.get("draft_id")));
  if (!draft || draft.tier !== "blocked" || draft.decided_at) return;
  await query("update drafts set decided_at = now(), decision_note = 'Handled outside the system' where id = $1", [
    draft.id,
  ]);
  await receipt(draft.skill, "Marked held draft as handled outside the system", {
    workOrderId: draft.work_order_id,
    inputs: { draft_id: draft.id },
  });
  refreshAll();
}

// Contradictions --------------------------------------------------------------

async function readBrain(): Promise<CompanyBrain> {
  const [row] = (await query("select data from company_brain where id = 1")) as { data: CompanyBrain }[];
  return row?.data ?? {};
}

function decisionFrom(form: FormData): Decision | string {
  const decision = text(form, "decision");
  const reasoning = text(form, "reasoning");
  const revisit_if = text(form, "revisit_if");
  if (!decision) return "State the decision.";
  if (!reasoning) return "A decision without its reasoning is not recorded. Add why.";
  if (!revisit_if) return "Name the condition that would reopen this decision.";
  return { decision, reasoning, revisit_if, date: new Date().toISOString().slice(0, 10) };
}

export async function resolveContradiction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireFounder();
  const id = Number(form.get("draft_id"));
  const decision = decisionFrom(form);
  if (typeof decision === "string") return { error: decision };
  const brain = await readBrain();
  brain.decisions = [...(brain.decisions ?? []), decision];
  await query("update company_brain set data = $1, updated_at = now() where id = 1", [JSON.stringify(brain)]);
  const rows = (await query(
    "update drafts set contradiction_resolved_at = now() where id = $1 returning work_order_id, skill",
    [id],
  )) as { work_order_id: string; skill: string }[];
  await receipt("company_brain", "Recorded a decision on a contradiction", {
    workOrderId: rows[0]?.work_order_id,
    inputs: { draft_id: id },
    output: decision,
  });
  refreshAll();
  return { ok: true };
}

// Company brain -------------------------------------------------------------

function num(form: FormData, key: string): number | null {
  const raw = text(form, key);
  if (!raw) return null;
  const n = Number(raw.replace(/[,$]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function saveBrain(_prev: FormState, form: FormData): Promise<FormState> {
  await requireFounder();
  const brain = await readBrain();
  const orNull = (key: string) => text(form, key) || null;
  const next: CompanyBrain = {
    ...brain,
    company: { name: orNull("company.name"), one_liner: orNull("company.one_liner"), stage: orNull("company.stage") },
    product: {
      what_it_does: orNull("product.what_it_does"),
      current_state: orNull("product.current_state"),
      live_url: orNull("product.live_url"),
    },
    icp: { who: orNull("icp.who"), evidence: orNull("icp.evidence") },
    positioning: {
      differentiation: orNull("positioning.differentiation"),
      messaging: orNull("positioning.messaging"),
    },
    constraints: {
      runway_months: num(form, "constraints.runway_months"),
      monthly_burn: num(form, "constraints.monthly_burn"),
      founder_hours_per_week: num(form, "constraints.founder_hours_per_week"),
    },
    priorities: [0, 1, 2].map((i) => text(form, `priorities.${i}`)).filter(Boolean),
    // Decisions are append-only; this form never rewrites them.
    decisions: brain.decisions ?? [],
  };
  await query("update company_brain set data = $1, updated_at = now() where id = 1", [JSON.stringify(next)]);
  await receipt("company_brain", "Edited the company brain");
  refreshAll();
  return { ok: true, message: "Saved. Every team reads this before its next work order." };
}

export async function addDecision(_prev: FormState, form: FormData): Promise<FormState> {
  await requireFounder();
  const decision = decisionFrom(form);
  if (typeof decision === "string") return { error: decision };
  const brain = await readBrain();
  brain.decisions = [...(brain.decisions ?? []), decision];
  await query("update company_brain set data = $1, updated_at = now() where id = 1", [JSON.stringify(brain)]);
  await receipt("company_brain", "Recorded a decision", { output: decision });
  refreshAll();
  return { ok: true };
}

/** First run: the few facts every team needs before any work order. */
export async function setupCompany(_prev: FormState, form: FormData): Promise<FormState> {
  const slug = await requireFounder();
  const name = text(form, "name");
  const whatItDoes = text(form, "what_it_does");
  if (!name) return { error: "Give the company a name." };
  if (!whatItDoes) return { error: "Say what the product does. No team claims more than this." };
  const brain = await readBrain();
  const next: CompanyBrain = {
    ...brain,
    company: { ...brain.company, name, one_liner: text(form, "one_liner") || null, stage: text(form, "stage") || "idea" },
    product: { ...brain.product, what_it_does: whatItDoes },
    icp: { ...brain.icp, who: text(form, "icp_who") || null },
  };
  await query("update company_brain set data = $1, updated_at = now() where id = 1", [JSON.stringify(next)]);
  await renameCompany(slug, name);
  await receipt("company_brain", `Updated the company essentials: ${name}`);
  refreshAll();
  redirect("/office");
}

// Playbooks -------------------------------------------------------------------

export async function amendPlaybook(_prev: FormState, form: FormData): Promise<FormState> {
  await requireFounder();
  const slug = text(form, "slug");
  const reason = text(form, "reason");
  const after = String(form.get("text") ?? "").replace(/\r\n/g, "\n");
  const baseline = String(form.get("baseline") ?? "").replace(/\r\n/g, "\n");
  if (!reason) return { error: "Give the reason for this amendment. It is kept in the register." };

  const current = await readPlaybook(slug);
  if (!current) return { error: `There is no playbook at skills/${slug}/SKILL.md.` };
  const before = current.raw.replace(/\r\n/g, "\n");
  if (before !== baseline) {
    return { error: "This playbook changed on disk since you opened it. Reload to amend the current version." };
  }
  if (before === after) return { error: "Nothing has changed. Edit the text before entering an amendment." };
  if (!/^---\n(?:[\s\S]*?\n)?name:[\s\S]*?\n---\n/.test(after) || !/\n## Hard rules/.test(after)) {
    return { error: "A playbook needs its frontmatter (name, description) and a Hard rules section. Restore them." };
  }

  // Record first: if the database is down the file stays untouched.
  const [row] = (await query(
    `insert into playbook_amendments (skill_path, reason, before_text, after_text)
     values ($1, $2, $3, $4) returning id`,
    [slug, reason, before, after],
  )) as { id: number }[];
  await writePlaybook(slug, after);
  await receipt(slug.split("/").pop()!, `Amended playbook skills/${slug}/SKILL.md`, {
    inputs: { amendment_id: row.id, reason },
  });
  refreshAll();
  redirect(`/playbooks/${slug}?amended=${row.id}`);
}
