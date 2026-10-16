/**
 * 脑扫描：风格化的大脑侧视图（脑回线条 + 小脑 + 脑干），
 * 扫描线横向扫过，前脑岛（藏在外侧裂深处）按强度发出紫红到红色的光
 */
import React from 'react';
import {C, FONT} from '../theme';

const OUTLINE =
  'M 90 250 C 60 160 130 70 240 55 C 330 35 430 50 500 110 C 560 160 575 230 545 290 C 525 330 470 345 420 340 C 400 370 350 385 300 375 C 250 395 180 380 140 340 C 105 315 95 285 90 250 Z';
const CEREBELLUM = 'M 420 340 C 470 345 522 362 515 398 C 505 432 440 436 405 410 C 386 395 395 352 420 340 Z';
const STEM = 'M 330 372 C 338 410 344 440 338 474 L 372 474 C 372 440 376 404 384 378';
const GYRI = [
  'M 170 290 C 240 255 300 246 380 232', // 外侧裂
  'M 330 62 C 316 120 302 172 292 240', // 中央沟
  'M 140 170 C 170 150 200 160 220 140 C 240 120 270 130 290 110',
  'M 120 230 C 150 210 175 225 200 205 C 225 185 250 200 270 180',
  'M 380 80 C 400 120 430 120 450 150 C 470 180 500 175 520 200',
  'M 360 150 C 390 170 420 165 440 195 C 460 225 500 225 530 250',
  'M 200 330 C 230 310 260 320 290 305 C 320 290 350 300 380 290',
  'M 410 255 C 440 270 470 262 500 280',
  'M 230 90 C 250 120 240 150 260 175',
];

export const Brain: React.FC<{
  frame: number;
  /** 前脑岛亮度 0~1 */
  insula: number;
  /** 扫描线位置 0~1（<0 不显示） */
  scan: number;
  w?: number;
  label?: boolean;
  /** 标签下方的补充说明（如“拒绝时 · 反应更强”） */
  note?: string;
  noteP?: number;
}> = ({frame, insula, scan, w = 760, label = true, note, noteP = 0}) => {
  const s = w / 600;
  const pulse = 0.85 + 0.15 * Math.sin(frame * 0.35);
  return (
    <svg width={w} height={500 * s} viewBox="0 0 600 500" style={{overflow: 'visible'}}>
      <defs>
        <radialGradient id="insula-glow">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.95} />
          <stop offset="25%" stopColor={C.red} stopOpacity={0.9} />
          <stop offset="60%" stopColor={C.scan} stopOpacity={0.45} />
          <stop offset="100%" stopColor={C.scan} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="brain-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a1a2a" />
          <stop offset="100%" stopColor="#140c16" />
        </linearGradient>
        <clipPath id="brain-clip">
          <path d={OUTLINE} />
          <path d={CEREBELLUM} />
        </clipPath>
      </defs>
      {/* HUD 圆环 */}
      <circle cx={300} cy={240} r={270} fill="none" stroke={C.scan} strokeOpacity={0.18} strokeWidth={1.5} strokeDasharray="4 10" transform={`rotate(${frame * 0.3} 300 240)`} />
      <circle cx={300} cy={240} r={240} fill="none" stroke={C.scan} strokeOpacity={0.1} strokeWidth={1} />
      <path d={OUTLINE} fill="url(#brain-fill)" stroke={C.scan} strokeOpacity={0.75} strokeWidth={3} />
      <path d={CEREBELLUM} fill="url(#brain-fill)" stroke={C.scan} strokeOpacity={0.6} strokeWidth={2.5} />
      <path d={STEM} fill="none" stroke={C.scan} strokeOpacity={0.6} strokeWidth={2.5} />
      {GYRI.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={C.scan} strokeOpacity={i < 2 ? 0.55 : 0.28} strokeWidth={i < 2 ? 2.5 : 1.8} strokeLinecap="round" />
      ))}
      {/* 前脑岛 */}
      <g clipPath="url(#brain-clip)">
        <ellipse cx={282} cy={262} rx={95 * (0.6 + 0.4 * insula)} ry={58 * (0.6 + 0.4 * insula)} fill="url(#insula-glow)" opacity={insula * pulse} />
        {/* 扫描线 */}
        {scan >= 0 ? (
          <g>
            <rect x={60 + scan * 500} y={0} width={6} height={500} fill={C.scan} opacity={0.85} />
            <rect x={60 + scan * 500 - 70} y={0} width={70} height={500} fill={C.scan} opacity={0.12} />
          </g>
        ) : null}
      </g>
      {label && insula > 0.05 ? (
        <g opacity={Math.min(1, insula * 1.5)}>
          <line x1={282} y1={262} x2={430} y2={470} stroke={C.ink} strokeWidth={2} strokeOpacity={0.7} />
          <circle cx={282} cy={262} r={6} fill="#fff" />
          <text x={436} y={480} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28}} fill={C.ink}>
            前脑岛
          </text>
          <text x={436} y={510} style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 16, letterSpacing: '0.1em'}} fill={C.inkDim}>
            ANTERIOR INSULA
          </text>
        </g>
      ) : null}
      {note && noteP > 0 ? (
        <text x={436} y={548} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28}} fill={C.redHot} opacity={noteP}>
          {note}
        </text>
      ) : null}
    </svg>
  );
};
