import { bbox } from "../geometry/contour";
import type { Contour } from "../types";

/** Contour as a 1:1 SVG (width/height in mm). When printing, use 100%, never "fit to page". */
export function contourSVG(c: Contour): string {
  const b = bbox(c.points);
  const m = 2;
  const W = b.w + 2 * m;
  const H = b.h + 2 * m;
  const d =
    c.points
      .map(([x, y], i) => `${i ? "L" : "M"}${(x - b.minX + m).toFixed(3)} ${(b.maxY - y + m).toFixed(3)}`)
      .join(" ") + "Z";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(3)}mm" height="${H.toFixed(3)}mm" viewBox="0 0 ${W.toFixed(3)} ${H.toFixed(3)}"><path d="${d}" fill="none" stroke="#000" stroke-width="0.1"/></svg>`;
}
