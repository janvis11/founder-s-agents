# Dashboard design

## Direction: Founder HQ, night shift

The dashboard is the founder's office. The home screen is a hand-drawn
isometric miniature of it (`src/components/office/`), one room per team,
driven by live data:

| Room | Props | Lights up when |
|---|---|---|
| Growth | pipeline whiteboard, two desks | a Growth work order is in progress or revising |
| Technical | server racks, dual-monitor desks, neon sign | Technical is working |
| Finance | vault, runway wall screen (shows `constraints.runway_months`) | Finance is working |
| Design | drafting table, swatch wall, moodboard | Design is working |
| Orchestrator | round hologram table in the centre | work orders are in flight |
| Reviewer | checkpoint counter with pass / bounce trays | drafts await review |
| Your desk | lamp, inbox stack (one sheet per draft waiting), pink lockbox when something is held | anything needs you |

Work orders travel between rooms as small sheets coloured by tier. A
contradiction draws a live rose arc between the two rooms, and the full
two-sided case sits under the office. Clicking a room opens its panel: work
orders, playbooks, counts.

References the founder asked for: the Hermes Agent site (electric blue,
thin condensed caps, framed page, terminal blocks) and Kami (dark,
cinematic, serif-italic accents).

## Tokens (`src/app/globals.css`)

- Night base `#05061a`, glass panels, blue hairlines.
- Electric blue `#3a3dff` for structure and the active nav.
- Tier colours: auto `#5dffa0`, approve `#ffb547` (lamp amber), blocked
  `#ff4d7a`. Blocked sheets keep the void pattern and have no controls.
- Room colours (`src/components/office/zones.ts`) identify teams in the
  office, contradiction sides and playbook groups.
- Type: Archivo condensed caps (display), Instrument Serif italic
  (accents), Source Serif 4 (reading), IBM Plex Mono (record).

## Kept from the first pass

The rules that carry product meaning still hold: blocked items are
read-only everywhere; contradictions are shown two-sided with no
recommendation; playbook edits are amendments with a diff and a required
reason; failures read as "broken", never as a team's decision. All motion
stops under `prefers-reduced-motion`.

This direction supersedes the restraint in
`meta/dashboard_design/ui_direction` (no team colours, no ambient motion,
no characters) at the founder's request.
