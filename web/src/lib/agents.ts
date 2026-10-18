import { readFile } from "node:fs/promises";
import path from "node:path";

// The six Hermes gateways and their ports (scripts/_profiles.py) and the
// runner's heartbeat file (harness/runner.py). Read on the server only.

export const AGENTS = [
  { id: "orchestrator", port: 8642 },
  { id: "growth", port: 8643 },
  { id: "technical", port: 8644 },
  { id: "finance", port: 8645 },
  { id: "design", port: 8646 },
  { id: "reviewer", port: 8647 },
] as const;

const HEARTBEAT = path.resolve(process.cwd(), "..", "harness", "logs", "runner.heartbeat");

export type AgentHealth = { id: string; up: boolean };

/** Which agents answer on their port right now. */
export async function agentHealth(): Promise<AgentHealth[]> {
  return Promise.all(
    AGENTS.map(async ({ id, port }) => {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`, {
          signal: AbortSignal.timeout(800),
          cache: "no-store",
        });
        return { id, up: response.ok };
      } catch {
        return { id, up: false };
      }
    }),
  );
}

/** Seconds since the runner last checked in, or null if it never has. */
export async function runnerSeen(): Promise<number | null> {
  try {
    const { at } = JSON.parse(await readFile(HEARTBEAT, "utf-8")) as { at: number };
    return Math.max(0, Date.now() / 1000 - at);
  } catch {
    return null;
  }
}
