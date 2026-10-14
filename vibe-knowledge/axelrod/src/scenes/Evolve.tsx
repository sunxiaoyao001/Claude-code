/**
 * 1:20 第二届 + 演化：
 *  ① 62 个程序环绕冠军，红色瞄准线全部指向它 → “卫冕”印章砸下，瞄准线崩散
 *  ② 演化 1000 代的 100% 堆叠面积图：背叛者先吃掉老好人暴涨，随后崩溃，以牙还牙铺满
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Kicker} from '../components/ui';
import {Stamp, Token} from '../components/Token';
import {ease, envelope, hash, prog} from '../lib/anim';
import {evolve, EVO_GENERATIONS, type StrategyId} from '../math/ipd';
import {C, FONT} from '../theme';

const T0 = 2400;
const T1 = 2854;

/* ---------- ① 第二届 ---------- */
const Round2: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2402, 2646, 10, 10);
  if (o <= 0) return null;
  const cx = 540;
  const cy = 790;
  const aim = prog(frame, 2496, 2540, ease.inOut);
  const blast = prog(frame, 2580, 2610, ease.out);
  const stamp = prog(frame, 2580, 2588, ease.out);
  const n = 62;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="ROUND 2" zh="第二届大赛" opacity={prog(frame, 2404, 2420)} y={290} color={C.hud} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {Array.from({length: n}).map((_, i) => {
          const ring = i % 3;
          const r = 230 + ring * 95 + blast * 260;
          const a = (i / n) * Math.PI * 2 + frame * 0.004 * (ring % 2 ? -1 : 1) + ring;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r * 0.92;
          const appear = prog(frame, 2410 + (i % 31) * 1.6, 2420 + (i % 31) * 1.6, ease.out);
          const flick = hash(i * 9 + Math.floor(frame / 4)) > 0.2 ? 1 : 0.5;
          return (
            <g key={i} opacity={appear * (1 - blast)}>
              {aim > 0 ? (
                <line
                  x1={x}
                  y1={y}
                  x2={x + (cx - x) * aim * 0.78}
                  y2={y + (cy - y) * aim * 0.78}
                  stroke={C.red}
                  strokeOpacity={0.35 * flick}
                  strokeWidth={1.6}
                />
              ) : null}
              <circle cx={x} cy={y} r={9} fill={hash(i) > 0.5 ? C.hud : C.blue} opacity={0.85} />
            </g>
          );
        })}
        <g transform={`translate(${cx}, ${cy}) scale(${1 + 0.06 * Math.sin(frame * 0.2) * aim})`}>
          <circle r={150 + blast * 300} fill="none" stroke={C.gold} strokeWidth={10 * (1 - blast)} opacity={blast > 0 ? 1 - blast : 0} />
          <Token ch="牙" color={C.gold} r={92} spin={frame * 0.6} glow={0.8 + 0.4 * aim} />
        </g>
      </svg>
      <div style={{position: 'absolute', top: 1110, left: 0, right: 0, textAlign: 'center', opacity: prog(frame, 2412, 2426) * (1 - prog(frame, 2574, 2582))}}>
        <span style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 96, color: C.ink}}>62</span>
        <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34, color: C.inkDim, marginLeft: 16}}>个程序 · 6 个国家</span>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1060, display: 'flex', justifyContent: 'center'}}>
        <Stamp text="卫冕冠军" sub="CHAMPION AGAIN" color={C.gold} p={stamp} rotate={-6} size={1} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------- ② 演化堆叠图 ---------- */
const LAYERS: {id: StrategyId; name: string; color: string}[] = [
  {id: 'tft', name: '以牙还牙', color: C.gold},
  {id: 'allc', name: '老好人', color: C.coop},
  {id: 'random', name: '随机', color: '#8A8F98'},
  {id: 'joss', name: '狡猾者', color: '#E08A4A'},
  {id: 'alld', name: '背叛者', color: C.red},
];
const X0 = 120;
const X1 = 960;
const Y0 = 420;
const Y1 = 1080;

