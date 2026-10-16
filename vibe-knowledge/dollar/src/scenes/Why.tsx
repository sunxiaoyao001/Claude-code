/**
 * 1:17 原因：
 *  ① 下沉的台阶：每一级是你又喊的一口价，每一步都合理，一级级走进深坑；每走一级，一枚硬币掉进“沉没成本”
 *  ② 已投入计数器越滚越大
 *  ③ 目标被替换：“赚 100 元”被划掉 → “不能输给他”
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {KineticText} from '../components/KineticText';
import {Token} from '../components/Token';
import {ease, envelope, hash, prog} from '../lib/anim';
import {C, FONT} from '../theme';

const T0 = 2330;
const T1 = 2704;
const STEPS = 8;
const stepPos = (i: number) => ({x: 170 + i * 92, y: 470 + i * 80});
const STEP_EVERY = 16;
const START = 2350;

const Stairs: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2334, 2592, 10, 12);
  if (o <= 0) return null;
  const pos = Math.min(STEPS - 1, Math.max(0, (frame - START) / STEP_EVERY));
  const i0 = Math.floor(pos);
  const t = pos - i0;
  const a = stepPos(i0);
  const b = stepPos(Math.min(STEPS - 1, i0 + 1));
  const hop = Math.sin(Math.PI * t) * 40;
  const tx = a.x + (b.x - a.x) * ease.inOut(t);
  const ty = a.y + (b.y - a.y) * ease.inOut(t) - hop;
  const invested = 105 + Math.floor(pos) * 20;
  const sunk = prog(frame, 2414, 2430);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="pit">
            <stop offset="0%" stopColor="#000" stopOpacity={1} />
            <stop offset="60%" stopColor="#1a0503" stopOpacity={0.95} />
            <stop offset="100%" stopColor={C.red} stopOpacity={0} />
          </radialGradient>
        </defs>
        {/* 深坑 */}
        <ellipse cx={880} cy={1150} rx={250} ry={74} fill="url(#pit)" />
        <ellipse cx={880} cy={1150} rx={250} ry={74} fill="none" stroke={C.red} strokeOpacity={0.5} strokeWidth={3} />
        {/* 台阶 */}
        {Array.from({length: STEPS}).map((_, i) => {
          const p = stepPos(i);
          const appear = prog(frame, 2336 + i * 3, 2346 + i * 3, ease.out);
          const shade = 1 - i * 0.09;
          return (
            <g key={i} opacity={appear}>
              <polygon points={`${p.x - 84},${p.y + 30} ${p.x + 84},${p.y + 30} ${p.x + 112},${p.y + 6} ${p.x - 56},${p.y + 6}`} fill={`rgba(244,238,227,${0.18 * shade})`} />
              <rect x={p.x - 84} y={p.y + 30} width={168} height={54} fill={`rgba(70,40,30,${0.85 * shade})`} />
              <text x={p.x} y={p.y + 66} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 32}} fill={C.inkDim}>
                ¥{105 + i * 20}
              </text>
            </g>
          );
        })}
        {/* 掉进沉没成本的硬币 */}
        {Array.from({length: Math.floor(pos) + 1}).map((_, i) => {
          const at = START + i * STEP_EVERY + 6;
          const d = frame - at;
          if (d < 0 || d > 40) return null;
          const p = stepPos(i);
          const k = d / 40;
          const x = interpolate(k, [0, 1], [p.x + 40, 880 + (hash(i) - 0.5) * 120]);
          const y = interpolate(k, [0, 1], [p.y + 10, 1150], {easing: ease.in});
          return (
            <g key={`c${i}`} opacity={1 - prog(d, 30, 40)}>
              <circle cx={x} cy={y} r={16} fill={C.gold} stroke="#8a5a14" strokeWidth={3} />
              <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 16}} fill="#5a3a0c">
                ¥
              </text>
            </g>
          );
        })}
        <g transform={`translate(${tx}, ${ty - 70})`}>
          <Token ch="你" color={C.gold} r={40} spin={frame} />
        </g>
        <text x={560} y={1170} textAnchor="middle" style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 52}} fill={C.red} opacity={sunk}>
          沉没成本
        </text>
      </svg>
      <div style={{position: 'absolute', left: 90, top: 300, opacity: prog(frame, 2498, 2512)}}>
        <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 26, color: C.inkDim, letterSpacing: '0.2em'}}>已经投入</div>
        <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 96, lineHeight: 1.05, color: C.red}}>¥{Math.min(245, invested)}</div>
      </div>
      <div style={{position: 'absolute', right: 90, top: 316, textAlign: 'right', fontFamily: FONT.sans, fontWeight: 900, fontSize: 34, color: C.ink, opacity: prog(frame, 2352, 2366) * (1 - prog(frame, 2496, 2506))}}>
        每一步都合理
        <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 24, color: C.inkDim, marginTop: 6}}>再加一口，就有机会赢回全部</div>
      </div>
    </AbsoluteFill>
  );
};

const GoalSwap: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2582, T1, 10, 8);
  if (o <= 0) return null;
  const strike = prog(frame, 2598, 2612, ease.out);
  const line = prog(frame, 2626, 2650, ease.out);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', top: 360, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{position: 'relative', display: 'inline-block', fontFamily: FONT.serif, fontWeight: 900, fontSize: 110, color: C.coop, opacity: 1 - 0.55 * strike}}>
          赚 100 元
          <div style={{position: 'absolute', left: -10, top: '52%', height: 10, width: `${strike * 104}%`, background: C.red, borderRadius: 5, boxShadow: `0 0 20px ${C.red}`}} />
        </div>
      </div>
      <div style={{position: 'absolute', top: 540, left: 0, right: 0, textAlign: 'center'}}>
        {frame >= 2614 ? (
          <KineticText text="<r>不能输给他</r>" frame={frame - 2614} duration={200} size={130} font={FONT.serif} weight={900} mode="slam" stagger={2.4} />
        ) : null}
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: prog(frame, 2620, 2634)}}>
        <line x1={300} y1={900} x2={300 + (780 - 300) * line} y2={900} stroke={C.red} strokeWidth={5} strokeDasharray="16 10" strokeDashoffset={-frame * 3} />
        <g transform="translate(240, 900)">
          <Token ch="你" color={C.gold} r={70} spin={frame} />
        </g>
        <g transform="translate(840, 900)">
          <Token ch="他" color={C.blue} r={70} spin={-frame} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export const WhyScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= T1) return null;
  return (
    <AbsoluteFill>
      <Stairs frame={frame} />
      <GoalSwap frame={frame} />
    </AbsoluteFill>
  );
};
