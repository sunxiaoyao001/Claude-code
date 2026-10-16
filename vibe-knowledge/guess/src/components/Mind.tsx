/**
 * 套娃思维（Droste 效应）：“我想 → 他想 → 我想他想……”
 * ------------------------------------------------------------
 * 每一层是一个半身像 + 思考气泡，气泡里装着缩小 s 倍的下一层（更“天真”的人）。
 * 第 0 层在最里面（随便选），第 k 层的人以为别人都在第 k−1 层，于是选 50 × (2/3)^k。
 * 镜头沿着层级连续“拉远”：t 从 0 增加到 k，第 k 层始终停在焦点位置，
 * 里面的层一圈圈缩进气泡深处，收敛到一个点——那里就是 0。
 *
 * 推导：第 j 层相对焦点的缩放 r = s^(t−j)，位移 = L·(1 − r)，其中 L = O / (1 − s) 是收敛点。
 */
import React from 'react';
import {levelValue} from '../math/guess';
import {C, FONT} from '../theme';

/** 局部坐标（单位尺寸）下的几何 */
const HEAD_R = 62;
const SHOULDERS = 'M -125 205 C -125 125 -75 98 -32 90 L 32 90 C 75 98 125 125 125 205 Z';
const BUBBLE = {x: 235, y: -305, r: 195};
const S = 0.42; // 每进一层的缩放
/** 下一层在本层坐标里的原点：让下一层的包围盒中心落在气泡中心 */
const BBOX_C = {x: (-125 + BUBBLE.x + BUBBLE.r) / 2, y: (BUBBLE.y - BUBBLE.r + 205) / 2};
const O = {x: BUBBLE.x - S * BBOX_C.x, y: BUBBLE.y - S * BBOX_C.y};
/** 无穷多层的收敛点 */
export const LIMIT = {x: O.x / (1 - S), y: O.y / (1 - S)};

/** 胸前显示的数字：前几层取整（与字幕一致），之后保留一位小数 */
export const levelLabel = (j: number) => {
  if (j === 0) return '50';
  const v = levelValue(j);
  return j <= 5 ? String(Math.round(v)) : v.toFixed(1);
};

const levelColor = (j: number) => (j === 0 ? C.blue : C.gold);

/** 单层：半身像 + 思考气泡 */
const Bust: React.FC<{j: number; focus: number; frame: number}> = ({j, focus, frame}) => {
  const col = levelColor(j);
  const glow = 0.25 + 0.75 * focus;
  return (
    <g>
      {/* 气泡 */}
      <circle cx={62} cy={-62} r={9} fill="none" stroke={col} strokeOpacity={0.5 * glow} strokeWidth={3} />
      <circle cx={95} cy={-104} r={15} fill="none" stroke={col} strokeOpacity={0.55 * glow} strokeWidth={3} />
      <circle cx={BUBBLE.x} cy={BUBBLE.y} r={BUBBLE.r} fill="rgba(10,12,20,0.55)" stroke={col} strokeOpacity={0.6 * glow} strokeWidth={4} />
      {/* 半身像 */}
      <path d={SHOULDERS} fill="rgba(16,14,20,0.95)" stroke={col} strokeOpacity={0.9 * glow} strokeWidth={4} />
      <circle r={HEAD_R} fill="rgba(16,14,20,0.95)" stroke={col} strokeOpacity={0.9 * glow} strokeWidth={4} />
      {j === 0 ? (
        // 第 0 层：脑袋里的数字随机跳动
        <text y={20} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 56}} fill={col} opacity={glow}>
          {[37, 81, 12, 64, 50, 93, 28, 71][Math.floor(frame / 4) % 8]}
        </text>
      ) : (
        // 头上写层级：L1、L2……
        <text y={20} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 52}} fill={col} opacity={glow}>
          L{j}
        </text>
      )}
      <text y={178} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 70}} fill={col} opacity={glow}>
        {levelLabel(j)}
      </text>
    </g>
  );
};

/**
 * @param t 连续的层级位置（0 = 聚焦第 0 层）
 * @param fx/fy 焦点层头部中心在屏幕上的位置；g 为焦点层的显示缩放
 */
export const Mind: React.FC<{
  t: number;
  fx: number;
  fy: number;
  g: number;
  frame: number;
  maxLevel?: number;
  fade?: number;
  /** 画面下方在这个 y 处完全淡出，给字幕让位（外层半身像放大时会从左下角进入） */
  fadeBottom?: number;
}> = ({t, fx, fy, g, frame, maxLevel = 16, fade = 1, fadeBottom = 1235}) => {
  const items: React.ReactNode[] = [];
  // 从外到内画：外层大、在下面；内层小、叠在上面
  for (let j = maxLevel; j >= 0; j--) {
    const r = Math.pow(S, t - j);
    if (r > 6 || r < 0.012) continue;
    const x = fx + g * LIMIT.x * (1 - r);
    const y = fy + g * LIMIT.y * (1 - r);
    const focus = Math.max(0, 1 - Math.abs(t - j));
    // 太小的内层淡出；比焦点大的外层很快淡出（否则巨大的气泡轮廓会横穿整个画面）
    const o = Math.min(1, r / 0.03) * (r > 1.15 ? Math.max(0, 1 - (r - 1.15) / 0.5) : 1);
    items.push(
      <g key={j} transform={`translate(${x}, ${y}) scale(${g * r})`} opacity={o * fade}>
        <Bust j={j} focus={focus} frame={frame} />
      </g>,
    );
  }
  return (
    <g>
      <defs>
        <linearGradient id="mind-fade" gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={1920}>
          <stop offset={(fadeBottom - 105) / 1920} stopColor="#fff" />
          <stop offset={fadeBottom / 1920} stopColor="#000" />
        </linearGradient>
        <mask id="mind-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
          <rect x={-200} y={-200} width={1480} height={2320} fill="url(#mind-fade)" />
        </mask>
      </defs>
      <g mask="url(#mind-mask)">{items}</g>
    </g>
  );
};

/** 不带气泡的小半身像：纳什均衡那一排“人人都选 0” */
export const MiniBust: React.FC<{head: string; chest: string; color: string; glow?: number}> = ({head, chest, color, glow = 1}) => (
  <g>
    <path d={SHOULDERS} fill="rgba(16,14,20,0.95)" stroke={color} strokeOpacity={0.9 * glow} strokeWidth={5} />
    <circle r={HEAD_R} fill="rgba(16,14,20,0.95)" stroke={color} strokeOpacity={0.9 * glow} strokeWidth={5} />
    <text y={20} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 52}} fill={color} opacity={glow}>
      {head}
    </text>
    <text y={178} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 76}} fill={color} opacity={glow}>
      {chest}
    </text>
  </g>
);
