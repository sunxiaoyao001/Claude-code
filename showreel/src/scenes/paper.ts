// Bars 1-5 on paper: HOOK, KINETIC TYPE, CURVES, SHAPE MORPH, TILING.
import {
  bezier,
  clamp,
  CX,
  CY,
  expoIn,
  expoInOut,
  expoOut,
  lerp,
  onBeat,
  P,
  polygon,
  rad,
  rect,
  seg,
  spring,
  TAU,
  curlLine,
} from '../lib/core';
import { fitSize, layoutWord, placeLetter } from '../lib/font';
import { Ink } from '../lib/ink';
import { mascot, MASCOT_X, RAIL_X0, RAIL_X1, restLabels, typed, wordmark } from './shared';

// ====================================================================== rails (bars 1-2)
interface Rails {
  x0: number;
  x1: number;
  cy: number;
  half: number;
}

const drawRails = (k: Ink, r: Rails) => {
  if (r.half < 0.6) {
    k.line(
      [
        [r.x0, r.cy],
        [r.x1, r.cy],
      ],
      { id: 'rail' },
    );
    return;
  }
  k.line(
    [
      [r.x0, r.cy - r.half],
      [r.x1, r.cy - r.half],
    ],
    { id: 'rail' },
  );
  k.line(
    [
      [r.x0, r.cy + r.half],
      [r.x1, r.cy + r.half],
    ],
    { id: 'rail2' },
  );
};

/** 41 blue ruler ticks along the top rail; `grow(i)` 0..1 per tick. */
const drawTicks = (k: Ink, r: Rails, grow: (i: number) => number) => {
  const y = r.cy - r.half;
  for (let i = 0; i <= 40; i++) {
    const g = grow(i);
    if (g <= 0.01) continue;
    const x = lerp(r.x0, r.x1, i / 40);
    const l = (i % 5 === 0 ? 24 : 12) * g;
    k.line(
      [
        [x, y],
        [x, y - l],
      ],
      { id: `tick${i}`, accent: true, w: i % 5 === 0 ? 2.6 : 2 },
    );
  }
};

/** Blue height dimension at the right of the rails with a live number. */
const drawDimension = (k: Ink, r: Rails, p: number) => {
  if (p <= 0.01 || r.half < 2) return;
  const xd = r.x1 + 62;
  const y0 = r.cy - r.half;
  const y1 = r.cy + r.half;
  const ext = (y: number, id: string) =>
    k.line(
      [
        [r.x1 + 14, y],
        [xd + 14, y],
      ],
      { id, accent: true, w: 1.8, draw: p },
    );
  ext(y0, 'dimA');
  ext(y1, 'dimB');
  k.line(
    [
      [xd, y0],
      [xd, y1],
    ],
    { id: 'dimL', accent: true, w: 2.2, draw: p },
  );
  for (const [y, id] of [
    [y0, 'dimS0'],
    [y1, 'dimS1'],
  ] as [number, string][]) {
    k.line(
      [
        [xd - 7, y + 7],
        [xd + 7, y - 7],
      ],
      { id, accent: true, w: 2.4, draw: clamp(p * 2 - 0.6) },
    );
  }
  if (p > 0.5) k.text(String(Math.round(r.half * 2)), xd + 18, r.cy + 9, { size: 24, accent: true, track: 0.14, weight: 800 });
};

// ---------------------------------------------------------------- word in the slot
interface SlotWord {
  text: string;
  size: number;
  accent?: boolean;
  /** per-letter offset and vertical scale */
  pose: (i: number, n: number) => { dx: number; dy: number; sy: number };
}

const drawSlotWord = (k: Ink, r: Rails, w: SlotWord, id: string) => {
  const word = layoutWord(w.text, w.size);
  const ox = CX - (word.inkX0 + word.inkX1) / 2;
  const cap = word.cap;
  const ctx = k.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x0, r.cy - r.half, r.x1 - r.x0, r.half * 2);
  ctx.clip();
  const n = word.letters.length;
  word.letters.forEach((l, i) => {
    if (!l.contours.length) return;
    const ps = w.pose(i, n);
    if (ps.sy <= 0.004) return;
    // letters are centred on the slot; sy scales about the slot centre line
    const c = placeLetter(l, ox + ps.dx, CY + cap / 2, (p) => [p[0], r.cy + ps.dy + (p[1] - CY) * ps.sy]);
    k.bigType(c, { id: `${id}${i}`, accent: w.accent, origin: [ps.dx, ps.dy] });
  });
  ctx.restore();
};

