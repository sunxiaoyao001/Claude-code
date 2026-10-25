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

// A 17³ .cube that maps luminance through the curve and splits tone:
// shadows lean cool (#1C2230), highlights lean warm (#EEDFC6), very low saturation.
const buildSplitToneCube = () => {
  const size = 17;
  const shadow = hexToRgb(COLORS.shadowCool);
  const highlight = hexToRgb(COLORS.highlightWarm);
  const rows: string[] = ['TITLE "darkroom-split-tone"', `LUT_3D_SIZE ${size}`];
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / (size - 1);
        const y = applyCurve(lum);
        const tone = shadow.map((s, i) => s + (highlight[i] - s) * y);
        // Blend the tone colour with neutral grey; 12% keeps the split subtle (a cool, neutral
        // silver), so the one colour moment at the twist stands out.
        const out = tone.map((t) => Math.min(1, Math.max(0, y * 0.88 + t * 0.12 * (0.4 + y))));
        rows.push(out.map((v) => v.toFixed(5)).join(" "));
      }
    }
  }
  return rows.join("\n");
};

export const SPLIT_TONE_CUBE = buildSplitToneCube();

type GradeOptions = {
  readonly frame: number;
  // 0 = blank paper, 1 = fully developed. Drives the white point, so the darkest tones appear first.
  readonly develop?: number;
  // 0 = graded black and white, 1 = original scan colours (used once, at the twist).
  readonly colorRestore?: number;
  readonly vignetteAmount?: number;
};

export const photoGrade = ({ frame, develop = 1, colorRestore = 0, vignetteAmount = GRADE.vignetteStrength }: GradeOptions) => {
  const whitePoint = 0.02 + 0.98 * Math.min(1, Math.max(0, develop));
  const graded = colorRestore < 1;
  // Order matters: vignette and grain belong to the exposure, so they sit before the develop
  // (levels) step and a blank print stays white; the split tone is applied last so levels cannot
  // stretch its tint.
  return [
    grayscale({ amount: 1 - colorRestore }),
    vignette({ amount: vignetteAmount }),
    // Grain re-seeds every frame so it reads as film, not a static texture.
    noise({ amount: GRADE.grainAmount, seed: frame }),
    levels({ blackPoint: 0, whitePoint, gamma: 1 }),
    lut({ content: SPLIT_TONE_CUBE, disabled: !graded || colorRestore > 0.5 }),
  ];
};

export const newsprintGrade = ({ frame }: { readonly frame: number }) => [
  grayscale({ amount: 1 }),
  lut({ content: SPLIT_TONE_CUBE }),
  halftone({ dotSize: GRADE.halftoneDotSize, dotSpacing: GRADE.halftoneDotSize }),
  noise({ amount: GRADE.grainAmount, seed: frame }),
];
