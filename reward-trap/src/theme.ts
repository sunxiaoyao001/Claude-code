import {Easing} from 'remotion';

export const W = 1920;
export const H = 1080;
export const FPS = 30;

// Colour script: night-blue darkness, cold screen light, and dopamine gold as the only warm hue.
export const C = {
  void: '#020308',
  bg: '#04050b',
  bg2: '#0a0e1a',
  ink: '#eef1f8',
  inkDim: 'rgba(238,241,248,0.62)',
  inkFaint: 'rgba(238,241,248,0.32)',
  gold: '#ffb547',
  goldHi: '#ffe4ad',
  goldDeep: '#ff7a1a',
  amber: '#ff9a2e',
  screen: '#9fdcff',
  cyan: '#62d2ff',
  teal: '#39e0cc',
  magenta: '#ff3d6e',
  blue: '#5b8cff',
  violet: '#8b6bff',
  tissue: '#e6a9a0',
} as const;

export const F = {
  serif: '"Noto Serif SC", "Source Han Serif SC", serif',
  sans: '"Noto Sans SC", "Inter", sans-serif',
  mono: '"JetBrains Mono", "Noto Sans SC", monospace',
  ui: '"Inter", "Noto Sans SC", sans-serif',
} as const;

// Motion vocabulary
export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // expo-out: snappy arrival
  inOut: Easing.bezier(0.65, 0, 0.35, 1), // camera moves
  in: Easing.bezier(0.7, 0, 0.84, 0), // accelerate away
  soft: Easing.bezier(0.33, 0, 0.2, 1),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
} as const;
