import { VisionError, type Measurer } from "./types";

/**
 * >>> THE VISION / AI WORKS HERE <<<
 *
 * Replace the body with the real pipeline. Everything downstream (3D frame, STL, SVG, plan)
 * already works with whatever Contour you return.
 *
 *   1. Rectify : find the reference (ArUco markers, card...), compute the homography,
 *                warp to a known scale (px per mm).
 *   2. Segment : isolate the lens (classical edge/gradient first, trained model for hard cases).
 *   3. Measure : contour in mm, smooth it, return { eye, points, A, B, perimeter }.
 *
 * Contract (src/types.ts):
 *   - points in mm, closed polygon, y up. The app re-normalizes (200 points, CCW, centered).
 *   - Orientation = WEARER's view. Right lens: nasal side at -x. Left lens: nasal side at +x.
 *     If the lens is photographed from the other side, use mirror() from geometry/contour.ts.
 *
 * Helpers: src/vision/image.ts (EXIF-correct loading, downscaling for Safari).
 * Errors: throw new VisionError("no_reference" | "blurry" | "lens_not_found", "message FR with the fix").
 * Progress: opts.onProgress("Redressement de l'image…").
 * Steps: return `steps` with the intermediate images (reference, rectified, mask, contour).
 */
export const measure: Measurer = async () => {
  throw new VisionError(
    "not_connected",
    "Le module de mesure par photo n'est pas encore branché. Ouvrez la page avec ?demo=1 pour tester la monture avec des verres simulés.",
  );
};
