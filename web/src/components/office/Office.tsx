"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { U, iso, pt, pts, rng, shade, type P3 } from "./iso";
import { ZONE_COLOR, ZONE_FLOOR, type ZoneKey } from "./zones";

export type { ZoneKey };

// ---------------------------------------------------------------- data shape

export type ZoneOrder = { id: string; summary: string; holder: string; tier: string };

export type ZoneState = {
  label: string;
  role: string;
  status: string;
  working: boolean;
  inFlight: number;
  waiting: number;
  held: number;
  orders: ZoneOrder[];
  playbooks: { slug: string; name: string }[];
};

export type OfficeProps = {
  zones: Record<ZoneKey, ZoneState>;
  disputes: { a: ZoneKey; b: ZoneKey; about: string }[];
  flows: { from: ZoneKey; to: ZoneKey; tier: string }[];
  runwayMonths: number | null;
  companyName: string;
  /** Headline and stats, laid over the sky above the office. */
  children?: ReactNode;
  /**
   * Arrival mode for the sign-in and sign-up screens: the building starts
   * dark and `lit` rooms (0 to 7) have their lights on. No clicks, no drawer.
   */
  arrival?: { lit: number };
};

/** The order rooms light up as a founder arrives. */
const ARRIVAL_ORDER: ZoneKey[] = ["founder", "orchestrator", "growth", "technical", "finance", "design", "reviewer"];

// ---------------------------------------------------------------- palette

const P = {
  wood: "#b97a45",
  woodTop: "#dba673",
  woodDark: "#8a5a31",
  wall: "#f3ede3",
  wallSide: "#e7dfd1",
  wallTop: "#d8cdb9",
  skirting: "#b97a45",
  floor: "#efe3cf",
  floorLine: "#d9c7a8",
  base: "#c9b391",
  baseSide: "#b39c79",
  bezel: "#2d3142",
  bezelTop: "#454a60",
  steel: "#8f9bb0",
  steelTop: "#b6c0d1",
  pot: "#c9663f",
  leaf1: "#3fae62",
  leaf2: "#2e8b4f",
  leaf3: "#5cc97f",
  white: "#ffffff",
  paper: "#fbfbf7",
  ink: "#0d1030",
  hair: "#3b2a20",
  sofa: "#3b5bdb",
  sofaTop: "#5c7cfa",
  rug: "#e07a4f",
};
const SKINS = ["#f1d2b6", "#c98e62", "#8d5a3b", "#e8b995", "#a86f48"];
const STICKIES = ["#ffd43b", "#ff8fab", "#8ce99a", "#74c0fc"];

// ---------------------------------------------------------------- floor plan

const W = 26;
const D = 18;
const WALL = 5.2;

const ZONES: Record<ZoneKey, { x: number; y: number; w: number; d: number; label: P3; anchor: P3 }> = {
  growth: { x: 0, y: 0, w: 9, d: 7, label: [4.5, 0.2, 6.3], anchor: [3.6, 3.4, 1.3] },
  technical: { x: 9, y: 0, w: 8, d: 7, label: [13, 0.2, 6.3], anchor: [12.2, 3.4, 1.3] },
  finance: { x: 17, y: 0, w: 9, d: 7, label: [21.5, 0.2, 6.3], anchor: [19.6, 3.6, 1.3] },
  design: { x: 0, y: 7, w: 9, d: 11, label: [4.6, 12.4, 2.6], anchor: [3, 12, 1.3] },
  orchestrator: { x: 9, y: 7, w: 9, d: 6, label: [13.5, 10, 4.6], anchor: [13.5, 10, 1.8] },
  reviewer: { x: 18, y: 7, w: 8, d: 6, label: [22, 9.4, 3.3], anchor: [21.4, 9.2, 1.4] },
  founder: { x: 9, y: 13, w: 17, d: 5, label: [17.2, 15.6, 2.8], anchor: [17, 15, 1.2] },
};

// ---------------------------------------------------------------- primitives

type Item = { key: number; el: ReactNode };

