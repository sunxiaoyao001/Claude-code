/**
 * 交火层：瞄准镜、轮次指示、曳光弹、枪口焰、命中冲击波、“先手”印章
 * 全部由 timeline.ts 的 SHOTS / AIMS / TURNS 驱动。
 */
import React from 'react';
import {ease, envelope, hash, prog} from '../lib/anim';
import {ghostOf, turnOf} from '../lib/world';
import {ARENA, C, FONT, medalOf, PLAYERS} from '../theme';
import {AIMS, BULLET_FRAMES, PlayerId, Shot, SHOTS} from '../timeline';

const R = ARENA.medal;

/* ---------------- 瞄准镜 ---------------- */
export const Reticles: React.FC<{frame: number}> = ({frame}) => (
  <g>
    {AIMS.filter((a) => frame >= a.start && frame < a.end + 8).map((a, i) => {
      const T = medalOf(a.to);
      const S = medalOf(a.from);
      const col = PLAYERS[a.from].color;
      const lp = prog(frame, a.start, a.start + 12, ease.out);
      const out = prog(frame, a.end, a.end + 8);
      const o = Math.min(1, lp * 1.5) * (1 - out);
      const r = R * T.s * (1.95 - 0.5 * lp);
      const rot = (1 - lp) * 140 + frame * 0.6;
      const lockFlash = prog(frame, a.start + 11, a.start + 20);
      const dx = T.x - S.x;
      const dy = T.y - S.y;
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      return (
        <g key={`${a.start}-${i}`} opacity={o}>
          {/* 激光引导线 */}
          <line
            x1={S.x + ux * R * S.s}
            y1={S.y + uy * R * S.s}
            x2={T.x - ux * r}
            y2={T.y - uy * r}
            stroke={col}
            strokeWidth={2}
            strokeOpacity={0.55}
            strokeDasharray="3 9"
            strokeDashoffset={-frame * 2}
          />
          <g transform={`translate(${T.x}, ${T.y}) rotate(${rot})`}>
            {[0, 90, 180, 270].map((ang) => (
              <g key={ang} transform={`rotate(${ang})`}>
                <path
                  d={`M ${r * Math.cos(-0.5)} ${r * Math.sin(-0.5)} A ${r} ${r} 0 0 1 ${r * Math.cos(0.5)} ${r * Math.sin(0.5)}`}
                  stroke={col}
                  strokeWidth={5}
                  fill="none"
                  strokeLinecap="round"
                  filter="url(#glow-s)"
                />
                <line x1={r + 6} y1={0} x2={r - 26} y2={0} stroke={col} strokeWidth={3} />
              </g>
            ))}
            {lockFlash > 0 && lockFlash < 1 ? (
              <circle r={r * (1 + lockFlash * 0.4)} fill="none" stroke={col} strokeWidth={3 * (1 - lockFlash)} opacity={1 - lockFlash} />
            ) : null}
          </g>
          <text
            x={T.x + r * 0.78}
            y={T.y - r * 0.86}
            style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, letterSpacing: '0.08em'}}
            fill={col}
            opacity={lp}
          >
            {PLAYERS[a.from].name} → LOCK
          </text>
        </g>
      );
    })}
  </g>
);

