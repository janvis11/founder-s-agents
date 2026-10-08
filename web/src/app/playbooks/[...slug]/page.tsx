import Link from "next/link";
import { notFound } from "next/navigation";
import { attempt, listAmendments } from "@/lib/db";
import { lineDiff, diffCounts } from "@/lib/diff";
import { stamp } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { GROUP_ORDER, changedSections, listPlaybooks, readPlaybook } from "@/lib/playbooks";
import { instancesUsing, teamLabel } from "@/lib/teams";
import { AmendmentDesk } from "@/components/AmendmentDesk";
import { DiffView } from "@/components/DiffView";

export async function generateMetadata(props: PageProps<"/playbooks/[...slug]">) {
  const { slug } = await props.params;
  return { title: `${slug.join("/")} · Playbooks · Aloft` };
}

function sectionClass(heading: string | null) {
  if (!heading) return "";
  if (/^procedure/i.test(heading)) return "procedure";
  if (/^hard rules/i.test(heading)) return "hard-rules";
  return "";
}

export default async function PlaybookPage(props: PageProps<"/playbooks/[...slug]">) {
  const { slug: parts } = await props.params;
  const search = await props.searchParams;
  const slug = parts.join("/");
  let playbook;
  try {
    playbook = await readPlaybook(slug);
  } catch {
    notFound();
  }
  if (!playbook) notFound();

  const [all, register] = await Promise.all([listPlaybooks(), attempt(() => listAmendments(slug))]);
  const amending = search.amend === "1";
  const justAmended = typeof search.amended === "string" ? Number(search.amended) : null;
  const usedBy = instancesUsing(slug).map(teamLabel);

  // Mark sections changed by the latest amendment, while the file still matches it.
  const latest = register.ok ? register.value[0] : undefined;
  const normalized = playbook.raw.replace(/\r\n/g, "\n");
  const marked = latest && latest.after_text === normalized ? changedSections(latest.before_text, latest.after_text) : new Set<string>();

  return (
    <div className="book">
      <nav className="book-contents" aria-label="All playbooks">
        {GROUP_ORDER.map((g) => {
          const items = all.filter((p) => p.group === g);
          if (!items.length) return null;
          return (
            <div key={g}>
              <h4>{g === "shared" ? "Every team" : teamLabel(g)}</h4>
              {items.map((p) => (
                <Link key={p.slug} href={`/playbooks/${p.slug}`} aria-current={p.slug === slug ? "page" : undefined}>
                  {p.name}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      <article className="sheet manual">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <h1 className="display manual-title">{playbook.title}</h1>
          <div className="mode-switch" role="group" aria-label="Mode">
            <Link href={`/playbooks/${slug}`} aria-current={!amending ? "page" : undefined}>
              Read
            </Link>
            <Link href={`/playbooks/${slug}?amend=1`} aria-current={amending ? "page" : undefined}>
              Amend
            </Link>
          </div>
        </div>
        <div className="manual-file">
          <span>{playbook.file}</span>
          <span>used by {usedBy.join(", ") || "no instance"}</span>
          {latest && <span>last amended {stamp(latest.created_at)}</span>}
        </div>

        {amending ? (
          register.ok ? (
            <AmendmentDesk slug={slug} original={playbook.raw} usedBy={usedBy} />
          ) : (
            <p className="form-error" role="alert">
              Amendments are recorded in the database, and it is not answering: {register.reason} The playbook stays
              readable; start the database to amend it.
            </p>
          )
        ) : (
          <>
            <div className="when">
              <span className="label">When it runs</span>
              <p>{playbook.description}</p>
            </div>
            {playbook.lead && (
              <div className="lead" dangerouslySetInnerHTML={{ __html: renderMarkdown(playbook.lead) }} />
            )}
            {playbook.sections.map((s) => (
              <section key={s.heading} className={`book-section ${sectionClass(s.heading)}`}>
                <h2>
                  {s.heading}
                  {marked.has(s.heading ?? "") && latest && (
                    <span className="amended-mark" title={latest.reason}>
                      amended {stamp(latest.created_at)}
                    </span>
                  )}
                </h2>
                <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body) }} />
              </section>
            ))}
          </>
        )}
      </article>

      <aside className="register" aria-labelledby="register-title">
        <h2 className="section-title" id="register-title">
          Amendment register
        </h2>
        {!register.ok ? (
          <p className="empty">The register is kept in the database, which is not answering.</p>
        ) : register.value.length === 0 ? (
          <div className="empty">
            <p>No amendments yet. This playbook is as written in the repo.</p>
            {!amending && (
              <Link href={`/playbooks/${slug}?amend=1`} className="btn btn-quiet">
                Amend this playbook
              </Link>
            )}
          </div>
        ) : (
          <ol>
            {register.value.map((a) => {
              const lines = lineDiff(a.before_text, a.after_text);
              const { added, removed } = diffCounts(lines);
              return (
                <li key={a.id} className={a.id === justAmended ? "lands" : undefined}>
                  <div className="draft-meta">
                    <span>no. {a.id}</span>
                    <span>{stamp(a.created_at)}</span>
                    <span>
                      +{added} −{removed}
                    </span>
                  </div>
                  <p className="reason">{a.reason}</p>
                  <details open={a.id === justAmended}>
                    <summary>Show the change</summary>
                    <DiffView lines={lines} label={`Amendment ${a.id}`} />
                  </details>
                </li>
              );
            })}
          </ol>
        )}
      </aside>
    </div>
  );
}
