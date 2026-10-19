// Per-shot random variables (CLAUDE.md §4): grain seed, dither seed and the light leak roll. Derived
// from one 32-bit seed with a deterministic PRNG, so any shot can be re-rendered exactly (tests, and
// later re-exports from the gallery).
import type { FilterParams } from '../pack/FilterParams';

export interface LeakRoll {
  /** Centre in frame coordinates (0..1, y down); lies just outside an edge. */
  x: number;
  y: number;
  /** Radius as a fraction of the frame height. */
  radius: number;
  opacity: number;
  color: [number, number, number];
}

export interface ShotRandom {
  seed: number;
  grainSeed: number;
  ditherSeed: number;
  leak: LeakRoll | null;
}

// Leak palette: amber, red-orange, magenta-violet (CLAUDE.md §4 "橙/红/蓝紫").
const LEAK_COLORS: ReadonlyArray<[number, number, number]> = [
  [1.0, 0.62, 0.22],
  [1.0, 0.36, 0.18],
  [0.72, 0.36, 1.0],
];

/** mulberry32: small, fast, well distributed; returns floats in [0, 1). */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newShotSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

export function rollShot(seed: number, params: FilterParams): ShotRandom {
  const rng = createRng(seed);
  const grainSeed = rng() * 100;
  const ditherSeed = rng() * 100;
  const leakRoll = rng();
  const { probability, opacityMin, opacityMax } = params.lightLeak;

  let leak: LeakRoll | null = null;
  if (leakRoll < probability) {
    const side = Math.floor(rng() * 4); // 0 left, 1 right, 2 top, 3 bottom
    const along = 0.15 + rng() * 0.7;
    const outside = -0.08 - rng() * 0.12;
    const x = side === 0 ? outside : side === 1 ? 1 - outside : along;
    const y = side === 2 ? outside : side === 3 ? 1 - outside : along;
    leak = {
      x,
      y,
      radius: 0.35 + rng() * 0.35,
      opacity: opacityMin + rng() * (opacityMax - opacityMin),
      color: LEAK_COLORS[Math.floor(rng() * LEAK_COLORS.length)] ?? [1, 0.62, 0.22],
    };
  }
  return { seed, grainSeed, ditherSeed, leak };
}
