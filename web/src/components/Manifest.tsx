import Link from "next/link";
import type { WorkOrder } from "@/lib/db";
import { age } from "@/lib/format";
import { teamLabel } from "@/lib/teams";
import { holder, isOpen } from "@/lib/workOrders";

/** Every work order as a manifest line. The row's edge is its tier copy. */
export function Manifest({ orders }: { orders: WorkOrder[] }) {
  const sorted = [...orders].sort((a, b) => {
    const rank = (w: WorkOrder) => (holder(w, orders).onYou ? 0 : isOpen(w) ? 1 : 2);
    return rank(a) - rank(b);
  });
  return (
    <table className="manifest">
      <caption className="visually-hidden">Work orders, newest open work first</caption>
      <thead>
        <tr>
          <th scope="col">No.</th>
          <th scope="col">Team</th>
          <th scope="col">Work</th>
          <th scope="col">Playbook</th>
          <th scope="col">Tier</th>
          <th scope="col">With</th>
          <th scope="col">Age</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((w) => {
          const h = holder(w, orders);
          return (
            <tr key={w.id} data-tier={w.tier} className={!isOpen(w) && !h.onYou ? "closed" : undefined}>
              <td>
                <Link className="wo-link" href={`/work-orders/${w.id}`}>
                  {w.id}
                </Link>
              </td>
              <td>{teamLabel(w.team)}</td>
              <td className="summary">{w.summary ?? w.skill}</td>
              <td className="mono">{w.skill}</td>
              <td className="tier-word">{w.tier}</td>
              <td className={h.onYou ? "on-you" : undefined}>{h.text}</td>
              <td className="mono muted">{age(w.created_at)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
