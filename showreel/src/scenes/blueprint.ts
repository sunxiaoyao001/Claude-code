// Bars 6-9 on the blueprint: 2D TO 3D, MECHANISM, UNFOLD, DATA.
import {
  add3,
  circle,
  clamp,
  Contours,
  CX,
  CY,
  expoIn,
  expoOut,
  lerp,
  lerpP,
  norm3,
  onBeat,
  P,
  polar,
  project,
  rad,
  rect,
  rotX,
  rotY,
  roundRect,
  seg,
  spring,
  sub3,
  TAU,
  V3,
  dot3,
  scale3,
} from '../lib/core';
import { Ink } from '../lib/ink';
import { HEXES, hexAt } from './paper';
import { typed } from './shared';

const HEX_R = 96;
const D = 1100;

// ====================================================================== cube model
interface CubePose {
  c: P;
  h: number;
  yaw: number;
  pitch: number;
  persp: number;
  flat: number; // 0 full depth, 1 squashed onto the front face
}

const CUBE_V: V3[] = [];
for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) CUBE_V.push([x, y, z]);
// faces as vertex index loops with outward normals
const FACES: { idx: number[]; n: V3 }[] = [
  { idx: [0, 1, 3, 2], n: [-1, 0, 0] },
  { idx: [4, 6, 7, 5], n: [1, 0, 0] },
  { idx: [0, 4, 5, 1], n: [0, -1, 0] },
  { idx: [2, 3, 7, 6], n: [0, 1, 0] },
  { idx: [0, 2, 6, 4], n: [0, 0, -1] },
  { idx: [1, 5, 7, 3], n: [0, 0, 1] },
];
const LIGHT_DIR: V3 = norm3([0.55, 0.85, 0.6]); // light travels down-right-away

const xf = (v: V3, p: CubePose): V3 => {
  let q: V3 = [v[0] * p.h, v[1] * p.h, v[2] * p.h * (1 - p.flat)];
  q = rotY(q, p.yaw);
  q = rotX(q, p.pitch);
  return q;
};

const faceVisible = (n: V3, centre: V3, persp: number) => {
  if (persp < 0.01) return n[2] < -1e-4;
  const eye: V3 = [0, 0, -D / persp];
  return dot3(n, sub3(centre, eye)) < -1e-4;
};

/** Draw a cube: visible edges solid, hidden edges dashed, visible faces hatched by how lit they are. */
const drawCube = (k: Ink, p: CubePose, id: string, fill = 0, skipFront = false) => {
  const vs = CUBE_V.map((v) => xf(v, p));
  const pts = vs.map((v) => project(v, p.c, p.persp, D));
  const vis = FACES.map((f) => {
    const n = rotX(rotY(f.n, p.yaw), p.pitch);
    const centre = scale3(f.idx.reduce((a, i) => add3(a, vs[i]), [0, 0, 0] as V3), 0.25);
    return { f, n, v: faceVisible(n, centre, p.persp) };
  });
  if (fill > 0)
    vis.forEach(({ f, n, v }, i) => {
      if (!v) return;
      const light = clamp(0.25 + 0.75 * Math.max(0, -dot3(n, LIGHT_DIR)));
      k.fill([f.idx.map((j) => pts[j])], { id: `${id}f${i}`, light, draw: fill });
    });
  // edges: an edge is visible when either neighbouring face is
  const edges = new Map<string, { a: number; b: number; vis: boolean }>();
  vis.forEach(({ f, v }) => {
    for (let i = 0; i < 4; i++) {
      const a = f.idx[i];
      const b = f.idx[(i + 1) % 4];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      const e = edges.get(key);
      if (e) e.vis = e.vis || v;
      else edges.set(key, { a, b, vis: v });
    }
  });
  const frontIdx = new Set([0, 2, 6, 4]);
  edges.forEach((e, key) => {
    if (skipFront && frontIdx.has(e.a) && frontIdx.has(e.b)) return;
    if (Math.hypot(pts[e.a][0] - pts[e.b][0], pts[e.a][1] - pts[e.b][1]) < 0.8) return;
    k.line([pts[e.a], pts[e.b]], { id: `${id}${key}`, hidden: !e.vis });
  });
};

