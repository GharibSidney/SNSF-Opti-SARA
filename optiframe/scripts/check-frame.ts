/**
 * Geometry self-check, no browser needed: `npm test`.
 * Builds frames from synthetic lenses and verifies what the jury will check:
 * closed mesh, expected topology, bridge distance, clearance, two different shapes.
 * Also writes out/monture-test.stl so you can open it in PrusaSlicer/Cura.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import Module from "manifold-3d";
import { buildFrame, type FrameResult } from "../src/geometry/frame";
import { mockContour, type MockShape } from "../src/geometry/mock";
import { DEFAULT_PARAMS } from "../src/geometry/params";
import { bbox } from "../src/geometry/contour";
import { toBinarySTL } from "../src/export/stl";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};

/** Every directed edge must appear exactly once, with its reverse also once: a closed 2-manifold. */
function isWatertight(idx: Uint32Array): boolean {
  const edges = new Map<string, number>();
  for (let t = 0; t < idx.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = idx[t + k], b = idx[t + ((k + 1) % 3)];
      const key = `${a}>${b}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  for (const [key, n] of edges) {
    const [a, b] = key.split(">");
    if (n !== 1 || edges.get(`${b}>${a}`) !== 1) return false;
  }
  return true;
}

const wasm = await Module();
wasm.setup();

function run(label: string, shapeL: MockShape, shapeR: MockShape, A: [number, number], B: [number, number]) {
  console.log(`\n--- ${label}`);
  const L = mockContour("L", A[0], B[0], shapeL);
  const R = mockContour("R", A[1], B[1], shapeR);
  const t0 = performance.now();
  const r: FrameResult = buildFrame(wasm, L, R, DEFAULT_PARAMS);
  const ms = performance.now() - t0;
  const p = DEFAULT_PARAMS;

  check("mock A/B within 0.05 mm of request", Math.abs(L.A - A[0]) < 0.05 && Math.abs(R.B - B[1]) < 0.05, `A_L ${L.A.toFixed(3)}, B_R ${R.B.toFixed(3)}`);
  check("mesh not empty", r.stats.tris > 1000, `${r.stats.tris} triangles, ${ms.toFixed(0)} ms`);
  check("watertight (closed 2-manifold)", isWatertight(r.indices));
  check("single solid piece", r.stats.components === 1, `${r.stats.components}`);
  check("genus = 4 (2 lens holes + 2 hinge holes)", r.stats.genus === 4, `genus ${r.stats.genus}`);
  check("volume plausible", r.stats.volume > 2000 && r.stats.volume < 20000, `${(r.stats.volume / 1000).toFixed(2)} cm3`);

  const zs = [];
  for (let i = 2; i < r.positions.length; i += 3) zs.push(r.positions[i]);
  check("z range = [0, thickness] (flat on the bed)", Math.min(...zs) > -1e-3 && Math.abs(Math.max(...zs) - p.thick) < 1e-3);

  const bl = bbox(r.lenses[0]), br = bbox(r.lenses[1]);
  check("bridge distance = 18 mm between nasal edges", Math.abs(br.minX - bl.maxX - p.bridge) < 1e-6, (br.minX - bl.maxX).toFixed(3));
  check("clearance = 0.2 mm (contour to groove bottom)", r.gap.min > p.clearance - 0.02 && r.gap.max < p.clearance + 0.02, `${r.gap.min.toFixed(3)}-${r.gap.max.toFixed(3)}`);
  return r;
}

run("two identical ellipses 50x36", "ellipse", "ellipse", [50, 50], [36, 36]);
const r = run("two DIFFERENT lenses (ellipse 50x36 / asymmetric 52x38)", "ellipse", "asym", [50, 52], [36, 38]);
run("superellipse 56x40 / ellipse 44x30", "super", "ellipse", [56, 44], [40, 30]);

mkdirSync("out", { recursive: true });
writeFileSync("out/monture-test.stl", Buffer.from(toBinarySTL(r.positions, r.indices)));
console.log("\nWrote out/monture-test.stl");

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed");