// ====================================================================== bars 1-2 (+ the crush into one line)
export const LINE_X0 = CX - 738;
export const LINE_X1 = CX + 738;

export const hookAndType = (k: Ink, t: number) => {
  const wm = wordmark();
  const L = restLabels();

  // ---- small lines un-type, mascot runs off
  const ut = 1 - seg(t, 0, 0.34);
  if (ut > 0) {
    typed(k, L.intro.s, L.intro.x, L.intro.y, ut, { align: 'center', size: 26, track: 0.3, caret: true });
    typed(k, L.sub.s, L.sub.x, L.sub.y, ut, { align: 'center', size: 26, track: 0.3, caret: true });
    typed(k, L.cd.s, L.cd.x, L.cd.y, ut, { align: 'right', size: 24, track: 0.2, accent: true, caret: true });
  }
  const mx = MASCOT_X + 2600 * t * t;
  if (mx < 2250) mascot(k, { x: mx, y: currentRailY(t), run: clamp(t / 0.06), phase: t, lean: 7 * spring(t, 0, 30), arm: 58 });

  // ---- the rail
  const drop = expoIn(seg(t, 0.36, 0.5));
  const pressY = wm.base + 26;
  const rise = onBeat(t, 1.0, 22);
  const split = onBeat(t, 1.0, 26);
  const open = onBeat(t, 1.5, 20);
  let r: Rails = {
    x0: lerp(RAIL_X0, LINE_X0 + 78, rise),
    x1: lerp(RAIL_X1, LINE_X1 - 78, rise),
    cy: lerp(lerp(wm.rail, pressY, drop), CY, rise),
    half: 70 * split + 80 * open,
  };

  // ---- wordmark pressed flat by the rail
  if (t < 0.52) {
    const top = Math.max(wm.top, r.cy);
    const kk = clamp((r.cy - wm.top) / (pressY - wm.top));
    const bottom = wm.base + 26 * kk;
    if (bottom - top > 0.5) {
      const sy = (bottom - top) / (wm.base - wm.top);
      wm.word.letters.forEach((l, i) => {
        const c = placeLetter(l, wm.ox, wm.base, (p) => [p[0], top + (p[1] - wm.top) * sy]);
        k.bigType(c, { id: `wm${i}` });
      });
    }
  }

  // ---- bar 2: words in the slot
  const sizeI = fitSize('INTRODUCING', 1200);
  const sizeM = fitSize('A MOTION', 1180);
  const sizeD = fitSize('DESIGNER', 1190);
  const sizeC = fitSize('CLAUDE', 1290);
  const capI = 0.71 * sizeI;
  const capM = 0.71 * sizeM;
  const capC = 0.71 * sizeC;
  const pad = 26;
  const halfI = capI / 2 + pad;
  const halfM = capM / 2 + pad;
  const halfD = 160;
  const halfC = capC / 2 + pad;
  if (t >= 1.95) {
    let half = lerp(150, halfI, onBeat(t, 2.0, 24));
    half = lerp(half, halfM, onBeat(t, 2.5, 26));
    // clap shut on A MOTION, reopen with DESIGNER
    const shut = expoIn(seg(t, 2.95, 3.06));
    const reopen = spring(t, 3.06, 24);
    if (t >= 2.95) half = t < 3.06 ? lerp(halfM, 0, shut) : lerp(0, halfD, reopen);
    if (t >= 3.45) half = lerp(halfD, halfC, onBeat(t, 3.5, 24));
    // crush into one line, stretching out to 1476 px
    const crush = expoIn(seg(t, 3.95, 4.05));
    const stretch = expoInOut(seg(t, 3.95, 4.05));
    if (t >= 3.95) half = lerp(halfC, 0, crush);
    r = { x0: lerp(LINE_X0 + 78, LINE_X0, stretch), x1: lerp(LINE_X1 - 78, LINE_X1, stretch), cy: CY, half };
    const padNow = pad * clamp(half / 60);
    const fit = (cap: number) => Math.max(0, Math.min(1, (2 * half - 2 * padNow) / cap));

    // INTRODUCING rises through the baseline letter by letter, then lifts out through the top
    if (t < 2.56)
      drawSlotWord(k, r, { text: 'INTRODUCING', size: sizeI, pose: (i) => {
        const up = spring(t, 1.95 + i * 0.025, 26);
        const out = expoIn(seg(t, 2.25 + i * 0.012, 2.39 + i * 0.012));
        return { dx: 0, dy: (1 - up) * (capI + 80) - out * (capI + 160), sy: 1 };
      } }, 'wi');
    // A MOTION whips in from the left, then is clapped flat
    if (t >= 2.45 && t < 3.06)
      drawSlotWord(k, r, { text: 'A MOTION', size: sizeM, pose: () => ({ dx: -1400 * (1 - expoOut(seg(t, 2.45, 2.65))), dy: 0, sy: Math.min(1, fit(capM)) }) }, 'wm_');
    // DESIGNER is stretched out of the line, then its letters fly out sideways
    if (t >= 3.06 && t < 3.5) {
      const capD = 0.71 * sizeD;
      const sy = Math.max(0, 2 * half - 2 * padNow) / capD;
      drawSlotWord(k, r, { text: 'DESIGNER', size: sizeD, pose: (i, n) => {
        const side = i < n / 2 ? -1 : 1;
        const rank = side < 0 ? i : n - 1 - i; // outer letters leave first
        const fly = expoIn(seg(t, 3.22 + rank * 0.03, 3.42 + rank * 0.03));
        return { dx: side * 1500 * fly, dy: 0, sy };
      } }, 'wd');
    }
    // CLAUDE in blue pencil, letters dropping in one every 0.05 s, then crushed
    if (t >= 3.45)
      drawSlotWord(k, r, { text: 'CLAUDE', size: sizeC, accent: true, pose: (i) => {
        const drop = spring(t, 3.45 + i * 0.05, 24);
        return { dx: 0, dy: -(1 - drop) * (capC + 220), sy: t >= 3.95 ? fit(capC) : 1 };
      } }, 'wc');
  }

  drawRails(k, r);
  // ruler ticks sweep along the top rail; they fold away as the rails crush
  const fold = 1 - expoIn(seg(t, 3.92, 4.02));
  drawTicks(k, r, (i) => spring(t, 1.0 + i * 0.008, 40) * fold);
  drawDimension(k, r, onBeat(t, 1.5, 24) * fold);
};

