/**
 * 0:18 便宜阶段：
 *  ① 人群举牌：5、10、15……报价器一路往上
 *  ② 涨到 50，大多数人放下牌子，只剩“你”和“他”
 *  ③ 拍卖师已收 45 + 50 = 95 元；再加一口就超过 100，“稳赚不赔”
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Banknote, Paddle, Ticker} from '../components/Props';
import {Stamp} from '../components/Token';
import {ease, envelope, prog} from '../lib/anim';
import {bidOf, standing} from '../math/auction';
import {BID_AT, bidIndexAt} from '../timeline';
import {C, FONT} from '../theme';

const T0 = 560;
const T1 = 1014;

/** 前 10 口的举牌位置；第 9 口是你，第 10 口是他 */
const SLOTS: Record<number, {x: number; y: number}> = {
  1: {x: 200, y: 720},
  2: {x: 380, y: 720},
  3: {x: 560, y: 720},
  4: {x: 740, y: 720},
  5: {x: 900, y: 720},
  6: {x: 200, y: 900},
  7: {x: 560, y: 900},
  8: {x: 900, y: 900},
  9: {x: 380, y: 900},
  10: {x: 740, y: 900},
};
const DUO = {you: {x: 230, y: 740}, him: {x: 850, y: 740}};

export const CheapScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= T1) return null;
  const o = envelope(frame, T0, T1, 10, 8);
  const k = Math.min(10, bidIndexAt(frame));
  const crowdOut = prog(frame, 730, 790, ease.inOut);
  const duo = prog(frame, 812, 842, ease.inOut);
  const panel = prog(frame, 820, 840, ease.out);
  const over = prog(frame, 916, 940, ease.out);
  const s = standing(10);

  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 286}}>
        <Ticker value={bidOf(k)} size={120} />
      </div>
      <div style={{position: 'absolute', left: 360, top: 476, opacity: 1 - 0.5 * duo}}>
        <Banknote frame={frame} w={360} spin={Math.sin(frame * 0.04) * 8} />
      </div>

      {/* 举牌的人群 */}
      {Array.from({length: 10}).map((_, i) => {
        const kk = i + 1;
        const at = BID_AT[kk];
        if (frame < at - 4) return null;
        const isYou = kk === 9;
        const isHim = kk === 10;
        const isDuo = isYou || isHim;
        const raise = prog(frame, at, at + 10) * (isDuo ? 1 : 1 - crowdOut);
        const dim = isDuo ? 0 : crowdOut;
        const from = SLOTS[kk];
        const to = isYou ? DUO.you : isHim ? DUO.him : from;
        const x = interpolate(duo, [0, 1], [from.x, to.x]);
        const y = interpolate(duo, [0, 1], [from.y, to.y]);
        const size = isDuo ? interpolate(duo, [0, 1], [110, 160]) : 110;
        const color = isYou ? C.gold : isHim ? C.blue : '#C9C1B4';
        return (
          <div key={kk} style={{position: 'absolute', left: x - size / 2, top: y, opacity: 1 - dim * 0.9}}>
            <Paddle label={String(bidOf(kk))} sub={isYou ? '你' : isHim ? '他' : undefined} color={color} size={size} raise={raise} />
          </div>
        );
      })}

      {/* 拍卖师已收 */}
      {panel > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 350,
            width: 380,
            top: 780,
            padding: '20px 0 26px',
            borderRadius: 24,
            border: `2px solid ${C.amber}`,
            background: 'rgba(28,18,6,0.9)',
            textAlign: 'center',
            opacity: panel,
            transform: `translateY(${(1 - panel) * 30}px)`,
            boxShadow: `0 0 ${40 + 40 * over}px ${C.amber}${over > 0 ? '77' : '33'}`,
          }}
        >
          <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 26, color: C.inkDim, letterSpacing: '0.2em'}}>拍卖师已收</div>
          <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 96, lineHeight: 1.05, color: C.amber}}>
            ¥{Math.round(interpolate(over, [0, 1], [s.revenue, s.revenue + 10]))}
          </div>
          <div style={{fontFamily: FONT.num, fontWeight: 500, fontSize: 30, color: C.inkDim}}>
            {over > 0.5 ? '55 + 50' : `${s.you} + ${s.him}`}
          </div>
          {/* 与面值 100 的对比条 */}
          <div style={{position: 'relative', margin: '16px 30px 0', height: 14, borderRadius: 7, background: C.inkFaint}}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.min(100, (interpolate(over, [0, 1], [s.revenue, s.revenue + 10]) / 120) * 100)}%`,
                borderRadius: 7,
                background: over > 0.5 ? C.gold : C.amber,
              }}
            />
            <div style={{position: 'absolute', left: `${(100 / 120) * 100}%`, top: -10, bottom: -10, width: 3, background: C.coop}} />
            <div style={{position: 'absolute', left: `${(100 / 120) * 100}%`, top: 22, transform: 'translateX(-50%)', fontFamily: FONT.num, fontSize: 20, color: C.coop}}>100</div>
          </div>
        </div>
      ) : null}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1066, display: 'flex', justifyContent: 'center'}}>
        <Stamp text="稳赚不赔" sub="AUCTIONEER WINS" color={C.gold} p={prog(frame, 918, 926, ease.out)} rotate={-6} size={0.7} />
      </div>
    </AbsoluteFill>
  );
};
