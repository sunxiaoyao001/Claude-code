import React from 'react';
import {interpolate} from 'remotion';
import {F, ease} from '../theme';

/**
 * Anatomical label: a pin on the structure, a hairline that draws out to the side, then the name.
 * Positioned in screen pixels (from a 3D projection).
 */
export const Callout: React.FC<{
  frame: number;
  at: number;
  x: number;
  y: number;
  dx?: number;
  dy?: number;
  title: string;
  sub?: string;
  color?: string;
  out?: number;
}> = ({frame, at, x, y, dx = 160, dy = -90, title, sub, color = '#ffc56b', out}) => {
  const t = frame - at;
  if (t < 0) return null;
  const pin = interpolate(t, [0, 8], [0, 1], {extrapolateRight: 'clamp', easing: ease.out});
  const line = interpolate(t, [4, 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
  const txt = interpolate(t, [14, 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.out});
  const fadeOut = out === undefined ? 1 : interpolate(frame, [out, out + 12], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ex = x + dx;
  const ey = y + dy;
  const kx = x + dx * 0.35;
  const ky = ey;
  const len1 = Math.hypot(kx - x, ky - y);
  const len2 = Math.abs(ex - kx);
  const total = len1 + len2;
  const drawn = total * line;
  const right = dx >= 0;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fadeOut, pointerEvents: 'none'}}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <circle cx={x} cy={y} r={14 * pin} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6 * pin} />
        <circle cx={x} cy={y} r={4.5 * pin} fill={color} />
        <polyline
          points={`${x},${y} ${kx},${ky} ${ex},${ey}`}
          fill="none"
          stroke={color}
          strokeWidth={1.6}
          strokeDasharray={`${drawn} ${total}`}
          opacity={0.85}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: right ? ex + 14 : undefined,
          right: right ? undefined : 1920 - ex + 14,
          top: ey - 30,
          opacity: txt,
          transform: `translateX(${(1 - txt) * (right ? -12 : 12)}px)`,
          textAlign: right ? 'left' : 'right',
          filter: txt < 0.98 ? `blur(${(1 - txt) * 6}px)` : undefined,
        }}
      >
        <div style={{fontFamily: F.sans, fontWeight: 500, fontSize: 34, color: '#fff4e2', letterSpacing: '0.08em', textShadow: `0 0 18px ${color}88, 0 2px 8px rgba(0,0,0,0.8)`}}>
          {title}
        </div>
        {sub ? (
          <div style={{fontFamily: F.mono, fontSize: 17, color, letterSpacing: '0.2em', marginTop: 4, opacity: 0.85}}>{sub}</div>
        ) : null}
      </div>
    </div>
  );
};
