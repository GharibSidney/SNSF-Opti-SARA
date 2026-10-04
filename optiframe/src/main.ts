import "./styles.css";
import type { ManifoldToplevel } from "manifold-3d";
import { loadEngine } from "./engine";
import { parseContour } from "./geometry/contour";
import { buildFrame } from "./geometry/frame";
import { DEFAULT_PARAMS } from "./geometry/params";
import { toBinarySTL } from "./export/stl";
import { download } from "./export/download";
import type { Contour, Eye } from "./types";
import { measure as realMeasurer } from "./vision/measure";
import { demoMeasurer } from "./vision/demo";
import { VisionError, type Measurer } from "./vision/types";
import { showQr } from "./ui/qr";
import { captureFromCamera, CameraUnavailable } from "./ui/camera";
import type { FrameResult } from "./geometry/frame";
import { contourSVG } from "./export/svg";

const $ = <T extends HTMLElement>(selector: string) =>
  document.querySelector(selector) as T;

type Lang = "fr" | "en";
type FlowState = "left" | "right" | "building" | "done" | "error";

const translations = {
  fr: {
    restart: "Nouvelle paire de verres",
    camUnavailable: "Caméra indisponible sur cet appareil. Utilisez « Importer une photo ».",
    camDenied: "Accès à la caméra refusé. Autorisez-le dans le navigateur ou utilisez « Importer une photo ».",
    takePhoto: "Prendre la photo",
    cancel: "Annuler",
    by: "par SaraVision",
    stepLeft: "Étape 1 sur 2",
    stepRight: "Étape 2 sur 2",
    stepDone: "Terminé",
    leftTitle: "Prendre la photo du verre gauche",
    rightTitle: "Prendre la photo du verre droit",
    leftHelp: "Prenez une photo claire du verre gauche.",
    rightHelp: "Prenez une photo claire du verre droit.",
    leftCamera: "Prendre une photo du verre gauche",
    rightCamera: "Prendre une photo du verre droit",
    uploadAlternative: "ou téléverser une photo",
    leftButton: "Prendre la photo du verre gauche",
    rightButton: "Prendre la photo du verre droit",
    measuring: "Analyse de la photo…",
    building: "Génération de la monture…",
    readyTitle: "Votre monture est prête",
    readyHelp: "Téléchargez le fichier STL prêt pour l'impression 3D.",
    download: "Télécharger le fichier STL",
    svgLeft: "Exporter le contour gauche (SVG 1:1)",
    svgRight: "Exporter le contour droit (SVG 1:1)",
    retry: "Réessayer",
    errorTitle: "Impossible d'analyser cette photo",
    genericMeasureError:
      "La mesure a échoué. Reprenez la photo avec le verre bien posé et l'objet de référence entièrement visible.",
    engineError: "Le moteur 3D n'est pas disponible sur cet appareil.",
    qrClose: "Fermer",
  },
  en: {
    restart: "Start over with new lenses",
    camUnavailable: "Camera unavailable on this device. Use 'Import photo'.",
    camDenied: "Camera access denied. Allow it in the browser or use 'Import photo'.",
    takePhoto: "Take photo",
    cancel: "Cancel",
    by: "by SaraVision",
    stepLeft: "Step 1 of 2",
    stepRight: "Step 2 of 2",
    stepDone: "Complete",
    leftTitle: "Take a picture of the left lens",
    rightTitle: "Take a picture of the right lens",
    leftHelp: "Take a clear picture of the left lens.",
    rightHelp: "Take a clear picture of the right lens.",
    leftCamera: "Take picture of left lens",
    rightCamera: "Take picture of right lens",
    uploadAlternative: "or upload picture",
    leftButton: "Take picture of left lens",
    rightButton: "Take picture of right lens",
    measuring: "Analyzing picture…",
    building: "Generating frame…",
    readyTitle: "Your frame is ready",
    readyHelp: "Download the STL file ready for 3D printing.",
    download: "Download STL file",
    svgLeft: "Export left contour (SVG 1:1)",
    svgRight: "Export right contour (SVG 1:1)",
    retry: "Try again",
    errorTitle: "This picture could not be analyzed",
    genericMeasureError:
      "Measurement failed. Retake the picture with the lens flat and the reference object fully visible.",
    engineError: "The 3D engine is not available on this device.",
    qrClose: "Close",
  },
} as const;

type TranslationKey = keyof typeof translations.fr;