/** Front-face half size of a cube seen square on. */

// ====================================================================== gears
const gearR = (n: number, rp: number, phi: number, rotA: number) => {
  const m = (2 * rp) / n;
  const ra = rp + m;
  const rf = rp - 1.25 * m;
  const pitch = TAU / n;
  let x = (phi - rotA) % pitch;
  if (x < 0) x += pitch;
  const psi = Math.abs(x > pitch / 2 ? x - pitch : x); // angle from the nearest tooth centre
  const tip = pitch * 0.16;
  const root = pitch * 0.32;
  if (psi <= tip) return ra;
  if (psi >= root) return rf;
  return lerp(ra, rf, (psi - tip) / (root - tip));
};

const polarShape = (c: P, f: (phi: number) => number, n = 512): P[] => {
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    const phi = (i / n) * TAU;
    out.push(polar(f(phi), phi, c));
  }
  return out;
};

const squareR = (half: number, phi: number) => half / Math.max(Math.abs(Math.cos(phi)), Math.abs(Math.sin(phi)));

const G1 = { n: 16, rp: 208 };
const G2 = { n: 10, rp: 130, a: rad(-35) };
const G3 = { n: 12, rp: 156, a: rad(-145) };

const drawGear = (k: Ink, c: P, n: number, rp: number, rotA: number, scale: number, id: string, label: string, labelAt: P, align: CanvasTextAlign) => {
  if (scale <= 0.01) return;
  const body = polarShape(c, (phi) => gearR(n, rp, phi, rotA) * scale, n * 28);
  const hub = circle(46 * scale * (rp / 208) + 12 * scale, c, 48);
  const bore = circle(16 * scale, c, 32);
  k.fill([body, hub], { id: `${id}fill`, light: 0.55 });
  k.line(body, { id, closed: true });
  k.line(hub, { id: `${id}hub`, closed: true, w: 2.6 });
  k.line(bore, { id: `${id}bore`, closed: true, w: 2.6 });
  // keyway
  const kw = [polar(16 * scale, rotA - 0.35, c), polar(24 * scale, rotA - 0.3, c), polar(24 * scale, rotA + 0.3, c), polar(16 * scale, rotA + 0.35, c)];
  k.line(kw, { id: `${id}key`, w: 2.2 });
  k.line(circle(rp * scale, c, 128), { id: `${id}pitch`, closed: true, hidden: true });
  if (scale > 0.85) k.text(label, labelAt[0], labelAt[1], { size: 26, weight: 800, accent: true, track: 0.2, align });
};

// ====================================================================== dashboard layout
type Rect = [number, number, number, number];
const PANELS: Record<string, Rect> = {
  header: [150, 140, 1770, 215],
  sidebar: [150, 240, 460, 940],
  chart: [490, 240, 1770, 610],
  tile1: [490, 640, 1115, 790],
  tile2: [1145, 640, 1770, 790],
  timeline: [490, 820, 1770, 940],
};
export const CHART = [42, 30, 36, 44, 50, 46, 52, 62, 50, 56, 62, 72, 60, 66, 58, 76, 56, 62, 68, 74, 70, 78, 86, 94, 100, 93, 97, 90, 80, 50];
export const BAR_NAMES = ['DRAFT', 'TYPE', 'CURVE', 'MORPH', 'TILE', 'SOLID', 'GEAR', 'PANEL', 'DATA', 'LIGHT', 'WAVE', 'GLOBE', 'DRUM', 'FORM', 'END'];

const PLOT = { x0: 520, x1: 1740, base: 584, max: 250 };
export const RING_CENTRE: P = [1130, 425];
const RING_R = 110;

