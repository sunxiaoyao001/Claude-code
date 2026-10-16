/**
 * 单字徽章：延续第一集“甲乙丙”的徽章语言
 * 本集：牙 = 以牙还牙，叛 = 永远背叛，善 = 老好人，狡 = 狡猾者，随 = 随机，你 / 他 = 玩家
 */
import React from 'react';
import {C, FONT} from '../theme';

export const Token: React.FC<{
  ch: string;
  color: string;
  r: number;
  glow?: number;
  spin?: number;
  dashed?: boolean;
}> = ({ch, color, r, glow = 1, spin = 0, dashed}) => {
  const id = `tk-${color.slice(1)}`;
  return (
    <g>
      <defs>
        <radialGradient id={id}>
          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle r={r * 1.9} fill={`url(#${id})`} opacity={glow} />
      <g transform={`rotate(${spin})`}>
        {Array.from({length: 24}).map((_, i) => (
          <line
            key={i}
            x1={0}
            y1={-(r + 10)}
            x2={0}
            y2={-(r + (i % 6 === 0 ? 22 : 16))}
            stroke={color}
            strokeOpacity={i % 6 === 0 ? 0.9 : 0.4}
            strokeWidth={i % 6 === 0 ? 3 : 1.5}
            transform={`rotate(${i * 15})`}
          />
        ))}
      </g>
      <circle r={r} fill="#0f0c09" stroke={color} strokeWidth={4} strokeDasharray={dashed ? '8 8' : undefined} />
      <circle r={r - 12} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="3 6" />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        y={r * 0.04}
        style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: r * 1.05}}
        fill={C.ink}
      >
        {ch}
      </text>
    </g>
  );
};

/** 抖音式互动图标 */
export const Icon: React.FC<{kind: 'like' | 'comment' | 'star' | 'share'; color: string}> = ({kind, color}) => {
  const common = {fill: 'none', stroke: color, strokeWidth: 5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};
  switch (kind) {
    case 'like':
      return <path d="M 0 22 C -34 0 -30 -26 -12 -26 C -4 -26 0 -18 0 -14 C 0 -18 4 -26 12 -26 C 30 -26 34 0 0 22 Z" {...common} fill={color} />;
    case 'comment':
      return <path d="M -28 -22 H 28 Q 34 -22 34 -16 V 10 Q 34 16 28 16 H -4 L -18 28 V 16 H -28 Q -34 16 -34 10 V -16 Q -34 -22 -28 -22 Z" {...common} />;
    case 'star':
      return <path d="M 0 -28 L 8 -9 L 28 -8 L 13 6 L 18 26 L 0 15 L -18 26 L -13 6 L -28 -8 L -8 -9 Z" {...common} />;
    default:
      return <path d="M -24 20 Q -22 -8 10 -8 V -24 L 32 -2 L 10 20 V 6 Q -10 6 -24 20 Z" {...common} />;
  }
};

/** 印章：砸下来的旋转方章 */
export const Stamp: React.FC<{text: string; color: string; p: number; size?: number; rotate?: number; sub?: string}> = ({
  text,
  color,
  p,
  size = 1,
  rotate = -10,
  sub,
}) => {
  if (p <= 0) return null;
  const s = (2.3 - 1.3 * Math.min(1, p)) * size;
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: `${14 * size}px ${30 * size}px`,
        border: `${5 * size}px solid ${color}`,
        borderRadius: 14 * size,
        background: 'rgba(14,10,7,0.88)',
        boxShadow: `0 0 ${40 * size}px ${color}66`,
        transform: `rotate(${rotate}deg) scale(${s / size})`,
        opacity: Math.min(1, p * 2),
      }}
    >
      <span style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 64 * size, color, lineHeight: 1.1, whiteSpace: 'nowrap'}}>{text}</span>
      {sub ? (
        <span style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 20 * size, color, letterSpacing: '0.3em', marginTop: 4}}>{sub}</span>
      ) : null}
    </div>
  );
};