const demo = new URLSearchParams(location.search).has("demo");
const measurer: Measurer = demo ? demoMeasurer : realMeasurer;
const params = { ...DEFAULT_PARAMS };
const contours: Partial<Record<Eye, Contour>> = {};

const restartBtn = $<HTMLButtonElement>("#restart-btn");

let engine: ManifoldToplevel | null = null;
let enginePromise: Promise<ManifoldToplevel | null> = Promise.resolve(null);
let last: FrameResult | null = null;
let currentEye: Eye = "L";
let flowState: FlowState = "left";
let lastError = "";

const savedLanguage = localStorage.getItem("optiframe-language");
let lang: Lang = savedLanguage === "en" ? "en" : "fr";

const titleEl = $<HTMLElement>("#flow-title");
const helpEl = $<HTMLElement>("#flow-help");
const stepEl = $<HTMLElement>("#step-label");
const statusEl = $<HTMLElement>("#status");
const uploadBtn = $<HTMLButtonElement>("#upload-btn");
const retryBtn = $<HTMLButtonElement>("#retry-btn");
const dlBtn = $<HTMLButtonElement>("#dl-stl");
const fileInput = $<HTMLInputElement>("#file-input");
const loadingEl = $<HTMLElement>("#loading");
const loadingTextEl = $<HTMLElement>("#loading-text");
const brandByEl = $<HTMLElement>("#brand-by");
const cameraBtn = $<HTMLButtonElement>("#camera-btn");
const cameraInput = $<HTMLInputElement>("#camera-input");
const svgLeftBtn = $<HTMLButtonElement>("#svg-left-btn");
const svgRightBtn = $<HTMLButtonElement>("#svg-right-btn");

function t(key: TranslationKey): string {
  return translations[lang][key];
}

function setStatus(message = "", err = false): void {
  statusEl.textContent = message;
  statusEl.classList.toggle("err", err);
}

function setLoading(visible: boolean, message = t("measuring")): void {
  loadingEl.hidden = !visible;
  loadingTextEl.textContent = message;
}

function render(): void {
  document.documentElement.lang = lang;
  brandByEl.textContent = t("by");
  retryBtn.textContent = t("retry");
  dlBtn.textContent = t("download");

  $<HTMLButtonElement>("#qr-close").textContent = t("qrClose");

  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === lang);
  });

  uploadBtn.hidden = true;
  retryBtn.hidden = true;
  dlBtn.hidden = true;
  cameraBtn.hidden = true;
  svgLeftBtn.hidden = true;  
  svgRightBtn.hidden = true;  
  restartBtn.hidden = true;
  restartBtn.textContent = t("restart");
  setLoading(false);

  if (flowState === "left") {
    stepEl.textContent = t("stepLeft");
    titleEl.textContent = t("leftTitle");
    helpEl.textContent = t("leftHelp");

    cameraBtn.textContent = t("leftCamera");
    uploadBtn.textContent = t("uploadAlternative");

    cameraBtn.hidden = false;
    uploadBtn.hidden = false;

    setStatus();
    return;
  }

  if (flowState === "right") {
    stepEl.textContent = t("stepRight");
    titleEl.textContent = t("rightTitle");
    helpEl.textContent = t("rightHelp");

    cameraBtn.textContent = t("rightCamera");
    uploadBtn.textContent = t("uploadAlternative");

    cameraBtn.hidden = false;
    uploadBtn.hidden = false;

    setStatus();
    return;
  }

  if (flowState === "building") {
    stepEl.textContent = t("stepDone");
    titleEl.textContent = t("building");
    helpEl.textContent = "";
    setLoading(true, t("building"));
    setStatus();
    return;
  }

  if (flowState === "done") {
    stepEl.textContent = t("stepDone");
    titleEl.textContent = t("readyTitle");
    helpEl.textContent = t("readyHelp");
    dlBtn.hidden = false;
    dlBtn.disabled = !last;
    svgLeftBtn.textContent = t("svgLeft");
    svgRightBtn.textContent = t("svgRight");
    svgLeftBtn.hidden = false;
    svgRightBtn.hidden = false;
    restartBtn.hidden = false
    setStatus();
    return;
  }

  stepEl.textContent = currentEye === "L" ? t("stepLeft") : t("stepRight");
  titleEl.textContent = t("errorTitle");
  helpEl.textContent = lastError;
  retryBtn.hidden = false;
  setStatus(lastError, true);
}