/** Bar chart that can bend round into a ring. Returns bar rectangles and the baseline. */
export const chartGeometry = (bend: number, centre: P, ringR: number, lenScale: number) => {
  const L0 = PLOT.x1 - PLOT.x0;
  const L1 = TAU * ringR;
  const Lb = lerp(L0, L1, bend);
  const kap = bend / ringR;
  // keep the arc's box centred between the flat baseline and the ring centre
  const sag = kap < 1e-7 ? 0 : (1 - Math.cos(Math.min(Math.PI, (kap * Lb) / 2))) / kap;
  const mid: P = [lerp((PLOT.x0 + PLOT.x1) / 2, centre[0], bend), lerp(PLOT.base, centre[1], bend) - sag / 2];
  const at = (s: number) => {
    if (kap < 1e-7) return { p: [mid[0] + s, mid[1]] as P, n: [0, -1] as P };
    const a = kap * s;
    return { p: [mid[0] + Math.sin(a) / kap, mid[1] + (1 - Math.cos(a)) / kap] as P, n: [Math.sin(a), -Math.cos(a)] as P };
  };
  const base: P[] = [];
  for (let i = 0; i <= 180; i++) base.push(at(-Lb / 2 + (i / 180) * Lb).p);
  const bw = lerp(26, 13, bend);
  const hScale = lerp(PLOT.max, 78 * lenScale, bend) / 100;
  const bars = CHART.map((v, i) => {
    const { p, n } = at(-Lb / 2 + ((i + 0.5) / 30) * Lb);
    const tg: P = [-n[1], n[0]];
    const h = v * hScale;
    const a: P = [p[0] - (tg[0] * bw) / 2, p[1] - (tg[1] * bw) / 2];
    const b: P = [p[0] + (tg[0] * bw) / 2, p[1] + (tg[1] * bw) / 2];
    return { poly: [a, b, [b[0] + n[0] * h, b[1] + n[1] * h], [a[0] + n[0] * h, a[1] + n[1] * h]] as P[], top: [p[0] + n[0] * h, p[1] + n[1] * h] as P };
  });
  return { base, bars, closed: bend > 0.999 };
};

const lerpRect = (a: Rect, b: Rect, p: number): Rect => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p), lerp(a[3], b[3], p)];

const cursorShape = (tip: P, s: number): P[] =>
  [
    [0, 0],
    [0, 34],
    [9, 26],
    [15, 40],
    [21, 37],
    [15, 24],
    [26, 24],
  ].map(([x, y]) => [tip[0] + x * s, tip[1] + y * s] as P);

// odometer digits
const rollNumber = (k: Ink, x: number, y: number, value: number, digits: number, size: number, id: string) => {
  const ctx = k.ctx;
  const cw = size * 0.62;
  for (let d = 0; d < digits; d++) {
    const place = Math.pow(10, digits - 1 - d);
    const pos = value / place;
    const base = Math.floor(pos);
    const frac = place === 1 ? pos - base : clamp((pos - base - 0.9) * 10); // higher digits roll at the carry
    const cx = x + d * cw;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - 4, y - size * 0.82, cw + 8, size * 0.9);
    ctx.clip();
    for (const [digit, off] of [
      [base % 10, -frac],
      [(base + 1) % 10, 1 - frac],
    ] as [number, number][]) {
      if (Math.abs(off) >= 1) continue;
      k.text(String(digit), cx, y + off * size * 0.9, { size, weight: 900, track: 0 });
    }
    ctx.restore();
    void id;
  }
};

// ====================================================================== the bars
export const blueprint = (k: Ink, t: number) => {
  if (t < 10.0) return honeycomb(k, 1);
  if (t < 13.95) return solidAndGear(k, t);
  if (t < 15.95) return unfoldAndPanels(k, t);
  return data(k, t);
};

const honeycomb = (k: Ink, p: number) => {
  HEXES.forEach((h, i) => k.line(hexAt(h.c, HEX_R), { id: `hc${i}`, closed: true, draw: p }));
};

