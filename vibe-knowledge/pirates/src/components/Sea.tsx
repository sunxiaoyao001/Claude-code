/**
 * 海与船：三层起伏的海浪（带月光倒影）、甲板与跳板、落水溅起的水花
 * 全部是 frame 的纯函数，画在 1080×1920 的整屏 SVG 坐标里。
 */
import React from 'react';
import {hash} from '../lib/anim';
import {C} from '../theme';

const wave = (y: number, amp: number, len: number, phase: number, bottom: number) => {
  let d = `M -20 ${bottom} L -20 ${y}`;
  for (let x = -20; x <= 1100; x += 20) d += ` L ${x} ${(y + Math.sin(x / len + phase) * amp + Math.sin(x / (len * 0.37) + phase * 1.7) * amp * 0.3).toFixed(1)}`;
  return d + ` L 1100 ${bottom} Z`;
};

export const Sea: React.FC<{y: number; frame: number; bottom?: number; opacity?: number}> = ({y, frame, bottom = 1240, opacity = 1}) => {
  const t = frame / 30;
  return (
    <g opacity={opacity}>
      <defs>
        <linearGradient id="sea-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#123d58" stopOpacity={0.95} />
          <stop offset="100%" stopColor="#05121c" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={wave(y - 14, 9, 70, t * 0.9, bottom)} fill="#2b6f96" opacity={0.45} />
      <path d={wave(y, 11, 95, -t * 1.2 + 1, bottom)} fill="#1f5f86" opacity={0.7} />
      <path d={wave(y + 18, 8, 120, t * 0.7 + 2, bottom)} fill="url(#sea-fade)" />
      {/* 月光倒影 */}
      {Array.from({length: 9}).map((_, i) => (
        <ellipse
          key={i}
          cx={780 + Math.sin(t * 1.3 + i) * 10}
          cy={y + 12 + i * 22}
          rx={70 - i * 6}
          ry={3}
          fill={C.goldHot}
          opacity={(0.35 - i * 0.035) * (0.6 + 0.4 * Math.sin(t * 3 + i * 1.7))}
        />
      ))}
    </g>
  );
};

/** 甲板 + 船舷 + 伸向海面的跳板 */
export const Deck: React.FC<{y: number; plank?: number}> = ({y, plank = 1}) => (
  <g>
    {/* 船舷 */}
    <path d={`M 20 ${y + 24} L 860 ${y + 24} Q 850 ${y + 110} 780 ${y + 150} L 60 ${y + 150} Q 30 ${y + 90} 20 ${y + 24} Z`} fill="#2a1a10" stroke={C.wood} strokeOpacity={0.6} strokeWidth={2} />
    {[0, 1, 2].map((k) => (
      <line key={k} x1={40 + k * 6} x2={850 - k * 12} y1={y + 52 + k * 30} y2={y + 52 + k * 30} stroke={C.wood} strokeOpacity={0.35} strokeWidth={2} />
    ))}
    {/* 甲板 */}
    <rect x={20} y={y} width={840} height={24} rx={4} fill={C.wood} />
    {Array.from({length: 14}).map((_, k) => (
      <line key={k} x1={20 + k * 60} x2={20 + k * 60} y1={y + 2} y2={y + 22} stroke="#5b3a22" strokeWidth={2} />
    ))}
    {/* 栏杆 */}
    {Array.from({length: 8}).map((_, k) => (
      <line key={k} x1={40 + k * 110} x2={40 + k * 110} y1={y} y2={y - 46} stroke={C.wood} strokeWidth={5} opacity={0.5} />
    ))}
    <line x1={40} x2={810} y1={y - 46} y2={y - 46} stroke={C.wood} strokeWidth={5} opacity={0.5} />
    {/* 跳板 */}
    <g opacity={plank}>
      <rect x={840} y={y + 4} width={210 * plank} height={14} rx={3} fill={C.woodHot} />
      <line x1={850} x2={850 + 190 * plank} y1={y + 11} y2={y + 11} stroke="#5b3a22" strokeWidth={2} />
    </g>
  </g>
);

/** 落水：水花 + 涟漪（p：0 → 1） */
export const Splash: React.FC<{x: number; y: number; p: number}> = ({x, y, p}) => {
  if (p <= 0 || p >= 1) return null;
  return (
    <g>
      {[0, 1, 2].map((k) => {
        const q = Math.max(0, Math.min(1, p * 1.4 - k * 0.15));
        return <ellipse key={k} cx={x} cy={y} rx={30 + 160 * q} ry={8 + 30 * q} fill="none" stroke={C.seaHot} strokeWidth={4 * (1 - q)} opacity={1 - q} />;
      })}
      {Array.from({length: 22}).map((_, i) => {
        const a = -Math.PI / 2 + (hash(i * 2.1) - 0.5) * 2.2;
        const v = 260 + hash(i * 5.3) * 380;
        const tt = p * 0.9;
        const dx = Math.cos(a) * v * tt;
        const dy = Math.sin(a) * v * tt + 900 * tt * tt;
        return <circle key={i} cx={x + dx} cy={y + dy} r={4 + hash(i) * 7} fill={C.seaHot} opacity={(1 - p) * 0.9} />;
      })}
    </g>
  );
};
