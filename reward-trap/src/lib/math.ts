import {interpolate, random} from 'remotion';
import {noise2D} from './noise';

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/** Frame-range progress with easing, clamped to [0,1]. */
export const prog = (
  frame: number,
  start: number,
  dur: number,
  easing: (t: number) => number = (t) => t,
) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

/** Deterministic random in [lo, hi). */
export const rand = (seed: string | number, lo = 0, hi = 1) => lo + random(seed) * (hi - lo);

/** Hand-held camera drift: smooth noise offsets in px and degrees. */
export const handheld = (frame: number, amp = 6, speed = 0.012, seed = 'cam') => ({
  x: noise2D(seed + 'x', frame * speed, 0) * amp,
  y: noise2D(seed + 'y', 0, frame * speed) * amp,
  r: noise2D(seed + 'r', frame * speed * 0.7, 3.1) * amp * 0.04,
});

/** Damped spring evaluated at time t (frames) — for physics-y overshoot without hooks. */
export const springAt = (t: number, {stiffness = 170, damping = 18, mass = 1} = {}) => {
  if (t <= 0) return 0;
  const s = t / 30;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * s) * (Math.cos(wd * s) + ((zeta * w0) / wd) * Math.sin(wd * s));
  }
  return 1 - Math.exp(-w0 * s) * (1 + w0 * s);
};

export const mix = (c1: [number, number, number], c2: [number, number, number], t: number) =>
  `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))})`;
