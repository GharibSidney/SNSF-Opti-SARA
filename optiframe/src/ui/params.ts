import type { FrameParams } from "../geometry/params";

type Key = "bridge" | "rim" | "thick" | "clearance" | "lip";
const MAIN: [Key, string, number, number, number][] = [["bridge", "Largeur du pont nasal (mm)", 10, 26, 0.5]];
const ADV: [Key, string, number, number, number][] = [
  ["rim", "Largeur du cercle (mm)", 2, 6, 0.1],
  ["thick", "Épaisseur (mm)", 3, 7, 0.1],
  ["clearance", "Jeu verre/rainure (mm)", 0.05, 0.4, 0.05],
  ["lip", "Retenue avant/arrière (mm)", 0, 0.8, 0.05],
];

export function createParamsPanel(host: HTMLElement, p: FrameParams, onChange: () => void): void {
  const row = ([k, label, min, max, step]: [Key, string, number, number, number]) => `
    <label class="field"><span>${label}</span><output data-o="${k}"></output>
      <input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${p[k]}"></label>`;
  host.innerHTML = `<h2>3. Réglages de la monture</h2>${MAIN.map(row).join("")}
    <details><summary>Réglages avancés</summary>${ADV.map(row).join("")}</details>`;
  const sync = () =>
    host.querySelectorAll<HTMLOutputElement>("output").forEach((o) => {
      o.textContent = String(+p[o.dataset.o as Key].toFixed(2));
    });
  host.querySelectorAll<HTMLInputElement>("input[type=range]").forEach((i) =>
    i.addEventListener("input", () => {
      p[i.dataset.k as Key] = parseFloat(i.value);
      sync();
      onChange();
    }),
  );
  sync();
}
