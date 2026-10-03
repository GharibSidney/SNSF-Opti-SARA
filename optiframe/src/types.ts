/**
 * DATA CONTRACT between the vision/AI pipeline and the frame generator.
 *
 * Frame coordinates are the WEARER's view (from behind), which is also the top view in
 * print orientation (front face on the bed):
 *   x to the right, y up, z from the bed (front face) upward.
 *   Right-eye lens sits at +x, its nasal side is -x.
 *   Left-eye  lens sits at -x, its nasal side is +x.
 *
 * A Contour must already follow this orientation. Use mirror() if the lens was photographed
 * from the other side.
 */
export type Vec2 = [number, number];
export type Eye = "L" | "R";

export interface Contour {
  eye: Eye;
  /** Closed polygon in mm, y up, counter-clockwise, centered on its bounding-box center. */
  points: Vec2[];
  /** Boxing dimensions (ISO 8624): bounding-box width and height, mm. */
  A: number;
  B: number;
  /** Polygon perimeter, mm. */
  perimeter: number;
}
