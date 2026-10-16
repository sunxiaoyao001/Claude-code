/**
 * 1:41 升华 + 评论区互动
 *  ① 三国鼎立 / 商战 / 职场 / 江湖 —— 三维漂浮的描边大字
 *  ② “最强的人是所有人的靶子” —— 四面八方的准星锁定同一枚徽章
 *  ③ “真正的高手知道什么时候不开枪” —— 丙的金色徽章与冲天光柱
 *  ④ 片尾金句 + 互动按钮
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {KineticText} from '../components/KineticText';
import {ease, envelope, hash, prog} from '../lib/anim';
import {C, FONT, PLAYERS} from '../theme';

const WORDS = [
  {t: '三国鼎立', x: 540, y: 470, at: 3036, size: 136},
  {t: '商战', x: 770, y: 710, at: 3050, size: 160},
  {t: '职场', x: 310, y: 900, at: 3064, size: 160},
  {t: '江湖', x: 720, y: 1080, at: 3078, size: 116},
];

const FloatingWords: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 3032, 3126, 10, 14);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{perspective: 900, opacity: o}}>
      {WORDS.map((w, i) => {
        const p = prog(frame, w.at, w.at + 16, ease.out);
        const z = interpolate(frame, [w.at, 3130], [-500, 160]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: w.x,
              top: w.y,
              transform: `translate(-50%, -50%) translateZ(${z}px) rotateY(${(i % 2 ? -1 : 1) * 14}deg)`,
              fontFamily: FONT.serif,
              fontWeight: 900,
              fontSize: w.size,
              color: 'transparent',
              WebkitTextStroke: `2px ${i === 0 ? C.gold : C.ink}`,
              opacity: p * 0.75,
              whiteSpace: 'nowrap',
              letterSpacing: '0.08em',
              textShadow: i === 0 ? `0 0 40px ${C.gold}55` : undefined,
            }}
          >
            {w.t}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** 一枚简化版徽章（与决斗场里的同一视觉语言） */
const MiniMedal: React.FC<{name: string; color: string; r: number}> = ({name, color, r}) => (
  <g>
    <circle r={r * 1.8} fill={`url(#mm-aura-${color.slice(1)})`} />
    <circle r={r} fill="#0f0c09" stroke={color} strokeWidth={5} />
    <circle r={r - 16} fill="none" stroke={color} strokeOpacity={0.4} strokeWidth={2} strokeDasharray="3 7" />
    <text textAnchor="middle" dominantBaseline="central" y={4} style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: r * 1.05}} fill={C.ink}>
      {name}
    </text>
    <defs>
      <radialGradient id={`mm-aura-${color.slice(1)}`}>
        <stop offset="0%" stopColor={color} stopOpacity={0.5} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </radialGradient>
    </defs>
  </g>
);

