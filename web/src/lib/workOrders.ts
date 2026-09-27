import type { WorkOrder } from "./db";
import { teamLabel } from "./teams";

/** Who holds a work order right now, in the founder's terms. */
export function holder(wo: WorkOrder, all: WorkOrder[] = []): { text: string; onYou: boolean } {
  const team = teamLabel(wo.team);
  if (wo.status === "escalated") return { text: "Escalated to you after two bounces", onYou: true };
  if (wo.latest_decision === "approved") return { text: "Approved by you", onYou: false };
  if (wo.latest_decision === "declined") return { text: `Declined, back with ${team}`, onYou: false };
  if (wo.tier === "blocked" && wo.latest_verdict === "pass") return { text: "Held for you", onYou: true };
  if (wo.latest_verdict === "fail") {
    return { text: `Bounced, ${team} revising (attempt ${wo.attempts + 1})`, onYou: false };
  }
  if (wo.latest_verdict === "pass" && wo.tier === "approve") return { text: "Waiting on you", onYou: true };
  if (wo.status === "done") return { text: "Filed", onYou: false };
  if (wo.status === "pending") {
    const open = wo.depends_on.filter((id) => {
      const dep = all.find((w) => w.id === id);
      return !dep || dep.status !== "done";
    });
    if (open.length) return { text: `Waits on ${open.join(", ")}`, onYou: false };
    return { text: `Queued for ${team}`, onYou: false };
  }
  return { text: `${team} is working`, onYou: false };
}

export function isOpen(wo: WorkOrder) {
  return wo.status === "pending" || wo.status === "in_progress" || wo.status === "escalated";
}
