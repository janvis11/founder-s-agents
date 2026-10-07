@AGENTS.md

# Dashboard notes (web/)

Next.js 16 App Router, React 19, TypeScript, Tailwind v4 present but styling
is plain CSS in `src/app/globals.css`.

## Layout

- `src/app/` pages: `/` lobby, `/new` create a company, `/enter/[slug]`
  passcode, `/office` office home, `/approvals`, `/work-orders/[id]`,
  `/playbooks` and `/playbooks/[...slug]` (read and amend), `/ledger`
  (receipts), `/brain`, `/setup` (company essentials), `/export` (JSON
  backup route). `actions.ts` holds every server action.
- `src/components/office/` the isometric office: `iso.ts` projection
  helpers, `zones.ts` room colours (shared by server and client),
  `Office.tsx` the SVG scene, room labels and the slide-in room drawer.
- `src/lib/`: `companies.ts` registry (`web/.data/companies.json`), one
  folder per company, one-time move of the old single-company layout;
  `sql.ts` one database per company (`query` uses the current company,
  `queryFor(slug)` an explicit one); `db.ts` typed queries; `lock.ts`
  passcode and session per company; `office.ts` maps work orders onto rooms,
  `playbooks.ts` reads and writes `../skills`, `gateway.ts` calls the
  Orchestrator, `teams.ts`, `workOrders.ts`, `format.ts`, `diff.ts`,
  `markdown.ts`, `rubric.ts`.
- `src/proxy.ts` (Next 16 name for middleware): `/`, `/new` and
  `/enter/*` are open; every other path needs the session of the company in
  the `fc_company` cookie, else it redirects to the lobby. It is the only
  place the `x-fc-company` request header is set (and it strips any client
  copy); `sql.ts` reads the current company from that header.
- `src/instrumentation.ts` opens every company's database at server start
  so each is served on its port for the agents straight away.
- `scripts/dev.mjs` is `npm run dev`: starts `next dev` on 127.0.0.1. The
  dashboard process itself opens the databases and runs one PGlite socket
  server per company.

## Rules that matter

- Every server action inside a company calls `requireFounder()` first; it
  returns the company slug. The proxy alone is not enough (Next docs, Data
  Security). Lobby actions (`enterCompany`, `createCompany`) run outside a
  company and use `queryFor(slug)`.
- Every founder action writes a receipt (`agent_run_logs`, agent
  `founder`).
- Blocked tier is enforced server side too, not just hidden in the UI.
- Never open a company's database folder from two processes at once:
  stop the running server before starting another, or before moving or
  deleting anything under `web/.data`.
- Bind to 127.0.0.1 (no login beyond the passcode).

## Gotchas hit before

- A class named `.contents` collided with Tailwind's `contents` utility
  (display: contents). Check class names against Tailwind utilities.
- A server component cannot read a constant exported from a "use client"
  file; shared constants go in a plain module (that is why `zones.ts`
  exists).
- New routes need `npx next typegen` before `tsc` knows `PageProps<"/x">`.
- After big edits the dev server can serve stale server HTML (hydration
  mismatch on colours). Restart it and delete `.next/dev` if so.
- `npx tsc --noEmit` takes minutes on this machine; run in background.
- Screenshots in the browser pane fail after programmatic scrolling with an
  emulated viewport; use a tall viewport instead, or read the page text.
- The Windows browser pane opens `localhost`, but the server binds
  127.0.0.1: navigate to http://127.0.0.1:3000.

## Design state

White theme, large edge-to-edge office, every office object coloured,
each room its own colour (see `zones.ts`), amber for what needs the founder,
rose for blocked. `DESIGN.md` describes an earlier direction; the code is
the source of truth. Janvi rejects: plain or boring layouts, pure black and
white, bluish dark themes, glow effects.
