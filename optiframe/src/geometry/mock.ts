import type { Contour, Eye, Vec2 } from "../types";
import { N_POINTS, bbox, normalize } from "./contour";

export type MockShape = "ellipse" | "super" | "asym";

/**
 * Synthetic lens with an exact A x B bounding box. Base shapes have their nasal side at -x
 * (right eye); the left eye is the mirror image. Used by demo mode and by the tests only.
 */
export function mockContour(eye: Eye, A: number, B: number, shape: MockShape): Contour {
  const n = shape === "ellipse" ? 2 : shape === "super" ? 3.2 : 2.6;
  const raw: Vec2[] = [];
  for (let i = 0; i < N_POINTS; i++) {
    const t = (i / N_POINTS) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    let x = Math.sign(c) * Math.abs(c) ** (2 / n);
    let y = Math.sign(s) * Math.abs(s) ** (2 / n);
    if (shape === "asym") {
      x = x * (1 - 0.14 * y);
      y = y + 0.12 * x;
    }
    raw.push([x, y]);
  }
  const b = bbox(raw);
  let q = raw.map(
    ([x, y]) => [((x - (b.minX + b.maxX) / 2) * A) / b.w, ((y - (b.minY + b.maxY) / 2) * B) / b.h] as Vec2,
  );
  if (eye === "L") q = q.map(([x, y]) => [-x, y] as Vec2);
  return normalize(eye, q);
}
