import { Easing } from "remotion";

// Darkroom Archive palette. Vermilion is the only accent and stays under 5% of any frame.
export const COLORS = {
  ink: "#0E0E10",
  darkPaper: "#1A1917",
  printWhite: "#ECE6DA",
  silver: "#8E8A84",
  vermilion: "#C8412B",
  shadowCool: "#1C2230",
  highlightWarm: "#EEDFC6",
} as const;

export const FONTS = {
  // Local woff2 subsets (see scripts/subset_fonts.py), loaded in fonts.ts.
  serifZh: "Noto Serif SC Subset",
  sansZh: "Noto Sans SC Subset",
  // Loaded through @remotion/google-fonts in fonts.ts.
  italicEn: "EB Garamond",
  mono: "IBM Plex Mono",
} as const;

// One frame never uses more than three of these sizes.
export const TYPE = {
  golden: 150,
  title: 128,
  subtitleZh: 56,
  subtitleEn: 36,
  label: 24,
  credits: 20,
  monoTracking: "0.12em",
  titleTracking: "-0.02em",
} as const;

export const CANVAS = { width: 1080, height: 1920 } as const;

// 9:16 safe area: top 9%, bottom 22%, right 12% stay free of key content; margins >= 7%.
export const SAFE = {
  top: Math.round(CANVAS.height * 0.09),
  bottom: Math.round(CANVAS.height * (1 - 0.22)),
  right: Math.round(CANVAS.width * (1 - 0.12)),
  margin: Math.round(CANVAS.width * 0.07),
  subtitleCenterY: Math.round(CANVAS.height * 0.68),
} as const;

const columnWidth = (CANVAS.width - SAFE.margin * 2) / 12;
// Left edge of a 1-based grid column.
export const col = (n: number) => SAFE.margin + (n - 1) * columnWidth;
export const span = (from: number, to: number) => (to - from + 1) * columnWidth;
export const BASELINE = 8;

// The archivist's hand: no bounce, no linear motion.
export const EASE = {
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  spring: Easing.spring({ damping: 200 }),
} as const;

export const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Periodic motion from the same bezier: 0 → 1 → 0 once per `period`, eased at both turns (no sine).
export const swing = (seconds: number, period: number) => {
  const p = (((seconds / period) % 1) + 1) % 1;
  return EASE.inOut(p < 0.5 ? p * 2 : 2 - p * 2);
};

// A one-off rise and fall (0 → 1 → 0) over progress 0..1, e.g. a print lifted while it moves.
export const arc = (progress: number) => EASE.inOut(1 - Math.abs(2 * progress - 1));

// One grade for every photograph (silver-gelatin black and white).
export const GRADE = {
  grainAmount: 0.025,
  vignetteStrength: 0.28,
  // curves control points (input -> output), slight S with lifted blacks
  curve: [
    [0, 0.04],
    [0.25, 0.2],
    [0.5, 0.5],
    [0.75, 0.8],
    [1, 0.95],
  ] as [number, number][],
  halftoneDotSize: 7,
} as const;

export const SUBTITLE_MOTION = {
  riseLines: 10,
  enterFrames: 12,
  exitFrames: 7,
  wordStaggerFrames: 2,
} as const;
