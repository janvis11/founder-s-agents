import { renderMarkdown } from "@/lib/markdown";

type Signal = { what?: string; date?: string; source?: string };
type Citation = { claim?: string; source?: string };

// Keys this renderer lays out. Anything else a team returns is shown as record.
const KNOWN = new Set(["body", "recipient", "signal", "citations", "limitations", "blocked_action", "rule", "word_count"]);

export function DraftContent({ content, struck = false }: { content: Record<string, unknown>; struck?: boolean }) {
  const body = typeof content.body === "string" ? content.body : null;
  const recipient = typeof content.recipient === "string" ? content.recipient : null;
  const signal = (content.signal ?? null) as Signal | null;
  const citations = Array.isArray(content.citations) ? (content.citations as Citation[]) : [];
  const limitations = typeof content.limitations === "string" ? content.limitations : null;
  const extra = Object.fromEntries(Object.entries(content).filter(([k]) => !KNOWN.has(k)));

  if (struck) {
    return body ? <p className="struck">{body}</p> : null;
  }

  return (
    <div>
      {(recipient || signal) && (
        <div className="fields signal">
          {recipient && (
            <div className="field">
              <span className="label">To</span>
              <span className="field-value">{recipient}</span>
            </div>
          )}
          {signal?.what && (
            <div className="field" style={{ gridColumn: "span 2" }}>
              <span className="label">Signal{signal.date ? `, ${signal.date}` : ""}</span>
              <span className="field-value">{signal.what}</span>
              {signal.source && <div className="mono muted">{signal.source}</div>}
            </div>
          )}
        </div>
      )}
      {body && <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />}
      {typeof content.word_count === "number" && (
        <p className="mono muted" style={{ marginTop: 8 }}>
          {content.word_count} words
        </p>
      )}
      {citations.length > 0 && (
        <div className="citations">
          <span className="label">Sources</span>
          <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0" }}>
            {citations.map((c, i) => (
              <li key={i}>
                <span>{c.claim}</span>
                <span className="mono">{c.source}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {limitations && (
        <div className="limitations">
          <span className="label">Stated limitations</span>
          <p style={{ margin: "2px 0 0" }}>{limitations}</p>
        </div>
      )}
      {Object.keys(extra).length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary className="label" style={{ cursor: "pointer" }}>
            Other fields in this draft
          </summary>
          <pre className="mono" style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
            {JSON.stringify(extra, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
