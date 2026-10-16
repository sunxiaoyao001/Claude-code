/**
 * 拍卖行道具：拍品钞票、号码牌、拍卖槌、报价器
 * 钞票是风格化设计（扭索纹 + 大号 100），不模仿任何真实货币。
 */
import React from 'react';
import {interpolate} from 'remotion';
import {ease} from '../lib/anim';
import {C, FONT} from '../theme';

/* ---------------- 拍品：一张“100” ---------------- */
export const Banknote: React.FC<{
  frame: number;
  w?: number;
  spin?: number;
  glow?: number;
  label?: string;
  value?: string;
  corner?: string;
  color?: string;
}> = ({frame, w = 560, spin = 0, glow = 1, label = '壹佰', value = '100', corner = '100', color = C.coop}) => {
  const h = w * 0.46;
  const sheen = ((frame * 2.2) % 260) - 60; // 镭射高光扫过（百分比）
  const id = `bn-${Math.round(w)}-${color.slice(1)}`;
  return (
    <div style={{width: w, height: h, perspective: 1200}}>
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `rotateY(${spin}deg) rotateX(${Math.sin(frame * 0.04) * 4}deg)`,
          transformStyle: 'preserve-3d',
          borderRadius: w * 0.04,
          overflow: 'hidden',
          boxShadow: `0 ${w * 0.04}px ${w * 0.12}px rgba(0,0,0,0.6), 0 0 ${w * 0.18 * glow}px ${color}55`,
          position: 'relative',
        }}
      >
        <svg width={w} height={h} viewBox="0 0 560 258" style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0f3b33" />
              <stop offset="55%" stopColor="#14594a" />
              <stop offset="100%" stopColor="#0c2f29" />
            </linearGradient>
          </defs>
          <rect width={560} height={258} fill={`url(#${id}-bg)`} />
          {/* 扭索纹 */}
          {Array.from({length: 9}).map((_, i) => {
            let d = '';
            for (let x = 0; x <= 560; x += 8) {
              const y = 129 + Math.sin(x / 26 + i * 0.7) * (18 + i * 9) * Math.cos(x / 140 + i);
              d += `${x === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)} `;
            }
            return <path key={i} d={d} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={1.2} />;
          })}
          {/* 玫瑰花饰 */}
          <g transform="translate(150, 129)">
            {Array.from({length: 24}).map((_, i) => (
              <ellipse key={i} rx={78} ry={24} fill="none" stroke={color} strokeOpacity={0.22} strokeWidth={1} transform={`rotate(${i * 7.5})`} />
            ))}
          </g>
          <rect x={10} y={10} width={540} height={238} rx={14} fill="none" stroke={color} strokeOpacity={0.6} strokeWidth={2} />
          <rect x={18} y={18} width={524} height={222} rx={10} fill="none" stroke={color} strokeOpacity={0.25} strokeWidth={1} strokeDasharray="2 4" />
          <text x={36} y={58} style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 38}} fill={C.coopHot}>
            {corner}
          </text>
          <text x={524} y={58} textAnchor="end" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 38}} fill={C.coopHot}>
            {corner}
          </text>
          <text x={150} y={142} textAnchor="middle" dominantBaseline="central" style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 52}} fill={C.coopHot}>
            {label}
          </text>
          <text x={385} y={140} textAnchor="middle" dominantBaseline="central" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 132}} fill={C.ink}>
            {value}
          </text>
          <text x={524} y={232} textAnchor="end" style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 14, letterSpacing: '0.3em'}} fill={C.coopHot} opacity={0.75}>
            LOT 001 · 拍品
          </text>
        </svg>
        {/* 镭射高光 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(110deg, transparent ${sheen}%, rgba(255,255,255,0.22) ${sheen + 8}%, transparent ${sheen + 16}%)`,
          }}
        />
      </div>
    </div>
  );
};

/* ---------------- 号码牌 ---------------- */
export const Paddle: React.FC<{
  label: string;
  color: string;
  size?: number;
  raise?: number; // 0 放下 → 1 举起
  dim?: number;
  sub?: string;
}> = ({label, color, size = 120, raise = 0, dim = 0, sub}) => {
  const lift = ease.back(Math.min(1, Math.max(0, raise)));
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size * 2.1,
        transform: `translateY(${(1 - lift) * size * 0.55}px) rotate(${(1 - lift) * -14}deg)`,
        transformOrigin: '50% 100%',
        opacity: 1 - dim * 0.75,
      }}
    >
      {/* 手柄 */}
      <div
        style={{
          position: 'absolute',
          left: size * 0.43,
          top: size * 0.92,
          width: size * 0.14,
          height: size * 1.1,
          borderRadius: size * 0.07,
          background: 'linear-gradient(90deg, #3a2a1c, #6b4a2c 50%, #3a2a1c)',
        }}
      />
      {/* 牌面 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          background: `radial-gradient(circle at 35% 30%, #fff8ea, ${color} 70%)`,
          border: `${size * 0.04}px solid rgba(0,0,0,0.25)`,
          boxShadow: lift > 0.5 ? `0 0 ${size * 0.4}px ${color}88` : '0 8px 20px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1a1206',
        }}
      >
        <div style={{fontFamily: /^[0-9¥]/.test(label) ? FONT.num : FONT.serif, fontWeight: 900, fontSize: size * (label.length > 3 ? 0.3 : 0.42), lineHeight: 1}}>{label}</div>
        {sub ? <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: size * 0.14, marginTop: size * 0.04}}>{sub}</div> : null}
      </div>
    </div>
  );
};

/* ---------------- 拍卖槌 ---------------- */
export const Gavel: React.FC<{frame: number; strikeAt: number; size?: number}> = ({frame, strikeAt, size = 220}) => {
  // 抬起 → 砸下 → 回弹
  const d = frame - strikeAt;
  const angle = d < -10 ? -38 : d < 0 ? interpolate(d, [-10, 0], [-38, 8], {easing: ease.in}) : d < 8 ? interpolate(d, [0, 8], [8, -6], {easing: ease.out}) : -6;
  const ring = d >= 0 && d < 16 ? d / 16 : 0;
  return (
    <svg width={size * 1.6} height={size} viewBox="-160 -100 320 200" style={{overflow: 'visible'}}>
      {/* 底座 */}
      <ellipse cx={20} cy={78} rx={80} ry={16} fill="#2a1d12" />
      <rect x={-50} y={56} width={140} height={22} rx={8} fill="#5a3a22" />
      {ring > 0 ? <ellipse cx={20} cy={60} rx={60 + ring * 120} ry={14 + ring * 30} fill="none" stroke={C.amber} strokeWidth={4 * (1 - ring)} opacity={1 - ring} /> : null}
      <g transform={`rotate(${angle} 110 40)`}>
        {/* 槌柄 */}
        <rect x={-10} y={28} width={130} height={14} rx={7} fill="#6b4a2c" />
        {/* 槌头 */}
        <rect x={-40} y={-2} width={56} height={74} rx={12} fill="#7a5232" stroke="#3a2614" strokeWidth={3} />
        <rect x={-46} y={8} width={68} height={10} rx={4} fill={C.amber} opacity={0.85} />
        <rect x={-46} y={52} width={68} height={10} rx={4} fill={C.amber} opacity={0.85} />
      </g>
    </svg>
  );
};

/* ---------------- 报价器 ---------------- */
export const Ticker: React.FC<{value: number; label?: string; size?: number; face?: number}> = ({value, label = '最高出价', size = 150, face = 100}) => {
  const over = value > face;
  const col = over ? C.red : C.gold;
  return (
    <div style={{textAlign: 'center'}}>
      <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: size * 0.2, letterSpacing: '0.3em', color: C.inkDim}}>{label}</div>
      <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: size, lineHeight: 1.05, color: col, textShadow: `0 0 ${size * 0.4}px ${col}77`}}>
        <span style={{fontSize: size * 0.55, marginRight: size * 0.06}}>¥</span>
        {Math.round(value)}
      </div>
    </div>
  );
};

/** 打勾 */
export const Check: React.FC<{color: string; size?: number; p?: number}> = ({color, size = 48, p = 1}) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path d="M 8 26 L 20 37 L 41 12" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p} 1`} />
  </svg>
);

/** 叉 */
export const Cross: React.FC<{color: string; size?: number}> = ({color, size = 48}) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path d="M 12 12 L 36 36 M 36 12 L 12 36" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
  </svg>
);