/** Where the mascot's ground is at the start (the rail before it drops). */
const currentRailY = (t: number) => {
  const wm = wordmark();
  return lerp(wm.rail, wm.base + 26, expoIn(seg(t, 0.36, 0.5)));
};

// ====================================================================== bar 3: curves
export const curves = (k: Ink, t: number) => {
  const p0: P = [LINE_X0, CY];
  const p3: P = [LINE_X1, CY];
  const hl = 430 * onBeat(t, 4.1, 22) * (1 - onBeat(t, 5.0, 26));
  const th = rad(58 - 116 * onBeat(t, 4.5, 20));
  const p1: P = [p0[0] + hl * Math.cos(th), p0[1] - hl * Math.sin(th)];
  const p2: P = [p3[0] - hl * Math.cos(th), p3[1] + hl * Math.sin(th)];
  const base = bezier(p0, p1, p2, p3, 120);
  const spread = 34 * onBeat(t, 4.5, 18);
  const wave = onBeat(t, 5.0, 18);
  const gather = onBeat(t, 5.5, 20);
  const amp = 92 * wave * (1 - gather);
  const lines: { k: number; pts: P[] }[] = [];
  const keep = 1 - gather;
  const copies = spread * (1 - wave) > 0.4 || wave * keep > 0.015;
  for (let j = -4; j <= 4; j++) {
    if (j !== 0 && !copies) continue;
    const pts = base.map((p, i) => {
      const u = i / (base.length - 1);
      // leaf: copies offset along the normal, joined at both ends
      const a = base[Math.max(0, i - 1)];
      const b = base[Math.min(base.length - 1, i + 1)];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      const leaf = j * spread * Math.sin(Math.PI * u) * (1 - wave);
      const lp: P = [p[0] - (dy / l) * leaf, p[1] + (dx / l) * leaf];
      // travelling sine, each line a little out of phase; the ends stay pinned
      const pin = Math.min(1, Math.min(u, 1 - u) / 0.08);
      const sy = CY + amp * pin * Math.sin(TAU * 2.75 * u - TAU * 1.5 * (t - 4.95) + j * 0.34 * keep);
      return [lerp(lp[0], lerp(LINE_X0, LINE_X1, u), wave), lerp(lp[1], sy, wave)] as P;
    });
    lines.push({ k: j, pts });
  }
  for (const l of lines) k.line(l.pts, { id: `curve${l.k}`, accent: l.k !== 0, w: l.k === 0 ? 3.4 : 2.4 });

  // pen-tool handles
  if (hl > 2) {
    const hp = hl / 430;
    for (const [a, b, id] of [
      [p0, p1, 'h1'],
      [p3, p2, 'h2'],
    ] as [P, P, string][]) {
      k.line([a, b], { id, w: 1.6 });
      k.line(rect(a[0] - 8 * hp, a[1] - 8 * hp, a[0] + 8 * hp, a[1] + 8 * hp), { id: `${id}sq`, closed: true, w: 2 });
      const circ: P[] = [];
      for (let i = 0; i < 24; i++) circ.push([b[0] + 7 * hp * Math.cos((i / 24) * TAU), b[1] + 7 * hp * Math.sin((i / 24) * TAU)]);
      k.line(circ, { id: `${id}c`, closed: true, accent: true, w: 2.2 });
    }
    if (hp > 0.5) {
      const deg = Math.round(58 - 116 * onBeat(t, 4.5, 20));
      k.text('EASE', p1[0] + 22, p1[1] + (th > 0 ? -10 : 30), { size: 24, accent: true, weight: 800, track: 0.2 });
      k.text(`${deg}°`, p1[0] + 22, p1[1] + (th > 0 ? 22 : 62), { size: 24, weight: 600, track: 0.14 });
    }
  }
};

