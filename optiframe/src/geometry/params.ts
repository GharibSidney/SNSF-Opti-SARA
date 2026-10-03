export interface FrameParams {
  /** Distance between the two lens nasal edges, mm (brief default: 18). */
  bridge: number;
  /** Rim width around each lens, mm. */
  rim: number;
  /** Frame thickness (z), mm. */
  thick: number;
  /** Gap between lens edge and groove bottom, mm (brief: 0.1 to 0.3). */
  clearance: number;
  /** How far the front/back lips overlap the lens faces, mm. */
  lip: number;
  /** Groove profile resolution (number of thin slabs). */
  slabs: number;
  /** Bridge bar: center height above the lens center line, and bar height, mm. */
  bridgeY: number;
  bridgeH: number;
  /** Temple tenons: length, height above lens center, hinge hole radius, mm. */
  tenonLen: number;
  tenonY: number;
  hinge: number;
}

export const DEFAULT_PARAMS: FrameParams = {
  bridge: 18,
  rim: 3,
  thick: 4,
  clearance: 0.2,
  lip: 0.3,
  slabs: 16,
  bridgeY: 4,
  bridgeH: 4,
  tenonLen: 7,
  tenonY: 6,
  hinge: 0.9,
};
