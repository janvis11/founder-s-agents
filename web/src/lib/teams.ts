// Team topology as the dashboard presents it. Which playbooks each Hermes
// instance runs mirrors TEAMS in scripts/_profiles.py — keep the two in step.

export const TEAMS = ["growth", "technical", "finance", "design"] as const;
export type Team = (typeof TEAMS)[number];

export type Tier = "auto" | "approve" | "blocked";

export const TEAM_LABEL: Record<string, string> = {
  orchestrator: "Orchestrator",
  growth: "Growth",
  technical: "Technical",
  finance: "Finance",
  design: "Design",
  reviewer: "Reviewer",
  founder: "You",
};

export const TEAM_ROLE: Record<string, string> = {
  orchestrator: "Plans and routes. Never does a team's work.",
  growth: "Sales and marketing",
  technical: "Product and engineering",
  finance: "Runway, burn, unit economics",
  design: "Product design and brand identity",
};

// Instance -> playbooks synced into it (scripts/_profiles.py).
export const INSTANCE_PLAYBOOKS: Record<string, string[]> = {
  orchestrator: ["business_rules", "review_rubric", "orchestrator/planning"],
  growth: ["business_rules", "growth/outreach_draft", "growth/positioning_check"],
  technical: ["business_rules", "technical/scope_mvp"],
  finance: ["business_rules", "finance/runway_tracker"],
  design: ["business_rules", "design/product_design_direction", "design/brand_identity"],
};

export function instancesUsing(playbook: string): string[] {
  return Object.entries(INSTANCE_PLAYBOOKS)
    .filter(([, playbooks]) => playbooks.includes(playbook))
    .map(([instance]) => instance);
}

export function teamLabel(team: string | null | undefined): string {
  if (!team) return "";
  return TEAM_LABEL[team] ?? team;
}

export const TIER_MEANING: Record<Tier, string> = {
  auto: "Filed without approval",
  approve: "Needs your approval before it leaves",
  blocked: "Held for you. No team can do this.",
};
