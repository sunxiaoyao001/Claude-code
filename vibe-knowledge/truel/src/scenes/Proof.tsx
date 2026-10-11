/**
 * 1:11 证明段：一万场蒙特卡洛模拟（Canvas 2D 逐点绘制）
 * ------------------------------------------------------------
 *  ① 100×100 点阵逐个点亮，每个点 = 一场完整决斗，颜色 = 赢家
 *  ② 一万个点“流”进三根柱子，柱高就是存活率
 *  ③ 斜率图：命中率排名 vs 存活率排名，完全颠倒
 *  ④ 丙的三种开局对比：朝天开枪胜出
 */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Kicker} from '../components/ui';
import {countUp, ease, envelope, mulberryShuffle, prog} from './proof-helpers';
import {airShotOutcome, bingAirShot, bingShootJia, bingShootYi, runSimulation, SIM_N} from '../math/truel';
import {C, FONT, PLAYERS} from '../theme';
import type {PlayerId} from '../timeline';

const T0 = 2130;
const GRID = {x: 180, y: 470, size: 720, n: 100};
const REVEAL = {a: 2222, b: 2392};
const FLOW = {a: 2402, spread: 34, dur: 38};
const BAR = {bottom: 1150, pitch: 4, cols: 40, dot: 3.2};
const ORDER: PlayerId[] = ['bing', 'yi', 'jia']; // 柱子从左到右
const BAR_X: Record<PlayerId, number> = {bing: 300, yi: 540, jia: 780};
const HEX: Record<PlayerId, string> = {jia: C.red, yi: C.blue, bing: C.gold};

const useDots = () =>
  useMemo(() => {
    const {winners} = runSimulation();
    const rank = mulberryShuffle(SIM_N, 77); // rank[i] = 第 i 个点的点亮次序
    const pitch = GRID.size / GRID.n;
    const groupIdx: Record<PlayerId, number> = {jia: 0, yi: 0, bing: 0};
    // 按点亮次序给每个赢家分配柱内序号，先点亮的点落到柱底
    const byRank = Array.from({length: SIM_N}, (_, i) => i).sort((a, b) => rank[a] - rank[b]);
    const barSlot = new Int32Array(SIM_N);
    for (const i of byRank) barSlot[i] = groupIdx[winners[i]]++;
    return winners.map((w, i) => {
      const gx = GRID.x + (i % GRID.n) * pitch + pitch / 2;
      const gy = GRID.y + Math.floor(i / GRID.n) * pitch + pitch / 2;
      const j = barSlot[i];
      const bx = BAR_X[w] - (BAR.cols * BAR.pitch) / 2 + (j % BAR.cols) * BAR.pitch + BAR.pitch / 2;
      const by = BAR.bottom - Math.floor(j / BAR.cols) * BAR.pitch - BAR.pitch / 2;
      const k = rank[i] / SIM_N;
      return {
        w,
        gx,
        gy,
        bx,
        by,
        reveal: REVEAL.a + (REVEAL.b - REVEAL.a) * Math.pow(k, 1 / 2.2),
        flow: FLOW.a + k * FLOW.spread,
      };
    });
  }, []);

const DotField: React.FC<{frame: number}> = ({frame}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const dots = useDots();
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 1080, 1920);
    const fade = 1 - prog(frame, 2572, 2590);
    if (fade <= 0) return;
    ctx.globalAlpha = fade;
    for (const pass of ORDER) {
      ctx.fillStyle = HEX[pass];
      for (const d of dots) {
        if (d.w !== pass || frame < d.reveal) continue;
        const t = ease.inOut(prog(frame, d.flow, d.flow + FLOW.dur));
        const x = d.gx + (d.bx - d.gx) * t;
        const y = d.gy + (d.by - d.gy) * t;
        const age = frame - d.reveal;
        const s = (age < 3 ? 8 : 5.2) * (1 - t) + BAR.dot * t;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }
    // 新点亮的点加一层白色高光
    ctx.fillStyle = '#ffffff';
    for (const d of dots) {
      const age = frame - d.reveal;
      if (age >= 0 && age < 2 && frame < FLOW.a) ctx.fillRect(d.gx - 3, d.gy - 3, 6, 6);
    }
    ctx.globalAlpha = 1;
  }, [frame, dots]);
  return <canvas ref={ref} width={1080} height={1920} style={{position: 'absolute', inset: 0}} />;
};

/** 顶部实时计数 */
const LiveCounters: React.FC<{frame: number}> = ({frame}) => {
  const dots = useDots();
  const o = envelope(frame, 2218, 2410, 10, 12);
  if (o <= 0) return null;
  const counts: Record<PlayerId, number> = {jia: 0, yi: 0, bing: 0};
  let total = 0;
  for (const d of dots) {
    if (frame >= d.reveal) {
      counts[d.w]++;
      total++;
    }
  }
  return (
    <div style={{position: 'absolute', top: 350, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 56, opacity: o}}>
      {ORDER.map((id) => (
        <div key={id} style={{textAlign: 'center', minWidth: 210}}>
          <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 26, color: C.inkDim, letterSpacing: '0.2em'}}>
            {PLAYERS[id].name}赢
          </div>
          <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 64, lineHeight: 1.1, color: HEX[id]}}>
            {total ? ((counts[id] / total) * 100).toFixed(1) : '0.0'}%
          </div>
        </div>
      ))}
    </div>
  );
};