// isometric cube in a hexagon of radius r: three visible and three hidden lines from the centre
const isoLines = (k: Ink, c: P, r: number, p: number, id: string) => {
  if (p <= 0) return;
  const at = (deg: number) => polar(r, rad(deg), c);
  [90, 210, 330].forEach((d, i) => k.line([c, at(d)], { id: `${id}v${i}`, draw: p }));
  [270, 30, 150].forEach((d, i) => k.line([c, at(d)], { id: `${id}h${i}`, draw: p, hidden: true }));
};

const ISO_YAW = rad(45);
const ISO_PITCH = Math.atan(1 / Math.sqrt(2));
const R_TO_H = 1 / Math.sqrt(8 / 3);

// ---------------------------------------------------------------- bars 6-7
const solidAndGear = (k: Ink, t: number) => {
  // bar 6: lines draw in every hexagon, the outer cubes slide into the centre one
  const merge = onBeat(t, 10.5, 22);
  const grow = onBeat(t, 10.5, 20);
  const R = lerp(HEX_R, 270, grow);
  if (merge < 0.995) {
    const ctx = k.ctx;
    ctx.save();
    // outer cubes disappear into the centre cube
    const sil = hexAt([CX, CY], R);
    ctx.beginPath();
    ctx.rect(-10, -10, 1940, 1100);
    ctx.moveTo(sil[0][0], sil[0][1]);
    sil.slice(1).forEach((q) => ctx.lineTo(q[0], q[1]));
    ctx.closePath();
    ctx.clip('evenodd');
    HEXES.forEach((h, i) => {
      if (h.ring === 0) return;
      const m = spring(t, 10.45 + (h.ring - 1) * 0.04, 22);
      const c = lerpP(h.c, [CX, CY], m);
      k.line(hexAt(c, HEX_R), { id: `hc${i}`, closed: true });
      isoLines(k, c, HEX_R, spring(t, 10.0 + h.ring * 0.06, 26), `iso${i}`);
    });
    ctx.restore();
  }

  // the centre cube: isometric, a quarter turn with perspective, then square on
  const turn = onBeat(t, 11.0, 20);
  const front = onBeat(t, 11.5, 20);
  const flat = expoIn(seg(t, 11.95, 12.08));
  const back = onBeat(t, 13.5, 20); // depth comes back
  const gearIn = spring(t, 12.0, 20);
  const gearOut = onBeat(t, 13.5, 22);
  const gearP = gearIn * (1 - gearOut);
  const lift = spring(t, 11.95, 20) * (1 - back);
  const toNet = back;
  const show = spring(t, 13.6, 22); // a three-quarter turn to show the depth again
  const pose: CubePose = {
    c: [CX, lerp(lerp(CY, 600, lift), 440, toNet)],
    h: lerp(R * R_TO_H, 100, toNet),
    yaw: t < 11.95 ? ISO_YAW + rad(90) * turn + rad(45) * front : rad(-32) * show,
    pitch: t < 11.95 ? ISO_PITCH * (1 - front) : rad(22) * show,
    persp: turn,
    flat: t >= 11.95 ? flat * (1 - back) : 0,
  };
  const fill = seg(t, 10.95, 11.4) * (1 - expoIn(seg(t, 11.95, 12.05)));
  if (t < 11.95) {
    if (turn < 0.002 && front < 0.002) {
      // corner-on: exactly the hexagon with its six lines
      k.line(hexAt([CX, CY], R), { id: 'hc0', closed: true });
      isoLines(k, [CX, CY], R, spring(t, 10.0, 26), 'iso0');
    } else drawCube(k, pose, 'cube', fill);
    return;
  }

  // bar 7: the front square grows teeth
  const steps = [12.25, 12.5, 12.75, 13.0, 13.25].reduce((a, b) => a + spring(t, b - 0.05, 36), 0);
  const th1 = rad(45) * steps;
  const c1 = pose.c;
  // front face in cube space (square -> gear), then turned and projected with the cube
  const zf = -pose.h * (1 - pose.flat);
  const shape = polarShape([0, 0], (phi) => lerp(squareR(pose.h, phi), gearR(G1.n, G1.rp, phi, th1), gearP), 640).map((q) =>
    project(rotX(rotY([q[0], q[1], zf], pose.yaw), pose.pitch), c1, pose.persp, D),
  );
  if (gearP > 0.02) {
    const hub = circle(58 * gearP, c1, 48);
    k.fill([shape, hub], { id: 'g1fill', light: 0.55, draw: gearP });
    k.line(hub, { id: 'g1hub', closed: true, w: 2.6 });
    k.line(circle(16 * gearP, c1, 32), { id: 'g1bore', closed: true, w: 2.6 });
    k.line(circle(G1.rp * gearP, c1, 128), { id: 'g1pitch', closed: true, hidden: true, draw: gearP });
    if (gearP > 0.85) k.text('16T', c1[0] + 196, c1[1] + 232, { size: 26, weight: 800, accent: true, track: 0.2 });
  }
  k.line(shape, { id: 'g1', closed: true });
  // depth edges (hidden) around the front face while it is a cube
  if (pose.flat < 0.995) drawCube(k, pose, 'cube', 0, true);

  // the train: 10T to the upper right, 12T to the upper left; both mesh with 16T
  const mesh = (g: { n: number; rp: number; a: number }) => g.a + Math.PI + Math.PI / g.n - (G1.n / g.n) * (th1 - g.a);
  const retract = expoIn(seg(t, 13.36, 13.54));
  for (const [g, start, label, id, align, lab] of [
    [G2, 12.5, '10T', 'g2', 'left', [178, 10]],
    [G3, 13.0, '12T', 'g3', 'right', [-200, 10]],
  ] as [typeof G2, number, string, string, CanvasTextAlign, P][]) {
    const s = onBeat(t, start, 22) * (1 - retract);
    if (s <= 0.01) continue;
    const dist = G1.rp + g.rp;
    const from = polar(G1.rp, g.a, c1);
    const to = polar(dist, g.a, c1);
    const c = lerpP(from, to, s);
    drawGear(k, c, g.n, g.rp, mesh(g), s, id, label, [c[0] + lab[0], c[1] + lab[1]], align);
  }
};

