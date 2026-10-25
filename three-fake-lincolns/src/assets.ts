import data from "./assets.generated.json";

export type Rect = readonly [number, number, number, number];

export type ImageAsset = {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly caption: string;
  readonly regions: Record<string, readonly number[]>;
};

export const IMG = data.images as Record<keyof typeof data.images, ImageAsset>;
export type ImageKey = keyof typeof IMG;

// Client rule: source pixels >= 1.5 x displayed pixels, at the largest size the shot ever reaches.
export const MIN_SOURCE_PER_DISPLAY = 1.5;

// Widest the crop may be displayed when the shot later zooms in by `maxZoom`.
export const capWidth = (key: ImageKey, crop: Rect, maxZoom = 1) =>
  ((crop[2] - crop[0]) * IMG[key].width) / MIN_SOURCE_PER_DISPLAY / maxZoom;

export const fitWidth = (key: ImageKey, crop: Rect, desired: number, maxZoom = 1) =>
  Math.min(desired, capWidth(key, crop, maxZoom));

export const region = (key: ImageKey, name: string): Rect => {
  const r = IMG[key].regions[name];
  if (!r || r.length !== 4) {
    throw new Error(`Missing region ${name} for ${key}`);
  }
  return [r[0], r[1], r[2], r[3]];
};

const REG = data.registration.calhounToLincoln;
// Similarity transform mapping Calhoun-print pixels onto Lincoln-print pixels.
export const CALHOUN_TO_LINCOLN = {
  a: REG.matrix[0][0],
  b: REG.matrix[0][1],
  tx: REG.matrix[0][2],
  c: REG.matrix[1][0],
  d: REG.matrix[1][1],
  ty: REG.matrix[1][2],
  scale: REG.scale,
  rotationDeg: REG.rotationDeg,
  differenceMask: REG.differenceMask,
  differenceBlobs: REG.differenceBlobs as readonly (readonly number[])[],
};

// The same scene region, expressed in the Calhoun print's normalised coordinates.
export const lincolnRectToCalhoun = (r: Rect): Rect => {
  const L = IMG.lincolnComposite;
  const C = IMG.calhoun1852;
  const { a, b, c, d, tx, ty } = CALHOUN_TO_LINCOLN;
  const det = a * d - b * c;
  const inv = (x: number, y: number) => {
    const X = x - tx;
    const Y = y - ty;
    return [(d * X - b * Y) / det, (-c * X + a * Y) / det];
  };
  const [x0, y0] = inv(r[0] * L.width, r[1] * L.height);
  const [x1, y1] = inv(r[2] * L.width, r[3] * L.height);
  return [x0 / C.width, y0 / C.height, x1 / C.width, y1 / C.height];
};
