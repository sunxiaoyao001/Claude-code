/**
 * 枪手徽章：悬浮在决斗场站位上方的“全息筹码”
 * ------------------------------------------------------------
 *  外圈 10 颗子弹 = 十枪里能中几枪（命中率的直观表达）
 *  中间是大号宋体“甲 / 乙 / 丙”
 *  被击中：闪白 → 裂纹 → 一分为二坠落 → 留下虚线残影
 *  倒带：残影消散，徽章重组
 */
import React from 'react';
import {interpolate} from 'remotion';
import {ease, hash, prog} from '../lib/anim';
import {activationOf, focusFade, ghostOf, lifeOf, REVEAL} from '../lib/world';
import {ARENA, C, FONT, footOf, medalOf, PLAYERS} from '../theme';
import type {PlayerId} from '../timeline';

const R = ARENA.medal;

/** 丙的金色光环：钩子、反转、先手时刻 */
const haloOf = (id: PlayerId, f: number) => {
  if (id !== 'bing') return 0;
  const win = (a: number, b: number) => prog(f, a, a + 12, ease.out) * (1 - prog(f, b - 12, b));
  return Math.max(win(44, 150), win(1455, 1645), win(1985, 2050), win(2950, 3030));
};

const MedalBody: React.FC<{id: PlayerId; frame: number; act: number; dashed: boolean}> = ({
  id,
  frame,
  act,
  dashed,
}) => {
  const P = PLAYERS[id];
  const n = Math.round(P.acc * 10);
  const lit = frame < REVEAL[id] ? 0 : Math.floor(prog(frame, REVEAL[id] + 2, REVEAL[id] + 2 + n * 2.2) * n + 1e-6);
  const rot = frame * 0.25;
  const col = act > 0.5 ? P.color : C.inkDim;

  return (
    <g>
      {/* 子弹环：十发，命中几发亮几发 */}
      <g transform={`rotate(${rot})`}>
        {Array.from({length: 10}).map((_, i) => {
          const on = i < lit;
          const a = -90 + i * 36;
          return (
            <g key={i} transform={`rotate(${a}) translate(${R + 26}, 0) rotate(90)`}>
              <rect
                x={-5}
                y={-12}
                width={10}
                height={24}
                rx={5}
                fill={on ? P.color : 'none'}
                stroke={on ? P.hot : C.inkFaint}
                strokeWidth={2}
                opacity={on ? 1 : 0.7}
                filter={on ? `url(#glow-s)` : undefined}
              />
            </g>
          );
        })}
      </g>
      {/* 外圈 */}
      <circle
        r={R}
        fill="none"
        stroke={col}
        strokeWidth={3.5}
        strokeDasharray={dashed ? '10 12' : undefined}
        opacity={0.5 + 0.5 * act}
      />
      {/* 刻度圈（反向旋转，制造机械感） */}
      <g transform={`rotate(${-rot * 1.6})`} opacity={0.35 + 0.4 * act}>
        {Array.from({length: 60}).map((_, i) => (
          <line
            key={i}
            x1={0}
            y1={-(R - 9)}
            x2={0}
            y2={-(R - (i % 5 === 0 ? 20 : 14))}
            stroke={i % 5 === 0 ? col : C.inkDim}
            strokeWidth={i % 5 === 0 ? 2.5 : 1.2}
            transform={`rotate(${i * 6})`}
          />
        ))}
      </g>
      {/* 盘面 */}
      <circle r={R - 24} fill={`url(#disc-${id})`} stroke={C.inkFaint} strokeWidth={1.5} />
      {/* 高光弧 */}
      <path
        d={`M ${-(R - 34)} -18 A ${R - 34} ${R - 34} 0 0 1 -18 ${-(R - 34)}`}
        fill="none"
        stroke="#fff"
        strokeOpacity={0.22}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <text
        y={4}
        textAnchor="middle"
        dominantBaseline="central"
        style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 104}}
        fill={act > 0.5 ? C.ink : C.inkDim}
        opacity={0.55 + 0.45 * act}
      >
        {P.name}
      </text>
    </g>
  );
};

