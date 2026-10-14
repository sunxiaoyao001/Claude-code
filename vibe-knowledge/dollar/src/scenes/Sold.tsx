/**
 * 0:54 成交：他在 240 放弃 → 落槌“成交 ¥245” → 三方结算：你 −145 / 他 −240 / 拍卖师 +385
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Gavel} from '../components/Props';
import {Stamp, Token} from '../components/Token';
import {countUp, ease, envelope, prog} from '../lib/anim';
import {finalResult} from '../math/auction';
import {SOLD_AT} from '../timeline';
import {C, FONT} from '../theme';

const T0 = 1644;
const T1 = 1924;

export const SoldScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= T1) return null;
  const o = envelope(frame, T0, T1, 6, 8);
  const r = finalResult();
  const cols = [
    {ch: '你', color: C.gold, value: r.youNet, at: 1732, note: `花 ${r.winnerPaid} 元，买到一张 100`},
    {ch: '他', color: C.blue, value: r.himNet, at: 1822, note: `付了 ${r.loserPaid} 元，什么也没有`},
    {ch: '拍', color: C.amber, value: r.auctioneerNet, at: 1840, note: `收 ${r.revenue}，卖出 100`},
  ];
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 290, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 30}}>
        <Gavel frame={frame} strikeAt={SOLD_AT} size={180} />
        <div style={{transform: `scale(${interpolate(prog(frame, SOLD_AT, SOLD_AT + 10, ease.back), [0, 1], [0.6, 1])})`, opacity: prog(frame, SOLD_AT, SOLD_AT + 6)}}>
          <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 110, color: C.ink, lineHeight: 1}}>成交</div>
          <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 84, color: C.red, lineHeight: 1.1}}>¥{r.winnerPaid}</div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 60, right: 60, top: 640, display: 'flex', justifyContent: 'space-between'}}>
        {cols.map((c) => {
          const p = prog(frame, c.at, c.at + 12, ease.back);
          const v = Math.round(countUp(frame, c.at + 2, c.at + 26, 0, c.value));
          return (
            <div key={c.ch} style={{width: 300, textAlign: 'center', opacity: Math.min(1, p), transform: `translateY(${(1 - Math.min(1, p)) * 40}px)`}}>
              <svg width={200} height={200} viewBox="-100 -100 200 200">
                <Token ch={c.ch} color={c.color} r={70} spin={frame * 0.5} />
              </svg>
              <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 86, lineHeight: 1.1, color: c.value >= 0 ? C.gold : C.red, textShadow: `0 0 40px ${c.value >= 0 ? C.gold : C.red}66`}}>
                {v >= 0 ? `+${v}` : `−${Math.abs(v)}`}
              </div>
              <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 24, color: C.inkDim, marginTop: 8, lineHeight: 1.4}}>{c.note}</div>
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1110, display: 'flex', justifyContent: 'center'}}>
        <Stamp text="两败俱伤" sub="BOTH LOSE" color={C.red} p={prog(frame, 1828, 1836, ease.out)} rotate={-5} size={0.62} />
      </div>
    </AbsoluteFill>
  );
};
