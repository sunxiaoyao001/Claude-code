/**
 * 1:30 现实：
 *  ① 三维漂浮的描边大字：价格战 / 补贴大战 / 军备竞赛 / 赌桌回本 / 内卷加码
 *  ② 左右两块号码牌轮流举起，数字越喊越高——谁也不敢先停
 *  ③ 落槌：“美元拍卖”
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Gavel, Paddle} from '../components/Props';
import {Headline} from '../components/ui';
import {ease, envelope, prog} from '../lib/anim';
import {C, FONT} from '../theme';

const T0 = 2700;
const T1 = 2974;

const WORDS = [
  {t: '价格战', x: 540, y: 440, at: 2706, size: 130},
  {t: '补贴大战', x: 760, y: 780, at: 2716, size: 110},
  {t: '军备竞赛', x: 320, y: 950, at: 2726, size: 110},
  {t: '赌桌回本', x: 740, y: 1110, at: 2736, size: 96},
  {t: '内卷加码', x: 300, y: 610, at: 2746, size: 96},
];

export const WorldScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= T1) return null;
  const wordsO = envelope(frame, 2702, 2800, 10, 14);
  const duelO = envelope(frame, 2792, 2882, 10, 8);
  const beat = Math.floor((frame - 2796) / 10);
  const finalO = envelope(frame, 2874, T1, 6, 6);
  return (
    <AbsoluteFill>
      {wordsO > 0 ? (
        <AbsoluteFill style={{perspective: 900, opacity: wordsO}}>
          {WORDS.map((w, i) => {
            const p = prog(frame, w.at, w.at + 14, ease.out);
            const z = interpolate(frame, [w.at, 2810], [-500, 160]);
            return (
              <div
                key={w.t}
                style={{
                  position: 'absolute',
                  left: w.x,
                  top: w.y,
                  transform: `translate(-50%, -50%) translateZ(${z}px) rotateY(${(i % 2 ? -1 : 1) * 14}deg)`,
                  fontFamily: FONT.serif,
                  fontWeight: 900,
                  fontSize: w.size,
                  color: 'transparent',
                  WebkitTextStroke: `2px ${i === 0 ? C.red : C.ink}`,
                  opacity: p * 0.8,
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.06em',
                }}
              >
                {w.t}
              </div>
            );
          })}
        </AbsoluteFill>
      ) : null}
      {duelO > 0 ? (
        <AbsoluteFill style={{opacity: duelO}}>
          {(['you', 'him'] as const).map((who, i) => {
            const myTurn = beat % 2 === i;
            const amount = 100 + Math.max(0, beat) * 5 + (myTurn ? 5 : 0);
            return (
              <div key={who} style={{position: 'absolute', left: i ? 700 : 180, top: 620}}>
                <Paddle label={String(amount)} sub={i ? '他' : '你'} color={i ? C.blue : C.gold} size={200} raise={myTurn ? 1 : 0.15} />
              </div>
            );
          })}
          <div style={{position: 'absolute', left: 0, right: 0, top: 500, textAlign: 'center', fontFamily: FONT.serif, fontWeight: 900, fontSize: 64, color: C.red}}>
            谁先停，谁亏光
          </div>
        </AbsoluteFill>
      ) : null}
      {finalO > 0 ? (
        <AbsoluteFill style={{opacity: finalO}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 760, display: 'flex', justifyContent: 'center'}}>
            <Gavel frame={frame} strikeAt={2878} size={230} />
          </div>
        </AbsoluteFill>
      ) : null}
      <Headline text="<r>美元拍卖</r>" from={2878} to={T1} y={420} size={190} stagger={3} kicker="THE  DOLLAR  AUCTION" />
    </AbsoluteFill>
  );
};