/** 柱状图标注 */
const BarLabels: React.FC<{frame: number}> = ({frame}) => {
  const {counts} = runSimulation();
  const o = envelope(frame, 2470, 2590, 10, 14);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{opacity: o}}>
      {ORDER.map((id, i) => {
        const rows = Math.ceil(counts[id] / BAR.cols);
        const top = BAR.bottom - rows * BAR.pitch;
        const v = countUp(frame, 2478 + i * 6, 2510 + i * 6, 0, (counts[id] / SIM_N) * 100);
        return (
          <React.Fragment key={id}>
            <div
              style={{
                position: 'absolute',
                left: BAR_X[id] - 150,
                width: 300,
                top: top - 104,
                textAlign: 'center',
                fontFamily: FONT.num,
                fontWeight: 700,
                fontSize: id === 'bing' ? 88 : 66,
                color: HEX[id],
                textShadow: `0 0 40px ${HEX[id]}88`,
              }}
            >
              {v.toFixed(1)}%
            </div>
            <div style={{position: 'absolute', left: BAR_X[id] - 150, width: 300, top: BAR.bottom + 14, textAlign: 'center'}}>
              <span style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 52, color: C.ink}}>{PLAYERS[id].name}</span>
              <span style={{fontFamily: FONT.sans, fontWeight: 500, fontSize: 24, color: C.inkDim, marginLeft: 10}}>
                命中 {Math.round(PLAYERS[id].acc * 100)}%
              </span>
            </div>
          </React.Fragment>
        );
      })}
      <div
        style={{
          position: 'absolute',
          top: 1226,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT.mono,
          fontWeight: 500,
          fontSize: 22,
          color: C.inkDim,
          letterSpacing: '0.06em',
          opacity: prog(frame, 2500, 2512),
        }}
      >
        理论值 丙 {(airShotOutcome.bing * 100).toFixed(1)}% · 乙 {(airShotOutcome.yi * 100).toFixed(1)}% · 甲{' '}
        {(airShotOutcome.jia * 100).toFixed(1)}%
      </div>
    </AbsoluteFill>
  );
};

/** 斜率图：命中率排名 → 存活率排名 */
const SlopeChart: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2578, 2720, 10, 10);
  if (o <= 0) return null;
  const left: PlayerId[] = ['jia', 'yi', 'bing'];
  const right: PlayerId[] = ['bing', 'yi', 'jia'];
  const rowY = (r: number) => 600 + r * 210;
  const LX = 270;
  const RX = 810;
  const survive: Record<PlayerId, number> = airShotOutcome;
  const draw = prog(frame, 2596, 2630, ease.inOut);
  const cross = prog(frame, 2628, 2640, ease.back);
  const node = (id: PlayerId, x: number, y: number, label: string, at: number, side: 'l' | 'r') => {
    const p = prog(frame, at, at + 10, ease.back);
    return (
      <g key={`${side}-${id}`} transform={`translate(${x}, ${y}) scale(${p})`}>
        <circle r={54} fill="#0e0b08" stroke={HEX[id]} strokeWidth={4} />
        <text textAnchor="middle" dominantBaseline="central" y={3} style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 54}} fill={C.ink}>
          {PLAYERS[id].name}
        </text>
        <text
          x={side === 'l' ? -78 : 78}
          textAnchor={side === 'l' ? 'end' : 'start'}
          dominantBaseline="central"
          style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 46}}
          fill={HEX[id]}
        >
          {label}
        </text>
      </g>
    );
  };
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        {[0, 1, 2].map((r) => (
          <text key={r} x={540} y={rowY(r) + 12} textAnchor="middle" style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 30}} fill={C.inkFaint}>
            {`NO.${r + 1}`}
          </text>
        ))}
        {left.map((id, li) => {
          const ri = right.indexOf(id);
          const x1 = LX + 60;
          const y1 = rowY(li);
          const x2 = RX - 60;
          const y2 = rowY(ri);
          return (
            <line
              key={id}
              x1={x1}
              y1={y1}
              x2={x1 + (x2 - x1) * draw}
              y2={y1 + (y2 - y1) * draw}
              stroke={HEX[id]}
              strokeWidth={id === 'yi' ? 4 : 8}
              strokeOpacity={id === 'yi' ? 0.5 : 1}
              strokeLinecap="round"
              filter="url(#slope-glow)"
            />
          );
        })}
        {left.map((id, i) => node(id, LX, rowY(i), `${Math.round(PLAYERS[id].acc * 100)}%`, 2584 + i * 4, 'l'))}
        {right.map((id, i) => node(id, RX, rowY(i), `${(survive[id] * 100).toFixed(1)}%`, 2626 + i * 4, 'r'))}
        {/* 交叉点印章 */}
        <g transform={`translate(540, ${rowY(1)}) rotate(-8) scale(${cross})`} opacity={cross}>
          <rect x={-104} y={-50} width={208} height={100} rx={14} fill="rgba(14,10,7,0.92)" stroke={C.gold} strokeWidth={4} />
          <text textAnchor="middle" dominantBaseline="central" y={3} style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 56}} fill={C.gold}>
            全颠倒
          </text>
        </g>
        <defs>
          <filter id="slope-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <div style={{position: 'absolute', top: 420, left: LX - 160, width: 320, textAlign: 'center', fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.inkDim, letterSpacing: '0.12em'}}>
        命中率
      </div>
      <div style={{position: 'absolute', top: 420, left: RX - 160, width: 320, textAlign: 'center', fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.ink, letterSpacing: '0.12em'}}>
        存活率
      </div>
    </AbsoluteFill>
  );
};

