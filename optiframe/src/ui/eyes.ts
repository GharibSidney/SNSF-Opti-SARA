import type { Contour, Eye } from "../types";
import type { MeasureResult } from "../vision/types";

export interface EyePanel {
  busy(message: string): void;
  done(contour: Contour, result: MeasureResult): void;
  fail(message: string): void;
}

export interface EyeHandlers {
  onFile(file: Blob): void;
  onCamera(): void;
  onSvg(): void;
}

const TITLES: Record<Eye, string> = { L: "1. Verre gauche", R: "2. Verre droit" };

export function createEyePanel(host: HTMLElement, eye: Eye, h: EyeHandlers): EyePanel {
  const sec = document.createElement("section");
  sec.className = "card";
  sec.innerHTML = `
    <h2>${TITLES[eye]}</h2>
    <div class="row">
      <button class="primary" data-act="cam">Prendre une photo</button>
      <label class="btn">Choisir une image<input type="file" accept="image/*" hidden></label>
    </div>
    <p class="result" aria-live="polite">Pas encore mesuré. Posez le verre sur le dispositif et photographiez-le.</p>
    <dl class="dims" hidden>
      <div><dt>Largeur</dt><dd data-k="A"></dd></div>
      <div><dt>Hauteur</dt><dd data-k="B"></dd></div>
      <div><dt>Périmètre</dt><dd data-k="P"></dd></div>
    </dl>
    <details class="steps" hidden><summary>Voir les étapes de la mesure</summary><div class="step-list"></div></details>
    <div class="row"><button data-act="svg" disabled>Exporter le contour (SVG)</button></div>`;
  host.appendChild(sec);

  const q = <T extends Element>(s: string) => sec.querySelector(s) as T;
  const result = q<HTMLElement>(".result");
  const dims = q<HTMLElement>(".dims");
  const steps = q<HTMLDetailsElement>(".steps");
  const stepList = q<HTMLElement>(".step-list");
  const camBtn = q<HTMLButtonElement>('[data-act="cam"]');
  const svgBtn = q<HTMLButtonElement>('[data-act="svg"]');
  const input = q<HTMLInputElement>('input[type="file"]');

  camBtn.addEventListener("click", () => h.onCamera());
  svgBtn.addEventListener("click", () => h.onSvg());
  input.addEventListener("change", () => {
    const f = input.files?.[0];
    if (f) h.onFile(f);
    input.value = "";
  });

  const setBusy = (b: boolean) => {
    camBtn.disabled = b;
    input.disabled = b;
  };
  const say = (msg: string, err = false) => {
    result.textContent = msg;
    result.classList.toggle("err", err);
  };

  return {
    busy(message) {
      setBusy(true);
      say(message);
    },
    done(c, r) {
      setBusy(false);
      const low = r.confidence !== undefined && r.confidence < 0.6;
      say(low ? "Mesure terminée, confiance faible: reprenez la photo si possible." : "Mesure terminée.", low);
      dims.hidden = false;
      q<HTMLElement>('[data-k="A"]').textContent = `${c.A.toFixed(2)} mm`;
      q<HTMLElement>('[data-k="B"]').textContent = `${c.B.toFixed(2)} mm`;
      q<HTMLElement>('[data-k="P"]').textContent = `${c.perimeter.toFixed(1)} mm`;
      svgBtn.disabled = false;
      stepList.replaceChildren(
        ...(r.steps ?? []).map((s) => {
          const fig = document.createElement("figure");
          const img = document.createElement("img");
          img.src = s.src;
          img.alt = s.label;
          const cap = document.createElement("figcaption");
          cap.textContent = s.label;
          fig.append(img, cap);
          return fig;
        }),
      );
      steps.hidden = (r.steps ?? []).length === 0;
    },
    fail(message) {
      setBusy(false);
      say(message, true);
    },
  };
}
