"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { amendPlaybook } from "@/app/actions";
import { diffCounts, lineDiff } from "@/lib/diff";
import { DiffView } from "./DiffView";

function EnterButton({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={!ready || pending}>
      {pending ? "Entering amendment…" : "Enter amendment"}
    </button>
  );
}

/**
 * Editing a playbook is amending the company's rulebook: the change is shown
 * as a diff before it is entered, and a reason is required.
 */
export function AmendmentDesk({ slug, original, usedBy }: { slug: string; original: string; usedBy: string[] }) {
  const baseline = original.replace(/\r\n/g, "\n");
  const [text, setText] = useState(baseline);
  const [reason, setReason] = useState("");
  const [state, action] = useActionState(amendPlaybook, null);

  const lines = useMemo(() => (text === baseline ? [] : lineDiff(baseline, text)), [baseline, text]);
  const { added, removed } = diffCounts(lines);
  const changed = lines.length > 0;

  return (
    <form action={action} className="amend">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="baseline" value={baseline} />

      <div className="form-row" style={{ marginBottom: 0 }}>
        <label className="label" htmlFor="amend-text">
          skills/{slug}/SKILL.md
        </label>
        <textarea
          id="amend-text"
          name="text"
          className="textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
      </div>

      <section aria-labelledby="amend-changes">
        <h3 className="section-title" id="amend-changes" style={{ fontSize: 16 }}>
          Changes{" "}
          <span className="count">
            {changed ? `+${added} −${removed}` : "none yet"}
          </span>
        </h3>
        {changed ? (
          <DiffView lines={lines} label="Changes in this amendment" />
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Edit the text above. Every line you change shows here before you enter it.
          </p>
        )}
      </section>

      <div className="form-row">
        <label className="label" htmlFor="amend-reason">
          Reason for this amendment — kept in the register
        </label>
        <input
          id="amend-reason"
          name="reason"
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What went wrong, or what should the team do differently"
        />
      </div>

      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <EnterButton ready={changed && reason.trim().length > 0} />
        <Link href={`/playbooks/${slug}`} className="btn btn-quiet">
          Discard
        </Link>
        <span className="muted" style={{ fontSize: 13.5, flexBasis: "100%" }}>
          Writes the file in this repo. {usedBy.join(", ")} {usedBy.length === 1 ? "works" : "work"} from the new
          version after the next <span className="mono">python scripts/sync_skills.py</span>. Run{" "}
          <span className="mono">evals/</span> before and after, once it exists.
        </span>
      </div>
    </form>
  );
}
