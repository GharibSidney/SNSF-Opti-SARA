import { VisionError, type MeasureResult, type Measurer } from "./types";
import type { Contour, Eye } from "../types";

/**
 * Base URL of the Python vision server.
 * Dev: VITE_API_URL is unset, so /api/* goes through the Vite proxy to http://localhost:5000.
 * Production (Vercel): set VITE_API_URL to the ngrok URL, e.g. https://scion-powdered-luckiness.ngrok-free.dev
 */
const SERVER_BASE = "https://scion-powdered-luckiness.ngrok-free.dev/api";

/**
 * >>> THE VISION / AI WORKS HERE <<<
 *
 * Sends the photo to the Python Flask server (finalSam.py) which runs:
 *   1. Rectify  – ArUco markers → homography → warp to mm scale
 *   2. Segment  – Grounding DINO + SAM → lens mask
 *   3. Measure  – contour extraction in mm, smoothed & centered
 *
 * Contract (src/types.ts):
 *   - points in mm, closed polygon, y up. The app re-normalizes (200 points, CCW, centered).
 *   - Orientation = WEARER's view.
 *
 * Errors: throws VisionError with codes the UI understands.
 * Progress: opts.onProgress("…").
 */
export const measure: Measurer = async (
  image: Blob,
  opts: { eye: Eye; onProgress?: (message: string) => void },
): Promise<MeasureResult> => {
  opts.onProgress?.("Envoi de la photo au serveur…");

  // Build multipart form
  const form = new FormData();
  form.append("image", image, "photo.jpg");
  form.append("eye", opts.eye);

  let response: Response;
  try {
    response = await fetch(`${SERVER_BASE}/measure`, {
      method: "POST",
      // Skips ngrok's free-tier warning page. Do NOT set Content-Type: the browser sets it for FormData.
      headers: { "ngrok-skip-browser-warning": "1" },
      body: form,
    });
  } catch {
    // Network error — server is not running
    throw new VisionError(
      "not_connected",
      "Le serveur de mesure n'est pas joignable. Lancez `python server.py` puis rechargez la page.",
    );
  }

  opts.onProgress?.("Analyse en cours…");

  const body = await response.json();

  if (!response.ok) {
    const code = (body.error ?? "failed") as VisionError["code"];
    const message: string =
      body.message ?? "La mesure a échoué. Reprenez la photo.";
    throw new VisionError(code === "failed" ? "failed" : code, message);
  }

  // Map the server response to our frontend Contour type
  const raw = body.contour as {
    eye: string;
    points: [number, number][];
    A: number;
    B: number;
    perimeter: number;
  };

  const contour: Contour = {
    eye: opts.eye,
    points: raw.points,
    A: raw.A,
    B: raw.B,
    perimeter: raw.perimeter,
  };

  return { contour };
};