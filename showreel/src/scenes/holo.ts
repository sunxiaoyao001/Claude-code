// Bars 10-15 in the hologram (and END back on paper): LIGHT, WAVE, GLOBE, DRUM, FORM, END.
import envelope from '../envelope.json';
import {
  circle,
  clamp,
  Contours,
  CX,
  CY,
  ellipse,
  expoIn,
  lerp,
  lerpP,
  norm3,
  onBeat,
  P,
  polar,
  project,
  rad,
  rotX,
  rotY,
  rotZ,
  seg,
  spring,
  TAU,
  V3,
  dot3,
} from '../lib/core';
import { layoutWord, placeLetter } from '../lib/font';
import { Ink } from '../lib/ink';
import { drawChart, RING_CENTRE } from './blueprint';
import { mascot, MASCOT_X, RAIL_X0, RAIL_X1, restLabels, typed, wordmark } from './shared';

const ENV = envelope as number[];
const env = (tau: number) => {
  const n = ENV.length;
  const x = ((((tau % 30) + 30) % 30) / 30) * n;
  const i = Math.floor(x);
  const f = x - i;
  return lerp(ENV[i % n], ENV[(i + 1) % n], f);
};

const LIGHT_Z = -0.55;

// ====================================================================== bar 10: LIGHT
const lightAngle = (t: number) => rad(225 + 90 * onBeat(t, 18.5, 20) + 135 * onBeat(t, 19.0, 20));
const lightOrbit = (t: number) => 1 - onBeat(t, 19.5, 20);

const lightVec = (t: number): V3 => {
  const a = lightAngle(t);
  const o = lightOrbit(t);
  return norm3([Math.cos(a) * o, Math.sin(a) * o, LIGHT_Z - (1 - o) * 1.5]);
};

/** Lambert on a sphere (or squashed sphere) of radii rx, ry centred on c. */
const sphereLight = (c: P, rx: number, ry: number, L: V3) => (x: number, y: number) => {
  const nx = (x - c[0]) / rx;
  const ny = (y - c[1]) / Math.max(ry, 0.001);
  const nz = -Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  return 0.06 + 0.94 * Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
};