// ---------------------------------------------------------------- bar 8: unfold into panels
const NET: Record<string, Rect> = {
  header: [860, 140, 1060, 340],
  sidebar: [660, 340, 860, 540],
  chart: [860, 340, 1060, 540],
  tile1: [860, 540, 1060, 740],
  tile2: [1060, 340, 1260, 540],
  timeline: [860, 740, 1060, 940],
};
const ORDER = ['chart', 'header', 'sidebar', 'tile2', 'tile1', 'timeline'];

const unfoldFaces = (u: number, persp: number, yaw: number, pitch: number): { key: string; pts: P[]; vis: boolean }[] => {
  const h = 100;
  const c: P = [CX, 440];
  const b = rad(90) * u;
  // faces are built around the cube centre; the unfolded net lies in the front plane
  const view = (v: V3): V3 => {
    const q = rotX(rotY(v, yaw), pitch);
    return [q[0], q[1], q[2] + h * u];
  };
  const sinB = Math.sin(b);
  const cosB = Math.cos(b);
  const phiK = rad(180 * u - 90);
  const hingeK = (x: number): V3 => [x, h + 2 * h * sinB, -h + 2 * h * cosB];
  const quad = (f: (x: number, d: number) => V3): V3[] => [f(-h, 0), f(h, 0), f(h, 2 * h), f(-h, 2 * h)];
  const faces: { key: string; vs: V3[]; n: V3 }[] = [
    { key: 'chart', vs: rect(-h, -h, h, h).map(([x, y]) => [x, y, -h] as V3), n: [0, 0, -1] },
    { key: 'header', vs: quad((x, d) => [x, -h - d * sinB, -h + d * cosB]), n: [0, -cosB, -sinB] },
    { key: 'tile1', vs: quad((x, d) => [x, h + d * sinB, -h + d * cosB]), n: [0, cosB, -sinB] },
    { key: 'sidebar', vs: quad((y, d) => [-h - d * sinB, y, -h + d * cosB]), n: [-cosB, 0, -sinB] },
    { key: 'tile2', vs: quad((y, d) => [h + d * sinB, y, -h + d * cosB]), n: [cosB, 0, -sinB] },
    {
      key: 'timeline',
      vs: [-h, h, h, -h].map((x, i) => {
        const e = i < 2 ? 0 : 2 * h;
        const hk = hingeK(x);
        return [hk[0], hk[1] + e * Math.sin(phiK), hk[2] + e * Math.cos(phiK)] as V3;
      }),
      n: [0, Math.cos(phiK), -Math.sin(phiK)],
    },
  ];
  return faces.map((f) => {
    const vv = f.vs.map(view);
    const centre = scale3(vv.reduce((a, q) => add3(a, q), [0, 0, 0] as V3), 0.25);
    const n = rotX(rotY(f.n, yaw), pitch);
    return { key: f.key, pts: vv.map((q) => project(q, c, persp, D)), vis: faceVisible(n, centre, persp) };
  });
};

