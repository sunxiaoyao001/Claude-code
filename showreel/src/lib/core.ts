// Timing, easing and geometry shared by every bar.

export type P = [number, number];
export type Contours = P[][];

export const W = 1920;
export const H = 1080;
export const CX = 960;
export const CY = 540;
export const FPS = 60;
export const DURATION = 30;
export const BEAT = 0.5;
export const LEAD = 0.05; // moves start this long before their beat

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpP = (a: P, b: P, t: number): P => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const TAU = Math.PI * 2;
export const rad = (d: number) => (d * Math.PI) / 180;

/** Critically damped spring 1 - (1 + w t) e^(-w t): never passes its target. */
export const spring = (t: number, t0: number, w = 24) => {
  const d = t - t0;
  if (d <= 0) return 0;
  const x = w * d;
  return 1 - (1 + x) * Math.exp(-x);
};
/** A spring move that lands on beat time `b` (starts LEAD seconds early). */
export const onBeat = (t: number, b: number, w = 24) => spring(t, b - LEAD, w);

export const expoIn = (p: number) => (p <= 0 ? 0 : p >= 1 ? 1 : (Math.pow(2, 10 * p) - 1) / 1023);
export const expoOut = (p: number) => 1 - expoIn(1 - p);
export const expoInOut = (p: number) => (p < 0.5 ? expoIn(p * 2) / 2 : 0.5 + expoOut(p * 2 - 1) / 2);

// ------------------------------------------------------------------ random
export const hash = (...n: number[]) => {
  let h = 2166136261;
  for (const v of n) {
    h ^= Math.floor(v * 1000003) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
export const strSeed = (s: string | number) => {
  if (typeof s === 'number') return s;
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
  return h;
};
export const rng = (seed: number) => {
  let a = Math.floor(seed * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ------------------------------------------------------------------ geometry
export const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: P, s: number): P => [a[0] * s, a[1] * s];
export const len = (a: P) => Math.hypot(a[0], a[1]);
export const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const rot = (p: P, a: number, c: P = [0, 0]): P => {
  const s = Math.sin(a);
  const k = Math.cos(a);
  const x = p[0] - c[0];
  const y = p[1] - c[1];
  return [c[0] + x * k - y * s, c[1] + x * s + y * k];
};
export const polar = (r: number, a: number, c: P = [0, 0]): P => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];

export const mapPts = (pts: P[], f: (p: P) => P) => pts.map(f);
export const mapC = (c: Contours, f: (p: P) => P): Contours => c.map((pts) => pts.map(f));
export const translateC = (c: Contours, dx: number, dy: number) => mapC(c, (p) => [p[0] + dx, p[1] + dy]);

export const pathLength = (pts: P[], closed = false) => {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]);
  if (closed && pts.length > 1) l += dist(pts[pts.length - 1], pts[0]);
  return l;
};

/** First fraction `p` of a polyline, by length. */
export const trimPath = (pts: P[], p: number, closed = false, from = 0): P[] => {
  if (p >= 1 && from <= 0) return closed ? [...pts, pts[0]] : pts;
  const src = closed ? [...pts, pts[0]] : pts;
  const total = pathLength(src);
  const a = total * clamp(from);
  const b = total * clamp(p);
  if (b <= a) return [];
  const out: P[] = [];
  let acc = 0;
  for (let i = 1; i < src.length; i++) {
    const s0 = acc;
    const d = dist(src[i - 1], src[i]);
    const s1 = acc + d;
    acc = s1;
    if (s1 < a) continue;
    if (s0 > b) break;
    const u0 = d > 0 ? clamp((a - s0) / d) : 0;
    const u1 = d > 0 ? clamp((b - s0) / d) : 1;
    if (!out.length) out.push(lerpP(src[i - 1], src[i], u0));
    out.push(lerpP(src[i - 1], src[i], u1));
  }
  return out;
};

/** Resample a polyline at a fixed step. Returns points, normals and arc length. */
export const resample = (pts: P[], step: number, closed = false) => {
  const src = closed ? [...pts, pts[0]] : pts;
  const out: P[] = [];
  const nrm: P[] = [];
  const arc: number[] = [];
  if (src.length < 2) return { pts: out, nrm, arc, total: 0 };
  const total = pathLength(src);
  const n = Math.max(1, Math.round(total / step));
  let j = 1;
  let acc = 0;
  let segLen = dist(src[0], src[1]);
  for (let k = 0; k <= n; k++) {
    if (closed && k === n) break;
    const s = (k / n) * total;
    while (j < src.length - 1 && acc + segLen < s) {
      acc += segLen;
      j++;
      segLen = dist(src[j - 1], src[j]);
    }
    const u = segLen > 0 ? clamp((s - acc) / segLen) : 0;
    const a = src[j - 1];
    const b = src[j];
    out.push(lerpP(a, b, u));
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    nrm.push([-dy / l, dx / l]);
    arc.push(s);
  }
  return { pts: out, nrm, arc, total };
};