const sun = (k: Ink, c: P, s: number, label: string) => {
  if (s <= 0.01) return;
  k.line(circle(12 * s, c, 32), { id: 'sun', closed: true, accent: true, w: 3 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    k.line([polar(20 * s, a, c), polar(30 * s, a, c)], { id: `ray${i}`, accent: true, w: 3 });
  }
  if (s > 0.6) k.text(label, c[0] + 44, c[1] + 9, { size: 24, weight: 800, accent: true, track: 0.2 });
};

const lightBar = (k: Ink, t: number) => {
  const m = onBeat(t, 18.0, 18);
  const c = lerpP(RING_CENTRE, [CX, CY], m);
  const r = lerp(110, 270, m);
  // the chart's bars retract into the ring
  if (t < 18.5) {
    const retract = spring(t, 17.95, 22);
    if (retract < 0.995) drawChart(k, t, 1, 0, 1, 1, c, r, 1 - retract);
  }
  const squash = expoIn(seg(t, 19.75, 20.0));
  const rx = lerp(r, 660, squash);
  const ry = r * (1 - squash);
  const L = lightVec(t);
  const outline = ry < 0.5 ? null : ellipse(rx, ry, c, 160, -Math.PI / 2);
  if (outline) {
    k.fill([outline], { id: 'sphere', light: sphereLight(c, rx, ry, L), draw: seg(t, 18.02, 18.4) });
    k.line(outline, { id: 'ring', closed: true });
  } else
    k.line(
      [
        [CX - 660, CY],
        [CX + 660, CY],
      ],
      { id: 'line' },
    );
  // the light: a marker orbiting the sphere
  const show = spring(t, 18.0, 24) * (1 - expoIn(seg(t, 19.7, 19.9)));
  const o = lightOrbit(t);
  const pos = polar(400 * o, lightAngle(t), [CX, CY]);
  const deg = Math.round(((((lightAngle(t) * 180) / Math.PI) % 360) + 360) % 360);
  sun(k, pos, show * lerp(0.7, 1, o), o > 0.5 ? `LIGHT ${deg}°` : 'LIGHT FRONT');
};

// ====================================================================== bar 11: WAVE
const WAVE_L = 1320;
const WAVE_R = WAVE_L / TAU;

const waveBar = (k: Ink, t: number) => {
  const grow = onBeat(t, 20.0, 20);
  const fill = seg(t, 20.45, 20.85);
  const wrap = onBeat(t, 21.0, 18);
  const tilt = onBeat(t, 21.5, 18);
  const amp = 190 * grow * lerp(1, 0.55, wrap) * (1 - tilt);
  const kap = wrap / WAVE_R;
  const R = lerp(WAVE_R, 270, tilt);
  const n = 360;
  const half = WAVE_L / 2;
  const sag = kap < 1e-7 ? 0 : (1 - Math.cos(Math.min(Math.PI, kap * half))) / kap;
  const top: P[] = [];
  const bot: P[] = [];
  const mid: P[] = [];
  for (let i = 0; i <= n; i++) {
    const s = -half + (i / n) * WAVE_L;
    // three seconds of the soundtrack across the line, now at the centre
    const e = env(t + (s / WAVE_L) * 3) * amp;
    let p: P;
    let nv: P;
    if (kap < 1e-7) {
      p = [CX + s, CY];
      nv = [0, -1];
    } else {
      const a = kap * s;
      p = [CX + Math.sin(a) / kap, CY - sag / 2 + (1 - Math.cos(a)) / kap];
      nv = [Math.sin(a), -Math.cos(a)];
    }
    // once closed, the ring grows and tilts back into the equator of a globe
    const tf = (q: P): P => {
      const dx = (q[0] - CX) * (R / WAVE_R);
      const dy = (q[1] - CY) * (R / WAVE_R);
      return [CX + lerp(q[0] - CX, dx, tilt), CY + lerp(q[1] - CY, dy * Math.cos(rad(70)), tilt)];
    };
    top.push(tf([p[0] + nv[0] * e, p[1] + nv[1] * e]));
    bot.push(tf([p[0] - nv[0] * e * (1 - wrap * 0.6), p[1] - nv[1] * e * (1 - wrap * 0.6)]));
    mid.push(tf(p));
  }
  const closed = wrap > 0.999;
  if (amp > 0.5) {
    const shape = closed ? [top, bot] : [[...top, ...[...bot].reverse()]];
    if (fill > 0) k.fill(shape, { id: 'wave', light: (x, y) => 0.25 + 0.75 * clamp(Math.abs(y - CY) / 160), draw: fill });
    k.line(top, { id: 'wtop', closed });
    k.line(bot, { id: 'wbot', closed, w: 3 });
  }
  k.line(mid, { id: 'line', closed, w: amp > 0.5 ? 2.4 : 4, accent: amp > 0.5 });
  // the playhead and the real time
  const ph = grow * (1 - wrap);
  if (ph > 0.02) {
    const hgt = 230 * ph;
    k.line(
      [
        [CX, CY - hgt],
        [CX, CY + hgt],
      ],
      { id: 'now', accent: true, w: 2.6 },
    );
    if (ph > 0.6) k.text(`${t.toFixed(2)} S`, CX + 16, CY - hgt + 18, { size: 24, weight: 800, accent: true, track: 0.14 });
  }
};

// ====================================================================== bars 12-13: GLOBE -> DRUM
interface GD {
  m: number; // 0 sphere, 1 cylinder
  spin: number;
  tilt: number;
  roll: number;
  persp: number;
  R: number;
  Rd: number;
  half: number;
  gap: number;
}

const LATS = [-90, -60, -30, 0, 30, 60, 90].map(rad);

/** Axial position: a sphere's sin(lat), or six equal reels with gaps between them. */
const axial = (lat: number, g: GD) => {
  const sph = g.R * Math.sin(lat);
  const u = (lat + Math.PI / 2) / Math.PI; // 0..1
  const j = Math.min(5, Math.floor(u * 6));
  const f = u * 6 - j;
  const span = (2 * g.half) / 6;
  const cyl = -g.half + j * span + g.gap / 2 + f * (span - g.gap);
  return lerp(sph, cyl, g.m);
};

const gdView = (lat: number, lon: number, g: GD, rOverride?: number): V3 => {
  const a = axial(lat, g);
  const r = rOverride ?? lerp(g.R * Math.cos(lat), g.Rd, g.m);
  const th = lon + g.spin;
  let v: V3 = [r * Math.sin(th), -a, -r * Math.cos(th)];
  v = rotX(v, g.tilt);
  v = rotZ(v, g.roll);
  return v;
};

const D_DRUM = 1700;
const gdProj = (v: V3, g: GD): P => project(v, [CX, CY], g.persp, D_DRUM);

/** Polyline drawn solid where it faces us and dashed where it is behind. */
const sideLine = (k: Ink, pts: V3[], g: GD, id: string, o: { w?: number; accent?: boolean; draw?: number } = {}) => {
  const n = pts.length;
  const lim = Math.max(1, Math.round((o.draw ?? 1) * (n - 1)));
  let run: P[] = [];
  let runVis: boolean | null = null;
  let part = 0;
  const flush = () => {
    if (run.length > 1) k.line(run, { id: `${id}_${part++}`, hidden: !runVis, w: o.w, accent: o.accent && !!runVis });
  };
  for (let i = 0; i <= lim && i < n; i++) {
    const v = pts[i];
    // facing test: the surface point's normal points to us when its depth is in front of the axis
    const vis = v[2] < 0.5;
    const p = gdProj(v, g);
    if (runVis === null) runVis = vis;
    if (vis !== runVis) {
      run.push(p);
      flush();
      run = [p];
      runVis = vis;
    } else run.push(p);
  }
  flush();
};

const globeState = (t: number): GD => {
  const m = onBeat(t, 23.5, 18);
  const kick = rad(45) * (onBeat(t, 24.0, 26) + onBeat(t, 24.5, 26));
  return {
    m,
    spin: rad(175) + rad(25) * (t - 23.2) + kick,
    tilt: rad(20) * (1 - m),
    roll: -rad(90) * m,
    persp: m,
    R: 270,
    Rd: 150,
    half: 660,
    gap: 34 * onBeat(t, 24.5, 22),
  };
};

const LON_N = 12;

const globeAndDrum = (k: Ink, t: number, letters = true) => {
  const g = globeState(t);
  const fan = (i: number) => spring(t, 21.95 + i * 0.02, 22);
  const par = onBeat(t, 22.5, 20);
  // drum lines retract when the reels flatten into type
  const keep = 1 - expoIn(seg(t, 25.95, 26.12));
  if (keep <= 0.001) return;

  // sphere shading, then drum shading
  if (g.m < 0.02) {
    const disc = circle(g.R, [CX, CY], 160, -Math.PI / 2);
    const rows = seg(t, 22.45, 22.85) * (1 - seg(t, 23.4, 23.6));
    if (rows > 0) k.fill([disc], { id: 'globeFill', light: sphereLight([CX, CY], g.R, g.R, norm3([-0.6, -0.7, -0.5])), draw: rows });
    k.line(disc, { id: 'limb', closed: true, draw: par });
  } else if (t >= 23.95) {
    const L = norm3([-0.5, -0.75, -0.6]);
    for (let j = 0; j < 6; j++) {
      const lo = rad(-90 + j * 30) + 1e-4;
      const hi = rad(-90 + (j + 1) * 30) - 1e-4;
      const ring = (lat: number) => Array.from({ length: 48 }, (_, i) => gdProj(gdView(lat, (i / 48) * TAU, g), g));
      const hull = convexHull([...ring(lo), ...ring(hi)]);
      const light = (x: number, y: number) => {
        const sy = clamp((y - CY) / g.Rd, -1, 1);
        const n: V3 = [0, sy, -Math.sqrt(1 - sy * sy)];
        return (0.08 + 0.92 * Math.max(0, dot3(n, L))) * lerp(1, 0.4, seg(t, 24.45, 24.7));
      };
      k.fill([hull], { id: `reel${j}`, light, draw: seg(t, 23.95, 24.3) * keep });
    }
  }

  // parallels (equator first: it is the ring from the wave bar)
  LATS.forEach((lat, i) => {
    const isEq = i === 3;
    const p = isEq ? 1 : par;
    if (p <= 0) return;
    // in the drum each parallel splits into the two rings either side of a gap
    for (const side of g.gap > 0.5 && i > 0 && i < 6 ? [-1e-4, 1e-4] : [0]) {
      const pts = Array.from({ length: 97 }, (_, q) => gdView(lat + side, (q / 96) * TAU, g, Math.abs(lat) > 1.5 && g.m < 0.001 ? 0.001 : undefined));
      if (Math.abs(lat) > 1.5 && g.m < 0.05) continue;
      sideLine(k, pts, g, `par${i}${side}`, { draw: p * keep });
    }
  });
  // meridians fan out of the equator: six great circles turn up about horizontal axes
  const fanning = fan(LON_N - 1) < 0.999;
  if (fanning) {
    for (let i = 0; i < LON_N / 2; i++) {
      const f = fan(i * 2);
      if (f <= 0.01) continue;
      const lon = (i / LON_N) * TAU * 2 * 0.5;
      const ax = toVec(0, lon + Math.PI / 2);
      const beta = (Math.PI / 2) * f;
      const pts: V3[] = [];
      for (let q = 0; q <= 120; q++) {
        const e = toVec(0, (q / 120) * TAU);
        const v = rodrigues(e, ax, beta);
        const ll = fromVec(v);
        pts.push(gdView(ll.lat, ll.lon, g));
      }
      sideLine(k, pts, g, `gc${i}`, { w: 2.6 });
    }
  } else
    for (let i = 0; i < LON_N; i++) {
      const lon = (i / LON_N) * TAU;
      for (let j = 0; j < 6; j++) {
        const pts: V3[] = [];
        for (let q = 0; q <= 10; q++) pts.push(gdView(rad(-90 + j * 30 + q * 3) * 0.99999, lon, g));
        sideLine(k, pts, g, `mer${i}_${j}`, { w: 2.6, draw: keep });
      }
    }

  // a route draws over the surface
  const route = onBeat(t, 23.0, 14) * (1 - expoIn(seg(t, 23.45, 23.6)));
  if (route > 0.01 && g.m < 0.2) drawRoute(k, g, route);

  if (letters && t >= 24.45) reelLetters(k, t, g, keep);
};

const toVec = (lat: number, lon: number): V3 => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
const fromVec = (v: V3) => ({ lat: Math.asin(clamp(v[1], -1, 1)), lon: Math.atan2(v[0], v[2]) });
const rodrigues = (v: V3, k: V3, a: number): V3 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const kv = dot3(k, v);
  const kx: V3 = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
  return [v[0] * c + kx[0] * s + k[0] * kv * (1 - c), v[1] * c + kx[1] * s + k[1] * kv * (1 - c), v[2] * c + kx[2] * s + k[2] * kv * (1 - c)];
};

