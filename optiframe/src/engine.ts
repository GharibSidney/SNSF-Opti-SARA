import Module from "manifold-3d";
import wasmUrl from "manifold-3d/manifold.wasm?url";
import type { ManifoldToplevel } from "manifold-3d";

/** Browser-side loader for the manifold WASM (Vite serves/hashes the .wasm file). */
export async function loadEngine(): Promise<ManifoldToplevel> {
  const wasm = await Module({ locateFile: () => wasmUrl });
  wasm.setup();
  return wasm;
}
