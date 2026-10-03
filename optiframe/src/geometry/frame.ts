import type { ManifoldToplevel } from "manifold-3d";
import type { Contour, Vec2 } from "../types";
import { bbox } from "./contour";
import type { FrameParams } from "./params";

export interface FrameResult {
  /** xyz triplets, mm. Front face on z = 0, frame grows toward +z. */
  positions: Float32Array;
  indices: Uint32Array;
  stats: { tris: number; volume: number; genus: number; components: number };
  /** 2D outline of the frame face (polygons with holes), mm. */
  ring: Vec2[][];
  /** Placed lens contours, mm. */
  lenses: Vec2[][];
  /** Distance from the lens contour to the groove-bottom opening (should equal `clearance`). */
  gap: { min: number; max: number };
}

/** Translate a contour so its nasal edge sits bridge/2 from the center line. */
export function placeContour(c: Contour, bridge: number): Vec2[] {
  const b = bbox(c.points);
  const dx = c.eye === "R" ? bridge / 2 - b.minX : -bridge / 2 - b.maxX;
  return c.points.map(([x, y]) => [x + dx, y] as Vec2);
}

function distToPoly(pt: Vec2, poly: Vec2[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / l2));
    best = Math.min(best, Math.hypot(pt[0] - (a[0] + t * dx), pt[1] - (a[1] + t * dy)));
  }
  return best;
}

/**
 * Pure function: (left, right, params) -> plain data (no wasm object leaks out).
 * Front face on the bed (z = 0), groove symmetric about mid-thickness.
 */
export function buildFrame(wasm: ManifoldToplevel, left: Contour, right: Contour, p: FrameParams): FrameResult {
  if (left.eye !== "L" || right.eye !== "R") throw new Error("buildFrame attend (verre gauche, verre droit).");
  const { Manifold, CrossSection } = wasm;
  const trash: { delete(): void }[] = [];
  const keep = <T extends { delete(): void }>(o: T): T => {
    trash.push(o);
    return o;
  };

  try {
    const lens = [left, right].map((c) => {
      const pts = placeContour(c, p.bridge);
      return { c, pts, cs: keep(CrossSection.ofPolygons([pts], "Positive")) };
    });

    // 1) 2D outline: rims + bridge bar + temple tenons
    const R = p.clearance + p.rim;
    let outline = keep(lens[0].cs.offset(R, "Round", 2, 64));
    outline = keep(outline.add(keep(lens[1].cs.offset(R, "Round", 2, 64))));
    outline = keep(
      outline.add(keep(CrossSection.square([p.bridge + 2, p.bridgeH], true).translate([0, p.bridgeY]))),
    );

    const hingeAt: Vec2[] = [];
    for (const { c, pts } of lens) {
      const b = bbox(pts);
      const dir = c.eye === "R" ? 1 : -1;
      const xo = (c.eye === "R" ? b.maxX : b.minX) + dir * R; // rim outer edge
      const cx = xo + (dir * (p.tenonLen - 4)) / 2; // 4 mm overlap into the rim
      outline = keep(
        outline.add(keep(CrossSection.square([p.tenonLen + 4, 5], true).translate([cx, p.tenonY]))),
      );
      hingeAt.push([xo + dir * (p.tenonLen - 3), p.tenonY]);
    }

    // 2) extrude (front face on z = 0)
    let body = keep(Manifold.extrude(outline, p.thick));

    // 3) lens openings with a groove: opening offset goes -lip (faces) -> +clearance (mid-plane)
    const h = p.thick / p.slabs;
    const slabs = [];
    for (const { cs } of lens) {
      for (let i = 0; i < p.slabs; i++) {
        const t = (i + 0.5) / p.slabs;
        const prof = 1 - Math.abs(2 * t - 1); // 0 at faces, 1 at mid-plane
        const off = -p.lip + prof * (p.lip + p.clearance);
        const z0 = i * h - (i === 0 ? 1 : 0);
        // 0.05 mm overlap between slabs: a tiny overlap (0.002) leaves zero-volume slivers in the union
        const z1 = (i + 1) * h + (i === p.slabs - 1 ? 1 : 0) + 0.05;
        const slab = keep(Manifold.extrude(keep(cs.offset(off, "Round", 2, 64)), z1 - z0));
        slabs.push(keep(slab.translate([0, 0, z0])));
      }
    }
    body = keep(body.subtract(keep(Manifold.union(slabs))));

    // 4) hinge holes through the tenons
    for (const [x, y] of hingeAt) {
      const cyl = keep(Manifold.cylinder(p.thick + 2, p.hinge, p.hinge, 24, true));
      body = keep(body.subtract(keep(cyl.translate([x, y, p.thick / 2]))));
    }

    const status = body.status();
    if (status !== "NoError") throw new Error(`Maillage invalide (${status}).`);
    if (body.isEmpty()) throw new Error("La monture est vide avec ces réglages.");
    const parts = body.decompose();
    parts.forEach(keep);
    if (parts.length !== 1) throw new Error(`La monture est en ${parts.length} morceaux avec ces réglages.`);

    // 5) extract plain data (xyz only)
    const m = body.getMesh();
    const nv = m.vertProperties.length / m.numProp;
    const positions = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) {
      positions[3 * i] = m.vertProperties[i * m.numProp];
      positions[3 * i + 1] = m.vertProperties[i * m.numProp + 1];
      positions[3 * i + 2] = m.vertProperties[i * m.numProp + 2];
    }

    // Offset sanity check: contour -> groove-bottom opening distance should equal `clearance`.
    const opening = lens.map(({ cs }) => cs.offset(p.clearance, "Round", 2, 64).toPolygons()[0]);
    let lo = Infinity;
    let hi = 0;
    lens.forEach(({ pts }, i) => {
      for (const pt of pts) {
        const d = distToPoly(pt, opening[i]);
        lo = Math.min(lo, d);
        hi = Math.max(hi, d);
      }
    });

    return {
      positions,
      indices: new Uint32Array(m.triVerts),
      stats: { tris: body.numTri(), volume: body.volume(), genus: body.genus(), components: parts.length },
      ring: outline.toPolygons(),
      lenses: lens.map((l) => l.pts),
      gap: { min: lo, max: hi },
    };
  } finally {
    trash.forEach((o) => {
      try {
        o.delete();
      } catch {
        /* already freed */
      }
    });
  }
}
