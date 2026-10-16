/**
 * 决斗场地面：倾斜的罗盘式圆形场地
 * 同心环 + 怀表刻度 + 内接三角 + 站位光池，
 * 以及只在特定段落出现的：钩子的对峙红线、规则段的开枪顺序箭头、拆解段的威胁光束。
 */
import React from 'react';
import {ease, envelope, hash, prog} from '../lib/anim';
import {activationOf, lifeOf} from '../lib/world';
import {ARENA, C, FONT, footOf, medalOf, PLAYERS} from '../theme';
import type {PlayerId} from '../timeline';

const {cx, cy, tilt} = ARENA;
const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return {x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) * tilt};
};
const arcPath = (r: number, a0: number, a1: number, steps = 48) => {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const p = pt(r, a0 + ((a1 - a0) * i) / steps);
    d += `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
  }
  return d;
};

export const Floor: React.FC<{frame: number}> = ({frame}) => {
  const draw = prog(frame, 0, 40, ease.out);
  const spin = frame * 0.08;
  const rings = [
    {r: 110, o: 0.18, w: 1.5},
    {r: 220, o: 0.22, w: 1.5},
    {r: ARENA.r, o: 0.5, w: 2.5},
    {r: 430, o: 0.2, w: 1.5},
    {r: 540, o: 0.1, w: 1},
  ];
  return (
    <g>
      {/* 中心聚光 */}
      <ellipse cx={cx} cy={cy} rx={520} ry={520 * tilt} fill="url(#floor-spot)" />
      {rings.map((g, i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={g.r}
          ry={g.r * tilt}
          fill="none"
          stroke={C.ink}
          strokeOpacity={g.o}
          strokeWidth={g.w}
          pathLength={1}
          strokeDasharray={`${draw} 1`}
        />
      ))}
      {/* 旋转虚线环 */}
      <path
        d={arcPath(375, spin, spin + 360, 120)}
        fill="none"
        stroke={C.gold}
        strokeOpacity={0.28 * draw}
        strokeWidth={2}
        strokeDasharray="2 16"
      />
      {/* 怀表刻度 */}
      {Array.from({length: 72}).map((_, i) => {
        const a = i * 5 + spin * 0.3;
        const long = i % 6 === 0;
        const p1 = pt(ARENA.r + 12, a);
        const p2 = pt(ARENA.r + (long ? 46 : 26), a);
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={long ? C.gold : C.ink}
            strokeOpacity={(long ? 0.5 : 0.18) * prog(frame, i * 0.4, i * 0.4 + 10)}
            strokeWidth={long ? 2.5 : 1.2}
          />
        );
      })}
      {/* 内接三角 */}
      <path
        d={`M ${footOf('jia').x} ${footOf('jia').y} L ${footOf('bing').x} ${footOf('bing').y} L ${footOf('yi').x} ${footOf('yi').y} Z`}
        fill="none"
        stroke={C.ink}
        strokeOpacity={0.14}
        strokeWidth={1.5}
        strokeDasharray="10 10"
        strokeDashoffset={-frame * 0.6}
        pathLength={1}
      />
      {/* 站位光池 */}
      {(['jia', 'yi', 'bing'] as PlayerId[]).map((id) => {
        const f = footOf(id);
        const life = lifeOf(id, frame);
        const alive = life.alive ? 1 : 1 - prog(frame, life.since, life.since + 20);
        const act = activationOf(id, frame);
        return (
          <g key={id}>
            <ellipse cx={f.x} cy={f.y} rx={150} ry={150 * tilt} fill={`url(#pool-${id})`} opacity={alive * (0.25 + 0.75 * act)} />
            <ellipse
              cx={f.x}
              cy={f.y}
              rx={58}
              ry={58 * tilt}
              fill="none"
              stroke={PLAYERS[id].color}
              strokeOpacity={0.7 * alive * act}
              strokeWidth={2}
            />
          </g>
        );
      })}
    </g>
  );
};

export const FloorDefs: React.FC = () => (
  <defs>
    <radialGradient id="floor-spot">
      <stop offset="0%" stopColor="#ffd9a0" stopOpacity={0.1} />
      <stop offset="60%" stopColor="#ffb860" stopOpacity={0.03} />
      <stop offset="100%" stopColor="#000" stopOpacity={0} />
    </radialGradient>
    <marker id="arrow-head" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill={C.gold} />
    </marker>
  </defs>
);