/** 丙的三种开局 */
const Strategies: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2718, 2792, 10, 8);
  if (o <= 0) return null;
  const rows = [
    {label: '先打甲', v: bingShootJia, color: C.red, at: 2724},
    {label: '先打乙', v: bingShootYi, color: C.blue, at: 2736},
    {label: '朝天开枪', v: bingAirShot, color: C.gold, at: 2748, best: true},
  ];
  const MAXW = 560;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', top: 400, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, letterSpacing: '0.4em', color: C.gold}}>BING · OPENING MOVES</div>
        <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 52, color: C.ink, marginTop: 10, letterSpacing: '0.08em'}}>
          丙的三种开局 · 最终存活率
        </div>
      </div>
      {rows.map((r, i) => {
        const p = prog(frame, r.at, r.at + 16, ease.out);
        const w = MAXW * r.v * 1.6 * p;
        return (
          <div key={i} style={{position: 'absolute', top: 600 + i * 170, left: 110, right: 110, display: 'flex', alignItems: 'center', gap: 24, opacity: Math.min(1, p * 2)}}>
            <div style={{width: 200, textAlign: 'right', fontFamily: FONT.sans, fontWeight: 900, fontSize: 42, color: r.best ? C.gold : C.ink}}>{r.label}</div>
            <div style={{flex: 1, height: 64, position: 'relative'}}>
              <div
                style={{
                  width: w,
                  height: '100%',
                  borderRadius: 10,
                  background: r.best ? `linear-gradient(90deg, ${C.gold}, ${C.goldHot})` : `${r.color}cc`,
                  boxShadow: r.best ? `0 0 40px ${C.gold}99` : 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: w + 18,
                  top: -6,
                  fontFamily: FONT.num,
                  fontWeight: 700,
                  fontSize: 60,
                  color: r.best ? C.gold : C.ink,
                }}
              >
                {(countUp(frame, r.at, r.at + 16, 0, r.v * 100)).toFixed(1)}%
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= 2795) return null;
  const titleO = envelope(frame, 2140, 2412, 12, 12);
  const gridO = envelope(frame, 2150, 2600, 16, 10);
  const frameDraw = prog(frame, 2150, 2200, ease.out);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: 290,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT.mono,
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: '0.36em',
          color: C.hud,
          opacity: titleO,
        }}
      >
        MONTE CARLO · N = {SIM_N.toLocaleString('en-US')}
      </div>
      {frame < 2222 ? <Kicker en="" zh="10000 场决斗" opacity={envelope(frame, 2140, 2222, 10, 8)} y={330} /> : null}
      {/* 点阵外框（HUD 角标） */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: gridO * (1 - prog(frame, FLOW.a, FLOW.a + 20))}}>
        {[
          [GRID.x - 16, GRID.y - 16, 1, 1],
          [GRID.x + GRID.size + 16, GRID.y - 16, -1, 1],
          [GRID.x - 16, GRID.y + GRID.size + 16, 1, -1],
          [GRID.x + GRID.size + 16, GRID.y + GRID.size + 16, -1, -1],
        ].map(([x, y, sx, sy], i) => (
          <path key={i} d={`M ${x} ${y + sy * 60 * frameDraw} L ${x} ${y} L ${x + sx * 60 * frameDraw} ${y}`} stroke={C.hud} strokeWidth={3} fill="none" />
        ))}
        <rect x={GRID.x} y={GRID.y} width={GRID.size} height={GRID.size} fill="rgba(143,211,232,0.03)" stroke="rgba(143,211,232,0.12)" />
      </svg>
      <DotField frame={frame} />
      <LiveCounters frame={frame} />
      <BarLabels frame={frame} />
      <SlopeChart frame={frame} />
      <Strategies frame={frame} />
    </AbsoluteFill>
  );
};
