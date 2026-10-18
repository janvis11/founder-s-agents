import Link from "next/link";
import { agentHealth, runnerSeen } from "@/lib/agents";
import { attempt, getOfficeState, lastFailure, listRunningActivity } from "@/lib/db";
import { stamp } from "@/lib/format";
import { teamLabel } from "@/lib/teams";
import { ZONE_COLOR, type ZoneKey } from "@/components/office/zones";
import { LiveRefresh } from "./LiveRefresh";
import { PauseOffice, StopWorkOrder } from "./StopControls";

export function elapsed(from: Date | string, to: Date | string = new Date()): string {
  const seconds = Math.max(0, Math.round((+new Date(to) - +new Date(from)) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  return m < 60 ? `${m} min ${seconds % 60}s` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** What the office is doing right now: is the runner on, which agents are
 *  up, who is working on what and for how long, and what the model is
 *  doing about trouble. Refreshes itself while anything runs. */
export async function LiveBar({ alsoActive = false }: { alsoActive?: boolean }) {
  const [agents, seen, state] = await Promise.all([
    agentHealth(),
    runnerSeen(),
    attempt(() => Promise.all([listRunningActivity(), getOfficeState(), lastFailure()])),
  ]);
  if (!state.ok) return null;
  const [running, office, failure] = state.value;
  const runnerOn = seen !== null && seen < 20;
  const allUp = agents.every((a) => a.up);

  return (
    <section className="live" aria-label="What the office is doing" aria-live="polite">
      <LiveRefresh active={alsoActive || running.length > 0} />
      <div className="live-row">
        <span className="live-state" data-on={runnerOn}>
          <span className="live-dot" /> Runner {runnerOn ? "on" : "off"}
        </span>
        <span className="live-agents" aria-label="Agents">
          {agents.map((a) => (
            <span key={a.id} className="live-agent" data-up={a.up} title={`${teamLabel(a.id)} is ${a.up ? "up" : "down"}`}>
              <span className="live-dot" style={a.up ? { background: ZONE_COLOR[a.id as ZoneKey] } : undefined} />
              {teamLabel(a.id)}
            </span>
          ))}
        </span>
        <span className="live-actions">
          <PauseOffice paused={office.paused} />
          <Link href="/activity" className="stop-btn">
            Activity →
          </Link>
        </span>
      </div>

      <div className="live-now">
        {!runnerOn || !allUp ? (
          <p className="live-off">
            {!runnerOn ? "The runner is off, so briefs wait. " : "Some agents are down. "}
            Start everything with <code>python scripts/start_agents.py</code> (the dashboard keeps running on its own).
          </p>
        ) : null}
        {office.paused && (
          <p className="live-paused">
            Paused by you{office.paused_at ? ` at ${stamp(office.paused_at)}` : ""}. No new work starts until you resume.
            {running.length > 0 && " What is already running finishes."}
          </p>
        )}
        {running.map((a) => {
          const secs = (Date.now() - +new Date(a.started_at)) / 1000;
          return (
            <div key={a.id} className="live-task">
              <span className="live-dot live-pulse" style={{ background: ZONE_COLOR[a.agent as ZoneKey] ?? "var(--auto)" }} />
              <div>
                <div>
                  <b>{a.action}</b>
                  <span className="mono muted">
                    {" "}
                    · {elapsed(a.started_at)}
                    {a.model ? ` · ${a.model}` : ""}
                  </span>
                </div>
                {a.detail ? (
                  <div className="live-detail">{a.detail}</div>
                ) : secs > 90 ? (
                  <div className="live-hint">Waiting for the model. Free models can take a few minutes per answer.</div>
                ) : (
                  <div className="live-hint">Waiting for the model.</div>
                )}
              </div>
              {a.work_order_id && <StopWorkOrder workOrderId={a.work_order_id} />}
            </div>
          );
        })}
        {running.length === 0 && runnerOn && !office.paused && (
          <p className="live-idle">
            Nobody is working right now.
            {failure && (
              <span className="live-detail">
                {" "}
                Last problem, {stamp(failure.started_at)}: {failure.detail ?? failure.action}
              </span>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
