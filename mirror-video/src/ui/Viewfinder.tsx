import React from 'react';
import {C, FONT} from '../theme';

/** Phone-camera HUD: corner marks, face-detect box, exposure readout. */
export const Viewfinder: React.FC<{
  opacity?: number;
  faceBox?: {x: number; y: number; w: number; h: number};
  info?: string;
  width?: number;
  height?: number;
  rec?: boolean;
  lock?: number; // 0..1 face-lock animation
}> = ({opacity = 1, faceBox, info = 'ISO 800   1/60   ƒ2.2   24mm', width = 1920, height = 1080, lock = 1}) => {
  const m = 70;
  const L = 46;
  const corner = (x: number, y: number, sx: number, sy: number) => (
    <path d={`M ${x} ${y + sy * L} L ${x} ${y} L ${x + sx * L} ${y}`} stroke="rgba(255,255,255,0.85)" strokeWidth={2.5} fill="none" />
  );
  const fb = faceBox;
  const s = 1 + (1 - lock) * 0.35;
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0, opacity}} viewBox={`0 0 ${width} ${height}`}>
      {corner(m, m, 1, 1)}
      {corner(width - m, m, -1, 1)}
      {corner(m, height - m, 1, -1)}
      {corner(width - m, height - m, -1, -1)}
      {/* rule of thirds */}
      {[1, 2].map((i) => (
        <g key={i} stroke="rgba(255,255,255,0.12)" strokeWidth={1}>
          <line x1={(width / 3) * i} y1={m} x2={(width / 3) * i} y2={height - m} />
          <line x1={m} y1={(height / 3) * i} x2={width - m} y2={(height / 3) * i} />
        </g>
      ))}
      {fb ? (
        <g transform={`translate(${fb.x + fb.w / 2} ${fb.y + fb.h / 2}) scale(${s}) translate(${-fb.w / 2} ${-fb.h / 2})`} opacity={0.4 + 0.6 * lock}>
          {[
            [0, 0, 1, 1],
            [fb.w, 0, -1, 1],
            [0, fb.h, 1, -1],
            [fb.w, fb.h, -1, -1],
          ].map(([x, y, sx, sy], i) => (
            <path key={i} d={`M ${x} ${y + sy * 26} L ${x} ${y} L ${x + sx * 26} ${y}`} stroke={C.gold} strokeWidth={3} fill="none" />
          ))}
        </g>
      ) : null}
      <text x={width / 2} y={height - m + 4} textAnchor="middle" fill="rgba(255,255,255,0.8)" style={{fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.18em'}}>
        {info}
      </text>
      <circle cx={m + 14} cy={m + 70} r={7} fill="#ff4d4d" opacity={0.9} />
    </svg>
  );
};
