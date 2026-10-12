import React from 'react';
import {interpolate} from 'remotion';
import {ease} from '../../theme';
import {springAt} from '../../lib/math';

/**
 * A human thumb seen from above the screen (nail side), drawn in its own frame with the
 * contact point at (0,0) and the thumb running down-right. `lift` 0 = touching glass, 1 = hovering.
 * The cast shadow tightens on contact, which is what sells the press.
 */
export const Thumb: React.FC<{x: number; y: number; angle?: number; lift?: number; press?: number; light?: [number, number, number]; scale?: number; uid?: string}> = ({
  x,
  y,
  angle = -32,
  lift = 0,
  press = 0,
  light = [150, 200, 255],
  scale = 1,
  uid = 'th',
}) => {
  const [lr, lg, lb] = light;
  const sh = 6 + lift * 26;
  const squash = 1 - press * 0.03;
  const outline = 'M -50 52 C -54 2 -40 -44 0 -48 C 40 -44 54 2 50 52 C 52 120 56 200 62 330 L -58 330 C -54 220 -51 130 -50 52 Z';
  return (
    <svg
      style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}
      width={1}
      height={1}
    >
      <defs>
        <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7d4a3a" />
          <stop offset="0.18" stopColor="#c98d72" />
          <stop offset="0.5" stopColor="#e9b79c" />
          <stop offset="0.78" stopColor="#c58468" />
          <stop offset="1" stopColor="#6d3d2f" />
        </linearGradient>
        <linearGradient id={`${uid}-depth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0.12" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${uid}-nail`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6d9cf" />
          <stop offset="0.5" stopColor="#e9b9ad" />
          <stop offset="1" stopColor="#c99085" />
        </linearGradient>
        <radialGradient id={`${uid}-rim`} cx="0.5" cy="0" r="0.9">
          <stop offset="0" stopColor={`rgb(${lr},${lg},${lb})`} stopOpacity="0.55" />
          <stop offset="1" stopColor={`rgb(${lr},${lg},${lb})`} stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={sh * 0.6} />
        </filter>
        <clipPath id={`${uid}-clip`}>
          <path d={outline} />
        </clipPath>
      </defs>
      <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${angle})`}>
        {/* contact shadow on the glass */}
        <g transform={`translate(${-sh * 0.5} ${sh * 0.9})`} filter={`url(#${uid}-shadow)`} opacity={0.55 - lift * 0.2}>
          <path d={outline} fill="#000" />
        </g>
        <g transform={`translate(0 ${-lift * 6}) scale(${1 + lift * 0.035} ${squash})`}>
          <path d={outline} fill={`url(#${uid}-skin)`} />
          <g clipPath={`url(#${uid}-clip)`}>
            <path d={outline} fill={`url(#${uid}-depth)`} />
            <ellipse cx={0} cy={-46} rx={70} ry={40} fill={`url(#${uid}-rim)`} />
            {/* knuckle creases */}
            <path d="M -40 168 Q 0 180 42 166" stroke="#8a5442" strokeWidth={2.4} fill="none" opacity={0.55} />
            <path d="M -34 182 Q 2 192 38 180" stroke="#8a5442" strokeWidth={1.6} fill="none" opacity={0.4} />
            <path d="M -30 196 Q 0 203 30 195" stroke="#f3c7ae" strokeWidth={1.2} fill="none" opacity={0.35} />
            {/* soft highlight along the ridge */}
            <path d="M -8 -30 C -14 40 -16 140 -12 320" stroke="#ffe2cf" strokeWidth={14} fill="none" opacity={0.18} strokeLinecap="round" />
          </g>
          {/* nail */}
          <path d="M -30 54 C -34 12 -26 -28 0 -31 C 26 -28 34 12 30 54 C 18 60 -18 60 -30 54 Z" fill={`url(#${uid}-nail)`} />
          <path d="M -30 54 C -18 60 18 60 30 54 C 22 64 -22 64 -30 54 Z" fill="#a8695a" opacity={0.6} />
          <path d="M -22 40 C -24 10 -18 -16 -2 -20" stroke="#fff" strokeWidth={5} fill="none" opacity={0.45} strokeLinecap="round" />
          <path d="M -27 -6 C -18 -24 18 -24 27 -6" stroke="#fff4ee" strokeWidth={3} fill="none" opacity={0.35} />
        </g>
      </g>
    </svg>
  );
};