/* ---------------- 轮次指示器 ---------------- */
export const TurnRing: React.FC<{frame: number}> = ({frame}) => {
  const turn = turnOf(frame);
  if (!turn) return null;
  const M = medalOf(turn.who);
  const col = PLAYERS[turn.who].color;
  const o = envelope(frame, turn.start, turn.end, 6, 6);
  const r = R * M.s + 50;
  const bounce = Math.abs(Math.sin(frame * 0.18)) * 10;
  return (
    <g opacity={o}>
      <g transform={`translate(${M.x}, ${M.y}) rotate(${frame * 2.4})`}>
        {[0, 120, 240].map((a) => (
          <path
            key={a}
            transform={`rotate(${a})`}
            d={`M ${r} 0 A ${r} ${r} 0 0 1 ${r * Math.cos(1.05)} ${r * Math.sin(1.05)}`}
            stroke={col}
            strokeWidth={3}
            strokeOpacity={0.85}
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </g>
      <path
        transform={`translate(${M.x}, ${M.y - r - 26 - bounce})`}
        d="M -16 -10 L 0 8 L 16 -10"
        stroke={col}
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow-s)"
      />
    </g>
  );
};

/* ---------------- 弹道 ---------------- */
const shotGeometry = (s: Shot) => {
  const S = medalOf(s.from);
  if (s.to === 'sky') {
    const from = {x: S.x + 6, y: S.y - R * S.s};
    const to = {x: S.x + 70, y: -900};
    return {from, to, travel: 10, impact: null as null | {x: number; y: number}};
  }
  const T = medalOf(s.to);
  const dx = T.x - S.x;
  const dy = T.y - S.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const from = {x: S.x + ux * R * S.s, y: S.y + uy * R * S.s};
  if (s.hit) return {from, to: {x: T.x, y: T.y}, travel: BULLET_FRAMES, impact: {x: T.x, y: T.y}};
  // 打空：从目标侧边擦过，飞出画面
  const px = -uy;
  const py = ux;
  const to = {x: T.x + px * 120 + ux * 900, y: T.y + py * 120 + uy * 900};
  return {from, to, travel: Math.round(BULLET_FRAMES * 2.2), impact: null};
};

export const Tracers: React.FC<{frame: number}> = ({frame}) => (
  <g>
    {SHOTS.filter((s) => frame >= s.t - 1 && frame < s.t + 40).map((s) => {
      const g = shotGeometry(s);
      const col = PLAYERS[s.from].hot;
      const d = frame - s.t;
      const head = prog(d, 0, g.travel);
      const tailP = prog(d, g.travel, g.travel + 7);
      const hx = g.from.x + (g.to.x - g.from.x) * head;
      const hy = g.from.y + (g.to.y - g.from.y) * head;
      const total = Math.hypot(g.to.x - g.from.x, g.to.y - g.from.y);
      const L = Math.min(total * head, 340) * (1 - tailP);
      const ux = (g.to.x - g.from.x) / total;
      const uy = (g.to.y - g.from.y) / total;
      const tx = hx - ux * L;
      const ty = hy - uy * L;
      const gid = `tr-${s.t}`;
      // 枪口焰
      const mf = 1 - prog(d, 0, 6);
      const ang = (Math.atan2(uy, ux) * 180) / Math.PI;
      return (
        <g key={s.t}>
          <defs>
            <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={tx} y1={ty} x2={hx} y2={hy}>
              <stop offset="0%" stopColor={col} stopOpacity={0} />
              <stop offset="70%" stopColor={col} stopOpacity={0.9} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={1} />
            </linearGradient>
          </defs>
          {L > 1 ? (
            <>
              <line x1={tx} y1={ty} x2={hx} y2={hy} stroke={`url(#${gid})`} strokeWidth={22} strokeOpacity={0.35} strokeLinecap="round" />
              <line x1={tx} y1={ty} x2={hx} y2={hy} stroke={`url(#${gid})`} strokeWidth={6} strokeLinecap="round" filter="url(#glow-s)" />
            </>
          ) : null}
          {mf > 0 ? (
            <g transform={`translate(${g.from.x}, ${g.from.y}) rotate(${ang})`} opacity={mf}>
              <circle r={120 * (1.2 - mf * 0.4)} fill="url(#muzzle-glow)" />
              <path
                d={starPath(10, 95 * (0.6 + 0.4 * mf), 26)}
                fill="#fff8e6"
                transform={`scale(1.6, 0.7) translate(30, 0)`}
              />
            </g>
          ) : null}
          {g.impact && d >= g.travel ? <ImpactBurst x={g.impact.x} y={g.impact.y} d={d - g.travel} seed={s.t} color={col} /> : null}
        </g>
      );
    })}
  </g>
);

const starPath = (n: number, ro: number, ri: number) => {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? ro * (0.7 + 0.3 * hash(i * 3.3)) : ri;
    const a = (Math.PI * i) / n;
    d += `${i ? 'L' : 'M'} ${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)} `;
  }
  return d + 'Z';
};

const ImpactBurst: React.FC<{x: number; y: number; d: number; seed: number; color: string}> = ({x, y, d, seed, color}) => {
  if (d > 30) return null;
  const e = ease.out(prog(d, 0, 22));
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r={40 + 280 * e} fill="none" stroke="#fff" strokeWidth={12 * (1 - e)} opacity={1 - e} />
      <circle r={20 + 170 * e} fill="none" stroke={color} strokeWidth={6 * (1 - e)} opacity={1 - e} />
      {Array.from({length: 30}).map((_, i) => {
        const a = hash(seed * 31 + i) * Math.PI * 2;
        const v = 120 + hash(seed * 17 + i * 3) * 260;
        const px = Math.cos(a) * v * e;
        const py = Math.sin(a) * v * e + 140 * e * e;
        const len = 18 * (1 - e) + 4;
        return (
          <line
            key={i}
            x1={px}
            y1={py}
            x2={px - Math.cos(a) * len}
            y2={py - Math.sin(a) * len}
            stroke={i % 3 === 0 ? '#fff' : color}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={1 - prog(d, 10, 30)}
          />
        );
      })}
    </g>
  );
};