const TargetOfAll: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 3124, 3212, 10, 12);
  if (o <= 0) return null;
  const cx = 540;
  const cy = 740;
  const n = 8;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920}>
        {Array.from({length: n}).map((_, i) => {
          const a = (i / n) * Math.PI * 2 + 0.3;
          const p = prog(frame, 3130 + i * 3, 3150 + i * 3, ease.out);
          const far = 900;
          const sx = cx + Math.cos(a) * far;
          const sy = cy + Math.sin(a) * far;
          const ex = cx + Math.cos(a) * 150;
          const ey = cy + Math.sin(a) * 150;
          const col = [C.blue, C.gold, C.ink][i % 3];
          return (
            <line
              key={i}
              x1={sx}
              y1={sy}
              x2={sx + (ex - sx) * p}
              y2={sy + (ey - sy) * p}
              stroke={col}
              strokeWidth={3}
              strokeOpacity={0.7}
              strokeDasharray="4 10"
              strokeDashoffset={-frame * 3}
            />
          );
        })}
        <g transform={`translate(${cx}, ${cy}) scale(${interpolate(prog(frame, 3126, 3142, ease.back), [0, 1], [0.6, 1])})`}>
          <MiniMedal name={PLAYERS.jia.name} color={C.red} r={120} />
          {/* 层层收紧的准星 */}
          {[0, 1, 2].map((k) => {
            const lp = prog(frame, 3146 + k * 8, 3160 + k * 8, ease.out);
            const r = 300 - lp * (110 - k * 22);
            return (
              <g key={k} transform={`rotate(${frame * (k % 2 ? -1.5 : 1.5) + k * 30})`} opacity={lp}>
                {[0, 90, 180, 270].map((ang) => (
                  <path
                    key={ang}
                    transform={`rotate(${ang})`}
                    d={`M ${r * Math.cos(-0.4)} ${r * Math.sin(-0.4)} A ${r} ${r} 0 0 1 ${r * Math.cos(0.4)} ${r * Math.sin(0.4)}`}
                    stroke={C.red}
                    strokeWidth={5 - k}
                    fill="none"
                    strokeLinecap="round"
                  />
                ))}
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

const QuietMaster: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 3208, 3296, 12, 12);
  if (o <= 0) return null;
  const cx = 540;
  const cy = 820;
  const beam = prog(frame, 3220, 3250, ease.out);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920}>
        <defs>
          <linearGradient id="qm-beam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={C.goldHot} stopOpacity={0.95} />
            <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect x={cx - 6} y={cy - 120 - 900 * beam} width={12} height={900 * beam} fill="url(#qm-beam)" />
        <rect x={cx - 40} y={cy - 120 - 900 * beam} width={80} height={900 * beam} fill="url(#qm-beam)" opacity={0.25} />
        <g transform={`translate(${cx}, ${cy})`}>
          <circle r={190 + Math.sin(frame * 0.12) * 6} fill="none" stroke={C.gold} strokeWidth={2} strokeDasharray="4 14" transform={`rotate(${frame})`} />
          <MiniMedal name={PLAYERS.bing.name} color={C.gold} r={120} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/* ---------------- 片尾 ---------------- */
const Icon: React.FC<{kind: 'like' | 'comment' | 'star' | 'share'; color: string}> = ({kind, color}) => {
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

const EndCard: React.FC<{frame: number}> = ({frame}) => {
  if (frame < 3292) return null;
  const icons = [
    {k: 'like' as const, t: '点赞', c: C.red},
    {k: 'comment' as const, t: '评论', c: C.gold},
    {k: 'star' as const, t: '收藏', c: C.ink},
    {k: 'share' as const, t: '转发', c: C.ink},
  ];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 470, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20}}>
        <KineticText text="不必急着成为最强的人" frame={frame - 3294} duration={400} size={76} font={FONT.serif} weight={900} mode="slam" stagger={1.8} />
        <KineticText
          text="<g>先成为活到最后的人</g>"
          frame={frame - 3318}
          duration={400}
          size={92}
          font={FONT.serif}
          weight={900}
          mode="slam"
          stagger={2}
        />
      </div>
      <div style={{position: 'absolute', top: 860, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 64}}>
        {icons.map((ic, i) => {
          const p = prog(frame, 3346 + i * 5, 3358 + i * 5, ease.back);
          const pulse = ic.k === 'comment' ? 1 + 0.08 * Math.sin(frame * 0.3) : 1;
          return (
            <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: Math.min(1, p), transform: `scale(${p * pulse})`}}>
              <div
                style={{
                  width: 116,
                  height: 116,
                  borderRadius: 58,
                  border: `2px solid ${ic.k === 'comment' ? C.gold : C.inkFaint}`,
                  background: 'rgba(14,10,7,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: ic.k === 'comment' ? `0 0 40px ${C.gold}66` : 'none',
                }}
              >
                <svg width={80} height={80} viewBox="-40 -40 80 80">
                  <Icon kind={ic.k} color={ic.c} />
                </svg>
              </div>
              <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 28, color: C.inkDim, letterSpacing: '0.1em'}}>{ic.t}</div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1090,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT.sans,
          fontWeight: 500,
          fontSize: 30,
          color: C.inkDim,
          letterSpacing: '0.12em',
          opacity: prog(frame, 3372, 3386),
        }}
      >
        <span style={{fontFamily: FONT.mono, color: C.gold, marginRight: 14}}>NEXT</span>下期拆解：囚徒困境
      </div>
    </AbsoluteFill>
  );
};

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 3028) return null;
  // 片尾：轻微的金色余烬
  return (
    <AbsoluteFill>
      <FloatingWords frame={frame} />
      <TargetOfAll frame={frame} />
      <QuietMaster frame={frame} />
      <EndCard frame={frame} />
      {frame > 3292
        ? Array.from({length: 40}).map((_, i) => {
            const t = (frame - 3292) / 30;
            const x = hash(i * 4.1) * 1080;
            const y = 1500 - ((t * (40 + hash(i) * 60) + hash(i * 2.2) * 1400) % 1400);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  background: C.goldHot,
                  boxShadow: `0 0 10px ${C.gold}`,
                  opacity: 0.4 + 0.4 * Math.sin(frame * 0.2 + i),
                }}
              />
            );
          })
        : null}
    </AbsoluteFill>
  );
};
