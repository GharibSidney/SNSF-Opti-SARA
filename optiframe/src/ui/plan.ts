import { bbox } from "../geometry/contour";
import type { FrameResult } from "../geometry/frame";
import type { Vec2 } from "../types";

export function renderPlan(svg: SVGSVGElement, legend: HTMLElement, r: FrameResult): void {
  const b = bbox(r.ring.flat());
  const m = 4;
  svg.setAttribute("viewBox", `${b.minX - m} ${-b.maxY - m} ${b.w + 2 * m} ${b.h + 2 * m}`);
  const path = (poly: Vec2[]) => "M" + poly.map(([x, y]) => `${x.toFixed(2)} ${(-y).toFixed(2)}`).join(" L") + "Z";
  svg.innerHTML =
    `<path d="${r.ring.map(path).join(" ")}" fill="var(--mesh)" fill-opacity=".25" fill-rule="evenodd" stroke="var(--mesh)" stroke-width=".3"/>` +
    r.lenses.map((l) => `<path d="${path(l)}" fill="none" stroke="var(--warm)" stroke-width=".35"/>`).join("");
  legend.textContent =
    `Orange: contour mesuré des verres. Teinté: face de la monture. ` +
    `Écart verre / fond de rainure: ${r.gap.min.toFixed(2)} à ${r.gap.max.toFixed(2)} mm.`;
}