/** 钩子：三角对峙红线 + 闪烁瞄准框 */
export const Standoff: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 0, 150, 4, 22);
  if (o <= 0) return null;
  const ids: PlayerId[] = ['jia', 'yi', 'bing'];
  const pairs: [PlayerId, PlayerId][] = [
    ['jia', 'yi'],
    ['yi', 'bing'],
    ['bing', 'jia'],
  ];
  return (
    <g opacity={o}>
      {pairs.map(([a, b], i) => {
        const A = medalOf(a);
        const B = medalOf(b);
        const flick = 0.55 + 0.45 * (hash(Math.floor(frame / 2) * 7 + i) > 0.25 ? 1 : 0.2);
        return (
          <line
            key={i}
            x1={A.x}
            y1={A.y}
            x2={B.x}
            y2={B.y}
            stroke={C.red}
            strokeWidth={3}
            strokeOpacity={0.65 * flick}
            strokeDasharray="18 12"
            strokeDashoffset={-frame * 3}
            filter="url(#glow-s)"
          />
        );
      })}
      {ids.map((id, i) => {
        const M = medalOf(id);
        const jitter = (hash(frame * 0.5 + i * 9) - 0.5) * 10;
        const r = ARENA.medal * M.s * 1.45 + Math.sin(frame * 0.3 + i) * 6;
        return (
          <g key={id} transform={`translate(${M.x + jitter}, ${M.y - jitter * 0.6}) rotate(${frame * 2 + i * 40})`}>
            {[0, 90, 180, 270].map((a) => (
              <path
                key={a}
                d={`M ${r} -18 A ${r} ${r} 0 0 1 ${r} 18`}
                transform={`rotate(${a})`}
                stroke={C.red}
                strokeWidth={4}
                fill="none"
                opacity={0.8}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
};

/** 规则段：开枪顺序 丙 → 乙 → 甲 的地面箭头 */
export const TurnArrows: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 420, 572, 10, 14);
  if (o <= 0) return null;
  const legs = [
    {a0: 30 + 24, a1: 150 - 24, at: 420},
    {a0: 150 + 24, a1: 270 - 24, at: 470},
    {a0: 270 + 24, a1: 390 - 24, at: 520},
  ];
  return (
    <g opacity={o}>
      {legs.map((l, i) => {
        const p = prog(frame, l.at - 4, l.at + 14, ease.out);
        return (
          <path
            key={i}
            d={arcPath(ARENA.r, l.a0, l.a1)}
            fill="none"
            stroke={C.gold}
            strokeWidth={5}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${p} 1`}
            markerEnd={p > 0.95 ? 'url(#arrow-head)' : undefined}
            opacity={0.85}
            filter="url(#glow-s)"
          />
        );
      })}
    </g>
  );
};

/** 拆解段：甲 ⇄ 乙 互为最大威胁的光束 */
export const ThreatBeam: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 1666, 1980, 14, 16);
  if (o <= 0) return null;
  const A = medalOf('yi');
  const B = medalOf('jia');
  const pulse = 0.75 + 0.25 * Math.sin(frame * 0.35);
  const mid = {x: (A.x + B.x) / 2, y: (A.y + B.y) / 2};
  const yiView = envelope(frame, 1680, 1750, 8, 8);
  const jiaView = envelope(frame, 1752, 1826, 8, 8);
  return (
    <g opacity={o}>
      <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="url(#threat-grad)" strokeWidth={26 * pulse} strokeOpacity={0.22} strokeLinecap="round" />
      <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="url(#threat-grad)" strokeWidth={6} strokeLinecap="round" filter="url(#glow-l)" />
      {/* 流动的箭头：乙看甲 / 甲看乙 */}
      <line
        x1={A.x}
        y1={A.y}
        x2={B.x}
        y2={B.y}
        stroke={C.ink}
        strokeWidth={3}
        strokeDasharray="6 26"
        strokeDashoffset={-frame * (yiView >= jiaView ? 4 : -4)}
        strokeOpacity={0.8}
      />
      <g transform={`translate(${mid.x - 104}, ${mid.y - 96})`}>
        <rect x={-104} y={-26} width={208} height={52} rx={26} fill="rgba(12,9,7,0.85)" stroke={C.red} strokeOpacity={0.7} strokeWidth={2} />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          y={1}
          style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28, letterSpacing: '0.08em'}}
          fill={C.ink}
        >
          互为最大威胁
        </text>
      </g>
      <defs>
        <linearGradient id="threat-grad" gradientUnits="userSpaceOnUse" x1={A.x} y1={A.y} x2={B.x} y2={B.y}>
          <stop offset="0%" stopColor={C.blue} />
          <stop offset="100%" stopColor={C.red} />
        </linearGradient>
      </defs>
    </g>
  );
};