const unfoldAndPanels = (k: Ink, t: number) => {
  const u = onBeat(t, 14.0, 14);
  const persp = 1 - spring(t, 13.95, 16);
  const square = onBeat(t, 14.0, 16);
  const yaw = rad(-32) * spring(t, 13.6, 22) * (1 - square);
  const pitch = rad(22) * spring(t, 13.6, 22) * (1 - square);
  const slide = (key: string) => onBeat(t, 14.5 + ORDER.indexOf(key) * 0.03, 20);
  if (t < 14.45) {
    const faces = unfoldFaces(u, persp, yaw, pitch);
    // draw hidden faces first so solid edges sit on top
    [...faces].sort((a, b) => Number(a.vis) - Number(b.vis)).forEach((f) => k.line(f.pts, { id: `net${f.key}`, closed: true, hidden: !f.vis }));
    return;
  }
  for (const key of ORDER) {
    const r = lerpRect(NET[key], PANELS[key], slide(key));
    k.line(rect(r[0], r[1], r[2], r[3]), { id: `net${key}`, closed: true });
  }
  panelContent(k, t);
};

// ---------------------------------------------------------------- panel content (bars 8-9)
const panelContent = (k: Ink, t: number) => {
  const fillIn = (d = 0) => onBeat(t, 15.0 + d, 20);
  const ft = seg(t, 14.95, 15.3);

  // header
  typed(k, 'CLAUDE — MOTION REEL', 178, 186, ft, { size: 26, weight: 800, track: 0.2, caret: true });
  const ringOn = onBeat(t, 16.5, 26);
  const lightOn = onBeat(t, 17.0, 26);
  const sw = fillIn(0.04);
  if (sw > 0.01) {
    k.line(rect(1250, 158, 1490, 198), { id: 'sw', closed: true, w: 2.4, draw: sw });
    typed(k, 'BARS', 1310, 187, seg(t, 15.0, 15.12), { size: 24, weight: 700, track: 0.14, align: 'center' });
    typed(k, 'RING', 1430, 187, seg(t, 15.06, 15.18), { size: 24, weight: 700, track: 0.14, align: 'center' });
    const kx = lerp(1254, 1374, ringOn);
    k.line(rect(kx, 162, kx + 112, 194), { id: 'swk', closed: true, accent: true, w: 3, draw: sw });
    // light toggle
    typed(k, 'LIGHT', 1530, 187, seg(t, 15.1, 15.25), { size: 24, weight: 700, track: 0.14 });
    const pill = roundRect(1650, 160, 1740, 196, 18, 8);
    // the pill fills by a wipe that follows the knob, never by opacity
    if (lightOn > 0.01) k.fill([pill], { id: 'pill', accent: true, solid: 1, density: 0.0001, clipX: [1640, lerp(1650, 1745, lightOn)] });
    k.line(pill, { id: 'pill', closed: true, w: 2.4, draw: sw });
    k.line(circle(12, [lerp(1668, 1722, lightOn), 178], 32), { id: 'knob', closed: true, w: 2.4, draw: sw });
  }

  // sidebar counters
  const roll = spring(t, 15.45, 14);
  [
    ['BPM', 120, 3],
    ['BEATS', 60, 2],
    ['FRAMES', 1800, 4],
    ['CUTS', 10, 1],
  ].forEach(([label, target, digits], i) => {
    const y0 = 240 + i * 175;
    typed(k, label as string, 180, y0 + 52, seg(t, 14.95 + i * 0.04, 15.15 + i * 0.04), { size: 24, weight: 700, track: 0.2 });
    if (i) k.line([[170, y0], [440, y0]], { id: `sep${i}`, w: 1.6, draw: fillIn(i * 0.03) });
    if (t >= 14.95) rollNumber(k, 180, y0 + 136, (target as number) * roll, digits as number, 72, `n${i}`);
  });

  // chart
  drawChart(k, t, onBeat(t, 16.5, 16), 0, fillIn());

  // tile 1: the spring this film moves on
  const sp = fillIn(0.06);
  typed(k, 'SPRING', 515, 684, sp, { size: 24, weight: 800, track: 0.2 });
  typed(k, 'ω 24', 515, 718, sp, { size: 24, weight: 600, track: 0.14, accent: true });
  if (sp > 0.01) {
    const curve: P[] = [];
    for (let i = 0; i <= 80; i++) {
      const x = i / 80;
      curve.push([700 + x * 380, 768 - 100 * (1 - (1 + 24 * 0.5 * x) * Math.exp(-24 * 0.5 * x))]);
    }
    k.line([[700, 668], [1080, 668]], { id: 'target', hidden: true, draw: sp });
    k.line(curve, { id: 'springc', draw: sp, accent: true });
  }

  // tile 2: the three inks
  const ip = fillIn(0.09);
  ['PAPER', 'BLUE', 'HOLO'].forEach((name, i) => {
    const x = 1178 + i * 200;
    const sq = rect(x, 668, x + 56, 724);
    if (ip <= 0.01) return;
    if (i === 1) k.fill([sq], { id: `sw${i}`, draw: ip, light: 0.2 });
    if (i === 2) k.fill([sq], { id: `sw${i}`, accent: true, solid: 1, density: 0.0001, clipX: [x - 4, x + 60 * ip] });
    k.line(sq, { id: `sw${i}`, closed: true, w: 2.4, draw: ip });
    typed(k, name, x, 764, ip, { size: 24, weight: 700, track: 0.2 });
  });

  // timeline
  const tl = fillIn(0.12);
  const x0 = 520;
  const x1 = 1740;
  if (tl > 0.01) {
    k.line([[x0, 880], [x1, 880]], { id: 'track', w: 2.4, draw: tl });
    const playX = x0 + (t / 30) * (x1 - x0);
    BAR_NAMES.forEach((n, i) => {
      const x = x0 + ((i + 0.5) / 15) * (x1 - x0);
      const s = 9 * spring(t, 15.0 + i * 0.015, 26);
      if (s < 0.3) return;
      const dia: P[] = [[x, 880 - s], [x + s, 880], [x, 880 + s], [x - s, 880]];
      if (t >= 15.95 && x < playX) k.solid([dia]);
      k.line(dia, { id: `kf${i}`, closed: true, w: 2.2 });
      typed(k, n, x, i % 2 ? 922 : 864, seg(t, 15.0 + i * 0.015, 15.2 + i * 0.015), { size: 24, weight: 600, track: 0.14, align: 'center' });
    });
    // the playhead lands at the real time
    const land = onBeat(t, 16.0, 22);
    if (land > 0.01) {
      const y0 = lerp(700, 826, land);
      k.line([[playX, y0], [playX, y0 + 108]], { id: 'play', accent: true, w: 3 });
      k.solid([[[playX - 9, y0 - 12], [playX + 9, y0 - 12], [playX, y0]]], { accent: true });
    }
  }

  // the cursor
  if (t >= 15.95) {
    const arrive = spring(t, 15.95, 16);
    const toLight = spring(t, 16.7, 20);
    const ringBtn: P = [1424, 182];
    const lightBtn: P = [1706, 182];
    const pos = lerpP(lerpP([1990, 1130], ringBtn, arrive), lightBtn, toLight);
    const press = (b: number) => (t >= b - 0.05 && t < b + 0.12 ? (t < b ? expoOut(seg(t, b - 0.05, b)) : 1 - expoOut(seg(t, b, b + 0.12))) : 0);
    const s = 1.3 * (1 - 0.14 * (press(16.5) + press(17.0)));
    const cur = cursorShape(pos, s);
    k.fill([cur], { id: 'cursor', light: 0.1, density: 1.3 });
    k.line(cur, { id: 'cursor', closed: true, w: 2.6 });
  }
};

