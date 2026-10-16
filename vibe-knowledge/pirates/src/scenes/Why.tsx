/**
 * 1:07 原理
 *  ① 为什么 1 号这么强？
 *  ② 每一票的价码 = 下一轮能拿的 + 1：2 号 100（太贵）、3 号 1、4 号 2、5 号 1 → 买最便宜的两票
 *  ③ 规则写着“一半就够”：提案权 = 最大的权力
 *  ④ 最小获胜联盟：只拉 2 人自己留 98，拉 3 人留 96，拉 4 人根本不够分
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {KineticText} from '../components/KineticText';
import {Pirate} from '../components/Pirate';
import {Stamp} from '../components/Token';
import {Kicker} from '../components/ui';
import {ease, envelope, prog} from '../lib/anim';
import {COINS, PRICES} from '../math/pirates';
import {C, FONT} from '../theme';

const Question: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2012, 2100, 10, 8);
  if (o <= 0) return null;
  const p = prog(frame, 2016, 2030, ease.back);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(540, 600) scale(${p * 1.6})`}>
          <Pirate n={1} r={70} captain={1} />
        </g>
      </svg>
      <div style={{position: 'absolute', top: 820, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <KineticText text="凭什么是 <g>98</g>？" frame={frame - 2020} duration={78} size={120} font={FONT.serif} weight={900} mode="slam" stagger={2.2} />
      </div>
    </AbsoluteFill>
  );
};

/** 价码牌 */
const Prices: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2098, 2184, 10, 8);
  if (o <= 0) return null;
  const cheap = prog(frame, 2130, 2142, ease.out);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="THE PRICE OF A VOTE" zh="每一票的价码" opacity={prog(frame, 2100, 2114)} y={268} color={C.blue} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform="translate(140, 640)">
          <Pirate n={1} r={56} captain={1} />
        </g>
        <text x={140} y={760} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28}} fill={C.goldHot}>
          出钱的人
        </text>
        {PRICES.map((price, i) => {
          const x = 340 + i * 180;
          const p = prog(frame, 2104 + i * 5, 2118 + i * 5, ease.back);
          const affordable = price <= 1;
          const tooMuch = price >= COINS;
          const col = affordable ? C.blue : tooMuch ? C.red : C.inkDim;
          return (
            <g key={i} opacity={Math.min(1, p)}>
              <g transform={`translate(${x}, 640)`}>
                <Pirate n={i + 2} r={50} color={affordable && cheap > 0 ? C.blue : C.seaHot} dim={!affordable && cheap > 0 ? 0.6 * cheap : 0} />
              </g>
              <line x1={x} x2={x} y1={694} y2={760} stroke={col} strokeWidth={2} strokeDasharray="4 4" />
              <g transform={`translate(${x}, 820) rotate(${(i % 2 ? 1 : -1) * 4 * Math.sin(frame * 0.12 + i)})`}>
                <rect x={-72} y={-56} width={144} height={112} rx={16} fill={C.panel} stroke={col} strokeWidth={affordable ? 4 : 2} style={affordable && cheap > 0 ? {filter: `drop-shadow(0 0 ${16 * cheap}px ${C.blue})`} : undefined} />
                <text y={-20} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 22}} fill={C.inkDim}>
                  价码
                </text>
                <text y={36} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 56}} fill={affordable ? C.blueHot : tooMuch ? C.redHot : C.ink}>
                  {price}
                </text>
              </g>
              <text x={x} y={920} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 26}} fill={col} opacity={cheap}>
                {affordable ? '最便宜 ✓' : tooMuch ? '太贵' : '贵一点'}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 990, textAlign: 'center', fontFamily: FONT.sans, fontWeight: 700, fontSize: 30, color: C.inkDim, opacity: prog(frame, 2112, 2124)}}>
        价码 = 他在 1 号落水后那一轮能拿的金币 + 1
      </div>
    </AbsoluteFill>
  );
};

/** 提案权 */
const Power: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2180, 2262, 8, 8);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {[1, 2, 3, 4, 5].map((n, i) => {
          const inside = n === 1 || n === 3 || n === 5;
          return (
            <g key={n} transform={`translate(${180 + i * 180}, 700)`}>
              <Pirate n={n} r={54} captain={n === 1 ? 1 : 0} color={inside ? C.coop : C.seaHot} vote={inside ? 'yes' : 'no'} voteP={prog(frame, 2190 + i * 3, 2200 + i * 3, ease.back)} dim={inside ? 0 : 0.5} />
            </g>
          );
        })}
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 820, textAlign: 'center', opacity: prog(frame, 2200, 2212)}}>
        <span style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 90, color: C.coop}}>3 / 5</span>
        <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.coopHot, marginLeft: 20}}>≥ 一半</span>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 420, display: 'flex', justifyContent: 'center'}}>
        <Stamp text="提案权" sub="AGENDA POWER" color={C.gold} p={prog(frame, 2182, 2190, ease.out)} rotate={-6} size={1.1} />
      </div>
    </AbsoluteFill>
  );
};

/** 最小获胜联盟 */
const Coalition: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2258, 2462, 10, 8);
  if (o <= 0) return null;
  const rows = [
    {who: '拉 2 人（3 号、5 号）', keep: 98, ok: true, at: 2344},
    {who: '再多拉 4 号', keep: 96, ok: true, at: 2362},
    {who: '把 2 号也拉上', keep: null, ok: false, at: 2380},
  ];
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="MINIMAL WINNING COALITION" zh="最小获胜联盟" opacity={prog(frame, 2262, 2276)} y={268} color={C.coop} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 420, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 700, fontSize: 22, letterSpacing: '0.16em', color: C.inkDim, opacity: prog(frame, 2276, 2290)}}>
        WILLIAM RIKER · 1962
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', fontFamily: FONT.sans, fontWeight: 900, fontSize: 44, color: C.ink, opacity: prog(frame, 2282, 2296)}}>
        只拉<span style={{color: C.coop}}>刚好够赢</span>的人
      </div>
      <div style={{position: 'absolute', left: 110, right: 110, top: 580, display: 'flex', flexDirection: 'column', gap: 20}}>
        {rows.map((r, i) => {
          const p = prog(frame, r.at, r.at + 12, ease.out);
          const w = r.keep ? (r.keep / COINS) * 100 : 100;
          return (
            <div key={i} style={{opacity: p, transform: `translateX(${(1 - p) * -30}px)`}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: FONT.sans, fontWeight: 900, fontSize: 32, color: r.ok ? C.ink : C.redHot, marginBottom: 8}}>
                <span>{r.who}</span>
                <span style={{fontFamily: FONT.num, fontWeight: 700, color: r.ok ? (i === 0 ? C.gold : C.goldHot) : C.red}}>{r.keep !== null ? `自己留 ${r.keep}` : '要 104 枚，不够分'}</span>
              </div>
              <div style={{height: 34, borderRadius: 17, background: C.inkFaint, overflow: 'hidden'}}>
                <div style={{height: '100%', width: `${w * p}%`, background: r.ok ? `linear-gradient(90deg, #b07a1c, ${C.gold})` : C.red, opacity: r.ok ? (i === 0 ? 1 : 0.7) : 0.6}} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const WhyScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 2010 || frame >= 2462) return null;
  return (
    <AbsoluteFill>
      <Question frame={frame} />
      <Prices frame={frame} />
      <Power frame={frame} />
      <Coalition frame={frame} />
    </AbsoluteFill>
  );
};