// ====================================================================== bars 4-5: morph and tiling
export const CURL_R = 1476 / TAU;

/** Polar radius of a regular n-gon (circumradius R, vertex at angle a0 from the top, clockwise). */
const ngonR = (n: number, R: number, phi: number, a0 = 0) => {
  const step = TAU / n;
  let x = (phi - a0) % step;
  if (x < 0) x += step;
  return (R * Math.cos(Math.PI / n)) / Math.cos(x - Math.PI / n);
};

type Shape = (phi: number) => number;
const SHAPES: Shape[] = [
  () => CURL_R,
  (p) => ngonR(3, 284, p),
  (p) => ngonR(4, 261, p, Math.PI / 4),
  (p) => ngonR(6, 270, p),
];
const TURNS = [0, rad(120), rad(90), rad(60)];

export const morphOutline = (t: number, R6 = 270, n = 480): P[] => {
  const ps = [onBeat(t, 6.5, 20), onBeat(t, 7.0, 20), onBeat(t, 7.5, 20)];
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    const phi0 = (i / n) * TAU;
    let r = SHAPES[0](phi0);
    let turn = 0;
    for (let s = 0; s < 3; s++) {
      const p = ps[s];
      if (p <= 0) break;
      // rotate the whole blend while it changes
      const a = TURNS[s + 1] * p;
      const phi = phi0 - a;
      const from = s === 0 ? CURL_R : SHAPES[s](phi);
      r = lerp(from, SHAPES[s + 1](phi), p);
      turn = a;
    }
    void turn;
    const sc = R6 / 270;
    out.push([CX + Math.sin(phi0) * r * sc, CY - Math.cos(phi0) * r * sc]);
  }
  return out;
};

