import {Easing, interpolate} from 'remotion';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix3 = (
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** 0..1 progress of `frame` across [start, start+dur], optionally eased */
export const prog = (frame: number, start: number, dur: number, ease: (t: number) => number = (t) => t) =>
  ease(clamp((frame - start) / dur));

/** clamped interpolate with optional easing */
export const map = (
  frame: number,
  input: number[],
  output: number[],
  ease: (t: number) => number = Easing.linear,
) =>
  interpolate(frame, input, output, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

export const E = {
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  outBack: Easing.bezier(0.34, 1.56, 0.64, 1),
  soft: Easing.bezier(0.45, 0.05, 0.25, 1),
  expoOut: Easing.bezier(0.19, 1, 0.22, 1),
  expoIn: Easing.bezier(0.95, 0.05, 0.795, 0.035),
};

/** keyframed vector track: [[frame, [x,y,z]], ...] with easing between keys */
export const track3 = (
  frame: number,
  keys: [number, [number, number, number]][],
  ease: (t: number) => number = E.inOut,
): [number, number, number] => {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i];
    const [f1, v1] = keys[i + 1];
    if (frame <= f1) return mix3(v0, v1, ease(clamp((frame - f0) / (f1 - f0))));
  }
  return keys[keys.length - 1][1];
};

export const track = (
  frame: number,
  keys: [number, number][],
  ease: (t: number) => number = E.inOut,
): number => {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i];
    const [f1, v1] = keys[i + 1];
    if (frame <= f1) return lerp(v0, v1, ease(clamp((frame - f0) / (f1 - f0))));
  }
  return keys[keys.length - 1][1];
};

/** deterministic PRNG */
export const rng = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
};

/** smooth pseudo-random wobble for handheld camera feel */
export const wobble = (t: number, seed = 0, freq = 1) =>
  Math.sin(t * 0.9 * freq + seed) * 0.5 +
  Math.sin(t * 2.3 * freq + seed * 1.7) * 0.3 +
  Math.sin(t * 5.1 * freq + seed * 2.9) * 0.2;
