import { VisionError } from "./types";

/** Decode a photo with EXIF orientation applied and, if needed, downscale (Safari crashes on huge canvases). */
export async function loadImage(blob: Blob, maxSide = 3000): Promise<ImageBitmap> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    throw new VisionError("bad_image", "Impossible de lire cette image. Reprenez la photo ou choisissez un autre fichier.");
  }
  const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  if (s === 1) return bmp;
  const out = await createImageBitmap(bmp, {
    resizeWidth: Math.round(bmp.width * s),
    resizeHeight: Math.round(bmp.height * s),
    resizeQuality: "high",
  });
  bmp.close();
  return out;
}

/** Small data URL of a bitmap or canvas, for the "pas à pas" images. */
export function toDataURL(src: ImageBitmap | HTMLCanvasElement, maxSide = 480): string {
  const w = src.width;
  const h = src.height;
  const s = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * s));
  c.height = Math.max(1, Math.round(h * s));
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}
