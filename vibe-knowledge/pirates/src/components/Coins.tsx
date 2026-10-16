/**
 * 金币：正面的单枚金币、堆起来的金币柱（每层代表若干枚）
 */
import React from 'react';
import {C, FONT} from '../theme';

/** 正面金币（带“金”字压纹） */
export const Coin: React.FC<{x: number; y: number; r: number; spin?: number; opacity?: number}> = ({x, y, r, spin = 0, opacity = 1}) => {
  const sx = Math.max(0.08, Math.abs(Math.cos(spin)));
  return (
    <g transform={`translate(${x}, ${y}) scale(${sx}, 1)`} opacity={opacity}>
      <circle r={r} fill="#b9831f" />
      <circle r={r * 0.92} fill={C.gold} />
      <circle r={r * 0.72} fill="none" stroke="#b9831f" strokeWidth={Math.max(1, r * 0.08)} />
      <text textAnchor="middle" dominantBaseline="central" y={r * 0.04} style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: r * 0.9}} fill="#9c6a12">
        金
      </text>
      <ellipse cx={-r * 0.35} cy={-r * 0.4} rx={r * 0.25} ry={r * 0.12} fill="#fff" opacity={0.45} transform={`rotate(-30 ${-r * 0.35} ${-r * 0.4})`} />
    </g>
  );
};

/** 金币柱：从 (x, y) 往上叠，每层 unit 枚；amount = 0 时只画一个虚线托盘 */
export const CoinStack: React.FC<{x: number; y: number; amount: number; unit?: number; w?: number; slice?: number; p?: number}> = ({
  x,
  y,
  amount,
  unit = 5,
  w = 70,
  slice = 11,
  p = 1,
}) => {
  const layers = amount <= 0 ? 0 : Math.max(1, Math.ceil(amount / unit));
  const shown = Math.round(layers * Math.min(1, p));
  const ry = w * 0.2;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={w / 2 + 6} ry={ry + 3} fill="none" stroke={C.inkFaint} strokeWidth={2} strokeDasharray="4 5" />
      {Array.from({length: shown}).map((_, i) => {
        const cy = y - i * slice;
        return (
          <g key={i}>
            <rect x={x - w / 2} y={cy - slice} width={w} height={slice} fill="#b9831f" />
            <ellipse cx={x} cy={cy} rx={w / 2} ry={ry} fill="#a8741a" />
            <ellipse cx={x} cy={cy - slice} rx={w / 2} ry={ry} fill={i === shown - 1 ? C.goldHot : C.gold} stroke="#b9831f" strokeWidth={1.5} />
          </g>
        );
      })}
    </g>
  );
};
