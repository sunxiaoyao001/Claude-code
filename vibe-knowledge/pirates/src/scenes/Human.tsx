/**
 * 1:22 人性：理性海盗 vs 真实的人
 *  ① 理性海盗的答案：98 : 0 : 1 : 0 : 1
 *  ② 第四集回顾：最后通牒博弈里，低于 2 成的分法约一半被拒绝；1 枚 = 1%，落在“红区”深处
 *  ③ 真实的 3 号和 5 号投了反对票 → 1 号被扔下海
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Pirate, Vote} from '../components/Pirate';
import {Deck, Sea, Splash} from '../components/Sea';
import {Kicker} from '../components/ui';
import {ease, envelope, prog} from '../lib/anim';
import {FINAL} from '../math/pirates';
import {C, FONT} from '../theme';

const Rational: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2462, 2552, 10, 8);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="RATIONAL PIRATES" zh="理性海盗的答案" opacity={prog(frame, 2466, 2480)} y={268} color={C.gold} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {FINAL.map((v, i) => {
          const x = 180 + i * 180;
          const p = prog(frame, 2470 + i * 4, 2484 + i * 4, ease.back);
          return (
            <g key={i}>
              <g transform={`translate(${x}, 700) scale(${p})`}>
                <Pirate n={i + 1} r={56} captain={i === 0 ? 1 : 0} color={v > 0 && i > 0 ? C.blue : C.seaHot} />
              </g>
              <text x={x} y={860} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: i === 0 ? 96 : 72}} fill={i === 0 ? C.gold : v > 0 ? C.blueHot : C.inkDim} opacity={p}>
                {v}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** 第四集回顾：0～100% 的出价轴，0～20% 是红区 */
const Callback: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2548, 2790, 10, 8);
  if (o <= 0) return null;
  const zone = prog(frame, 2632, 2652, ease.out);
  const mark = prog(frame, 2712, 2726, ease.back);
  const X0 = 120;
  const W = 840;
  const X = (pct: number) => X0 + (pct / 100) * W;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', opacity: prog(frame, 2552, 2566)}}>
        <div style={{display: 'inline-block', padding: '10px 26px', borderRadius: 999, border: `2px solid ${C.red}`, fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, letterSpacing: '0.24em', color: C.redHot}}>
          EP.04 · ULTIMATUM GAME
        </div>
        <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 72, color: C.ink, marginTop: 20}}>最后通牒博弈</div>
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: prog(frame, 2560, 2576)}}>
        <text x={X0 + W} y={660} textAnchor="end" style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 28}} fill={C.inkDim}>
          分给对方的比例
        </text>
        <rect x={X0} y={700} width={W} height={26} rx={13} fill={C.inkFaint} />
        <rect x={X0} y={700} width={(X(20) - X0) * zone} height={26} rx={13} fill={C.red} style={{filter: `drop-shadow(0 0 12px ${C.red})`}} />
        {[0, 20, 50, 100].map((v) => (
          <g key={v}>
            <line x1={X(v)} x2={X(v)} y1={690} y2={736} stroke={C.ink} strokeOpacity={0.5} strokeWidth={2} />
            <text x={X(v)} y={776} textAnchor={v === 0 ? 'start' : v === 100 ? 'end' : 'middle'} style={{fontFamily: FONT.num, fontWeight: 500, fontSize: 26}} fill={C.inkDim}>
              {v}%
            </text>
          </g>
        ))}
        {zone > 0 ? (
          <g opacity={zone}>
            <text x={X0} y={850} textAnchor="start" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 36}} fill={C.red}>
              低于 2 成：约一半被拒绝
            </text>
          </g>
        ) : null}
        {mark > 0 ? (
          <g transform={`translate(${X(1)}, 713) scale(${mark})`}>
            <circle r={26} fill={C.gold} stroke="#fff" strokeWidth={4} />
            <text y={-48} textAnchor="start" x={-10} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34}} fill={C.goldHot}>
              1 枚 = 1%
            </text>
          </g>
        ) : null}
      </svg>
      {mark > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 920, textAlign: 'center', opacity: Math.min(1, mark)}}>
          <span style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 150, color: C.red, textShadow: `0 0 50px ${C.red}88`}}>1%</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** 真实海盗：反对票 → 1 号落水 */
const DECK_Y = 760;
const PX = [150, 290, 430, 570, 710];

const Overboard: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2780, 2852, 6, 6);
  if (o <= 0) return null;
  const votes: Vote[] = ['yes', 'no', 'no', 'no', 'no'];
  const vp = prog(frame, 2786, 2794, ease.back);
  const push = prog(frame, 2794, 2802, ease.in);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <Sea y={DECK_Y + 130} frame={frame} bottom={1180} />
        <Deck y={DECK_Y} />
        {PX.map((x, i) => {
          const isOne = i === 0;
          if (isOne && frame >= 2806) return null;
          const px = isOne ? interpolate(push, [0, 1], [x, 1000]) : x;
          const py = isOne ? DECK_Y - 56 + push * push * 200 : DECK_Y - 56;
          return (
            <g key={i} transform={`translate(${px}, ${py}) rotate(${isOne ? push * 80 : 0})`}>
              <Pirate n={i + 1} r={50} captain={isOne ? 1 : 0} vote={votes[i]} voteP={vp} color={i === 2 || i === 4 ? C.red : C.seaHot} />
            </g>
          );
        })}
        <Splash x={1000} y={DECK_Y + 135} p={prog(frame, 2802, 2832)} />
      </svg>
      <div style={{position: 'absolute', right: 70, top: 440, textAlign: 'right', opacity: prog(frame, 2790, 2798)}}>
        <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 80, color: C.red}}>1 / 5</div>
        <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34, color: C.redHot}}>3 号、5 号也反对</div>
      </div>
    </AbsoluteFill>
  );
};

export const HumanScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 2460 || frame >= 2852) return null;
  return (
    <AbsoluteFill>
      <Rational frame={frame} />
      <Callback frame={frame} />
      <Overboard frame={frame} />
    </AbsoluteFill>
  );
};
