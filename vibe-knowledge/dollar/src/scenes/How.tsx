/**
 * 1:39 解法 + 片尾
 *  ① 三张卡：先定止损线 / 沉没成本不是理由 / 最好的出价是不出价（金色高亮）
 *  ② 片尾金句：有些游戏，不玩就是赢；互动按钮；下期预告
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {KineticText} from '../components/KineticText';
import {Icon} from '../components/Token';
import {Kicker} from '../components/ui';
import {ease, envelope, prog} from '../lib/anim';
import {C, FONT} from '../theme';

const T0 = 2970;

const CARDS = [
  {no: '01', zh: '先定止损线', en: 'SET YOUR LIMIT BEFORE YOU BID', at: 3050, color: C.coop},
  {no: '02', zh: '沉没成本，不是继续的理由', en: 'SUNK COST IS NOT A REASON', at: 3124, color: C.coop},
  {no: '03', zh: '最好的出价：不出价', en: 'THE WINNING MOVE: DON’T BID', at: 3232, color: C.gold},
];

const Cards: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2974, 3334, 10, 10);
  if (o <= 0) return null;
  const focus = prog(frame, 3232, 3246, ease.out);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="HOW NOT TO GET TRAPPED" zh="怎么不掉进去？" opacity={prog(frame, 2976, 2990)} y={290} color={C.coop} />
      {CARDS.map((c, i) => {
        const p = prog(frame, c.at, c.at + 12, ease.back);
        if (p <= 0) return null;
        const last = i === 2;
        const dim = last ? 0 : focus;
        return (
          <div
            key={c.no}
            style={{
              position: 'absolute',
              left: 80,
              right: 80,
              top: 470 + i * 230,
              height: 200,
              borderRadius: 26,
              border: `${last ? 4 : 2}px solid ${last && focus > 0 ? C.gold : C.inkFaint}`,
              background: last && focus > 0 ? `linear-gradient(160deg, ${C.gold}33, rgba(14,12,16,0.92) 70%)` : C.panel,
              boxShadow: last ? `0 0 ${80 * focus}px ${C.gold}66` : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 30,
              padding: '0 36px',
              opacity: Math.min(1, p) * (1 - 0.5 * dim),
              transform: `scale(${0.9 + 0.1 * Math.min(1, p) + (last ? 0.04 * focus : 0)})`,
            }}
          >
            <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 64, color: c.color, width: 90}}>{c.no}</div>
            <div>
              <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: last ? 58 : 50, color: C.ink, letterSpacing: '0.04em'}}>{c.zh}</div>
              <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 20, color: C.inkDim, marginTop: 10, letterSpacing: '0.14em'}}>{c.en}</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{frame: number}> = ({frame}) => {
  if (frame < 3330) return null;
  const icons = [
    {k: 'like' as const, t: '点赞', c: C.red},
    {k: 'comment' as const, t: '评论', c: C.gold},
    {k: 'star' as const, t: '收藏', c: C.ink},
    {k: 'share' as const, t: '转发', c: C.ink},
  ];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 470, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20}}>
        <KineticText text="有些游戏" frame={frame - 3334} duration={400} size={84} font={FONT.serif} weight={900} mode="slam" stagger={2} />
        <KineticText text="<g>不玩，就是赢</g>" frame={frame - 3352} duration={400} size={120} font={FONT.serif} weight={900} mode="slam" stagger={2.4} />
      </div>
      <div style={{position: 'absolute', top: 860, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 64}}>
        {icons.map((ic, i) => {
          const p = prog(frame, 3384 + i * 5, 3396 + i * 5, ease.back);
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
          opacity: prog(frame, 3410, 3424),
        }}
      >
        <span style={{fontFamily: FONT.mono, color: C.gold, marginRight: 14}}>NEXT</span>下期拆解：最后通牒博弈
      </div>
    </AbsoluteFill>
  );
};

export const HowScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0) return null;
  return (
    <AbsoluteFill>
      <Cards frame={frame} />
      <EndCard frame={frame} />
    </AbsoluteFill>
  );
};