const drawRoute = (k: Ink, g: GD, p: number) => {
  const A = toVec(rad(37.6), rad(-122.4));
  const B = toVec(rad(40.1), rad(116.6));
  const om = Math.acos(clamp(dot3(A, B), -1, 1));
  const pts: V3[] = [];
  const n = 64;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = Math.sin((1 - u) * om) / Math.sin(om);
    const b = Math.sin(u * om) / Math.sin(om);
    const v: V3 = [A[0] * a + B[0] * b, A[1] * a + B[1] * b, A[2] * a + B[2] * b];
    const { lat, lon } = fromVec(v);
    const lift = 1 + 0.16 * Math.sin(Math.PI * u);
    const s = gdView(lat, lon, g, g.R * Math.cos(lat) * lift);
    // lift the axial part too
    pts.push([s[0], s[1] * lift + (1 - lift) * 0, s[2]]);
  }
  const proj = pts.map((v) => gdProj(v, g));
  k.line(proj, { id: 'route', accent: true, w: 3.4, draw: p });
  const a = proj[0];
  const b = proj[n];
  k.line(circle(9, a, 24), { id: 'ra', closed: true, accent: true, w: 3 });
  if (p > 0.95) {
    k.line(circle(9, b, 24), { id: 'rb', closed: true, accent: true, w: 3 });
    k.text('SFO', a[0] - 20, a[1] + 40, { size: 24, weight: 800, accent: true, track: 0.2, align: 'right' });
    k.text('PEK', b[0] + 20, b[1] - 18, { size: 24, weight: 800, accent: true, track: 0.2 });
  }
};