export const CombatDefs: React.FC = () => (
  <defs>
    <radialGradient id="muzzle-glow">
      <stop offset="0%" stopColor="#fff6d8" stopOpacity={0.95} />
      <stop offset="35%" stopColor="#ffb648" stopOpacity={0.5} />
      <stop offset="100%" stopColor="#ff6a1a" stopOpacity={0} />
    </radialGradient>
  </defs>
);

/* ---------------- “先手”印章 ---------------- */
const SEALS = [
  {from: 1988, to: 2050},
  {from: 2958, to: 3030},
];

export const FirstMoveSeal: React.FC<{frame: number}> = ({frame}) => {
  const w = SEALS.find((s) => frame >= s.from && frame < s.to);
  if (!w) return null;
  const M = medalOf('bing');
  const p = prog(frame, w.from, w.from + 9, ease.out);
  const o = Math.min(1, p * 2) * (1 - prog(frame, w.to - 8, w.to));
  const s = 2.4 - 1.4 * p;
  return (
    <g transform={`translate(${M.x - 215}, ${M.y + 96}) rotate(-12) scale(${s})`} opacity={o}>
      <circle r={66} fill="rgba(20,12,4,0.65)" stroke={C.gold} strokeWidth={5} />
      <circle r={54} fill="none" stroke={C.gold} strokeWidth={1.5} strokeDasharray="3 5" />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        y={2}
        style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 44}}
        fill={C.gold}
      >
        先手
      </text>
    </g>
  );
};

/* ---------------- 丙“隐身”标签 ---------------- */
export const GhostLabel: React.FC<{frame: number}> = ({frame}) => {
  const o = ghostOf(frame);
  if (o <= 0.01) return null;
  const M = medalOf('bing');
  return (
    <g transform={`translate(${M.x}, ${M.y - R - 92})`} opacity={o}>
      <rect x={-118} y={-30} width={236} height={60} rx={30} fill="rgba(10,8,6,0.75)" stroke={C.gold} strokeOpacity={0.6} />
      {/* 闭眼图标 */}
      <g transform="translate(-78, 0)" stroke={C.gold} strokeWidth={3} fill="none" strokeLinecap="round">
        <path d="M -18 0 Q 0 -14 18 0 Q 0 14 -18 0" />
        <line x1={-18} y1={14} x2={18} y2={-14} />
      </g>
      <text
        x={18}
        textAnchor="middle"
        dominantBaseline="central"
        style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30, letterSpacing: '0.08em'}}
        fill={C.goldHot}
      >
        无人瞄准
      </text>
    </g>
  );
};

export type {PlayerId};
