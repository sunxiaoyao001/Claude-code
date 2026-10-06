/**
 * Isometric (2:1 dimetric) projection used by the renderer.
 * World: metres, x to the south-east, y to the south-west, z up.
 */
export const ISO_W = 16; // px per metre along x−y
export const ISO_H = 8; // px per metre along x+y
export const ISO_Z = 18; // px per metre of height

export const isoX = (x: number, y: number) => (x - y) * ISO_W;
export const isoY = (x: number, y: number, z = 0) => (x + y) * ISO_H - z * ISO_Z;

/** Inverse projection of a ground-plane (z = 0) screen point. */
export function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  const a = sx / ISO_W; // x - y
  const b = sy / ISO_H; // x + y
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/** Painter's-algorithm depth for something standing at (x, y). */
export const depthOf = (x: number, y: number) => x + y;

/** Screen-space angle of a world direction (for rotating flat sprites like tracers). */
export function screenAngle(dx: number, dy: number, dz = 0): number {
  return Math.atan2((dx + dy) * ISO_H - dz * ISO_Z, (dx - dy) * ISO_W);
}

/** Screen-space length of a world vector. */
export function screenLen(dx: number, dy: number, dz = 0): number {
  return Math.hypot((dx - dy) * ISO_W, (dx + dy) * ISO_H - dz * ISO_Z);
}

/** Quantise a world-space facing angle to one of `n` sprite directions. */
export function dirIndex(angle: number, n: number): number {
  const t = angle / (Math.PI * 2);
  return ((Math.round(t * n) % n) + n) % n;
}
