import { grayscale } from "@remotion/effects/grayscale";
import { halftone } from "@remotion/effects/halftone";
import { levels } from "@remotion/effects/levels";
import { lut } from "@remotion/effects/lut";
import { noise } from "@remotion/effects/noise";
import { vignette } from "@remotion/effects/vignette";
import { COLORS, GRADE } from "./theme";

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
};

// Silver-gelatin curve, sampled with linear interpolation between GRADE.curve points.
const applyCurve = (x: number) => {
  const pts = GRADE.curve;
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
};

const SPLIT_TONE = 0.55;

// A 17³ .cube that maps luminance through the curve and splits tone:
// shadows lean cool (#1C2230), highlights lean warm (#EEDFC6), very low saturation.
const buildSplitToneCube = () => {
  const size = 17;
  const shadow = hexToRgb(COLORS.shadowCool);
  const PAPER = hexToRgb(COLORS.printWhite);
  const highlight = hexToRgb(COLORS.highlightWarm);
  const rows: string[] = ['TITLE "darkroom-split-tone"', `LUT_3D_SIZE ${size}`];
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / (size - 1);
        const y = applyCurve(lum);
        const tone = shadow.map((s, i) => s + (highlight[i] - s) * y);
        // Split tone: 55% of the way from neutral grey to the tone colour, so blacks sit on a cool
        // #1C2230-ish silver and highlights on a warm #EEDFC6-ish paper while the midtones stay
        // neutral. Paper white is the brightest tone a print can have (#ECE6DA), never 255 white.
        const out = tone.map((t, c) => Math.min(PAPER[c], Math.max(0, y + (t - y) * SPLIT_TONE)));
        rows.push(out.map((v) => v.toFixed(5)).join(" "));
      }
    }
  }
  return rows.join("\n");
};

export const SPLIT_TONE_CUBE = buildSplitToneCube();

type GradeOptions = {
  readonly frame: number;
  // 0 = blank paper, 1 = fully developed (see developGamma / developOpacity).
  readonly develop?: number;
  // 0 = graded black and white, 1 = original scan colours (used once, at the twist).
  readonly colorRestore?: number;
  readonly vignetteAmount?: number;
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// Development is continuous tone, as in a real tray: density builds where the exposure was
// strongest first. A high gamma lifts every tone toward paper white while keeping the darkest ones
// darkest, and relaxes to 1 as the print develops, so the shadows come up first, then the midtones,
// and the faintest greys (the "spirit") last. Nothing is clipped.
export const developGamma = (develop: number) => 1 + 9 * Math.pow(1 - clamp01(develop), 1.6);
// The very first moments: the image itself fades up out of blank paper over the first 30%.
export const developOpacity = (develop: number) => {
  const x = clamp01(develop / 0.3);
  return x * x * (3 - 2 * x);
};

export const photoGrade = ({ frame, develop = 1, colorRestore = 0, vignetteAmount = GRADE.vignetteStrength }: GradeOptions) => {
  const graded = colorRestore < 1;
  // Order matters: vignette and grain belong to the exposure, so they sit before the develop step;
  // the split tone is applied last so the develop curve cannot stretch its tint.
  return [
    grayscale({ amount: 1 - colorRestore }),
    vignette({ amount: vignetteAmount }),
    // Grain re-seeds every frame so it reads as film, not a static texture.
    noise({ amount: GRADE.grainAmount, seed: frame }),
    levels({ blackPoint: 0, whitePoint: 1, gamma: developGamma(develop) }),
    lut({ content: SPLIT_TONE_CUBE, disabled: !graded || colorRestore > 0.5 }),
  ];
};

export const newsprintGrade = ({ frame }: { readonly frame: number }) => [
  grayscale({ amount: 1 }),
  lut({ content: SPLIT_TONE_CUBE }),
  halftone({ dotSize: GRADE.halftoneDotSize, dotSpacing: GRADE.halftoneDotSize }),
  noise({ amount: GRADE.grainAmount, seed: frame }),
];
