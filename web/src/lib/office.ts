import type { OfficeProps, ZoneKey, ZoneOrder, ZoneState } from "@/components/office/Office";
import type { Draft, WorkOrder } from "./db";
import { INSTANCE_PLAYBOOKS, TEAMS, TEAM_ROLE, teamLabel } from "./teams";
import { holder, isOpen } from "./workOrders";
import { plural } from "./format";

const books = (instance: string) =>
  (INSTANCE_PLAYBOOKS[instance] ?? []).map((slug) => ({ slug, name: slug.split("/").pop()! }));

/** Turn work orders and drafts into what each room of the office shows. */
export function buildOffice(
  orders: WorkOrder[],
  latest: Draft[],
  allDrafts: Draft[],
  contradictions: Draft[],
  runwayMonths: number | null,
  companyName: string,
): OfficeProps {
  const waitingDrafts = latest.filter((d) => d.tier === "approve" && d.verdict === "pass" && !d.founder_decision);
  const heldDrafts = latest.filter((d) => d.tier === "blocked" && !d.decided_at);
  const toOrder = (w: WorkOrder): ZoneOrder => ({
    id: w.id,
    summary: w.summary ?? w.skill,
    holder: holder(w, orders).text,
    tier: w.tier,
  });

  const zones = {} as Record<ZoneKey, ZoneState>;
  for (const team of TEAMS) {
    const mine = orders.filter((w) => w.team === team);
    const open = mine.filter(isOpen);
    const revising = mine.filter((w) => w.latest_verdict === "fail" && isOpen(w));
    const working = open.find((w) => w.status === "in_progress");
    const waiting = waitingDrafts.filter((d) => d.team === team).length;
    const held = heldDrafts.filter((d) => d.team === team).length;
    const status = revising.length
      ? `revising after a bounce · ${revising[0].id}`
      : working
        ? `working on ${working.id}`
        : open.length
          ? `${plural(open.length, "work order")} queued`
          : waiting
            ? `${waiting} waiting on you`
            : "idle";
    zones[team] = {
      label: teamLabel(team),
      role: TEAM_ROLE[team],
      status,
      working: Boolean(working || revising.length),
      inFlight: open.length,
      waiting,
      held,
      orders: mine.map(toOrder),
      playbooks: books(team),
    };
  }

  const inFlight = orders.filter(isOpen);
  zones.orchestrator = {
    label: "Orchestrator",
    role: TEAM_ROLE.orchestrator,
    status: inFlight.length ? `routing ${plural(inFlight.length, "work order")}` : "waiting for a brief",
    working: inFlight.length > 0,
    inFlight: inFlight.length,
    waiting: 0,
    held: 0,
    orders: inFlight.map(toOrder),
    playbooks: books("orchestrator").filter((b) => b.slug.startsWith("orchestrator")),
  };

  const passes = allDrafts.filter((d) => d.verdict === "pass").length;
  const bounces = allDrafts.filter((d) => d.verdict === "fail").length;
  const unreviewed = allDrafts.filter((d) => d.verdict === null);
  zones.reviewer = {
    label: "Reviewer",
    role: "A checklist, not an opinion. Checks every draft against the rubric and your business rules. No tools, no discretion.",
    status: `${passes} passed · ${bounces} bounced`,
    working: unreviewed.length > 0,
    inFlight: unreviewed.length,
    waiting: 0,
    held: 0,
    orders: [],
    playbooks: [
      { slug: "review_rubric", name: "review_rubric" },
      { slug: "business_rules", name: "business_rules" },
    ],
  };

  const onYou = orders.filter((w) => holder(w, orders).onYou);
  zones.founder = {
    label: "You",
    role: "The only person here. Nothing leaves the building without your sign-off, and nothing blocked happens at all.",
    status: waitingDrafts.length || heldDrafts.length ? `${waitingDrafts.length} to approve · ${heldDrafts.length} held` : "all clear",
    working: waitingDrafts.length > 0,
    inFlight: 0,
    waiting: waitingDrafts.length,
    held: heldDrafts.length,
    orders: onYou.map(toOrder),
    playbooks: [],
  };

  const flows: OfficeProps["flows"] = [];
  const push = (from: ZoneKey, to: ZoneKey, tier: string) => {
    if (!flows.some((f) => f.from === from && f.to === to)) flows.push({ from, to, tier });
  };
  for (const w of inFlight) {
    const team = w.team as ZoneKey;
    if (w.latest_verdict === "fail") push("reviewer", team, "blocked");
    else if (w.attempts === 0) push("orchestrator", team, w.tier);
  }
  if (waitingDrafts.length) push("reviewer", "founder", "approve");
  for (const d of heldDrafts) push(d.team as ZoneKey, "founder", "blocked");

  const disputes = contradictions
    .filter((d) => d.contradiction)
    .map((d) => ({
      a: d.team as ZoneKey,
      b: (d.contradiction!.with as ZoneKey) ?? "founder",
      about: d.contradiction!.about ?? "a decision",
    }));

  return { zones, flows, disputes, runwayMonths, companyName };
}