async function measureEye(eye: Eye, image: Blob): Promise<void> {
  currentEye = eye;
  uploadBtn.hidden = true;
  retryBtn.hidden = true;
  cameraBtn.hidden = true;
  setStatus();
  setLoading(true, t("measuring"));

  try {
    const options = {
      eye,
      onProgress: (message: string) => {
        loadingTextEl.textContent = message || t("measuring");
      },
    };
    let result;
    console.log("salut")
    try {
      result = await measurer(image, options);
    } catch (error) {
      // Real pipeline not plugged in yet: fall back to simulated lenses.
      if (error instanceof VisionError && error.code === "not_connected") {
        result = await demoMeasurer(image, options);
      } else {
        throw error;
      }
    }

    contours[eye] = parseContour(eye, result.contour);
    setLoading(false);

    if (eye === "L") {
      console.log("Left eye")
      currentEye = "R";
      flowState = "right";
      render();
      return;
    }

    flowState = "building";
    render();
    await buildFinalFrame();
  } catch (error) {
    console.error(error);
    delete contours[eye];
    lastError =
      error instanceof VisionError || error instanceof Error
        ? error.message
        : t("genericMeasureError");
    flowState = "error";
    setLoading(false);
    render();
  }
}

async function buildFinalFrame(): Promise<void> {
  const left = contours.L;
  const right = contours.R;

  if (!left || !right) return;

  engine = await enginePromise;
  if (!engine) {
    lastError = t("engineError");
    flowState = "error";
    render();
    return;
  }

  // Let the loading state paint before the synchronous geometry work starts.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  try {
    last = buildFrame(engine, left, right, params);
    flowState = "done";
    console.log("done")

    render();
  } catch (error) {
    console.error(error);
    last = null;
    lastError = error instanceof Error ? error.message : t("engineError");
    flowState = "error";
    render();
  }
}

/* ---------- camera: in-app getUserMedia first, native capture input as fallback ---------- */

cameraBtn.addEventListener("click", async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraInput.value = "";
    cameraInput.click();
    return;
  }
  try {
    const blob = await captureFromCamera({
      takePhoto: t("takePhoto"),
      cancel: t("cancel"),
      unavailable: t("camUnavailable"),
      denied: t("camDenied"),
    });
    if (blob) void measureEye(currentEye, blob);
  } catch (error) {
    setStatus(
      error instanceof CameraUnavailable ? error.message : t("genericMeasureError"),
      true,
    );
  }
});

cameraInput.addEventListener("change", () => {
  const file = cameraInput.files?.[0];
  if (file) void measureEye(currentEye, file);
});

/* ---------- upload, retry, download, language, QR ---------- */

uploadBtn.addEventListener("click", () => {
  fileInput.value = "";
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) void measureEye(currentEye, file);
});

retryBtn.addEventListener("click", () => {
  if (contours.L && contours.R) {
    flowState = "building";
    render();
    void buildFinalFrame();
    return;
  }
  flowState = currentEye === "L" ? "left" : "right";
  render();
});

function exportSvg(eye: Eye): void {
  const c = contours[eye];
  if (!c) return;
  download(
    `verre_${eye === "L" ? "gauche" : "droit"}.svg`,
    contourSVG(c),
    "image/svg+xml",
  );
}

svgLeftBtn.addEventListener("click", () => exportSvg("L"));
svgRightBtn.addEventListener("click", () => exportSvg("R"));

dlBtn.addEventListener("click", () => {
  if (last) {
    download(
      "monture.stl",
      toBinarySTL(last.positions, last.indices),
      "model/stl",
    );
  }
});

document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((button) => {
  button.addEventListener("click", () => {
    const next = button.dataset.lang;
    if (next !== "fr" && next !== "en") return;
    lang = next;
    localStorage.setItem("optiframe-language", lang);
    render();
  });
});

$("#qr-btn").addEventListener("click", () =>
  void showQr($<HTMLDialogElement>("#qr-dialog"), $("#qr-box")),
);

function resetFlow(): void {
  delete contours.L;
  delete contours.R;
  last = null;
  lastError = "";
  currentEye = "L";
  flowState = "left";
  render();
}

restartBtn.addEventListener("click", resetFlow);

/* ---------- boot ---------- */

render();

enginePromise = loadEngine()
  .then((loadedEngine) => {
    engine = loadedEngine;
    return loadedEngine;
  })
  .catch((error) => {
    console.error(error);
    return null;
  });

// Dev hook: inject a contour from the console (points in mm, see src/types.ts).
(window as unknown as { OptiFrame: unknown }).OptiFrame = {
  setContour(eye: Eye, points: [number, number][]) {
    const contour = parseContour(eye, points);
    contours[eye] = contour;
    return contour;
  },
};