function Box({
  x, y, z = 0, w, d, h, color, top, stroke,
}: {
  x: number; y: number; z?: number; w: number; d: number; h: number; color: string; top?: string; stroke?: string;
}) {
  const t = top ?? shade(color, 0.22);
  const s = stroke ?? shade(color, -0.3);
  return (
    <g>
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={color} stroke={s} strokeWidth={0.6} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={shade(color, -0.18)} stroke={s} strokeWidth={0.6} />
      <polygon points={pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={t} stroke={s} strokeWidth={0.6} />
    </g>
  );
}

function Desk({ x, y, w = 2.6, d = 1.2, color = P.wood, top = P.woodTop }: { x: number; y: number; w?: number; d?: number; color?: string; top?: string }) {
  return (
    <g>
      <Box x={x + 0.08} y={y + 0.08} w={0.12} d={d - 0.16} h={0.68} color={P.woodDark} />
      <Box x={x + w - 0.2} y={y + 0.08} w={0.12} d={d - 0.16} h={0.68} color={P.woodDark} />
      <Box x={x} y={y} z={0.68} w={w} d={d} h={0.09} color={color} top={top} />
    </g>
  );
}

function Monitor({ x, y, z = 0.77, w = 0.9, color, active }: { x: number; y: number; z?: number; w?: number; color: string; active: boolean }) {
  const face = y + 0.1;
  const lines = [0.48, 0.38, 0.28, 0.18];
  return (
    <g>
      <Box x={x + w / 2 - 0.06} y={y} z={z} w={0.12} d={0.1} h={0.14} color={P.bezel} />
      <Box x={x} y={y} z={z + 0.12} w={w} d={0.1} h={0.62} color={P.bezel} top={P.bezelTop} />
      <polygon
        points={pts([[x + 0.05, face, z + 0.17], [x + w - 0.05, face, z + 0.17], [x + w - 0.05, face, z + 0.7], [x + 0.05, face, z + 0.7]])}
        fill={active ? color : "#3c4258"}
        className={active ? "screen-on" : undefined}
      />
      {active &&
        lines.map((lz, i) => {
          const a = iso(x + 0.14, face, z + 0.12 + lz);
          const b = iso(x + 0.14 + (w - 0.3) * (0.45 + ((i * 37) % 50) / 100), face, z + 0.12 + lz);
          return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#ffffff" strokeOpacity={0.85} strokeWidth={1.3} className="type-line" style={{ animationDelay: `${i * 0.45}s` }} />;
        })}
    </g>
  );
}

function Person({ x, y, z = 0, color, active, seated = true, skin = SKINS[0] }: { x: number; y: number; z?: number; color: string; active: boolean; seated?: boolean; skin?: string }) {
  const foot = pt(x, y, 0);
  const base = pt(x, y, z);
  const bodyH = (seated ? 0.62 : 1.05) * U;
  return (
    <g className={active ? "bob" : undefined}>
      <ellipse cx={foot.x} cy={foot.y} rx={9} ry={4.5} fill="#000" opacity={0.15} />
      {!seated && <rect x={base.x - 6} y={base.y - 0.42 * U} width={12} height={0.42 * U} rx={3} fill="#2f3a56" />}
      <rect x={base.x - 7} y={base.y - bodyH} width={14} height={seated ? bodyH : bodyH - 0.4 * U} rx={6} fill={color} stroke={shade(color, -0.3)} strokeWidth={0.8} />
      <circle cx={base.x} cy={base.y - bodyH - 5} r={6.2} fill={skin} stroke={shade(skin, -0.3)} strokeWidth={0.8} />
      <path d={`M ${base.x - 6.2} ${base.y - bodyH - 6} a 6.2 6.2 0 0 1 12.4 0 z`} fill={P.hair} />
    </g>
  );
}

function Chair({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <Box x={x + 0.3} y={y + 0.3} w={0.1} d={0.1} h={0.42} color="#4a4f63" />
      <Box x={x} y={y} z={0.42} w={0.7} d={0.7} h={0.1} color={color} />
    </g>
  );
}

function ChairBack({ x, y, color }: { x: number; y: number; color: string }) {
  return <Box x={x} y={y + 0.62} z={0.52} w={0.7} d={0.1} h={0.62} color={color} />;
}

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const c = pt(x + 0.3, y + 0.3, 0.5 + 0.55 * s);
  return (
    <g>
      <Box x={x} y={y} w={0.6} d={0.6} h={0.5} color={P.pot} />
      <circle cx={c.x - 8 * s} cy={c.y + 4} r={9 * s} fill={P.leaf2} />
      <circle cx={c.x + 8 * s} cy={c.y + 3} r={9 * s} fill={P.leaf1} />
      <circle cx={c.x} cy={c.y - 7 * s} r={10 * s} fill={P.leaf3} />
    </g>
  );
}

function Workstation({ x, y, color, active, dual, seat = true, skin }: { x: number; y: number; color: string; active: boolean; dual?: boolean; seat?: boolean; skin?: string }) {
  const chair = shade(color, -0.25);
  return (
    <g>
      <Desk x={x} y={y} />
      {dual ? (
        <>
          <Monitor x={x + 0.4} y={y + 0.15} w={0.85} color={color} active={active} />
          <Monitor x={x + 1.35} y={y + 0.15} w={0.85} color={color} active={active} />
        </>
      ) : (
        <Monitor x={x + 0.85} y={y + 0.15} color={color} active={active} />
      )}
      <Box x={x + 0.9} y={y + 0.72} z={0.77} w={0.8} d={0.3} h={0.03} color="#e9ecf2" />
      <Box x={x + 2.0} y={y + 0.75} z={0.77} w={0.22} d={0.22} h={0.24} color={shade(color, 0.3)} />
      {seat && (
        <>
          <Chair x={x + 0.95} y={y + 1.45} color={chair} />
          <Person x={x + 1.3} y={y + 1.75} z={0.5} color={color} active={active} skin={skin} />
          <ChairBack x={x + 0.95} y={y + 1.45} color={chair} />
        </>
      )}
    </g>
  );
}

// ---------------------------------------------------------------- walls

type Plane = "y0" | "x0";
function onWall(plane: Plane, a: number, b: number, z1: number, z2: number): P3[] {
  return plane === "y0"
    ? [[a, 0, z1], [b, 0, z1], [b, 0, z2], [a, 0, z2]]
    : [[0, a, z1], [0, b, z1], [0, b, z2], [0, a, z2]];
}
function wallPt(plane: Plane, a: number, z: number) {
  return plane === "y0" ? pt(a, 0, z) : pt(0, a, z);
}

