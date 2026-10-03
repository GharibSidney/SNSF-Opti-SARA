import type { Contour, Eye, Vec2 } from "../types";

/** Fixed resample count: keeps smoothing and offsetting predictable. */
export const N_POINTS = 200;

export function area(p: Vec2[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

export function perimeterOf(p: Vec2[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    s += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return s;
}

export function bbox(p: Vec2[]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of p) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

/** Resample a closed polyline to n points, evenly spaced by arc length. */
export function resample(pts: Vec2[], n: number): Vec2[] {
  const m = pts.length;
  const cum = [0];
  for (let i = 0; i < m; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % m];
    cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[m];
  const out: Vec2[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const t = (k * total) / n;
    while (j < m - 1 && cum[j + 1] < t) j++;
    const seg = cum[j + 1] - cum[j] || 1;
    const f = (t - cum[j]) / seg;
    const a = pts[j];
    const b = pts[(j + 1) % m];
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

/** Any polygon (mm) -> Contour: resampled, CCW, centered on the bbox center, A/B/perimeter computed. */
export function normalize(eye: Eye, points: Vec2[]): Contour {
  let p = resample(points, N_POINTS);
  if (area(p) < 0) p.reverse();
  const b = bbox(p);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  p = p.map(([x, y]) => [x - cx, y - cy] as Vec2);
  const b2 = bbox(p);
  return { eye, points: p, A: b2.w, B: b2.h, perimeter: perimeterOf(p) };
}

/** Validate untrusted input (vision pipeline output) and normalize it. Throws a French message. */
export function parseContour(eye: Eye, input: unknown): Contour {
  const raw = (input as { points?: unknown })?.points ?? input;
  const ok =
    Array.isArray(raw) &&
    raw.length >= 3 &&
    raw.every((q) => Array.isArray(q) && q.length === 2 && q.every((v) => Number.isFinite(v)));
  if (!ok) throw new Error("Le contour doit être une liste d'au moins 3 points [x, y] en mm.");
  const c = normalize(eye, raw as Vec2[]);
  if (c.A < 10 || c.B < 10 || c.A > 120 || c.B > 120) {
    throw new Error(
      `Dimensions improbables pour un verre (A ${c.A.toFixed(1)} mm, B ${c.B.toFixed(1)} mm). Vérifiez l'échelle.`,
    );
  }
  return c;
}

/** Same lens, other eye (mirror in x). */
export function mirror(c: Contour): Contour {
  return normalize(c.eye === "L" ? "R" : "L", c.points.map(([x, y]) => [-x, y] as Vec2));
}
