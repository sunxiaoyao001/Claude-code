import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {W, H} from '../theme';

type RGB = [number, number, number];

/** Out-of-focus lights drifting at several depths (each disc rasterised once, then only moved). */
export const Bokeh: React.FC<{
  count?: number;
  seed?: string;
  colors?: RGB[];
  opacity?: number;
  drift?: number;
  sizeRange?: [number, number];
}> = ({count = 26, seed = 'bokeh', colors = [[98, 160, 255], [255, 181, 71], [140, 110, 255]], opacity = 0.5, drift = 1, sizeRange = [40, 220]}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {new Array(count).fill(0).map((_, i) => {
        const depth = random(`${seed}d${i}`);
        const size = sizeRange[0] + depth * (sizeRange[1] - sizeRange[0]);
        const bx = random(`${seed}x${i}`) * (W + 400) - 200;
        const by = random(`${seed}y${i}`) * (H + 400) - 200;
        const t = frame * 0.004 * drift * (0.4 + depth);
        const x = bx + noise2D(`${seed}nx${i}`, t, 0) * 120 + frame * 0.15 * drift * (depth - 0.5);
        const y = by + noise2D(`${seed}ny${i}`, 0, t) * 90 - frame * 0.25 * drift * depth;
        const c = colors[i % colors.length];
        const tw = 0.6 + 0.4 * Math.sin(frame * 0.05 + i * 1.7);
        const a = opacity * (0.25 + 0.75 * (1 - depth)) * tw;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: size,
              height: size,
              borderRadius: '50%',
              opacity: Math.min(1, a),
              willChange: 'transform',
              transform: `translate3d(${(x - size / 2).toFixed(1)}px, ${(y - size / 2).toFixed(1)}px, 0)`,
              background: `radial-gradient(circle, rgba(${c[0]},${c[1]},${c[2]},0.55) 0%, rgba(${c[0]},${c[1]},${c[2]},0.4) 52%, rgba(${c[0]},${c[1]},${c[2]},0.62) 66%, rgba(${c[0]},${c[1]},${c[2]},0) 70%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Fine floating dust / spores catching light. */
export const Dust: React.FC<{count?: number; seed?: string; color?: string; opacity?: number; speed?: number}> = ({
  count = 90,
  seed = 'dust',
  color = '220,230,255',
  opacity = 0.7,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        {new Array(count).fill(0).map((_, i) => {
          const z = random(`${seed}z${i}`);
          const r = 0.6 + z * 2.2;
          const t = frame * 0.003 * speed;
          const x = ((random(`${seed}x${i}`) * W + noise2D(`${seed}a${i}`, t, 1) * 160 + frame * 0.2 * speed * z) % (W + 40) + W + 40) % (W + 40) - 20;
          const y = ((random(`${seed}y${i}`) * H + noise2D(`${seed}b${i}`, 1, t) * 120 - frame * 0.35 * speed * z) % (H + 40) + H + 40) % (H + 40) - 20;
          const tw = 0.35 + 0.65 * Math.abs(Math.sin(frame * 0.06 * (0.5 + z) + i));
          return <circle key={i} cx={x} cy={y} r={r} fill={`rgba(${color},${opacity * tw * (0.3 + z * 0.7)})`} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** Big soft coloured light that breathes at the edge of frame (cached layer, moved by transform). */
export const LightLeak: React.FC<{color?: RGB; x?: number; y?: number; size?: number; intensity?: number; seed?: string}> = ({
  color = [255, 140, 60],
  x = 0.85,
  y = 0.15,
  size = 1100,
  intensity = 0.35,
  seed = 'leak',
}) => {
  const frame = useCurrentFrame();
  const nx = noise2D(seed, frame * 0.006, 0) * 120;
  const ny = noise2D(seed + 'y', 0, frame * 0.006) * 90;
  const breathe = 0.75 + 0.25 * noise2D(seed + 'b', frame * 0.01, 2);
  const [r, g, b] = color;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: size,
          height: size,
          borderRadius: '50%',
          opacity: Math.max(0, Math.min(1, intensity * breathe)),
          willChange: 'transform',
          transform: `translate3d(${(x * W - size / 2 + nx).toFixed(1)}px, ${(y * H - size / 2 + ny).toFixed(1)}px, 0)`,
          background: `radial-gradient(circle, rgba(${r},${g},${b},0.9) 0%, rgba(${r},${g},${b},0.32) 35%, rgba(${r},${g},${b},0) 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};
