// Geist 900 glyph outlines (via opentype.js) for the big type, plus canvas text for labels.
import opentype from 'opentype.js';
import { bbox, Contours, P } from './core';

let font: opentype.Font | null = null;

export const loadGlyphFont = async (url: string) => {
  const buf = await (await fetch(url)).arrayBuffer();
  font = opentype.parse(buf);
};

export const glyphFontReady = () => font !== null;

const UNITS = 1000;
const cache = new Map<string, { contours: Contours; adv: number }>();

const flatten = (path: opentype.Path): Contours => {
  const out: Contours = [];
  let cur: P[] = [];
  let x = 0;
  let y = 0;
  const steps = 10;
  for (const c of path.commands as any[]) {
    if (c.type === 'M') {
      if (cur.length > 2) out.push(cur);
      cur = [[c.x, c.y]];
      x = c.x;
      y = c.y;
    } else if (c.type === 'L') {
      cur.push([c.x, c.y]);
      x = c.x;
      y = c.y;
    } else if (c.type === 'C') {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        cur.push([
          u * u * u * x + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
          u * u * u * y + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y,
        ]);
      }
      x = c.x;
      y = c.y;
    } else if (c.type === 'Q') {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        cur.push([u * u * x + 2 * u * t * c.x1 + t * t * c.x, u * u * y + 2 * u * t * c.y1 + t * t * c.y]);
      }
      x = c.x;
      y = c.y;
    } else if (c.type === 'Z') {
      if (cur.length > 2) {
        const a = cur[0];
        const b = cur[cur.length - 1];
        if (Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01) cur.pop();
        out.push(cur);
      }
      cur = [];
    }
  }
  if (cur.length > 2) out.push(cur);
  return out;
};

const glyph = (ch: string) => {
  let g = cache.get(ch);
  if (!g) {
    if (!font) throw new Error('glyph font not loaded');
    const gl = font.charToGlyph(ch);
    g = { contours: flatten(gl.getPath(0, 0, UNITS)), adv: gl.advanceWidth ?? 0 };
    cache.set(ch, g);
  }
  return g;
};

export interface Letter {
  ch: string;
  /** pen position of the letter origin (baseline, left) relative to the word origin */
  x: number;
  /** outline relative to the letter origin, already scaled */
  contours: Contours;
  /** ink box relative to the letter origin */
  box: { x0: number; y0: number; x1: number; y1: number };
  adv: number;
}

export interface Word {
  letters: Letter[];
  size: number;
  inkX0: number;
  inkX1: number;
  cap: number;
}

/** Lay a word out in Geist 900 at `size` px. Positions are relative to the pen origin (0, baseline). */
export const layoutWord = (text: string, size: number, tracking = 0): Word => {
  if (!font) throw new Error('glyph font not loaded');
  const s = size / UNITS;
  const letters: Letter[] = [];
  let pen = 0;
  const glyphs = font.stringToGlyphs(text);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const g = glyph(ch);
    const contours = g.contours.map((c) => c.map(([x, y]) => [x * s, y * s] as P));
    const box = contours.length ? bbox(contours) : { x0: 0, y0: 0, x1: g.adv * s, y1: 0 };
    letters.push({ ch, x: pen, contours, box, adv: g.adv * s });
    let kern = 0;
    if (i + 1 < text.length) kern = font.getKerningValue(glyphs[i], glyphs[i + 1]) * s;
    pen += g.adv * s + kern + tracking * size;
  }
  const inked = letters.filter((l) => l.contours.length);
  const inkX0 = Math.min(...inked.map((l) => l.x + l.box.x0));
  const inkX1 = Math.max(...inked.map((l) => l.x + l.box.x1));
  return { letters, size, inkX0, inkX1, cap: 0.71 * size };
};

/** Size at which `text` has the given ink width. */
export const fitSize = (text: string, inkWidth: number) => {
  const w = layoutWord(text, 1000);
  return (1000 * inkWidth) / (w.inkX1 - w.inkX0);
};

/** Absolute contours of one letter at a given pen origin with an optional per-letter transform. */
export const placeLetter = (
  l: Letter,
  ox: number,
  baseline: number,
  f?: (p: P) => P,
): Contours => l.contours.map((c) => c.map(([x, y]) => (f ? f([ox + l.x + x, baseline + y]) : ([ox + l.x + x, baseline + y] as P))));
