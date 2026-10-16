/**
 * 凯恩斯的“报纸选美”：一墙抽象的脸（几何图形拼成，不对应任何真人）
 * highlight：被选中的格子及其描边颜色（第 1 / 2 / 3 层的选择用不同颜色）
 */
import React from 'react';
import {hash} from '../lib/anim';
import {C} from '../theme';

const BG = ['#2a2233', '#1f2b33', '#33261f', '#202b25', '#2d2030', '#262626'];
const SKIN = ['#e8c4a0', '#d9a77f', '#b98560', '#f0d2b4', '#a87455', '#cfa184'];
const HAIR = ['#1b1512', '#3b2618', '#6b4528', '#c79a5a', '#2c2c34', '#8a3a2a'];

const Face: React.FC<{i: number; size: number}> = ({i, size}) => {
  const h = (k: number) => hash(i * 9.13 + k * 3.7);
  const bg = BG[Math.floor(h(1) * BG.length)];
  const skin = SKIN[Math.floor(h(2) * SKIN.length)];
  const hair = HAIR[Math.floor(h(3) * HAIR.length)];
  const style = Math.floor(h(4) * 4);
  const mouth = h(5);
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100">
      <rect x={-50} y={-50} width={100} height={100} rx={12} fill={bg} />
      {/* 头发（背面） */}
      {style === 1 ? <path d="M -30 -6 C -34 30 -20 46 0 46 C 20 46 34 30 30 -6 Z" fill={hair} /> : null}
      {style === 3 ? <circle cy={-8} r={34} fill={hair} /> : null}
      {/* 肩膀 */}
      <path d="M -40 52 C -38 32 -22 26 0 26 C 22 26 38 32 40 52 Z" fill={hair} opacity={0.55} />
      {/* 脸 */}
      <ellipse cy={-4} rx={22} ry={26} fill={skin} />
      {/* 头发（前面） */}
      {style === 0 ? <path d="M -24 -12 C -22 -36 22 -36 24 -12 C 14 -22 -10 -24 -24 -12 Z" fill={hair} /> : null}
      {style === 1 ? <path d="M -24 -10 C -20 -38 20 -38 24 -10 C 10 -26 -10 -26 -24 -10 Z" fill={hair} /> : null}
      {style === 2 ? <path d="M -23 -14 C -18 -34 18 -34 23 -14 L 20 -20 C 8 -28 -8 -28 -20 -20 Z" fill={hair} /> : null}
      {/* 眼睛与嘴 */}
      <circle cx={-8} cy={-6} r={2.6} fill="#1a1412" />
      <circle cx={8} cy={-6} r={2.6} fill="#1a1412" />
      <path d={`M -7 ${10} Q 0 ${10 + 4 + mouth * 4} 7 ${10}`} stroke="#7a3b30" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </svg>
  );
};

export const Faces: React.FC<{
  cols: number;
  rows: number;
  size: number;
  gap: number;
  highlight: Map<number, {color: string; p: number}>;
  p: number;
}> = ({cols, rows, size, gap, highlight, p}) => {
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const appear = Math.min(1, Math.max(0, p * (cols * rows) * 0.12 - (r + c) * 0.25));
    const hl = highlight.get(i);
    const hp = hl ? hl.p : 0;
    cells.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: c * (size + gap),
          top: r * (size + gap),
          width: size,
          height: size,
          borderRadius: 12,
          opacity: appear * (hl ? 1 : 1 - 0.45 * Math.max(...[...highlight.values()].map((v) => v.p), 0)),
          transform: `scale(${(0.85 + 0.15 * appear) * (1 + 0.06 * hp)})`,
          boxShadow: hl && hp > 0 ? `0 0 0 ${4 * hp}px ${hl.color}, 0 0 ${30 * hp}px ${hl.color}aa` : 'none',
        }}
      >
        <Face i={i} size={size} />
      </div>,
    );
  }
  return <div style={{position: 'relative', width: cols * (size + gap) - gap, height: rows * (size + gap) - gap}}>{cells}</div>;
};

/** 简单的“对勾”角标 */
export const Corner: React.FC<{color: string}> = ({color}) => (
  <svg width={34} height={34} viewBox="0 0 34 34">
    <circle cx={17} cy={17} r={16} fill={color} />
    <path d="M 9 17 L 15 23 L 26 11" stroke={C.bg} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