const HEX_R = 96;
const hexCentres = () => {
  const out: { q: number; r: number; ring: number; c: P }[] = [];
  for (let q = -2; q <= 2; q++)
    for (let r = -2; r <= 2; r++) {
      const s = -q - r;
      const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
      if (ring > 2) continue;
      out.push({ q, r, ring, c: [CX + HEX_R * Math.sqrt(3) * (q + r / 2), CY + HEX_R * 1.5 * r] });
    }
  return out.sort((a, b) => a.ring - b.ring || Math.atan2(a.c[1] - CY, a.c[0] - CX) - Math.atan2(b.c[1] - CY, b.c[0] - CX));
};
export const HEXES = hexCentres();
export const hexAt = (c: P, r: number) => polygon(6, r, -Math.PI / 2, c);

/** The flood: the centre cell pressed, then grown past the frame. */
export const floodR = (t: number) => {
  const press = expoOut(seg(t, 9.45, 9.6));
  const grow = expoIn(seg(t, 9.6, 10.0));
  return HEX_R * lerp(1, 0.86, press) + grow * 1400;
};

export const morphAndTile = (k: Ink, t: number) => {
  // ---- bar 4: the line curls into a circle, then becomes a triangle, a square and a hexagon
  if (t < 6.45) {
    const kap = onBeat(t, 6.1, 24) / CURL_R;
    k.line(curlLine(CX, CY, 1476, kap, 360), { id: 'line', w: 3.4 });
    return;
  }
  const shrink = onBeat(t, 8.0, 22);
  const R6 = lerp(270, HEX_R, shrink);
  const hatch = seg(t, 6.45, 6.95);
  const cross = seg(t, 7.45, 7.95);
  const sweepX = lerp(CX - 440, CX + 440, expoInOut(seg(t, 8.95, 9.45)));
  const sweeping = t >= 8.95;

  // ---- bar 5: six, then twelve more cells slide out from under it
  if (t >= 7.95) {
    const ctx = k.ctx;
    HEXES.forEach((h, idx) => {
      if (h.ring === 0) return;
      const start = h.ring === 1 ? 7.95 + (idx - 1) * 0.02 : 8.45 + (idx - 7) * 0.012;
      const p = spring(t, start, 22);
      if (p <= 0.001) return;
      const parent = h.ring === 1 ? 0 : nearestInner(h);
      const from = HEXES[parent].c;
      const c: P = [lerp(from[0], h.c[0], p), lerp(from[1], h.c[1], p)];
      const hex = hexAt(c, HEX_R);
      // each cell slides into its own slot from the cell it came out of, seen only through the slot
      ctx.save();
      if (p < 0.999) {
        const slot = hexAt(h.c, HEX_R + 4);
        ctx.beginPath();
        ctx.moveTo(slot[0][0], slot[0][1]);
        slot.slice(1).forEach((q) => ctx.lineTo(q[0], q[1]));
        ctx.closePath();
        ctx.clip();
      }
      if (sweeping) cellFill(k, hex, `cell${idx}`, sweepX);
      k.line(hex, { id: `cell${idx}`, closed: true, w: 3 });
      ctx.restore();
    });
  }

  // the centre shape
  const pressed = t >= 9.45 ? floodR(t) : R6;
  const outline = t < 8.6 ? morphOutline(t, R6) : hexAt([CX, CY], pressed);
  if (sweeping) cellFill(k, outline, 'cell0', sweepX, true);
  else k.fill([outline], { id: 'morph', accent: true, draw: hatch, cross, density: 1.25 });
  k.line(outline, { id: 'line', closed: true, w: 3.4 });
};

const nearestInner = (h: { c: P }) => {
  let best = 1;
  let bd = Infinity;
  HEXES.forEach((o, i) => {
    if (o.ring !== 1) return;
    const d = Math.hypot(o.c[0] - h.c[0], o.c[1] - h.c[1]);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
};

/** Dense hatching sweeping left to right; behind the front the cell turns solid blue. */
const cellFill = (k: Ink, hex: P[], id: string, sweepX: number, wasHatched = false) => {
  if (wasHatched) k.fill([hex], { id: `${id}x`, accent: true, density: 1.25, cross: 1, clipX: [sweepX, 4000] });
  k.fill([hex], { id, accent: true, density: 3, clipX: [sweepX - 30, sweepX + 18] });
  k.fill([hex], { id: `${id}s`, accent: true, density: 0.0001, solid: 1, clipX: [-100, sweepX - 22] });
};
