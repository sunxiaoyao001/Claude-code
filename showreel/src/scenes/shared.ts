// Layout and characters reused across bars: the CLAUDE wordmark, the rails, typed labels, the mascot.
import { clamp, Contours, CX, CY, P, rad, rect, rot, roundRect, TAU } from '../lib/core';
import { fitSize, layoutWord, placeLetter, Word } from '../lib/font';
import { Ink } from '../lib/ink';

// ------------------------------------------------------------------ wordmark (frame 0)
let wm: { word: Word; ox: number; top: number; base: number; rail: number } | null = null;
export const wordmark = () => {
  if (!wm) {
    const size = fitSize('CLAUDE', 1500);
    const word = layoutWord('CLAUDE', size);
    const ox = CX - (word.inkX0 + word.inkX1) / 2;
    const top = CY - word.cap / 2;
    const base = top + word.cap;
    wm = { word, ox, top, base, rail: top - 96 };
  }
  return wm;
};

export const RAIL_X0 = 150;
export const RAIL_X1 = 1770;
export const MASCOT_X = 1560;

/** Small labels around the wordmark at rest. */
export const restLabels = () => {
  const w = wordmark();
  return {
    intro: { s: 'INTRODUCING', x: CX, y: w.top - 36 },
    sub: { s: 'A MOTION DESIGNER', x: CX, y: w.base + 74 },
    cd: { s: 'CREATIVE DIRECTOR', x: MASCOT_X - 150, y: w.rail - 20 },
  };
};

/** Typed / un-typed label: `p` = fraction of characters shown. Draws a caret while typing. */
export const typed = (
  k: Ink,
  s: string,
  x: number,
  y: number,
  p: number,
  o: { size?: number; weight?: number; track?: number; align?: CanvasTextAlign; accent?: boolean; caret?: boolean } = {},
) => {
  const n = Math.round(clamp(p) * s.length);
  if (n <= 0 && !o.caret) return;
  const size = o.size ?? 26;
  const full = k.textWidth(s, o);
  let x0 = x;
  if (o.align === 'center') x0 = x - full / 2;
  if (o.align === 'right') x0 = x - full;
  const shown = s.slice(0, n);
  k.text(shown, x0, y, { ...o, align: 'left' });
  if (o.caret && p > 0 && p < 1) {
    const cx = x0 + (n ? k.textWidth(shown, o) + (o.track ?? 0.2) * size * 0.6 : 0);
    k.line(
      [
        [cx, y + 4],
        [cx, y - size * 0.78],
      ],
      { id: `caret${s}`, w: 3, accent: o.accent },
    );
  }
};

/** Letter contours of a word laid out at size, centred on cx (ink box), with per-letter transforms. */
export const wordContours = (
  text: string,
  size: number,
  cx: number,
  baseline: number,
  f?: (p: P, i: number, letterBox: { x0: number; x1: number; y0: number; y1: number }) => P,
) => {
  const word = layoutWord(text, size);
  const ox = cx - (word.inkX0 + word.inkX1) / 2;
  return word.letters.map((l, i) => {
    const box = { x0: ox + l.x + l.box.x0, x1: ox + l.x + l.box.x1, y0: baseline + l.box.y0, y1: baseline + l.box.y1 };
    return placeLetter(l, ox, baseline, f ? (p) => f(p, i, box) : undefined);
  });
};

// ------------------------------------------------------------------ mascot
export interface MascotPose {
  x: number; // centre of the feet
  y: number; // ground line
  run?: number; // 0 standing, 1 full run
  phase?: number; // seconds of running (six steps a second)
  lean?: number; // degrees, positive leans right
  arm?: number; // right arm angle in degrees above horizontal
  eye?: P; // eye offset in units
  blink?: number; // 0 open, 1 shut
  scale?: number;
  id?: string;
}

const U = 2.1; // px per unit: about 250 px wide with the arms

/** The creative director: a 76x54 box with arm stubs, four legs, tall eyes and a pencil. */
export const mascot = (k: Ink, m: MascotPose) => {
  const s = U * (m.scale ?? 1);
  const run = m.run ?? 0;
  const ph = (m.phase ?? 0) * 3 * TAU; // each pair lifts three times a second: six steps
  const lean = rad(m.lean ?? 0);
  const id = m.id ?? 'cd';
  const bob = run * 2.5 * Math.abs(Math.sin(ph));
  const tf = (p: P): P => {
    const q = rot(p, lean);
    return [m.x + q[0] * s, m.y + q[1] * s];
  };
  const shape = (pts: P[]) => pts.map(tf);
  const legTop = -33 - bob;
  const bodyBot = legTop;
  const bodyTop = bodyBot - 54;
  const midY = (bodyTop + bodyBot) / 2;

  // legs: pairs (0,2) and (1,3) lift alternately
  const legX = [-29.5, -10, 10, 29.5];
  legX.forEach((lx, i) => {
    const pair = i % 2 === 0 ? Math.sin(ph) : -Math.sin(ph);
    const lift = run * 11 * Math.max(0, pair);
    const leg = shape(rect(lx - 5.5, legTop, lx + 5.5, -lift));
    k.line(leg, { id: `${id}leg${i}`, closed: true, w: 2.6 });
  });

  // body
  const body = shape(roundRect(-38, bodyTop, 38, bodyBot, 9));
  k.fill([body], { id: `${id}body`, accent: k.kind !== 'holo', density: 0.5, light: 0.55 });
  k.line(body, { id: `${id}bodyL`, closed: true, w: 3 });

  // left arm stub
  k.line(shape(roundRect(-38 - 24, midY - 8, -36, midY + 8, 4)), { id: `${id}armL`, closed: true, w: 2.6 });
  // right arm raised, holding the pencil
  const a = -rad(m.arm ?? 58);
  const pivot: P = [38, midY];
  const arm = roundRect(0, -8, 24, 8, 4).map((p) => {
    const q = rot(p, a);
    return [pivot[0] + q[0], pivot[1] + q[1]] as P;
  });
  k.line(shape(arm), { id: `${id}armR`, closed: true, w: 2.6 });
  const hand = [pivot[0] + Math.cos(a) * 22, pivot[1] + Math.sin(a) * 22] as P;
  // pencil: held across the hand, pointing up and forward
  const pa = a - rad(28);
  const along = (d: number, side: number): P => [hand[0] + Math.cos(pa) * d - Math.sin(pa) * side, hand[1] + Math.sin(pa) * d + Math.cos(pa) * side];
  const pencilBody = [along(-6, -3), along(16, -3), along(16, 3), along(-6, 3)];
  k.line(shape(pencilBody), { id: `${id}pencil`, closed: true, w: 2.2 });
  k.line(shape([along(16, -3), along(23, 0), along(16, 3)]), { id: `${id}tip`, w: 2.2 });

  // eyes
  const e = m.eye ?? [0, 0];
  const blink = clamp(m.blink ?? 0);
  for (const ex of [-14, 14]) {
    const cx = ex + e[0];
    const cy = bodyTop + 22 + e[1];
    const h = 14 * (1 - 0.88 * blink);
    const eye = shape(roundRect(cx - 4, cy - h / 2, cx + 4, cy + h / 2, 3.5, 4));
    k.solid([eye], { accent: k.kind === 'holo' });
  }
};

export const mascotBox = (m: MascotPose): Contours => {
  const s = U * (m.scale ?? 1);
  return [rect(m.x - 62 * s, m.y - 110 * s, m.x + 50 * s, m.y)];
};
