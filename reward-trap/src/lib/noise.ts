import {makeNoise3} from '../brain/geometry';

// Drop-in replacement for @remotion/noise's noise2D. That package keeps only ~11 seeded generators,
// so thousands of per-particle seeds rebuilt a permutation table on almost every call (~45µs each).
// Here every seed is a slice through ONE shared 3D simplex field: same API, O(1) per call.
const field = makeNoise3(1337);

const seedZ = (seed: string | number) => {
  if (typeof seed === 'number') return seed * 1.6180339887;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100003) * 0.7310585 + 0.5;
};

/** Smooth noise in [-1, 1]; different seeds give independent-looking fields. */
export const noise2D = (seed: string | number, x: number, y: number) => field(x, y, seedZ(seed));
