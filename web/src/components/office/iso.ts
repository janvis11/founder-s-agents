// Isometric projection for the office scene. World units: x runs to the
// screen's lower right, y to the lower left, z up. (0,0) is the back corner.

export const U = 24; // px per world unit
const C = Math.cos(Math.PI / 6);

export type P3 = [number, number, number?];

export function iso(x: number, y: number, z = 0): [number, number] {
  return [(x - y) * C * U, (x + y) * 0.5 * U - z * U];
}

export function pts(points: P3[]): string {
  return points
    .map(([x, y, z]) => iso(x, y, z ?? 0))
    .map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`)
    .join(" ");
}

export function pt(x: number, y: number, z = 0) {
  const [a, b] = iso(x, y, z);
  return { x: a, y: b };
}

/** Mix a hex colour toward white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const t = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (t - c) * k);
  return `#${((1 << 24) | (mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).slice(1)}`;
}

/** Tiny seeded PRNG so the skyline is the same on server and client. */
export function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