export const Medal: React.FC<{id: PlayerId; frame: number; tagsOn: number; threatOn: number}> = ({
  id,
  frame,
  tagsOn,
  threatOn,
}) => {
  const P = PLAYERS[id];
  const {x, y, s} = medalOf(id);
  const foot = footOf(id);
  const life = lifeOf(id, frame);
  const act = activationOf(id, frame);
  const ghost = id === 'bing' ? ghostOf(frame) : 0;
  const halo = haloOf(id, frame);
  const t = frame / 30;
  const bob = Math.sin(t * 1.4 + (id === 'jia' ? 0 : id === 'yi' ? 2 : 4)) * 5;

  // 死亡进度 / 复活进度
  const dp = life.alive ? 0 : prog(frame, life.since, life.since + 28);
  const flash = life.alive ? 0 : 1 - prog(frame, life.since, life.since + 6);
  const crack = life.alive ? 0 : prog(frame, life.since, life.since + 5, ease.out);
  const revive = life.revived ? prog(frame, life.since, life.since + 14, ease.out) : 1;
  const ghostMark = life.alive ? 1 - revive : prog(frame, life.since + 18, life.since + 32, ease.out);

  const fall = ease.in(prog(dp, 0.18, 1));
  const split = ease.out(prog(dp, 0.12, 0.6));

  return (
    <g opacity={focusFade(id, frame)}>
      {/* 光柱：徽章与地面落点相连 */}
      <line
        x1={foot.x}
        y1={foot.y}
        x2={x}
        y2={y + R * s + bob}
        stroke={`url(#beam-${id})`}
        strokeWidth={6}
        opacity={(life.alive ? revive : 1 - dp) * (0.3 + 0.7 * act)}
      />

      <g transform={`translate(${x}, ${y + bob}) scale(${s})`}>
        {/* 环境辉光 */}
        <circle
          r={R * 1.75}
          fill={`url(#aura-${id})`}
          opacity={(life.alive ? revive : 1 - dp) * (0.15 + 0.85 * act) * (1 + halo * 0.6)}
        />

        {/* 金色光环 */}
        {halo > 0 ? (
          <g opacity={halo}>
            <circle
              r={R + 58 + Math.sin(t * 4) * 4}
              fill="none"
              stroke={C.gold}
              strokeWidth={2.5}
              strokeDasharray="4 14"
              transform={`rotate(${frame * 1.2})`}
              filter="url(#glow-s)"
            />
            <circle r={R + 72} fill="none" stroke={C.goldHot} strokeOpacity={0.35} strokeWidth={1.2} />
          </g>
        ) : null}

        {/* 本体：存活 / 复活 */}
        {life.alive ? (
          <g opacity={revive} transform={`scale(${interpolate(revive, [0, 1], [0.82, 1])})`}>
            <MedalBody id={id} frame={frame} act={act} dashed={ghost > 0.5} />
          </g>
        ) : null}

        {/* 本体：中弹裂成两半坠落 */}
        {!life.alive && dp < 1 ? (
          <g opacity={1 - prog(dp, 0.55, 1)}>
            {(['L', 'R'] as const).map((side) => {
              const dir = side === 'L' ? -1 : 1;
              return (
                <g
                  key={side}
                  clipPath={`url(#half-${side})`}
                  transform={`translate(${dir * 46 * split}, ${fall * 260}) rotate(${dir * 24 * split})`}
                >
                  <MedalBody id={id} frame={frame} act={act} dashed={false} />
                </g>
              );
            })}
            {/* 裂纹 */}
            <g opacity={crack * (1 - split)} stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round">
              <path d="M 0 -84 L 8 -40 L -6 -6 L 10 30 L -4 84" />
              <path d="M -6 -6 L -40 -20 L -70 -12" />
              <path d="M 10 30 L 46 42 L 64 70" />
            </g>
            {/* 中弹闪白 */}
            <circle r={R} fill="#fff" opacity={flash * 0.9} />
          </g>
        ) : null}

        {/* 出局残影 */}
        {ghostMark > 0.01 ? (
          <g opacity={ghostMark * 0.5}>
            <circle r={R} fill="none" stroke={C.inkDim} strokeWidth={2} strokeDasharray="6 10" />
            <text
              y={4}
              textAnchor="middle"
              dominantBaseline="central"
              style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 104}}
              fill="none"
              stroke={C.inkDim}
              strokeWidth={1.5}
            >
              {P.name}
            </text>
            <path d="M -38 -38 L 38 38 M 38 -38 L -38 38" stroke={C.red} strokeWidth={5} strokeLinecap="round" />
          </g>
        ) : null}
      </g>

      {/* 名牌：头衔 + 命中率 */}
      <NameTag id={id} frame={frame} on={tagsOn} threatOn={threatOn} dead={!life.alive && dp > 0.3} />
    </g>
  );
};