function Window({ plane, a, b, seed, id }: { plane: Plane; a: number; b: number; seed: number; id: string }) {
  const z1 = 1.7;
  const z2 = 4.5;
  const r = rng(seed);
  const buildings: ReactNode[] = [];
  const towers = ["#9fb4d9", "#b7c6e4", "#8aa3cf", "#c5d2ea"];
  let cursor = a;
  while (cursor < b) {
    const bw = 0.35 + r() * 0.6;
    const bh = 0.4 + r() * 1.6;
    const end = Math.min(b, cursor + bw);
    buildings.push(<polygon key={`b${cursor}`} points={pts(onWall(plane, cursor, end, z1, z1 + bh))} fill={towers[Math.floor(r() * towers.length)]} />);
    for (let wz = z1 + 0.15; wz < z1 + bh - 0.1; wz += 0.22) {
      for (let wa = cursor + 0.08; wa < end - 0.08; wa += 0.16) {
        if (r() > 0.55) {
          const p = wallPt(plane, wa, wz);
          buildings.push(<rect key={`w${wa}-${wz}`} x={p.x} y={p.y} width={2.2} height={2.2} fill="#e8f1ff" opacity={0.9} />);
        }
      }
    }
    cursor = end;
  }
  const cloud = wallPt(plane, a + (b - a) * 0.35, z2 - 0.45);
  return (
    <g>
      <clipPath id={id}>
        <polygon points={pts(onWall(plane, a, b, z1, z2))} />
      </clipPath>
      <polygon points={pts(onWall(plane, a, b, z1, z2))} fill="url(#sky)" />
      <g clipPath={`url(#${id})`}>
        <ellipse cx={cloud.x} cy={cloud.y} rx={14} ry={5} fill="#ffffff" opacity={0.9} />
        <ellipse cx={cloud.x + 10} cy={cloud.y - 3} rx={9} ry={4} fill="#ffffff" opacity={0.9} />
        {buildings}
      </g>
      <polygon points={pts(onWall(plane, a, b, z1, z2))} fill="none" stroke="#ffffff" strokeWidth={2.4} />
      <polygon points={pts(onWall(plane, a, b, z1, z2))} fill="none" stroke="#b9a88c" strokeWidth={0.8} />
      <polyline points={pts(plane === "y0" ? [[(a + b) / 2, 0, z1], [(a + b) / 2, 0, z2]] : [[0, (a + b) / 2, z1], [0, (a + b) / 2, z2]])} stroke="#ffffff" strokeWidth={2} />
      <polygon points={pts(onWall(plane, a - 0.1, b + 0.1, z1 - 0.12, z1))} fill="#d8cdb9" />
    </g>
  );
}

function Walls({ runway, disputeGrowthFinance }: { runway: number | null; disputeGrowthFinance: boolean }) {
  const bars = [0.55, 0.7, 0.62, 0.8, 0.74, 0.92, 0.86];
  return (
    <g>
      {/* wall faces */}
      <polygon points={pts([[0, 0, 0], [W, 0, 0], [W, 0, WALL], [0, 0, WALL]])} fill={P.wall} />
      <polygon points={pts([[0, 0, 0], [0, D, 0], [0, D, WALL], [0, 0, WALL]])} fill={P.wallSide} />
      {/* accent paint behind each back room */}
      <polygon points={pts(onWall("y0", 0, 9, 0, 1.2))} fill="#fcd9bd" />
      <polygon points={pts(onWall("y0", 9, 17, 0, 1.2))} fill="#c7ecff" />
      <polygon points={pts(onWall("y0", 17, W, 0, 1.2))} fill="#c9efd6" />
      <polygon points={pts(onWall("x0", 7, D, 0, 1.2))} fill="#e3cffb" />
      <polygon points={pts(onWall("x0", 0, 7, 0, 1.2))} fill="#f7d1b4" />
      {/* wall tops (thickness) */}
      <polygon points={pts([[-0.35, -0.35, WALL], [W, -0.35, WALL], [W, 0, WALL], [0, 0, WALL], [0, D, WALL], [-0.35, D, WALL]])} fill={P.wallTop} stroke="#bfb198" strokeWidth={0.8} />
      <polygon points={pts([[W, -0.35, WALL], [W, 0, WALL], [W, 0, 0], [W, -0.35, 0]])} fill="#cbbfa8" />
      <polygon points={pts([[-0.35, D, WALL], [0, D, WALL], [0, D, 0], [-0.35, D, 0]])} fill="#d8cdb9" />
      {/* wooden skirting */}
      <polyline points={pts([[0, D, 0.06], [0, 0, 0.06], [W, 0, 0.06]])} fill="none" stroke={P.skirting} strokeWidth={3} />

      {/* Growth: pipeline whiteboard with sticky notes */}
      <polygon points={pts(onWall("y0", 0.9, 4.4, 1.6, 4.1))} fill="#ffffff" stroke="#9aa3b8" strokeWidth={1.4} />
      {[0, 1, 2, 3].map((i) =>
        [0, 1, 2].slice(0, 3 - (i % 2)).map((j) => (
          <polygon key={`${i}-${j}`} points={pts(onWall("y0", 1.1 + i * 0.82, 1.7 + i * 0.82, 3.35 - j * 0.55, 3.75 - j * 0.55))} fill={STICKIES[(i + j) % 4]} />
        )),
      )}
      <polyline points={pts([[1.1, 0, 1.85], [2.1, 0, 2.05], [3.1, 0, 1.95], [4.2, 0, 2.35]])} fill="none" stroke="#f97316" strokeWidth={1.8} />

      <Window plane="y0" a={5.1} b={8.4} seed={3} id="win1" />
      <Window plane="y0" a={9.7} b={12.6} seed={7} id="win2" />
      <Window plane="y0" a={13.2} b={14.4} seed={11} id="win3" />
      <Window plane="x0" a={1.4} b={5.8} seed={19} id="win4" />

      {/* Technical: neon sign */}
      {(() => {
        const p = pt(15.6, 0, 4.55);
        return (
          <text className="neon" fill="#0ea5e9" fontSize={13} textAnchor="middle" transform={`translate(${p.x} ${p.y}) skewY(30)`}>
            {"</ship>"}
          </text>
        );
      })()}

      {/* Finance: runway screen */}
      <polygon points={pts(onWall("y0", 19.8, 24.6, 1.8, 4.5))} fill="#1f2937" stroke="#374151" strokeWidth={1.6} />
      {bars.map((h, i) => (
        <polygon
          key={i}
          points={pts(onWall("y0", 20.2 + i * 0.6, 20.55 + i * 0.6, 2.0, 2.0 + h * 1.6))}
          fill={i === bars.length - 1 ? "#facc15" : "#22c55e"}
          className="bar-grow"
          style={{ animationDelay: `${i * 0.08}s` }}
        />
      ))}
      {(() => {
        const p = pt(20.3, 0, 4.25);
        return (
          <text fill="#86efac" fontSize={9} className="mono-svg" transform={`translate(${p.x} ${p.y}) skewY(30)`}>
            RUNWAY {runway != null ? `${runway} MO` : "—"}
          </text>
        );
      })()}
      {disputeGrowthFinance && (
        <polygon points={pts(onWall("y0", 19.8, 24.6, 1.8, 4.5))} fill="none" stroke="#e11d48" strokeWidth={1.6} className="alert-blink" />
      )}

      {/* Design: swatches and moodboard */}
      {["#9333ea", "#ec4899", "#f59e0b", "#06b6d4", "#22c55e", "#3a3dff"].map((c, i) => (
        <polygon key={c} points={pts(onWall("x0", 7.9 + (i % 3) * 1.15, 8.85 + (i % 3) * 1.15, i < 3 ? 3.2 : 2.2, i < 3 ? 4.1 : 3.1))} fill={c} />
      ))}
      <polygon points={pts(onWall("x0", 12.4, 16.8, 1.7, 4.3))} fill="#fff7ed" stroke="#c4b5fd" strokeWidth={1.2} />
      {[
        [12.7, 13.9, 3.1, 4.0, "#f472b6"],
        [14.1, 15.5, 3.4, 4.1, "#a78bfa"],
        [15.7, 16.5, 2.6, 4.0, "#fbbf24"],
        [12.7, 14.4, 1.9, 2.9, "#60a5fa"],
        [14.6, 15.5, 1.9, 3.2, "#34d399"],
      ].map(([a, b, z1, z2, c]) => (
        <polygon key={`${a}-${z1}`} points={pts(onWall("x0", a as number, b as number, z1 as number, z2 as number))} fill={c as string} />
      ))}
      {/* wall clock over the orchestrator side */}
      {(() => {
        const p = pt(0, 6.4, 4.2);
        return (
          <g>
            <ellipse cx={p.x} cy={p.y} rx={9} ry={10} fill="#ffffff" stroke={P.wood} strokeWidth={2} />
            <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 6} stroke={P.ink} strokeWidth={1.4} />
            <line x1={p.x} y1={p.y} x2={p.x - 4} y2={p.y + 2} stroke={P.ink} strokeWidth={1.4} />
          </g>
        );
      })()}
    </g>
  );
}

