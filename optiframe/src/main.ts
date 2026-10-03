import "./styles.css";
import type { ManifoldToplevel } from "manifold-3d";
import { loadEngine } from "./engine";
import { parseContour } from "./geometry/contour";
import { buildFrame } from "./geometry/frame";
import { DEFAULT_PARAMS } from "./geometry/params";
import { contourSVG } from "./export/svg";
import { toBinarySTL } from "./export/stl";
import { download } from "./export/download";
import type { Contour, Eye } from "./types";
import { measure as realMeasurer } from "./vision/measure";
import { demoMeasurer } from "./vision/demo";
import { VisionError, type Measurer } from "./vision/types";
import { Viewer } from "./ui/viewer";
import { renderPlan } from "./ui/plan";
import { createEyePanel, type EyePanel } from "./ui/eyes";
import { createParamsPanel } from "./ui/params";
import { captureFromCamera, CameraUnavailable } from "./ui/camera";
import { showQr } from "./ui/qr";
import type { FrameResult } from "./geometry/frame";

const $ = <T extends HTMLElement | SVGElement>(s: string) => document.querySelector(s) as T;

const demo = new URLSearchParams(location.search).has("demo");
const measurer: Measurer = demo ? demoMeasurer : realMeasurer;

const params = { ...DEFAULT_PARAMS };
const contours: Partial<Record<Eye, Contour>> = {};
const panels = {} as Record<Eye, EyePanel>;
let engine: ManifoldToplevel | null = null;
let last: FrameResult | null = null;

const statusEl = $<HTMLElement>("#status");
const setStatus = (msg: string, err = false) => {
  statusEl.textContent = msg;
  statusEl.classList.toggle("err", err);
};

/* ---------- measuring ---------- */

async function measureEye(eye: Eye, image: Blob): Promise<void> {
  panels[eye].busy("Mesure en cours…");
  try {
    const res = await measurer(image, { eye, onProgress: (m) => panels[eye].busy(m) });
    const c = parseContour(eye, res.contour);
    contours[eye] = c;
    panels[eye].done(c, res);
    scheduleBuild();
  } catch (err) {
    console.error(err);
    delete contours[eye];
    const msg =
      err instanceof VisionError || err instanceof Error
        ? err.message
        : "La mesure a échoué. Reprenez la photo: verre bien posé sur le fond uni, objet de référence entièrement visible.";
    panels[eye].fail(msg);
    scheduleBuild();
  }
}

async function fromCamera(eye: Eye): Promise<void> {
  try {
    const blob = await captureFromCamera();
    if (blob) await measureEye(eye, blob);
  } catch (err) {
    panels[eye].fail(err instanceof CameraUnavailable ? err.message : "La caméra n'a pas pu démarrer. Utilisez « Importer une photo ».");
  }
}

for (const eye of ["L", "R"] as const) {
  panels[eye] = createEyePanel($("#eyes"), eye, {
    onFile: (f) => void measureEye(eye, f),
    onCamera: () => void fromCamera(eye),
    onSvg: () => {
      const c = contours[eye];
      if (c) download(`verre_${eye}.svg`, contourSVG(c), "image/svg+xml");
    },
  });
}

/* ---------- frame ---------- */

const viewer = new Viewer($<HTMLCanvasElement>("#gl"));
const dlBtn = $<HTMLButtonElement>("#dl-stl");
let timer: number | undefined;
let building = false;
let dirty = false;

function scheduleBuild() {
  clearTimeout(timer);
  timer = window.setTimeout(rebuild, 120);
}

function rebuild() {
  if (!engine) return;
  const L = contours.L;
  const R = contours.R;
  if (!L || !R) {
    dlBtn.disabled = true;
    setStatus(L || R ? "Il manque encore un verre pour générer la monture." : "Photographiez les deux verres pour générer la monture.");
    return;
  }
  if (building) {
    dirty = true;
    return;
  }
  building = true;
  setStatus("Génération de la monture…");
  // yield once so the status text paints before the (synchronous) geometry work
  setTimeout(() => {
    try {
      const t0 = performance.now();
      last = buildFrame(engine!, L, R, params);
      viewer.show(last);
      renderPlan($<SVGSVGElement>("#plan"), $("#plan-legend"), last);
      dlBtn.disabled = false;
      const s = last.stats;
      setStatus(`Monture prête en ${Math.round(performance.now() - t0)} ms, ${s.tris} triangles, ${(s.volume / 1000).toFixed(2)} cm³.`);
    } catch (err) {
      console.error(err);
      last = null;
      dlBtn.disabled = true;
      setStatus(`Impossible de générer la monture avec ces réglages: ${(err as Error).message}`, true);
    } finally {
      building = false;
      if (dirty) {
        dirty = false;
        rebuild();
      }
    }
  }, 30);
}

createParamsPanel($("#params"), params, scheduleBuild);

dlBtn.addEventListener("click", () => {
  if (last) download("monture.stl", toBinarySTL(last.positions, last.indices), "model/stl");
});

/* ---------- QR, demo, console hook ---------- */

$("#qr-btn").addEventListener("click", () => void showQr($<HTMLDialogElement>("#qr-dialog"), $("#qr-box")));

if (demo) {
  $<HTMLElement>("#demo-banner").hidden = false;
  $("#demo-fill").addEventListener("click", () => {
    void measureEye("L", new Blob());
    void measureEye("R", new Blob());
  });
} else {
  $("#demo-text").textContent = "La mesure par photo n'est pas encore branchée. Testez la monture avec des verres simulés.";
  $("#demo-fill").textContent = "Activer le mode démo";
  $("#demo-fill").addEventListener("click", () => {
    const u = new URL(location.href);
    u.searchParams.set("demo", "1");
    location.href = u.href;
  });
}

// Dev hook: inject a contour from the console (points in mm, see src/types.ts).
(window as unknown as { OptiFrame: unknown }).OptiFrame = {
  setContour(eye: Eye, points: [number, number][]) {
    const c = parseContour(eye, points);
    contours[eye] = c;
    scheduleBuild();
    return c;
  },
};

/* ---------- boot ---------- */

loadEngine()
  .then((w) => {
    engine = w;
    rebuild();
  })
  .catch((err) => {
    console.error(err);
    setStatus("Moteur 3D indisponible sur cet appareil: " + (err as Error).message, true);
  });
