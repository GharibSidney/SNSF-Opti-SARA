import type { Contour, Eye } from "../types";

export type VisionErrorCode =
  | "not_connected" // pipeline not plugged in yet
  | "bad_image" // file unreadable
  | "no_reference" // ArUco markers / reference object not found
  | "blurry"
  | "lens_not_found" // no lens found, or lens touching the border
  | "failed";

/** Throw this from the measurer: the message is shown to the user as is, so write it in French, with a fix. */
export class VisionError extends Error {
  constructor(
    public code: VisionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "VisionError";
  }
}

/** An intermediate image for the "pas à pas" page (reference found, rectified, mask, contour overlay...). */
export interface StepImage {
  label: string;
  /** data: URL or blob: URL */
  src: string;
}

export interface MeasureResult {
  /** Contour in mm, already in the frame orientation (see types.ts). Normalized again by the app. */
  contour: Contour;
  steps?: StepImage[];
  /** Optional 0..1 score shown to the user when low. */
  confidence?: number;
}

export interface MeasureOptions {
  eye: Eye;
  onProgress?: (message: string) => void;
}

/**
 * The whole vision/AI pipeline is ONE async function: photo in, contour in mm out.
 * Implement it in src/vision/measure.ts (rectify -> segment -> measure).
 */
export type Measurer = (image: Blob, opts: MeasureOptions) => Promise<MeasureResult>;
