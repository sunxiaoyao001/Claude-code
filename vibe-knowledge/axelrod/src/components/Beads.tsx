/**
 * 出招珠串：两行珠子，青 = 合作，红 = 背叛
 * 每颗珠子按回合依次点亮；可画出“照抄上一步”的斜向箭头；可标出“手滑”的那一颗；
 * 右侧实时累计得分。
 */
import React from 'react';
import {ease, prog} from '../lib/anim';
import {payoff, type Move} from '../math/ipd';
import {C, FONT, MOVE_COLOR} from '../theme';

type Row = {label: string; moves: Move[]; color: string};

type Props = {
  frame: number;
  x: number;
  y: number;
  top: Row;
  bottom: Row;
  /** 第一颗珠子出现的帧、每颗之间间隔多少帧 */
  start: number;
  step?: number;
  size?: number;
  gap?: number;
  /** 画出“下方第 i 颗 → 上方第 i+1 颗”的照抄箭头 */
  echoArrows?: boolean;
  /** 被标记的珠子（如手滑）：[行, 序号] */
  marks?: {row: 'top' | 'bottom'; i: number; label: string; color?: string}[];
  /** 高亮某一列 */
  focus?: number;
  showScore?: boolean;
  opacity?: number;
};

export const BEAD_LABEL_W = 210;

export const Beads: React.FC<Props> = ({
  frame,
  x,
  y,
  top,
  bottom,
  start,
  step = 4,
  size = 48,
  gap = 14,
  echoArrows,
  marks = [],
  focus,
  showScore = true,
  opacity = 1,
}) => {
  const n = top.moves.length;
  const rowGap = size * 1.9;
  const pitch = size + gap;
  const shown = Math.max(0, Math.min(n, Math.floor((frame - start) / step) + 1));
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < shown; i++) {
    const [pa, pb] = payoff(top.moves[i], bottom.moves[i]);
    sa += pa;
    sb += pb;
  }
  const bead = (m: Move, i: number, row: 'top' | 'bottom') => {
    const appear = start + i * step;
    const p = prog(frame, appear, appear + 6, ease.back);
    if (p <= 0) return null;
    const cx = BEAD_LABEL_W + i * pitch + size / 2;
    const cy = row === 'top' ? size / 2 : size / 2 + rowGap;
    const col = MOVE_COLOR[m];
    const isFocus = focus === i;
    return (
      <g key={`${row}-${i}`} transform={`translate(${cx}, ${cy}) scale(${p})`}>
        <circle r={size / 2 + 8} fill={col} opacity={isFocus ? 0.35 : 0.12} />
        <circle r={size / 2} fill={m === 'C' ? col : 'rgba(30,8,6,0.9)'} stroke={col} strokeWidth={4} />
        {m === 'D' ? <path d={`M ${-size * 0.18} ${-size * 0.18} L ${size * 0.18} ${size * 0.18} M ${size * 0.18} ${-size * 0.18} L ${-size * 0.18} ${size * 0.18}`} stroke={col} strokeWidth={5} strokeLinecap="round" /> : null}
      </g>
    );
  };
  const width = BEAD_LABEL_W + n * pitch + 180;

  return (
    <svg
      width={width}
      height={rowGap + size + 60}
      style={{position: 'absolute', left: x, top: y, overflow: 'visible', opacity}}
    >
      {/* 行标签 */}
      {[top, bottom].map((r, k) => (
        <text
          key={k}
          x={BEAD_LABEL_W - 28}
          y={size / 2 + k * rowGap}
          textAnchor="end"
          dominantBaseline="central"
          style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 32}}
          fill={r.color}
        >
          {r.label}
        </text>
      ))}
      {/* 照抄箭头：对手第 i 步 → 我第 i+1 步 */}
      {echoArrows
        ? bottom.moves.slice(0, n - 1).map((m, i) => {
            const t = start + (i + 1) * step;
            const p = prog(frame, t - 2, t + 4, ease.out);
            if (p <= 0) return null;
            const x1 = BEAD_LABEL_W + i * pitch + size / 2;
            const y1 = rowGap + 4;
            const x2 = BEAD_LABEL_W + (i + 1) * pitch + size / 2;
            const y2 = size - 4;
            return (
              <line
                key={`a${i}`}
                x1={x1}
                y1={y1}
                x2={x1 + (x2 - x1) * p}
                y2={y1 + (y2 - y1) * p}
                stroke={MOVE_COLOR[m]}
                strokeWidth={3}
                strokeOpacity={0.55}
                strokeDasharray="5 6"
              />
            );
          })
        : null}
      {top.moves.map((m, i) => bead(m, i, 'top'))}
      {bottom.moves.map((m, i) => bead(m, i, 'bottom'))}
      {/* 标记 */}
      {marks.map((mk, k) => {
        const appear = start + mk.i * step;
        const p = prog(frame, appear + 4, appear + 12, ease.out);
        if (p <= 0) return null;
        const cx = BEAD_LABEL_W + mk.i * pitch + size / 2;
        const cy = mk.row === 'top' ? size / 2 : size / 2 + rowGap;
        const col = mk.color ?? C.gold;
        return (
          <g key={`m${k}`} opacity={p}>
            <circle cx={cx} cy={cy} r={size / 2 + 14 + (1 - p) * 20} fill="none" stroke={col} strokeWidth={3} strokeDasharray="4 6" />
            <text
              x={cx}
              y={mk.row === 'top' ? cy - size / 2 - 26 : cy + size / 2 + 40}
              textAnchor="middle"
              style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 26}}
              fill={col}
            >
              {mk.label}
            </text>
          </g>
        );
      })}
      {/* 累计得分 */}
      {showScore && shown > 0
        ? [sa, sb].map((s, k) => (
            <text
              key={`s${k}`}
              x={BEAD_LABEL_W + n * pitch + 30}
              y={size / 2 + k * rowGap}
              dominantBaseline="central"
              style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 44}}
              fill={k === 0 ? top.color : bottom.color}
            >
              {s}
            </text>
          ))
        : null}
    </svg>
  );
};