const EvoChart: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2640, T1, 12, 6);
  if (o <= 0) return null;
  const data = evolve();
  const reveal = ease.inOut(prog(frame, 2648, 2808));
  const gMax = Math.max(1, Math.round(EVO_GENERATIONS * reveal));
  const step = 5;
  const gx = (g: number) => X0 + (g / EVO_GENERATIONS) * (X1 - X0);
  // 每层的上下边界
  const paths = LAYERS.map((layer, li) => {
    const top: string[] = [];
    const bottom: string[] = [];
    for (let g = 0; g <= gMax; g += step) {
      const s = data[Math.min(g, EVO_GENERATIONS)];
      let below = 0;
      for (let k = 0; k < li; k++) below += s[LAYERS[k].id];
      const above = below + s[layer.id];
      top.push(`${gx(g).toFixed(1)},${(Y1 - above * (Y1 - Y0)).toFixed(1)}`);
      bottom.push(`${gx(g).toFixed(1)},${(Y1 - below * (Y1 - Y0)).toFixed(1)}`);
    }
    return `M ${top.join(' L ')} L ${bottom.reverse().join(' L ')} Z`;
  });
  const cur = data[gMax];
  const peakG = data.reduce((best, s, g) => (s.alld > data[best].alld ? g : best), 0);
  const peakShown = gMax >= peakG;
  const endShown = reveal > 0.98;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="EVOLUTION · 1000 GENERATIONS" zh="演化模拟 · 1000 代" opacity={prog(frame, 2642, 2656)} y={276} color={C.coop} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill="rgba(12,14,16,0.6)" stroke={C.inkFaint} />
        {paths.map((d, i) => (
          <path key={i} d={d} fill={LAYERS[i].color} opacity={LAYERS[i].id === 'tft' ? 0.95 : 0.78} />
        ))}
        {/* 扫描线 */}
        <line x1={gx(gMax)} x2={gx(gMax)} y1={Y0 - 10} y2={Y1 + 10} stroke={C.ink} strokeWidth={2} strokeOpacity={reveal < 1 ? 0.8 : 0} />
        {[0, 250, 500, 750, 1000].map((g) => (
          <text key={g} x={gx(g)} y={Y1 + 40} textAnchor="middle" style={{fontFamily: FONT.mono, fontSize: 22}} fill={C.inkDim}>
            {g}
          </text>
        ))}
        <text x={X1} y={Y1 + 76} textAnchor="end" style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 22}} fill={C.inkDim}>
          代数 →
        </text>
        {/* 背叛者峰值标注 */}
        {peakShown ? (
          <g opacity={prog(frame, 2700, 2712)}>
            <circle cx={gx(peakG)} cy={Y1 - (1 - data[peakG].alld / 2) * (Y1 - Y0)} r={10} fill={C.redHot} />
            <text x={gx(peakG) + 24} y={Y0 + 56} textAnchor="start" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill="#fff">
              背叛者暴涨到 {Math.round(data[peakG].alld * 100)}%
            </text>
          </g>
        ) : null}
      </svg>
      {/* 右侧实时占比 */}
      <div style={{position: 'absolute', left: X0, right: 1080 - X1, top: Y1 + 96, display: 'flex', justifyContent: 'space-between'}}>
        {LAYERS.map((l) => (
          <div key={l.id} style={{textAlign: 'center', minWidth: 120}}>
            <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 22, color: l.color}}>{l.name}</div>
            <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 36, color: C.ink}}>{(cur[l.id] * 100).toFixed(0)}%</div>
          </div>
        ))}
      </div>
      {endShown ? (
        <div
          style={{
            position: 'absolute',
            left: X0 + 450,
            top: Y0 + 260,
            fontFamily: FONT.serif,
            fontWeight: 900,
            fontSize: 52,
            color: '#2a1a04',
            opacity: prog(frame, 2808, 2822),
            transform: `scale(${interpolate(prog(frame, 2808, 2822, ease.back), [0, 1], [0.8, 1])})`,
          }}
        >
          以牙还牙 {Math.round(cur.tft * 100)}%
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const EvolveScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= T1) return null;
  return (
    <AbsoluteFill>
      <Round2 frame={frame} />
      <EvoChart frame={frame} />
    </AbsoluteFill>
  );
};