export const polygon = (n: number, r: number, rotation = -Math.PI / 2, c: P = [0, 0]): P[] => {
  const out: P[] = [];
  for (let i = 0; i < n; i++) out.push(polar(r, rotation + (i / n) * TAU, c));
  return out;
};

export const circle = (r: number, c: P = [0, 0], n = 96, a0 = 0): P[] => {
  const out: P[] = [];
  for (let i = 0; i < n; i++) out.push(polar(r, a0 + (i / n) * TAU, c));
  return out;
};

export const ellipse = (rx: number, ry: number, c: P = [0, 0], n = 96, a0 = 0): P[] => {
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * TAU;
    out.push([c[0] + rx * Math.cos(a), c[1] + ry * Math.sin(a)]);
  }
  return out;
};

export const rect = (x0: number, y0: number, x1: number, y1: number): P[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

export const roundRect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 6): P[] => {
  r = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  const out: P[] = [];
  const corners: [number, number, number][] = [
    [x1 - r, y0 + r, -Math.PI / 2],
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, Math.PI / 2],
    [x0 + r, y0 + r, Math.PI],
  ];
  for (const [cx, cy, a0] of corners)
    for (let i = 0; i <= n; i++) out.push(polar(r, a0 + (i / n) * (Math.PI / 2), [cx, cy]));
  return out;
};

export const bezier = (p0: P, p1: P, p2: P, p3: P, n = 64): P[] => {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
};

/** Sample a closed polyline at n points evenly by arc length, starting at its first point. */
export const sampleClosed = (pts: P[], n: number): P[] => {
  const src = [...pts, pts[0]];
  const total = pathLength(src);
  const out: P[] = [];
  let j = 1;
  let acc = 0;
  let segLen = dist(src[0], src[1]);
  for (let k = 0; k < n; k++) {
    const s = (k / n) * total;
    while (j < src.length - 1 && acc + segLen < s) {
      acc += segLen;
      j++;
      segLen = dist(src[j - 1], src[j]);
    }
    out.push(lerpP(src[j - 1], src[j], segLen > 0 ? clamp((s - acc) / segLen) : 0));
  }
  return out;
};

/**
 * An arc of fixed length whose curvature grows from 0 (flat line) to closing into a circle.
 * Midpoint stays on top; the ends curl downward. Vertically centred on cy.
 */
export const curlLine = (cx: number, cy: number, length: number, kappa: number, n = 240, centre = true): P[] => {
  const out: P[] = [];
  const half = length / 2;
  const sag = kappa < 1e-7 ? 0 : (1 - Math.cos(Math.min(Math.PI, kappa * half))) / kappa;
  const shift = centre ? sag / 2 : 0;
  for (let i = 0; i <= n; i++) {
    const s = -half + (i / n) * length;
    if (kappa < 1e-7) out.push([cx + s, cy]);
    else out.push([cx + Math.sin(kappa * s) / kappa, cy - shift + (1 - Math.cos(kappa * s)) / kappa]);
  }
  return out;
};

/** Even-odd intervals of horizontal line y=c through contours. */
export const scanIntervals = (contours: Contours, y: number): [number, number][] => {
  const xs: number[] = [];
  for (const c of contours) {
    const n = c.length;
    for (let i = 0; i < n; i++) {
      const a = c[i];
      const b = c[(i + 1) % n];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    }
  }
  xs.sort((p, q) => p - q);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
};

export const bbox = (contours: Contours) => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of contours)
    for (const p of c) {
      if (p[0] < x0) x0 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[0] > x1) x1 = p[0];
      if (p[1] > y1) y1 = p[1];
    }
  return { x0, y0, x1, y1 };
};

// ------------------------------------------------------------------ 3D
export type V3 = [number, number, number];
export const rotX = (v: V3, a: number): V3 => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
export const rotY = (v: V3, a: number): V3 => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
export const rotZ = (v: V3, a: number): V3 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
export const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale3 = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm3 = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
/** Project with z pointing away from the viewer; persp 0 = orthographic, 1 = full perspective. */
export const project = (v: V3, c: P, persp = 0, D = 1100): P => {
  const s = 1 / (1 + (persp * v[2]) / D);
  return [c[0] + v[0] * s, c[1] + v[1] * s];
};