export type Swipe = {at: number; dist?: number};

const DRAG = 7;
const SNAP_FROM = 0.24;

/** Feed position after a series of swipes: finger drag, then a critically-damped snap. */
export const feedPositionAt = (frame: number, swipes: Swipe[]) => {
  let pos = 0;
  for (const s of swipes) {
    const t = frame - s.at;
    if (t <= 0) continue;
    if (t < DRAG) {
      pos += interpolate(t, [0, DRAG], [0, SNAP_FROM], {easing: ease.in});
    } else {
      pos += SNAP_FROM + (1 - SNAP_FROM) * springAt(t - DRAG, {stiffness: 260, damping: 30});
    }
  }
  return pos;
};

type Pose = {x: number; y: number; lift: number; press: number};
const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  lift: a.lift + (b.lift - a.lift) * t,
  press: a.press + (b.press - a.press) * t,
});

/** Thumb pose for a series of swipes. Rest point (rx, ry) is in screen coordinates. */
export const thumbPoseAt = (frame: number, swipes: Swipe[], rx = 292, ry = 650): Pose => {
  const rest: Pose = {x: rx + 40, y: ry + 70, lift: 1, press: 0};
  let prev: Swipe | null = null;
  let next: Swipe | null = null;
  for (const s of swipes) {
    if (s.at <= frame) prev = s;
    else if (!next) next = s;
  }
  let pose = rest;
  if (prev) {
    const t = frame - prev.at;
    const dist = prev.dist ?? 250;
    if (t < DRAG) {
      const p = interpolate(t, [0, DRAG], [0, 1], {easing: ease.in});
      pose = {x: rx - 18 * p, y: ry - dist * 0.55 * p, lift: 0, press: 1};
    } else if (t < DRAG + 5) {
      const p = interpolate(t, [DRAG, DRAG + 5], [0, 1], {easing: ease.out});
      pose = {x: rx - 18 - 14 * p, y: ry - dist * 0.55 - dist * 0.45 * p, lift: p, press: 1 - p};
    } else {
      const p = interpolate(t, [DRAG + 5, 26], [0, 1], {easing: ease.inOut, extrapolateRight: 'clamp'});
      pose = lerpPose({x: rx - 32, y: ry - dist, lift: 1, press: 0}, rest, p);
    }
  }
  if (next && frame - next.at >= -10) {
    const p = interpolate(frame - next.at, [-10, 0], [0, 1], {easing: ease.inOut});
    pose = lerpPose(pose, {x: rx, y: ry, lift: 0, press: 0.6}, p);
  }
  return pose;
};

/** Double-tap (like) gesture blended over a base pose. taps: frames of contact. */
export const tapOverlay = (frame: number, base: Pose, taps: number[], tx: number, ty: number): Pose => {
  if (!taps.length) return base;
  const first = taps[0];
  const last = taps[taps.length - 1];
  const inP = interpolate(frame, [first - 14, first - 2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
  const outP = interpolate(frame, [last + 4, last + 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
  const w = inP * (1 - outP);
  if (w <= 0) return base;
  let lift = 0.6;
  for (const t of taps) {
    const d = Math.abs(frame - t);
    if (d < 3) lift = Math.min(lift, (d / 3) * 0.6);
  }
  const press = 1 - lift / 0.6;
  return lerpPose(base, {x: tx, y: ty, lift, press}, w);
};
