// Parametric placeholder looks (CLAUDE.md §6): each built-in camera gets a distinct, plausible colour
// response until datasheet-based (spectral_film_lut) or ColorChecker-calibrated LUTs replace it.
// Operates on sRGB-encoded values, the same space the shaders feed into the LUT.

type RGB = [number, number, number];

export interface LookParams {
  /** -1 cool .. +1 warm white balance shift. */
  temperature: number;
  /** -1 green .. +1 magenta. */
  tint: number;
  saturation: number;
  /** 0..1 blend towards a smoothstep S-curve. */
  contrast: number;
  /** Black level lift, 0..0.1. */
  lift: number;
  /** Highlight shoulder: f(x) = x(1+r)/(1+rx), keeps 1 at 1 and lifts the midtones. */
  rolloff: number;
  shadowTint: RGB;
  highlightTint: RGB;
  /** Black & white channel mix; when set the look is monochrome. */
  mono?: RGB;
  /** Multiplier applied last, e.g. a faint warm paper tone for B&W. */
  tone?: RGB;
}

const REC709: RGB = [0.2126, 0.7152, 0.0722];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const dot = (a: RGB, b: RGB) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function applyLook(look: LookParams, input: RGB): RGB {
  let rgb: RGB = [
    input[0] * (1 + 0.08 * look.temperature),
    input[1] * (1 - 0.04 * look.tint),
    input[2] * (1 - 0.1 * look.temperature),
  ];

  if (look.mono) {
    const y = dot(rgb, look.mono);
    rgb = [y, y, y];
  } else {
    const luma = dot(rgb, REC709);
    rgb = rgb.map((c) => luma + (c - luma) * look.saturation) as RGB;
  }

  rgb = rgb.map((c) => {
    const x = clamp01(c);
    const s = x * x * (3 - 2 * x);
    return x + (s - x) * look.contrast;
  }) as RGB;

  const luma = clamp01(dot(rgb, REC709));
  const shadowWeight = (1 - luma) ** 2;
  const highlightWeight = luma ** 2;
  rgb = rgb.map((c, i) => c + (look.shadowTint[i] ?? 0) * shadowWeight + (look.highlightTint[i] ?? 0) * highlightWeight) as RGB;

  rgb = rgb.map((c) => {
    const lifted = look.lift + (1 - look.lift) * clamp01(c);
    return (lifted * (1 + look.rolloff)) / (1 + look.rolloff * lifted);
  }) as RGB;

  if (look.tone) rgb = rgb.map((c, i) => c * (look.tone?.[i] ?? 1)) as RGB;
  return rgb.map(clamp01) as RGB;
}

const NEUTRAL: LookParams = {
  temperature: 0, tint: 0, saturation: 1, contrast: 0, lift: 0, rolloff: 0,
  shadowTint: [0, 0, 0], highlightTint: [0, 0, 0],
};

export const PLACEHOLDER_LOOKS: Record<string, LookParams> = {
  identity: NEUTRAL,
  // Kodak FunSaver 800: warm yellow highlights, slightly cool shadows, punchy but not harsh.
  'sunny-fun': {
    temperature: 0.55, tint: -0.1, saturation: 1.08, contrast: 0.18, lift: 0.035, rolloff: 0.15,
    shadowTint: [-0.01, 0, 0.02], highlightTint: [0.03, 0.015, -0.03],
  },
  // Fujifilm Natura 1600 at night: bright, warm, gentle contrast, open shadows.
  moonlight: {
    temperature: 0.3, tint: 0, saturation: 0.98, contrast: 0.08, lift: 0.05, rolloff: 0.35,
    shadowTint: [0.01, 0, -0.01], highlightTint: [0.02, 0.01, -0.02],
  },
  // Leica M3 + Ilford HP5 Plus: panchromatic B&W, classic mid contrast, faint warm paper.
  'm3-hp5': {
    ...NEUTRAL, contrast: 0.25, lift: 0.02, rolloff: 0.05,
    mono: [0.27, 0.63, 0.1], tone: [1, 0.99, 0.97],
  },
};
