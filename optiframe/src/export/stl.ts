/** Binary STL from xyz positions + triangle indices. Units: mm. */
export function toBinarySTL(positions: Float32Array, indices: Uint32Array): ArrayBuffer {
  const nTri = indices.length / 3;
  const buf = new ArrayBuffer(84 + nTri * 50);
  const dv = new DataView(buf);
  const tag = "OptiFrame";
  for (let i = 0; i < tag.length; i++) dv.setUint8(i, tag.charCodeAt(i));
  dv.setUint32(80, nTri, true);
  let o = 84;
  for (let t = 0; t < nTri; t++) {
    const ia = indices[3 * t] * 3;
    const ib = indices[3 * t + 1] * 3;
    const ic = indices[3 * t + 2] * 3;
    const ux = positions[ib] - positions[ia], uy = positions[ib + 1] - positions[ia + 1], uz = positions[ib + 2] - positions[ia + 2];
    const vx = positions[ic] - positions[ia], vy = positions[ic + 1] - positions[ia + 1], vz = positions[ic + 2] - positions[ia + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    for (const v of [nx, ny, nz]) { dv.setFloat32(o, v, true); o += 4; }
    for (const i of [ia, ib, ic]) {
      for (let k = 0; k < 3; k++) { dv.setFloat32(o, positions[i + k], true); o += 4; }
    }
    o += 2; // attribute byte count
  }
  return buf;
}
