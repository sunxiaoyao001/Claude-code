/**
 * 1:06 悖论：冠军一局都没赢过
 *  巨大的“0 胜” → 两张对局卡（输 5 分 / 平局）→ 柱状对比：赢一局只拿 204，合作各拿 600
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Headline} from '../components/ui';
import {Stamp, Token} from '../components/Token';
import {countUp, ease, envelope, prog} from '../lib/anim';
import {playMatch} from '../math/ipd';
import {C, FONT} from '../theme';

const T0 = 1980;
const T1 = 2404;

const MatchCard: React.FC<{
  frame: number;
  at: number;
  y: number;
  left: {ch: string; color: string; name: string};
  right: {ch: string; color: string; name: string};
  score: [number, number];
  stamp: {text: string; color: string; at: number};
}> = ({frame, at, y, left, right, score, stamp}) => {
  const p = prog(frame, at, at + 14, ease.out);
  if (p <= 0) return null;
  const a = Math.round(countUp(frame, at + 6, at + 34, 0, score[0]));
  const b = Math.round(countUp(frame, at + 6, at + 34, 0, score[1]));
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        right: 70,
        top: y,
        height: 300,
        borderRadius: 26,
        border: `2px solid ${C.inkFaint}`,
        background: C.panel,
        opacity: p,
        transform: `translateY(${(1 - p) * 50}px)`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}
    >
      <svg width={940} height={300} style={{position: 'absolute', inset: 0}}>
        <g transform="translate(120, 130)">
          <Token ch={left.ch} color={left.color} r={58} spin={frame * 0.5} />
        </g>
        <g transform="translate(820, 130)">
          <Token ch={right.ch} color={right.color} r={58} spin={-frame * 0.5} />
        </g>
        <text x={120} y={256} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28}} fill={left.color}>
          {left.name}
        </text>
        <text x={820} y={256} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28}} fill={right.color}>
          {right.name}
        </text>
        <text x={470} y={70} textAnchor="middle" style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 22, letterSpacing: '0.2em'}} fill={C.inkDim}>
          200 ROUNDS
        </text>
        <text x={440} y={160} textAnchor="end" dominantBaseline="central" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 104}} fill={left.color}>
          {a}
        </text>
        <text x={470} y={156} textAnchor="middle" dominantBaseline="central" style={{fontFamily: FONT.num, fontWeight: 500, fontSize: 70}} fill={C.inkDim}>
          :
        </text>
        <text x={500} y={160} textAnchor="start" dominantBaseline="central" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 104}} fill={right.color}>
          {b}
        </text>
      </svg>
      <div style={{position: 'absolute', left: 372, top: 222}}>
        <Stamp text={stamp.text} color={stamp.color} p={prog(frame, stamp.at, stamp.at + 8, ease.out)} size={0.62} rotate={-8} />
      </div>
    </div>
  );
};

const Compare: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2238, T1, 12, 6);
  if (o <= 0) return null;
  const base = 1130;
  const scale = 0.82; // 每分对应的像素
  const bars = [
    {x: 230, v: 204, color: C.red, label: '背叛者', at: 2246},
    {x: 380, v: 199, color: C.gold, label: '以牙还牙', at: 2252},
    {x: 700, v: 600, color: C.coop, label: '合作者 A', at: 2326},
    {x: 850, v: 600, color: C.coop, label: '合作者 B', at: 2332},
  ];
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <line x1={120} x2={960} y1={base} y2={base} stroke={C.inkFaint} strokeWidth={2} />
        {bars.map((b, i) => {
          const p = ease.out(prog(frame, b.at, b.at + 22));
          if (p <= 0) return null;
          const h = b.v * scale * p;
          return (
            <g key={i}>
              <rect x={b.x - 56} y={base - h} width={112} height={h} rx={8} fill={b.color} opacity={0.88} />
              <text x={b.x} y={base - h - 22} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 54}} fill={b.color}>
                {Math.round(b.v * p)}
              </text>
              <text x={b.x} y={base + 44} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28}} fill={C.inkDim}>
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
      {/* 分组标签 */}
      <div style={{position: 'absolute', left: 150, width: 310, top: base - 330, textAlign: 'center', opacity: prog(frame, 2262, 2276)}}>
        <div style={{display: 'inline-block', padding: '8px 20px', borderRadius: 12, border: `2px solid ${C.red}`, fontFamily: FONT.sans, fontWeight: 900, fontSize: 30, color: C.red, background: 'rgba(30,8,6,0.8)'}}>
          “赢了”这一局
        </div>
      </div>
      <div style={{position: 'absolute', left: 620, width: 310, top: base - 630, textAlign: 'center', opacity: prog(frame, 2346, 2360)}}>
        <div style={{display: 'inline-block', padding: '8px 20px', borderRadius: 12, border: `2px solid ${C.coop}`, fontFamily: FONT.sans, fontWeight: 900, fontSize: 30, color: C.coop, background: 'rgba(6,26,20,0.8)'}}>
          平局 · 但都高分
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ParadoxScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= T1) return null;
  const vsAllD = playMatch('tft', 'alld');
  const vsSelf = playMatch('tft', 'tft');
  const zeroO = envelope(frame, 1994, 2076, 6, 10);
  const zeroIn = prog(frame, 2000, 2010, ease.out);
  const cardsO = envelope(frame, 2070, 2242, 4, 10);
  return (
    <AbsoluteFill>
      {/* 巨大的 0 胜 */}
      {zeroO > 0 ? (
        <div style={{position: 'absolute', top: 330, left: 0, right: 0, textAlign: 'center', opacity: zeroO}}>
          <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 28, letterSpacing: '0.42em', color: C.inkDim}}>以牙还牙 · 胜场数</div>
          <div
            style={{
              fontFamily: FONT.num,
              fontWeight: 700,
              fontSize: 520,
              lineHeight: 1.05,
              color: C.red,
              textShadow: `0 0 90px ${C.red}88`,
              transform: `scale(${interpolate(zeroIn, [0, 1], [1.8, 1])})`,
              opacity: zeroIn,
            }}
          >
            0
          </div>
          <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, letterSpacing: '0.5em', color: C.red}}>WINS</div>
        </div>
      ) : null}
      <div style={{position: 'absolute', inset: 0, opacity: cardsO}}>
        <MatchCard
          frame={frame}
          at={2076}
          y={330}
          left={{ch: '牙', color: C.gold, name: '以牙还牙'}}
          right={{ch: '叛', color: C.red, name: '永远背叛'}}
          score={[vsAllD.scoreA, vsAllD.scoreB]}
          stamp={{text: '输 5 分', color: C.red, at: 2118}}
        />
        <MatchCard
          frame={frame}
          at={2158}
          y={700}
          left={{ch: '牙', color: C.gold, name: '以牙还牙'}}
          right={{ch: '善', color: C.coop, name: '善良的人'}}
          score={[vsSelf.scoreA, vsSelf.scoreB]}
          stamp={{text: '平局', color: C.inkDim, at: 2200}}
        />
      </div>
      <Compare frame={frame} />
      <Headline text="比的是<g>总分</g>，不是<r>输赢</r>" from={2324} to={T1} y={300} size={84} stagger={1.6} />
    </AbsoluteFill>
  );
};