/** The chart in any ink: bars, baseline, graph line; bends into a ring and lifts out to the centre. */
export const drawChart = (k: Ink, t: number, bend: number, lift: number, appear: number, ringScale = 1, at?: P, ringR?: number, barLen = 1) => {
  if (appear <= 0.01) return;
  const centre = at ?? lerpP(RING_CENTRE, [CX, CY], lift);
  const r = ringR ?? RING_R * lerp(1, 1.36, lift) * ringScale;
  const { base, bars: full } = chartGeometry(bend, centre, r, lerp(1, 1.36, lift) * ringScale);
  // bars can shrink back into the baseline
  const bars = full.map((b) => ({ poly: [b.poly[0], b.poly[1], lerpP(b.poly[1], b.poly[2], barLen), lerpP(b.poly[0], b.poly[3], barLen)] as P[], top: lerpP(lerpP(b.poly[0], b.poly[1], 0.5), b.top, barLen) }));
  const cs = Math.floor(t);
  const states = t >= 15.95;
  bars.forEach((b, i) => {
    const grow = spring(t, 15.0 + i * 0.012, 24);
    if (grow < 0.01) return;
    const poly = b.poly.map((p, j) => (j < 2 ? p : lerpP(b.poly[j - 1 === 0 ? 1 : 0], p, grow))) as P[];
    const pp = [poly[0], poly[1], lerpP(poly[1], b.poly[2], grow), lerpP(poly[0], b.poly[3], grow)];
    if (states && i === cs) k.fill([pp], { id: `bar${i}`, accent: true, solid: 1, density: 0.0001, light: 1 });
    else if (states && i < cs) k.fill([pp], { id: `bar${i}`, light: 0.45, draw: onBeat(t, 16.0, 20) });
    k.line(pp, { id: `bar${i}`, closed: true, w: 2.2, accent: states && i === cs });
  });
  k.line(base, { id: 'baseline', w: 3, draw: appear });
  if (states) {
    const g = onBeat(t, 16.0, 14);
    k.line(
      bars.map((b) => b.top),
      { id: 'graph', draw: g, w: 2.6 },
    );
    if (g > 0.05) bars.forEach((b, i) => i % 3 === 0 && k.line(circle(4, b.top, 12), { id: `gp${i}`, closed: true, w: 2, draw: clamp(g * 30 - i) }));
  }
};

// ---------------------------------------------------------------- bar 9: data
const data = (k: Ink, t: number) => {
  for (const key of ORDER) {
    const r = PANELS[key];
    k.line(rect(r[0], r[1], r[2], r[3]), { id: `net${key}`, closed: true });
  }
  panelContent(k, t);
};

export const unusedContours: Contours = [];
