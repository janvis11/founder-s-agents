@AGENTS.md

# Dashboard notes (web/)

Next.js 16 App Router, React 19, TypeScript, Tailwind v4 present but styling
is plain CSS in `src/app/globals.css`.

## Layout

- `src/app/` pages: `/` office home, `/approvals`, `/work-orders/[id]`,
  `/playbooks` and `/playbooks/[...slug]` (read and amend), `/ledger`
  (receipts), `/brain`, `/setup` (first run), `/unlock`, `/export` (JSON
  backup route). `actions.ts` holds every server action.
- `src/components/office/` the isometric office: `iso.ts` projection
  helpers, `zones.ts` room colours (shared by server and client),
  `Office.tsx` the SVG scene, room labels and the slide-in room drawer.
- `src/lib/`: `sql.ts` database driver, `db.ts` typed queries, `lock.ts`
  passcode and session, `office.ts` maps work orders onto rooms,
  `playbooks.ts` reads and writes `../skills`, `gateway.ts` calls the
  Orchestrator, `teams.ts`, `workOrders.ts`, `format.ts`, `diff.ts`,
  `markdown.ts`, `rubric.ts`.
- `src/proxy.ts` (Next 16 name for middleware) redirects to `/unlock` when
  a passcode is set and the session cookie is missing.
- `scripts/dev.mjs` is `npm run dev`: starts PGlite with the socket server
  on 127.0.0.1:5434, then `next dev`. `npm run dev:dashboard` starts only
  the dashboard (then `sql.ts` opens the database in-process).

## Rules that matter

- Every server action calls `requireFounder()` first. The proxy alone is
  not enough (Next docs, Data Security).
- Every founder action writes a receipt (`agent_run_logs`, agent
  `founder`).
- Blocked tier is enforced server side too, not just hidden in the UI.
- Never open `web/.data/postgres` from two processes at once: stop the
  running server before starting another one on the same folder.
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
