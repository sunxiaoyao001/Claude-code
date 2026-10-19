// Seven-segment glyph geometry for the date stamp (CLAUDE.md §4): drawn as paths, so there is no font
// asset, no licence question and it stays sharp at any capture size. Pure geometry; DateStamp draws it.

export type Point = [number, number];
export type Polygon = Point[];

// Segments: a top, b upper right, c lower right, d bottom, e lower left, f upper left, g middle.
const DIGITS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
  '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
};

export const DIGIT_ASPECT = 0.56; // width / height
const THICKNESS = 0.13; // relative to glyph height
const GAP = 0.02; // between neighbouring segments
const SKEW = 0.1; // italic slant, like the LCDs on date backs

export function segmentsFor(char: string): string {
  return DIGITS[char] ?? '';
}

function horizontal(x0: number, x1: number, y: number, t: number): Polygon {
  const h = t / 2;
  return [[x0, y], [x0 + h, y - h], [x1 - h, y - h], [x1, y], [x1 - h, y + h], [x0 + h, y + h]];
}

function vertical(x: number, y0: number, y1: number, t: number): Polygon {
  const h = t / 2;
  return [[x, y0], [x + h, y0 + h], [x + h, y1 - h], [x, y1], [x - h, y1 - h], [x - h, y0 + h]];
}

/** Polygons for one digit whose box starts at (x, y) with the given height; y grows downwards. */
export function digitPolygons(char: string, x: number, y: number, height: number): Polygon[] {
  const width = height * DIGIT_ASPECT;
  const t = height * THICKNESS;
  const g = height * GAP;
  const left = x + t / 2;
  const right = x + width - t / 2;
  const top = y + t / 2;
  const mid = y + height / 2;
  const bottom = y + height - t / 2;
  const shapes: Record<string, Polygon> = {
    a: horizontal(left + g, right - g, top, t),
    b: vertical(right, top + g, mid - g, t),
    c: vertical(right, mid + g, bottom - g, t),
    d: horizontal(left + g, right - g, bottom, t),
    e: vertical(left, mid + g, bottom - g, t),
    f: vertical(left, top + g, mid - g, t),
    g: horizontal(left + g, right - g, mid, t),
  };
  return segmentsFor(char).split('').map((segment) => skew(shapes[segment] ?? [], y + height));
}

function skew(polygon: Polygon, baseline: number): Polygon {
  return polygon.map(([px, py]) => [px + (baseline - py) * SKEW, py]);
}

/** Advance width of a character at the given glyph height. */
export function advance(char: string, height: number): number {
  if (char in DIGITS) return height * (DIGIT_ASPECT + 0.18);
  if (char === '/' || char === ':') return height * 0.42;
  return height * 0.5; // space and anything unknown
}

/** Lays out a stamp string; returns polygons relative to (0, 0) plus the total width. */
export function layoutStamp(text: string, height: number): { polygons: Polygon[]; width: number } {
  const polygons: Polygon[] = [];
  let x = 0;
  for (const char of text) {
    if (char in DIGITS) {
      polygons.push(...digitPolygons(char, x, 0, height));
    } else if (char === '/') {
      const t = height * THICKNESS * 0.8;
      polygons.push(skew([[x + height * 0.28, height * 0.08], [x + height * 0.28 + t, height * 0.08], [x + t, height * 0.92], [x, height * 0.92]], height));
    } else if (char === ':') {
      const s = height * THICKNESS;
      for (const cy of [height * 0.32, height * 0.68]) {
        polygons.push(skew([[x + s, cy - s / 2], [x + 2 * s, cy - s / 2], [x + 2 * s, cy + s / 2], [x + s, cy + s / 2]], height));
      }
    }
    x += advance(char, height);
  }
  return { polygons, width: x };
}

/** "yyyy/MM/dd" or "HH:mm" from a Date. */
export function formatStamp(date: Date, format: 'date' | 'time' = 'date'): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  if (format === 'time') return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}
