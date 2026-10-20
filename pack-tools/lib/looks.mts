// Parametric looks (CLAUDE.md §6) for cameras without film datasheet data: the CCD digicams now, and
// later the series spectral_film_lut cannot model. Film cameras get datasheet LUTs from
// pack-tools/spectral/. Operates on sRGB-encoded values, the same space the shaders feed into the LUT.

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
  /** CCD-style hard clip: values above this level saturate to white (1 = off). */
  clip?: number;
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
    input[0] * (1 + 0.12 * look.temperature),
    input[1] * (1 - 0.05 * look.tint),
    input[2] * (1 - 0.16 * look.temperature),
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

  if (look.clip !== undefined && look.clip < 1) {
    const clip = look.clip;
    rgb = rgb.map((c) => c / clip) as RGB;
  }

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
  // C · CCD 千禧: small sensors clip highlights hard and render colour with a digital bias.
  // Casio Exilim EX-S500: cool, high-key, flash-white skin.
  'ccd-casio': {
    temperature: -0.7, tint: 0.08, saturation: 0.88, contrast: 0.1, lift: 0.03, rolloff: 0.45, clip: 0.88,
    shadowTint: [-0.01, 0, 0.03], highlightTint: [-0.02, 0, 0.03],
  },
  // Sony Cyber-shot DSC-T10: blue cast, low dynamic range.
  'ccd-sony': {
    temperature: -0.95, tint: -0.05, saturation: 1.0, contrast: 0.3, lift: 0.01, rolloff: 0.05, clip: 0.85,
    shadowTint: [-0.03, 0, 0.06], highlightTint: [-0.01, 0, 0.02],
  },
  // Canon Digital IXUS 860 IS: warm, friendly compact.
  'ccd-canon': {
    temperature: 0.45, tint: -0.05, saturation: 1.1, contrast: 0.18, lift: 0.015, rolloff: 0.12, clip: 0.92,
    shadowTint: [0.01, 0, -0.01], highlightTint: [0.02, 0.01, -0.02],
  },
  // Fujifilm FinePix F40fd: the skin-tone favourite, soft highlights, slightly cool greens.
  'ccd-fuji': {
    temperature: -0.4, tint: -0.2, saturation: 0.95, contrast: 0.1, lift: 0.02, rolloff: 0.4, clip: 0.95,
    shadowTint: [-0.01, 0.015, 0.02], highlightTint: [0.015, 0.005, -0.005],
  },
  // Nikon Coolpix SQ: toy-like vivid colour.
  'ccd-nikon': {
    temperature: 0.1, tint: 0.05, saturation: 1.35, contrast: 0.25, lift: 0.01, rolloff: 0.1, clip: 0.9,
    shadowTint: [0, 0, 0.01], highlightTint: [0.01, 0, -0.01],
  },
  // Sony Handycam on VHS-C tape: washed-out chroma, lifted blacks, magenta drift.
  'vhs-c': {
    temperature: 0.15, tint: 0.18, saturation: 0.72, contrast: 0.05, lift: 0.07, rolloff: 0.25, clip: 0.94,
    shadowTint: [0.01, -0.01, 0.03], highlightTint: [0.02, 0, -0.01],
  },
};