// ---------------------------------------------------------------- zone furniture

function zoneItems(z: Record<ZoneKey, ZoneState>, held: number, waiting: number): Item[] {
  const c = ZONE_COLOR;
  const items: Item[] = [];
  const add = (key: number, el: ReactNode) => items.push({ key, el });

  // Growth
  add(4.4, <Workstation key="g1" x={1.2} y={2.0} color={c.growth} active={z.growth.working} skin={SKINS[0]} />);
  add(8.2, <Workstation key="g2" x={4.9} y={2.0} color={c.growth} active={z.growth.working && z.growth.inFlight > 1} skin={SKINS[2]} />);
  add(8.8, <Plant key="gp" x={7.9} y={0.6} />);
  add(
    12.2,
    <g key="gc">
      <Box x={7.4} y={4.6} w={1.1} d={0.8} h={1.15} color="#e5e7eb" top="#f3f4f6" />
      <Box x={7.55} y={4.75} z={1.15} w={0.5} d={0.4} h={0.35} color="#fb923c" />
    </g>,
  );

  // Technical
  add(13.4, <Workstation key="t1" x={9.9} y={2.0} color={c.technical} active={z.technical.working} dual skin={SKINS[1]} />);
  add(16.0, <Workstation key="t2" x={12.5} y={2.0} color={c.technical} active={false} dual seat={false} />);
  [15.0, 16.0].forEach((rx, i) =>
    add(
      rx + 0.8,
      <g key={`rack${i}`}>
        <Box x={rx} y={0.35} w={0.9} d={0.9} h={3.3} color="#2d3142" top="#454a60" />
        {Array.from({ length: 8 }, (_, r) =>
          [0.22, 0.55].map((ox, k) => {
            const p = pt(rx + ox, 1.25, 0.35 + r * 0.36);
            return <circle key={`${r}-${k}`} cx={p.x} cy={p.y} r={1.6} fill={(r + k + i) % 3 === 0 ? "#22c55e" : "#38bdf8"} className="led" style={{ animationDelay: `${((r * 7 + k * 3 + i * 5) % 11) * 0.23}s` }} />;
          }),
        )}
      </g>,
    ),
  );

  // Finance
  add(22.0, <Workstation key="f1" x={18.2} y={2.2} color={c.finance} active={z.finance.working} skin={SKINS[3]} />);
  add(
    26.0,
    <g key="safe">
      <Box x={24.1} y={0.5} w={1.5} d={1.3} h={1.8} color={P.steel} top={P.steelTop} />
      {(() => {
        const p = pt(24.85, 1.8, 0.95);
        return (
          <g>
            <ellipse cx={p.x} cy={p.y} rx={8} ry={9} fill="#6b778c" stroke="#facc15" strokeWidth={1.6} />
            <line x1={p.x} y1={p.y} x2={p.x + 4} y2={p.y - 5} stroke="#facc15" strokeWidth={1.6} />
          </g>
        );
      })()}
    </g>,
  );
  add(28.4, <Plant key="fp" x={23.2} y={5.6} s={0.8} />);

  // Design: drafting table + tablet desk
  add(
    11.4,
    <g key="draft">
      <Box x={1.5} y={9.3} w={0.12} d={1.2} h={0.95} color={P.woodDark} />
      <Box x={3.9} y={9.3} w={0.12} d={1.2} h={0.95} color={P.woodDark} />
      <polygon points={pts([[1.4, 9.2, 1.08], [4.1, 9.2, 1.08], [4.1, 10.7, 0.72], [1.4, 10.7, 0.72]])} fill="#ffffff" stroke="#c4b5fd" strokeWidth={1} />
      <polyline points={pts([[1.8, 9.6, 1.0], [2.6, 10.0, 0.93], [3.2, 9.7, 1.0], [3.7, 10.3, 0.85]])} fill="none" stroke="#9333ea" strokeWidth={1.8} />
      <polygon points={pts([[2.2, 10.1, 0.92], [2.9, 10.1, 0.92], [2.9, 10.5, 0.82], [2.2, 10.5, 0.82]])} fill="#f472b6" />
    </g>,
  );
  add(
    14.0,
    <g key="dperson">
      <Chair x={2.35} y={11.1} color={shade(c.design, -0.25)} />
      <Person x={2.7} y={11.4} z={0.5} color={c.design} active={z.design.working} skin={SKINS[4]} />
      <ChairBack x={2.35} y={11.1} color={shade(c.design, -0.25)} />
    </g>,
  );
  add(16.4, <Workstation key="d2" x={1.4} y={13.4} color={c.design} active={z.design.working} seat={false} />);
  add(
    13.0,
    <g key="rugD">
      {(() => {
        const p = pt(6, 12.6, 0.02);
        return <ellipse cx={p.x} cy={p.y} rx={2.3 * U * 1.22} ry={2.3 * U * 0.7} fill="#c084fc" opacity={0.35} stroke="#9333ea" strokeOpacity={0.5} strokeDasharray="3 4" />;
      })()}
    </g>,
  );
  add(24.4, <Plant key="dp" x={7.6} y={16.6} />);

  // Orchestrator: round table + hologram
  add(
    23.5,
    <g key="orch">
      {(() => {
        const r = 1.9;
        const rx = r * 1.2247 * U;
        const ry = r * 0.7071 * U;
        const top = pt(13.5, 10, 0.78);
        const bot = pt(13.5, 10, 0.62);
        const foot = pt(13.5, 10, 0);
        return (
          <g>
            <ellipse cx={foot.x} cy={foot.y} rx={rx * 0.9} ry={ry * 0.9} fill="#000" opacity={0.12} />
            <rect x={foot.x - 6} y={top.y} width={12} height={foot.y - top.y} fill="#94a3b8" />
            <ellipse cx={bot.x} cy={bot.y} rx={rx} ry={ry} fill={P.woodDark} />
            <rect x={bot.x - rx} y={top.y} width={rx * 2} height={bot.y - top.y} fill={P.woodDark} />
            <ellipse cx={top.x} cy={top.y} rx={rx} ry={ry} fill={P.woodTop} stroke={P.wood} strokeWidth={1.2} />
            <ellipse cx={top.x} cy={top.y} rx={rx * 0.55} ry={ry * 0.55} fill="#e0e7ff" stroke="#3a3dff" strokeOpacity={0.7} strokeDasharray="4 5" className="spin-dash" />
          </g>
        );
      })()}
      <Person x={13.4} y={12.4} color={c.orchestrator} active={z.orchestrator.working} seated={false} skin={SKINS[1]} />
    </g>,
  );

  // Reviewer: checkpoint counter
  add(
    29.2,
    <g key="rev">
      <Person x={21.4} y={8.1} color={c.reviewer} active={z.reviewer.working} seated={false} skin={SKINS[3]} />
      <Box x={19.0} y={8.7} w={5.0} d={1.0} h={1.05} color="#cbd5e1" top="#ffffff" />
      <Box x={19.4} y={8.85} z={1.05} w={0.9} d={0.7} h={0.12} color="#22c55e" />
      <Box x={20.5} y={8.85} z={1.05} w={0.9} d={0.7} h={0.12} color="#ef4444" />
      <Box x={22.6} y={9.0} z={1.05} w={0.35} d={0.35} h={0.35} color="#f59e0b" />
      <Box x={22.68} y={9.08} z={1.4} w={0.19} d={0.19} h={0.25} color="#7c2d12" />
      {(() => {
        const a = pt(19.85, 9.2, 1.3);
        const b = pt(20.95, 9.2, 1.3);
        return (
          <g className="mono-svg" fontSize={8} textAnchor="middle">
            <text x={a.x} y={a.y} fill="#14532d">PASS</text>
            <text x={b.x} y={b.y} fill="#7f1d1d">BOUNCE</text>
          </g>
        );
      })()}
    </g>,
  );
  add(33.5, <Plant key="rp" x={25.0} y={11.8} s={0.85} />);

  // Founder: rug, executive desk, lamp, sofa
  add(
    27.0,
    <g key="rug">
      <polygon points={pts([[11.6, 13.7, 0.02], [22.4, 13.7, 0.02], [22.4, 17.6, 0.02], [11.6, 17.6, 0.02]])} fill={P.rug} opacity={0.35} stroke={P.rug} strokeWidth={1.4} />
      <polygon points={pts([[12.1, 14.1, 0.03], [21.9, 14.1, 0.03], [21.9, 17.2, 0.03], [12.1, 17.2, 0.03]])} fill="none" stroke="#fff7ed" strokeOpacity={0.9} strokeDasharray="2 5" />
    </g>,
  );
  add(
    29.8,
    <g key="founder">
      <Box x={16.6} y={13.4} w={0.8} d={0.8} h={0.5} color="#1f2937" />
      <Person x={17.0} y={13.8} z={0.5} color={c.founder} active={waiting > 0} skin={SKINS[0]} />
      <Box x={16.55} y={13.25} z={0.5} w={0.9} d={0.15} h={0.95} color="#1f2937" />
      <Box x={14.7} y={14.6} w={4.6} d={1.5} h={0.82} color={P.wood} top={P.woodTop} />
      <Monitor x={15.9} y={14.72} z={0.82} w={1.7} color="#f59e0b" active />
      <Box x={15.1} y={15.4} z={0.82} w={0.28} d={0.28} h={0.3} color="#ef4444" />
      {Array.from({ length: Math.min(waiting, 5) }, (_, i) => (
        <Box key={i} x={18.1} y={15.2} z={0.82 + i * 0.07} w={0.8} d={0.6} h={0.06} color="#fde68a" top="#fffbeb" />
      ))}
      {held > 0 && (
        <g className="held-pulse">
          <Box x={14.95} y={14.75} z={0.82} w={0.55} d={0.5} h={0.42} color="#be123c" top="#fb7185" />
        </g>
      )}
      {(() => {
        const base = pt(19.0, 14.9, 0.82);
        const head = pt(19.0, 14.9, 2.0);
        return (
          <g>
            <circle cx={head.x} cy={head.y + 18} r={60} fill="url(#lamp)" className="lamp-glow" />
            <line x1={base.x} y1={base.y} x2={head.x} y2={head.y} stroke="#374151" strokeWidth={2} />
            <path d={`M ${head.x - 11} ${head.y + 8} L ${head.x - 5} ${head.y - 4} L ${head.x + 5} ${head.y - 4} L ${head.x + 11} ${head.y + 8} Z`} fill="#fbbf24" stroke="#b45309" strokeWidth={0.8} />
          </g>
        );
      })()}
    </g>,
  );
  add(
    37.5,
    <g key="sofa">
      <Box x={21.2} y={15.0} w={1.8} d={0.8} h={0.36} color={P.wood} top={P.woodTop} />
      <Box x={21.6} y={15.2} z={0.36} w={0.3} d={0.3} h={0.25} color="#ffffff" />
      <Box x={20.9} y={16.3} w={3.4} d={1.2} h={0.45} color={P.sofa} top={P.sofaTop} />
      <Box x={20.9} y={17.25} z={0.45} w={3.4} d={0.25} h={0.55} color={P.sofa} top={P.sofaTop} />
      <Box x={20.9} y={16.3} z={0.45} w={0.25} d={1.2} h={0.3} color={P.sofa} />
      <Box x={24.05} y={16.3} z={0.45} w={0.25} d={1.2} h={0.3} color={P.sofa} />
      <Box x={21.5} y={16.5} z={0.45} w={0.6} d={0.2} h={0.4} color="#fbbf24" />
    </g>,
  );
  add(38.6, <Plant key="fp2" x={25.1} y={13.4} />);
  add(26.6, <Plant key="fp3" x={9.6} y={16.8} s={0.9} />);
  add(
    22.4,
    <g key="shelf">
      <Box x={9.35} y={13.3} w={0.55} d={2.6} h={2.1} color={P.wood} top={P.woodTop} />
      {["#ef4444", "#3b82f6", "#f59e0b", "#22c55e", "#8b5cf6", "#ec4899"].map((col, i) => (
        <polygon
          key={col}
          points={pts([
            [9.9, 13.5 + i * 0.38, 0.35 + (i % 2) * 0.9],
            [9.9, 13.8 + i * 0.38, 0.35 + (i % 2) * 0.9],
            [9.9, 13.8 + i * 0.38, 0.95 + (i % 2) * 0.9],
            [9.9, 13.5 + i * 0.38, 0.95 + (i % 2) * 0.9],
          ])}
          fill={col}
        />
      ))}
    </g>,
  );

  return items.sort((a, b) => a.key - b.key);
}

