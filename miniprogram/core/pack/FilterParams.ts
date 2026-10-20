// Film look parameters of one camera (CLAUDE.md §4–§5), resolved from SeriesProfile + pack delta
// (core/pack/CameraPack.ts). Every field is required after resolution.

export interface FilterParams {
  lut: {
    /** Asset id; built-in LUTs live at /assets/luts/<id>.png (33^3 packed as 6x6 tiles). */
    id: string;
    intensity: number;
  };
  vignette: { strength: number; softness: number };
  halation: {
    strength: number;
    /** Luma where the soft-knee highlight mask is centred. */
    threshold: number;
    /** 1 = blur radii of 8px and 24px at a 1080px image height; scales with output size. */
    radius: number;
  };
  grain: {
    /** Grain cell size in pixels at a 1080px image height. */
    size: number;
    intensity: number;
    /** 0 = flat grain, 1 = full sin-shaped weighting that peaks in the midtones. */
    lumaWeight: number;
    colored: boolean;
  };
  lightLeak: { probability: number; opacityMin: number; opacityMax: number };
  frame: {
    /** Output aspect as "w:h", e.g. "3:4". */
    aspectRatio: string;
  };
  dateStamp: { enabled: boolean };
  fx: {
    /** Lateral colour fringing towards the frame edge, as a fraction of the frame width (VHS, cheap optics). */
    chromaticAberration: number;
    /** Scanline darkening 0..1 (VHS). */
    scanlines: number;
  };
}

interface Range {
  path: string;
  min: number;
  max: number;
  read: (params: FilterParams) => number;
}

const RANGES: Range[] = [
  { path: 'lut.intensity', min: 0, max: 1, read: (p) => p.lut.intensity },
  { path: 'vignette.strength', min: 0, max: 1, read: (p) => p.vignette.strength },
  { path: 'vignette.softness', min: 0.05, max: 0.8, read: (p) => p.vignette.softness },
  { path: 'halation.strength', min: 0, max: 1, read: (p) => p.halation.strength },
  { path: 'halation.threshold', min: 0.5, max: 0.98, read: (p) => p.halation.threshold },
  { path: 'halation.radius', min: 0.25, max: 4, read: (p) => p.halation.radius },
  { path: 'grain.size', min: 0.5, max: 6, read: (p) => p.grain.size },
  { path: 'grain.intensity', min: 0, max: 0.4, read: (p) => p.grain.intensity },
  { path: 'grain.lumaWeight', min: 0, max: 1, read: (p) => p.grain.lumaWeight },
  { path: 'lightLeak.probability', min: 0, max: 1, read: (p) => p.lightLeak.probability },
  { path: 'lightLeak.opacityMin', min: 0, max: 1, read: (p) => p.lightLeak.opacityMin },
  { path: 'lightLeak.opacityMax', min: 0, max: 1, read: (p) => p.lightLeak.opacityMax },
  { path: 'fx.chromaticAberration', min: 0, max: 0.02, read: (p) => p.fx.chromaticAberration },
  { path: 'fx.scanlines', min: 0, max: 1, read: (p) => p.fx.scanlines },
];

/** Parses "w:h" into a width/height ratio, or NaN when malformed. */
export function parseAspect(aspect: string): number {
  const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(aspect);
  if (!match) return Number.NaN;
  const ratio = Number(match[1]) / Number(match[2]);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : Number.NaN;
}

/** Returns the list of problems; an empty list means the look can be rendered. */
export function validateFilterParams(params: FilterParams): string[] {
  const problems: string[] = [];
  for (const range of RANGES) {
    const value = range.read(params);
    if (!Number.isFinite(value) || value < range.min || value > range.max) {
      problems.push(`${range.path}=${value} outside [${range.min}, ${range.max}]`);
    }
  }
  if (params.lightLeak.opacityMin > params.lightLeak.opacityMax) problems.push('lightLeak.opacityMin > opacityMax');
  if (!/^[a-z0-9-]+$/.test(params.lut.id)) problems.push(`lut.id "${params.lut.id}" is not a valid asset id`);
  if (Number.isNaN(parseAspect(params.frame.aspectRatio))) problems.push(`frame.aspectRatio "${params.frame.aspectRatio}" is not "w:h"`);
  return problems;
}
