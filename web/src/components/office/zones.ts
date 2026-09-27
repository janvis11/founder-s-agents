export type ZoneKey = "growth" | "technical" | "finance" | "design" | "orchestrator" | "reviewer" | "founder";

/** Each room's colour — its screens, shirts, label and floor tint. */
export const ZONE_COLOR: Record<ZoneKey, string> = {
  growth: "#f97316",
  technical: "#0ea5e9",
  finance: "#16a34a",
  design: "#9333ea",
  orchestrator: "#3a3dff",
  reviewer: "#64748b",
  founder: "#e8930c",
};

/** Soft floor colour for each room. */
export const ZONE_FLOOR: Record<ZoneKey, string> = {
  growth: "#ffe4cf",
  technical: "#d7f1ff",
  finance: "#d8f5e1",
  design: "#ecdcff",
  orchestrator: "#dfe3ff",
  reviewer: "#e9edf3",
  founder: "#fff0d4",
};