const NameTag: React.FC<{id: PlayerId; frame: number; on: number; threatOn: number; dead: boolean}> = ({
  id,
  frame,
  on,
  threatOn,
  dead,
}) => {
  const P = PLAYERS[id];
  const {x, y, s} = medalOf(id);
  const reveal = prog(frame, REVEAL[id] + 4, REVEAL[id] + 18, ease.out);
  const o = Math.min(on, reveal);
  if (o <= 0.001) return null;
  const pctVal = Math.round(P.acc * 100 * prog(frame, REVEAL[id] + 4, REVEAL[id] + 26, ease.out));
  const ty = y + (R + 62) * s;
  const threatW = 150 * P.acc * threatOn;

  return (
    <g transform={`translate(${x}, ${ty + (1 - o) * 16})`} opacity={o * (dead ? 0.4 : 1)}>
      <text
        x={-8}
        y={0}
        textAnchor="end"
        dominantBaseline="central"
        style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 30, letterSpacing: '0.12em'}}
        fill={C.inkDim}
      >
        {P.title}
      </text>
      <text
        x={8}
        y={2}
        textAnchor="start"
        dominantBaseline="central"
        style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 52}}
        fill={P.color}
      >
        {pctVal}%
      </text>
      <line x1={-110} x2={110} y1={36} y2={36} stroke={P.color} strokeOpacity={0.45} strokeWidth={2} />
      {dead ? (
        <line x1={-120} x2={120} y1={2} y2={2} stroke={C.red} strokeWidth={4} strokeLinecap="round" />
      ) : null}
      {/* 威胁度条（拆解段） */}
      {threatOn > 0.01 ? (
        <g transform="translate(0, 66)" opacity={threatOn}>
          <text
            x={-82}
            y={0}
            textAnchor="end"
            dominantBaseline="central"
            style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 22}}
            fill={C.inkDim}
          >
            威胁
          </text>
          <rect x={-74} y={-6} width={150} height={12} rx={6} fill={C.inkFaint} />
          <rect x={-74} y={-6} width={threatW} height={12} rx={6} fill={P.color} />
        </g>
      ) : null}
    </g>
  );
};

/** 共享 defs：渐变、滤镜、半边裁切 */
export const MedalDefs: React.FC = () => (
  <defs>
    {(['jia', 'yi', 'bing'] as PlayerId[]).map((id) => {
      const P = PLAYERS[id];
      return (
        <React.Fragment key={id}>
          <radialGradient id={`aura-${id}`}>
            <stop offset="0%" stopColor={P.color} stopOpacity={0.55} />
            <stop offset="45%" stopColor={P.color} stopOpacity={0.16} />
            <stop offset="100%" stopColor={P.color} stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`disc-${id}`} cx="40%" cy="35%">
            <stop offset="0%" stopColor="#2a211a" />
            <stop offset="70%" stopColor="#120e0b" />
            <stop offset="100%" stopColor="#0a0807" />
          </radialGradient>
          <linearGradient id={`beam-${id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={P.color} stopOpacity={0.9} />
            <stop offset="100%" stopColor={P.color} stopOpacity={0} />
          </linearGradient>
          <radialGradient id={`pool-${id}`}>
            <stop offset="0%" stopColor={P.color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={P.color} stopOpacity={0} />
          </radialGradient>
        </React.Fragment>
      );
    })}
    <clipPath id="half-L">
      <rect x={-300} y={-300} width={300} height={600} />
    </clipPath>
    <clipPath id="half-R">
      <rect x={0} y={-300} width={300} height={600} />
    </clipPath>
    <filter id="glow-s" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="3" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="glow-l" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);

/** 用于粒子：确定性方向 */
export const sparkDir = (seed: number, i: number) => {
  const a = hash(seed * 31 + i) * Math.PI * 2;
  const v = 0.5 + hash(seed * 17 + i * 3) * 0.9;
  return {dx: Math.cos(a) * v, dy: Math.sin(a) * v};
};
