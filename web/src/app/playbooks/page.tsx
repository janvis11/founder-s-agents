import Link from "next/link";
import type { Metadata } from "next";
import { attempt, lastAmendedBySkill } from "@/lib/db";
import { stamp } from "@/lib/format";
import { GROUP_ORDER, listPlaybooks } from "@/lib/playbooks";
import { TEAM_ROLE, instancesUsing, teamLabel } from "@/lib/teams";
import { ZONE_COLOR, type ZoneKey } from "@/components/office/zones";

export const metadata: Metadata = { title: "Playbooks · Founders Corps" };

export default async function Playbooks() {
  const playbooks = await listPlaybooks();
  // Reading playbooks never needs the database; amendment dates are extra.
  const amended = await attempt(lastAmendedBySkill);
  const groups = GROUP_ORDER.map((g) => ({ group: g, items: playbooks.filter((p) => p.group === g) })).filter(
    (g) => g.items.length,
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="display">
            Playbooks <span className="accent">— the rulebook, in files you own.</span>
          </h1>
          <p>
            How each team decides, in files you own. A team follows its playbook step by step and the Reviewer checks every
            draft against the hard rules. Change a playbook and the team works differently.
          </p>
        </div>
        <span className="mono muted" style={{ fontSize: 12.5 }}>
          skills/ · {playbooks.length} playbooks
        </span>
      </div>

      {groups.map(({ group, items }) => (
        <section
          className="toc-group"
          key={group}
          aria-labelledby={`g-${group}`}
          style={{ ["--group" as string]: group === "shared" ? "#6b7bff" : ZONE_COLOR[group as ZoneKey] }}
        >
          <div>
            <h2 id={`g-${group}`}>{group === "shared" ? "Every team" : teamLabel(group)}</h2>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
              {group === "shared" ? "Injected into every work order and every review." : TEAM_ROLE[group]}
            </p>
          </div>
          <div className="toc-cards">
            {items.map((p) => {
              const at = amended.ok ? amended.value[p.slug] : undefined;
              return (
                <Link key={p.slug} href={`/playbooks/${p.slug}`} className="sheet toc-entry">
                  <div className="toc-title">{p.title}</div>
                  <p className="toc-desc">{p.description}</p>
                  <div className="draft-meta">
                    <span>skills/{p.slug}/SKILL.md</span>
                    <span>used by {instancesUsing(p.slug).map(teamLabel).join(", ") || "no instance"}</span>
                    {at && <span>amended {stamp(at)}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
