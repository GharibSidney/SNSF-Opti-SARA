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
import type { FrameResult } from "./geometry/frame";

const $ = <T extends HTMLElement>(selector: string) =>
  document.querySelector(selector) as T;

type Lang = "fr" | "en";
type FlowState = "left" | "right" | "building" | "done" | "error";

const translations = {
  fr: {
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
    retry: "Réessayer",
    errorTitle: "Impossible d'analyser cette photo",
    genericMeasureError:
      "La mesure a échoué. Reprenez la photo avec le verre bien posé et l'objet de référence entièrement visible.",
    engineError: "Le moteur 3D n'est pas disponible sur cet appareil.",
    qrClose: "Fermer",
  },
  en: {
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

let engine: ManifoldToplevel | null = null;
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
const cameraBtn = $<HTMLLabelElement>("#camera-btn");
const cameraInput = $<HTMLInputElement>("#camera-input");

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
    const result = await measurer(image, {
      eye,
      onProgress: (message) => {
        loadingTextEl.textContent = message || t("measuring");
      },
    });

    contours[eye] = parseContour(eye, result.contour);
    setLoading(false);

    if (eye === "L") {
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
    render();
  } catch (error) {
    console.error(error);
    last = null;
    lastError = error instanceof Error ? error.message : t("engineError");
    flowState = "error";
    render();
  }
}

uploadBtn.addEventListener("click", () => {
  fileInput.value = "";
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) void measureEye(currentEye, file);
});

retryBtn.addEventListener("click", () => {
  flowState = currentEye === "L" ? "left" : "right";
  render();
});

dlBtn.addEventListener("click", () => {
  if (last) {
    download(
      "monture.stl",
      toBinarySTL(last.positions, last.indices),
      "model/stl",
    );
  }
});

cameraInput.addEventListener("change", () => {
  const file = cameraInput.files?.[0];
  if (file) void measureEye(currentEye, file);
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

render();

loadEngine()
  .then((loadedEngine) => {
    engine = loadedEngine;
  })
  .catch((error) => {
    console.error(error);
    lastError = t("engineError");
    flowState = "error";
    render();
  });

// Dev hook: inject a contour from the console (points in mm, see src/types.ts).
(window as unknown as { OptiFrame: unknown }).OptiFrame = {
  setContour(eye: Eye, points: [number, number][]) {
    const contour = parseContour(eye, points);
    contours[eye] = contour;
    return contour;
  },
};
