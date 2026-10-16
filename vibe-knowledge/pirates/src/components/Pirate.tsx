/**
 * 海盗徽章：圆形徽章 + 三角海盗帽 + 编号；头顶可以冒出投票气泡（✓ 赞成 / ✗ 反对）
 * captain：船长（当前提方案的人），帽檐镶金并发光
 */
import React from 'react';
import {C, FONT} from '../theme';

export type Vote = 'yes' | 'no' | null;

export const Pirate: React.FC<{
  n: number | string;
  r?: number;
  color?: string;
  captain?: number;
  vote?: Vote;
  voteP?: number;
  dim?: number;
}> = ({n, r = 52, color = C.seaHot, captain = 0, vote = null, voteP = 0, dim = 0}) => {
  const trim = captain > 0 ? C.gold : color;
  const o = 1 - 0.6 * dim;
  return (
    <g opacity={o}>
      {/* 船长光晕 */}
      {captain > 0 ? <circle r={r * 1.9} fill={C.gold} opacity={0.12 * captain} style={{filter: 'blur(14px)'}} /> : null}
      {/* 身体（徽章） */}
      <circle r={r} fill="#120f0c" stroke={captain > 0 ? C.gold : color} strokeWidth={4 + 2 * captain} />
      <circle r={r - 10} fill="none" stroke={captain > 0 ? C.gold : color} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="3 6" />
      <text textAnchor="middle" dominantBaseline="central" y={r * 0.06} style={{fontFamily: FONT.num, fontWeight: 700, fontSize: r * 0.95}} fill={captain > 0 ? C.goldHot : C.ink}>
        {n}
      </text>
      {/* 三角海盗帽 */}
      <path
        d={`M ${-0.72 * r} ${-0.78 * r} Q ${-0.62 * r} ${-1.5 * r} 0 ${-1.46 * r} Q ${0.62 * r} ${-1.5 * r} ${0.72 * r} ${-0.78 * r} Z`}
        fill="#1a1410"
        stroke={trim}
        strokeWidth={3}
      />
      <path
        d={`M ${-1.18 * r} ${-0.62 * r} Q ${-0.5 * r} ${-1.02 * r} 0 ${-0.84 * r} Q ${0.5 * r} ${-1.02 * r} ${1.18 * r} ${-0.62 * r} Q ${0.6 * r} ${-0.6 * r} 0 ${-0.66 * r} Q ${-0.6 * r} ${-0.6 * r} ${-1.18 * r} ${-0.62 * r} Z`}
        fill="#1a1410"
        stroke={trim}
        strokeWidth={3}
      />
      {/* 帽子上的骷髅小徽 */}
      <circle cy={-1.14 * r} r={0.13 * r} fill={captain > 0 ? C.goldHot : C.ink} opacity={0.9} />
      <circle cx={-0.045 * r} cy={-1.15 * r} r={0.03 * r} fill="#1a1410" />
      <circle cx={0.045 * r} cy={-1.15 * r} r={0.03 * r} fill="#1a1410" />
      {/* 投票气泡 */}
      {vote && voteP > 0 ? (
        <g transform={`translate(0, ${-2.05 * r}) scale(${Math.min(1, voteP)})`}>
          <circle r={0.46 * r} fill={vote === 'yes' ? 'rgba(63,217,177,0.22)' : 'rgba(236,74,60,0.22)'} stroke={vote === 'yes' ? C.coop : C.red} strokeWidth={3} />
          {vote === 'yes' ? (
            <path d={`M ${-0.22 * r} 0 L ${-0.06 * r} ${0.16 * r} L ${0.24 * r} ${-0.16 * r}`} fill="none" stroke={C.coop} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d={`M ${-0.17 * r} ${-0.17 * r} L ${0.17 * r} ${0.17 * r} M ${0.17 * r} ${-0.17 * r} L ${-0.17 * r} ${0.17 * r}`} fill="none" stroke={C.red} strokeWidth={5} strokeLinecap="round" />
          )}
        </g>
      ) : null}
    </g>
  );
};
