import { mockContour } from "../geometry/mock";
import { loadImage, toDataURL } from "./image";
import type { Measurer, StepImage } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Demo mode (?demo=1): ignores the photo content and returns a synthetic lens, so the frame,
 * STL and UI can be developed and shown without the real pipeline. Never ships as the default.
 */
export const demoMeasurer: Measurer = async (image, { eye, onProgress }) => {
  onProgress?.("Mode démo: mesure simulée…");
  await sleep(400);
  const contour = eye === "L" ? mockContour("L", 50, 36, "ellipse") : mockContour("R", 52, 38, "asym");
  const steps: StepImage[] = [];
  if (image.size > 0) {
    try {
      const bmp = await loadImage(image, 1000);
      steps.push({ label: "Photo reçue (mode démo, rien n'est mesuré dessus)", src: toDataURL(bmp) });
      bmp.close();
    } catch {
      /* thumbnail is optional */
    }
  }
  return { contour, steps };
};