const convexHull = (pts: P[]): P[] => {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: P[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: P[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
};

// ---------------------------------------------------------------- reels
const REEL_SIZE = 190;
const SLOTS = 6;
const STRIPS = ['CQXMBKZ', 'LWHTRVJ', 'AYGSNPO', 'UFKXBMZ', 'DOJRWQT', 'EVNHYGS'];

/** Reel angle: drum spin, then each reel spins at its own speed and locks on its letter. */
const reelAngle = (t: number, j: number) => {
  const base = globeState(t).spin;
  const t0 = 24.95;
  const v = 9 + 3.2 * j;
  const kk = 9;
  const free = (tt: number) => (tt <= t0 ? 0 : v * (tt - t0) - (v * (1 - Math.exp(-kk * (tt - t0)))) / kk);
  const lock = 25.45 + 0.05 * j;
  if (t < lock) return base + free(t);
  const x0 = globeState(lock).spin + free(lock);
  const v0 = v * (1 - Math.exp(-kk * (lock - t0))) + rad(25);
  const w = 24;
  const target = TAU * Math.ceil((x0 + v0 / w + 0.4) / TAU);
  const tau = t - lock;
  return target + (x0 - target + (v0 + w * (x0 - target)) * tau) * Math.exp(-w * tau);
};

const reelLetterContours = (t: number, g: GD, j: number): { contours: Contours; front: number }[] => {
  const span = (2 * g.half) / 6;
  const centreA = -g.half + (j + 0.5) * span;
  const th = reelAngle(t, j);
  const strip = STRIPS[j]; // each strip starts with its CLAUDE letter
  const out: { contours: Contours; front: number }[] = [];
  for (let s = 0; s < SLOTS; s++) {
    const slotA = th - (s * TAU) / SLOTS;
    const wrapped = Math.atan2(Math.sin(slotA), Math.cos(slotA));
    if (Math.abs(wrapped) > 1.15) continue;
    const w = layoutWord(strip[s], REEL_SIZE);
    const l = w.letters[0];
    const ox = -(l.box.x0 + l.box.x1) / 2;
    const cap = w.cap;
    const contours = l.contours.map((c) =>
      c.map(([x, y]) => {
        // wrap the glyph round the reel: x along the axis, y around the circumference
        // clamp to the silhouette so glyph parts past the fold never mirror back into view
        const phi = clamp(wrapped + (y + cap / 2) / g.Rd, -Math.PI / 2, Math.PI / 2);
        const v: V3 = [centreA + x + ox, g.Rd * Math.sin(phi), -g.Rd * Math.cos(phi)];
        return project(v, [CX, CY], g.persp, D_DRUM);
      }),
    );
    out.push({ contours, front: Math.cos(wrapped) });
  }
  return out;
};

const reelLetters = (k: Ink, t: number, g: GD, keep: number) => {
  if (keep < 0.999) return;
  const show = seg(t, 24.45, 24.7);
  for (let j = 0; j < 6; j++) {
    for (const { contours, front } of reelLetterContours(t, g, j)) {
      k.bigType(contours, { id: `rl${j}`, accent: true, draw: show, fill: front > 0.5 ? show : 0, light: 0.2 + 0.7 * front, w: 2.6 });
    }
  }
};

// ====================================================================== bar 14: FORM
const restLetter = (i: number) => {
  const wm = wordmark();
  return placeLetter(wm.word.letters[i], wm.ox, wm.base);
};

const formBar = (k: Ink, t: number) => {
  const f = onBeat(t, 26.0, 20);
  globeAndDrum(k, t, false);
  const wm = wordmark();
  const depth = 90 * onBeat(t, 26.5, 20) * (1 - onBeat(t, 27.5, 22));
  const yaw = rad(16) * (onBeat(t, 26.5, 20) - 2 * onBeat(t, 27.0, 20) + onBeat(t, 27.5, 20));
  const g = globeState(t);
  wm.word.letters.forEach((l, i) => {
    const rest = restLetter(i);
    // the locked reel letter, flattened and grown into the wordmark
    const reel = reelLetterContours(25.99, g, i).find((r) => r.front > 0.9)?.contours ?? rest;
    const flat = rest.map((c, ci) => c.map((p, pi) => lerpP(reel[ci]?.[pi] ?? p, p, f)));
    if (depth < 0.5 && Math.abs(yaw) < 1e-3) {
      k.bigType(flat, { id: `wm${i}`, light: 0.75, accent: k.kind === 'holo' });
      return;
    }
    const xf = (p: P, z: number): P => {
      const v = rotY([p[0] - CX, p[1] - CY, z], yaw);
      return project(v, [CX, CY], 1, 2400);
    };
    const front = flat.map((c) => c.map((p) => xf(p, -depth / 2)));
    const back = flat.map((c) => c.map((p) => xf(p, depth / 2)));
    back.forEach((c, ci) => k.line(c, { id: `wb${i}${ci}`, closed: true, hidden: true }));
    // side edges at the corners of each outline
    flat.forEach((c, ci) => {
      corners(c).forEach((pi) => k.line([front[ci][pi], back[ci][pi]], { id: `we${i}${ci}${pi}`, w: 2 }));
    });
    const lit = 0.3 + 0.65 * Math.max(0, Math.cos(yaw + rad(20)));
    k.bigType(front, { id: `wm${i}`, light: lit, accent: true });
  });
};

const cornerCache = new Map<string, number[]>();
const corners = (c: P[]) => {
  const key = `${c.length}:${Math.round(c[0][0])}:${Math.round(c[0][1])}`;
  let out = cornerCache.get(key);
  if (!out) {
    out = [];
    const n = c.length;
    let since = 0;
    for (let i = 0; i < n; i++) {
      const a = c[(i - 1 + n) % n];
      const b = c[i];
      const d = c[(i + 1) % n];
      const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const t2 = Math.atan2(d[1] - b[1], d[0] - b[0]);
      let turn = Math.abs(t2 - t1);
      if (turn > Math.PI) turn = TAU - turn;
      since++;
      if (turn > rad(35) || since > 14) {
        out.push(i);
        since = 0;
      }
    }
    cornerCache.set(key, out);
  }
  return out;
};

// ====================================================================== the rail, the mascot and the end card
const railDraw = (t: number) => spring(t, 27.45, 20);
const mascotX = (t: number) => MASCOT_X - 1800 * (1 - spring(t, 27.45, 12));
const mascotSpeed = (t: number) => {
  const d = t - 27.45;
  if (d <= 0) return 0;
  return 1800 * 144 * d * Math.exp(-12 * d);
};

const railAndMascot = (k: Ink, t: number) => {
  const wm = wordmark();
  const rd = railDraw(t);
  if (rd > 0.001) k.line([[RAIL_X0, wm.rail], [RAIL_X1, wm.rail]], { id: 'rail', draw: rd });
  if (t >= 27.45) {
    const sp = mascotSpeed(t);
    const glance = spring(t, 29.45, 26) * (1 - spring(t, 29.72, 26));
    mascot(k, {
      x: mascotX(t),
      y: wm.rail,
      run: clamp(sp / 700),
      phase: t,
      lean: 7 * clamp(sp / 1500),
      arm: 58,
      eye: [-6 * glance, 1.5 * glance],
    });
  }
};

const endCard = (k: Ink, t: number) => {
  const wm = wordmark();
  const L = restLabels();
  wm.word.letters.forEach((l, i) => k.bigType(restLetter(i), { id: `wm${i}`, light: 0.75, accent: k.kind === 'holo' }));
  railAndMascot(k, t);
  typed(k, L.intro.s, L.intro.x, L.intro.y, seg(t, 28.45, 28.7), { align: 'center', size: 26, track: 0.3, caret: true });
  typed(k, L.sub.s, L.sub.x, L.sub.y, seg(t, 28.95, 29.3), { align: 'center', size: 26, track: 0.3, caret: true });
  typed(k, L.cd.s, L.cd.x, L.cd.y, seg(t, 29.45, 29.8), { align: 'right', size: 24, track: 0.2, accent: true, caret: true });
};

// ====================================================================== dispatch
export const hologram = (k: Ink, t: number) => {
  if (t < 18.0 && k.kind === 'holo') {
    // the ring chart arrives through the scan line
    drawChart(k, t, 1, 0, 1);
    return;
  }
  if (t < 19.95) return lightBar(k, t);
  if (t < 21.95) return waveBar(k, t);
  if (t < 25.95) return globeAndDrum(k, t);
  if (t < 27.95) {
    formBar(k, t);
    railAndMascot(k, t);
    return;
  }
  endCard(k, t);
};
