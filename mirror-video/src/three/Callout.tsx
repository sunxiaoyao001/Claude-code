import React from 'react';
import {Html} from '@react-three/drei';
import {C, FONT} from '../theme';

/** Anchored 3D label: a dot on the anatomy, a leader line, a short caption. */
export const Callout: React.FC<{
  position: [number, number, number];
  text: string;
  sub?: string;
  dx?: number;
  dy?: number;
  p?: number;
  color?: string;
}> = ({position, text, sub, dx = 120, dy = -70, p = 1, color = C.neuron}) => {
  if (p <= 0.001) return null;
  const len = Math.hypot(dx, dy);
  const lineP = Math.min(1, p * 1.6);
  const textP = Math.max(0, (p - 0.35) / 0.65);
  const left = dx >= 0;
  return (
    <Html position={position} zIndexRange={[20, 0]} style={{pointerEvents: 'none'}}>
      <div style={{position: 'relative', width: 0, height: 0}}>
        <svg width={Math.abs(dx) + 20} height={Math.abs(dy) + 20} style={{position: 'absolute', overflow: 'visible', left: 0, top: 0}}>
          <circle cx={0} cy={0} r={6 * lineP} fill={color} style={{filter: `drop-shadow(0 0 8px ${color})`}} />
          <circle cx={0} cy={0} r={14 * lineP} fill="none" stroke={color} strokeOpacity={0.5} strokeWidth={1.5} />
          <line x1={0} y1={0} x2={dx * lineP} y2={dy * lineP} stroke={color} strokeWidth={2} strokeDasharray={`${len} ${len}`} />
          <line x1={dx * lineP} y1={dy * lineP} x2={(dx + (left ? 90 : -90)) * lineP} y2={dy * lineP} stroke={color} strokeWidth={2} />
        </svg>
        <div
          style={{
            position: 'absolute',
            left: left ? dx + 8 : undefined,
            right: left ? undefined : -dx + 8,
            top: dy - 50,
            whiteSpace: 'nowrap',
            textAlign: left ? 'left' : 'right',
            opacity: textP,
            transform: `translateY(${(1 - textP) * 10}px)`,
          }}
        >
          <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 30, letterSpacing: '0.12em', color: C.text, textShadow: '0 2px 16px rgba(0,0,0,0.95)'}}>
            {text}
          </div>
          {sub ? (
            <div style={{fontFamily: FONT.mono, fontSize: 18, letterSpacing: '0.16em', color, marginTop: 2, textShadow: '0 2px 12px rgba(0,0,0,0.95)'}}>{sub}</div>
          ) : null}
        </div>
      </div>
    </Html>
  );
};