// ---------------------------------------------------------------- component

export function Office({ zones, disputes, flows, runwayMonths, children, arrival }: OfficeProps) {
  const lit = arrival ? Math.max(0, Math.min(7, arrival.lit)) : 7;
  const isLit = (k: ZoneKey) => !arrival || ARRIVAL_ORDER.indexOf(k) < lit;
  const [selected, setSelected] = useState<ZoneKey | null>(null);
  const [hover, setHover] = useState<ZoneKey | null>(null);
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const held = zones.founder.held;
  const waiting = zones.founder.waiting;
  const items = useMemo(() => zoneItems(zones, held, waiting), [zones, held, waiting]);

  // viewBox from the scene's projected extent.
  const left = iso(0, D + 0.6)[0] - 30;
  const right = iso(W + 0.6, 0)[0] + 30;
  const topY = iso(0, 0, WALL + 2.6)[1];
  const bottom = iso(W, D, -1)[1] + 20;
  const vb = `${left} ${topY} ${right - left} ${bottom - topY}`;

  const anchor = (k: ZoneKey) => {
    const [x, y, z] = ZONES[k].anchor;
    return pt(x, y, z ?? 0);
  };
  const curve = (a: ZoneKey, b: ZoneKey, lift = 60) => {
    const p = anchor(a);
    const q = anchor(b);
    return `M ${p.x} ${p.y} Q ${(p.x + q.x) / 2} ${Math.min(p.y, q.y) - lift} ${q.x} ${q.y}`;
  };
  const tierColor = (t: string) => (t === "approve" ? "#f59e0b" : t === "blocked" ? "#e11d48" : "#3a3dff");
  const disputeGF = disputes.some((d) => [d.a, d.b].includes("growth") && [d.a, d.b].includes("finance"));

  const zoneKeys = Object.keys(ZONES) as ZoneKey[];
  const sel = selected ? zones[selected] : null;

  return (
    <div className="office">
      {children && <div className="office-overlay">{children}</div>}
      <svg
        viewBox={vb}
        className="office-svg"
        role="img"
        aria-label={arrival ? "Your office, lighting up as you arrive." : "Your office. Each room is a team. Select a room to see its work."}
        style={
          arrival
            ? { filter: `brightness(${0.3 + (0.7 * lit) / 7}) saturate(${0.35 + (0.65 * lit) / 7})`, transition: "filter 900ms ease" }
            : undefined
        }
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6fb4ff" />
            <stop offset="0.7" stopColor="#b9dcff" />
            <stop offset="1" stopColor="#e3f1ff" />
          </linearGradient>
          <radialGradient id="lamp">
            <stop offset="0" stopColor="#fde68a" stopOpacity="0.6" />
            <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="holo" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#3a3dff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#3a3dff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* diorama base */}
        <polygon points={pts([[0, D, 0], [W, D, 0], [W, D, -0.9], [0, D, -0.9]])} fill={P.base} />
        <polygon points={pts([[W, 0, 0], [W, D, 0], [W, D, -0.9], [W, 0, -0.9]])} fill={P.baseSide} />
        <polygon points={pts([[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]])} fill={P.floor} />
        {Array.from({ length: W - 1 }, (_, i) => (
          <polyline key={`gx${i}`} points={pts([[i + 1, 0, 0.005], [i + 1, D, 0.005]])} stroke={P.floorLine} strokeOpacity={0.6} />
        ))}

        {/* room floors */}
        {zoneKeys.map((k) => {
          const z = ZONES[k];
          const on = hover === k || selected === k;
          return (
            <polygon
              key={k}
              points={pts([[z.x + 0.12, z.y + 0.12, 0.01], [z.x + z.w - 0.12, z.y + 0.12, 0.01], [z.x + z.w - 0.12, z.y + z.d - 0.12, 0.01], [z.x + 0.12, z.y + z.d - 0.12, 0.01]])}
              fill={ZONE_FLOOR[k]}
              fillOpacity={on ? 1 : 0.85}
              stroke={ZONE_COLOR[k]}
              strokeOpacity={on ? 0.95 : 0.35}
              strokeWidth={on ? 2.2 : 1.2}
              style={{ transition: "fill-opacity 200ms, stroke-opacity 200ms" }}
            />
          );
        })}

        {/* room names painted on the floor */}
        {zoneKeys.map((k) => {
          const z = ZONES[k];
          const o = pt(z.x + 0.5, z.y + z.d - 0.55, 0.01);
          const name = k === "founder" ? "YOUR DESK" : k.toUpperCase();
          return (
            <text
              key={`floor-${k}`}
              transform={`matrix(0.866 0.5 -0.866 0.5 ${o.x} ${o.y})`}
              fill={ZONE_COLOR[k]}
              fillOpacity={hover === k || selected === k ? 0.7 : 0.38}
              fontSize={k === "founder" ? 26 : 22}
              className="floor-text"
              pointerEvents="none"
            >
              {name}
            </text>
          );
        })}

        <Walls runway={runwayMonths} disputeGrowthFinance={disputeGF} />

        {items.map((it, i) => (
          <g key={i}>{it.el}</g>
        ))}

        {/* hologram over the orchestrator table */}
        {(() => {
          const base = pt(13.5, 10, 0.8);
          const topP = pt(13.5, 10, 3.4);
          return (
            <g pointerEvents="none">
              <path d={`M ${base.x - 14} ${base.y} L ${topP.x - 44} ${topP.y} L ${topP.x + 44} ${topP.y} L ${base.x + 14} ${base.y} Z`} fill="url(#holo)" />
              {[1.6, 2.3, 3.0].map((z, i) => {
                const p = pt(13.5, 10, z);
                return <ellipse key={z} cx={p.x} cy={p.y} rx={22 + i * 9} ry={8 + i * 3} fill="none" stroke="#3a3dff" strokeOpacity={0.6} strokeWidth={1.2} className="holo-ring" style={{ animationDelay: `${i * 0.6}s` }} />;
              })}
              {(["growth", "technical", "finance", "design"] as ZoneKey[]).map((k, i) => {
                const p = pt(13.5, 10, 2.3);
                const path = `M ${p.x - 32} ${p.y} a 32 11 0 1 0 64 0 a 32 11 0 1 0 -64 0`;
                return (
                  <circle key={k} r={3.6} fill={ZONE_COLOR[k]}>
                    {motion && <animateMotion dur="6s" repeatCount="indefinite" path={path} begin={`${-i * 1.5}s`} />}
                  </circle>
                );
              })}
            </g>
          );
        })()}

        {/* work in motion */}
        <g pointerEvents="none">
          {flows.map((f, i) => {
            const d = curve(f.from, f.to);
            return (
              <g key={`${f.from}-${f.to}-${i}`}>
                <path d={d} fill="none" stroke={tierColor(f.tier)} strokeOpacity={0.45} strokeWidth={1.4} strokeDasharray="2 5" />
                {motion &&
                  [0, 1].map((n) => (
                    <g key={n}>
                      <rect x={-5} y={-3.5} width={10} height={7} rx={1} fill={tierColor(f.tier)} stroke="#ffffff" strokeWidth={0.8}>
                        <animateMotion dur="3.2s" repeatCount="indefinite" path={d} begin={`${-(i * 0.7 + n * 1.6)}s`} rotate="auto" />
                      </rect>
                    </g>
                  ))}
              </g>
            );
          })}
          {disputes.map((dp, i) => {
            const d = curve(dp.a, dp.b, 130);
            const p = anchor(dp.a);
            const q = anchor(dp.b);
            const mid = { x: (p.x + q.x) / 2, y: (Math.min(p.y, q.y) - 130 + (p.y + q.y) / 2) / 2 };
            return (
              <g key={`d${i}`}>
                <path d={d} fill="none" stroke="#e11d48" strokeWidth={2.2} strokeDasharray="7 6" className="dispute-arc" />
                <g transform={`translate(${mid.x} ${mid.y - 8})`}>
                  <rect x={-78} y={-13} width={156} height={24} rx={12} fill="#fff1f4" stroke="#e11d48" strokeWidth={1.2} />
                  <text x={0} y={4} textAnchor="middle" fill="#be123c" fontSize={10.5} className="mono-svg" letterSpacing={1}>
                    ⚡ DISAGREE · {dp.about.toUpperCase()}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* hit areas + labels */}
        {!arrival && zoneKeys.map((k) => {
          const z = ZONES[k];
          return (
            <polygon
              key={`hit-${k}`}
              points={pts([[z.x, z.y, 0], [z.x + z.w, z.y, 0], [z.x + z.w, z.y + z.d, 0], [z.x, z.y + z.d, 0]])}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(k)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setSelected(k)}
            />
          );
        })}
        {zoneKeys.filter(isLit).map((k) => {
          const [x, y, zz] = ZONES[k].label;
          const p = pt(x, y, zz ?? 0);
          const s = zones[k];
          const on = hover === k || selected === k;
          const w = Math.max(s.label.length * 8.6 + 34, s.status.length * 5.9 + 26);
          const badge = k === "founder" ? s.waiting + s.held : s.waiting;
          return (
            <g
              key={`label-${k}`}
              transform={`translate(${p.x} ${p.y}) ${on ? "translate(0 -4)" : ""}`}
              className="zone-label"
              tabIndex={arrival ? -1 : 0}
              role={arrival ? undefined : "button"}
              aria-label={arrival ? undefined : `${s.label}: ${s.status}. Open.`}
              onClick={arrival ? undefined : () => setSelected(k)}
              onKeyDown={arrival ? undefined : (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(k))}
              onMouseEnter={arrival ? undefined : () => setHover(k)}
              onMouseLeave={arrival ? undefined : () => setHover(null)}
              style={arrival ? { pointerEvents: "none" } : { cursor: "pointer", transition: "transform 180ms" }}
            >
              <line x1={0} y1={0} x2={0} y2={18} stroke={ZONE_COLOR[k]} strokeOpacity={0.8} />
              <circle cx={0} cy={18} r={2.5} fill={ZONE_COLOR[k]} />
              <rect x={-w / 2} y={-34} width={w} height={34} rx={6} fill="#ffffff" stroke={ZONE_COLOR[k]} strokeOpacity={on ? 1 : 0.7} strokeWidth={on ? 2 : 1.2} />
              <rect x={-w / 2} y={-34} width={4} height={34} rx={2} fill={ZONE_COLOR[k]} />
              <circle cx={-w / 2 + 13} cy={-22} r={3.2} fill={s.working ? ZONE_COLOR[k] : "#cbd5e1"} className={s.working ? "led" : undefined} />
              <text x={-w / 2 + 22} y={-18} fill="#0d1030" fontSize={12.5} className="label-svg">
                {s.label.toUpperCase()}
              </text>
              <text x={-w / 2 + 13} y={-6} fill="#50567a" fontSize={9} className="mono-svg">
                {s.status}
              </text>
              {badge > 0 && (
                <g transform={`translate(${w / 2} ${-34})`}>
                  <circle r={9} fill={k === "founder" && s.held > 0 && s.waiting === 0 ? "#e11d48" : "#f59e0b"} className="badge-pop" />
                  <text y={3.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#ffffff">
                    {badge}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {!arrival && <div className="office-legend" aria-hidden>
        <span><i style={{ background: "#3a3dff" }} /> auto</span>
        <span><i style={{ background: "#f59e0b" }} /> needs you</span>
        <span><i style={{ background: "#e11d48" }} /> blocked</span>
        <span className="muted">click a room</span>
      </div>}

      {!arrival && sel && selected && (
        <div className="room-backdrop" onClick={() => setSelected(null)} aria-hidden />
      )}
      {!arrival && sel && selected && (
        <aside
          key={selected}
          className="room-panel"
          role="dialog"
          aria-modal="true"
          aria-label={`${sel.label} room`}
          style={{ ["--zone" as string]: ZONE_COLOR[selected] }}
        >
          <button className="room-close" onClick={() => setSelected(null)} aria-label="Close" autoFocus>
            ✕
          </button>
          <div className="room-kicker">ROOM · {selected === "founder" ? "YOUR DESK" : selected.toUpperCase()}</div>
          <h3 className="room-title">{sel.label}</h3>
          <p className="room-role">{sel.role}</p>
          <div className="room-stats">
            <div><b>{sel.inFlight}</b><span>in flight</span></div>
            <div><b>{sel.waiting}</b><span>waiting on you</span></div>
            <div><b>{sel.held}</b><span>held</span></div>
          </div>
          <div className="room-section">Work orders</div>
          {sel.orders.length ? (
            <ul className="room-orders">
              {sel.orders.map((o) => (
                <li key={o.id} data-tier={o.tier}>
                  <Link href={`/work-orders/${o.id}`}>
                    <span className="mono">{o.id}</span>
                    <span className="room-order-sum">{o.summary}</span>
                    <span className="room-order-holder">{o.holder}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="room-empty">Nothing on this desk right now.</p>
          )}
          {sel.playbooks.length > 0 && (
            <>
              <div className="room-section">Playbooks this room runs</div>
              <div className="room-books">
                {sel.playbooks.map((p) => (
                  <Link key={p.slug} href={`/playbooks/${p.slug}`} className="chip">
                    {p.name}
                  </Link>
                ))}
              </div>
            </>
          )}
          {selected === "founder" && (
            <Link href="/approvals" className="btn btn-glow" style={{ marginTop: 18 }}>
              Open approvals →
            </Link>
          )}
        </aside>
      )}
    </div>
  );
}
