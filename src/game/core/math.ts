export interface Vec2 {
  x: number;
  y: number;
}

export const TAU = Math.PI * 2;

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(bx - ax, by - ay);
export const dist2 = (ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
};

/** Wrap an angle into (-PI, PI]. */
export function wrapAngle(a: number): number {
  a %= TAU;
  if (a > Math.PI) a -= TAU;
  else if (a <= -Math.PI) a += TAU;
  return a;
}

/** Signed smallest difference b - a. */
export const angleDiff = (a: number, b: number) => wrapAngle(b - a);

/** Rotate angle `from` toward `to` by at most `maxStep` radians. */
export function turnToward(from: number, to: number, maxStep: number): number {
  const d = angleDiff(from, to);
  if (Math.abs(d) <= maxStep) return wrapAngle(to);
  return wrapAngle(from + Math.sign(d) * maxStep);
}

export function lerpAngle(a: number, b: number, t: number): number {
  return wrapAngle(a + angleDiff(a, b) * t);
}

/**
 * Distance along the ray (origin + dir * t, |dir| = 1) to the first intersection with a circle,
 * or -1 when the ray misses within [0, maxT].
 */
export function rayCircle(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  maxT: number,
  cx: number,
  cy: number,
  r: number,
): number {
  const fx = ox - cx;
  const fy = oy - cy;
  const b = fx * dx + fy * dy;
  const c = fx * fx + fy * fy - r * r;
  if (c > 0 && b > 0) return -1;
  const disc = b * b - c;
  if (disc < 0) return -1;
  let t = -b - Math.sqrt(disc);
  if (t < 0) t = 0;
  return t <= maxT ? t : -1;
}

/** Closest distance from point to the segment a-b. */
export function pointSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 > 0 ? ((px - ax) * abx + (py - ay) * aby) / len2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(ax + abx * t - px, ay + aby * t - py);
}

/**
 * Ray vs oriented box (center, half extents along its local axes, rotation `angle`).
 * Returns entry distance or -1.
 */
export function rayOBB(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  maxT: number,
  cx: number,
  cy: number,
  hx: number,
  hy: number,
  angle: number,
): number {
  const c = Math.cos(-angle);
  const s = Math.sin(-angle);
  const lx = (ox - cx) * c - (oy - cy) * s;
  const ly = (ox - cx) * s + (oy - cy) * c;
  const ldx = dx * c - dy * s;
  const ldy = dx * s + dy * c;
  let tmin = 0;
  let tmax = maxT;
  if (Math.abs(ldx) < 1e-9) {
    if (lx < -hx || lx > hx) return -1;
  } else {
    let t1 = (-hx - lx) / ldx;
    let t2 = (hx - lx) / ldx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  if (Math.abs(ldy) < 1e-9) {
    if (ly < -hy || ly > hy) return -1;
  } else {
    let t1 = (-hy - ly) / ldy;
    let t2 = (hy - ly) / ldy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  return tmin;
}

export function pointInOBB(px: number, py: number, cx: number, cy: number, hx: number, hy: number, angle: number) {
  const c = Math.cos(-angle);
  const s = Math.sin(-angle);
  const lx = (px - cx) * c - (py - cy) * s;
  const ly = (px - cx) * s + (py - cy) * c;
  return Math.abs(lx) <= hx && Math.abs(ly) <= hy;
}

/** Length of the chord a segment cuts through a circle (used for smoke opacity). */
export function segmentCircleChord(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  r: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return 0;
  const ux = dx / len;
  const uy = dy / len;
  const fx = ax - cx;
  const fy = ay - cy;
  const b = fx * ux + fy * uy;
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - c;
  if (disc <= 0) return 0;
  const sq = Math.sqrt(disc);
  const t0 = clamp(-b - sq, 0, len);
  const t1 = clamp(-b + sq, 0, len);
  return Math.max(0, t1 - t0);
}
