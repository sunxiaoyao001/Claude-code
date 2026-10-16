/**
 * 开场三幕
 *  0:00 钩子：100 枚金币落成一堆 → 船长站在跳板尽头，脚下是海 → 金币滑向他：98
 *  0:05 规则：5 个海盗站上甲板；1 号提方案、全员投票；过半通过的演示，不足一半的演示（1 号走跳板落水）；
 *       海盗的三条偏好
 *  0:20 直觉：平分 20？多分给别人？——印章“都错了”
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Coin, CoinStack} from '../components/Coins';
import {KineticText} from '../components/KineticText';
import {Pirate, Vote} from '../components/Pirate';
import {Deck, Sea, Splash} from '../components/Sea';
import {Stamp} from '../components/Token';
import {ease, envelope, hash, prog} from '../lib/anim';
import {C, FONT} from '../theme';

/* ============================================================
 * 钩子
 * ========================================================== */
const PILE = Array.from({length: 45}).map((_, i) => {
  // 金字塔形的金币堆
  const row = Math.floor((Math.sqrt(8 * i + 1) - 1) / 2);
  const col = i - (row * (row + 1)) / 2;
  const rows = 9;
  const y = 760 - (rows - 1 - row) * 26;
  const x = 360 + (col - row / 2) * 52 + (hash(i) - 0.5) * 10;
  return {x, y, at: 6 + i * 0.6, r: 30}; // 45 枚排成 9 层金字塔
});

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= 152) return null;
  const out = prog(frame, 136, 150, ease.in);
  const plank = prog(frame, 40, 52, ease.out);
  const slide = prog(frame, 88, 104, ease.inOut);
  const big = prog(frame, 92, 104, ease.back);
  const lines = [
    {text: '5 个海盗，分 100 枚金币', at: 4, size: 84},
    {text: '提方案的，<r>随时被扔下海</r>', at: 40, size: 90},
    {text: '他却能拿走 <g>98</g> 枚', at: 86, size: 104},
  ];
  return (
    <AbsoluteFill style={{opacity: 1 - out}}>
      <div
        style={{
          position: 'absolute',
          top: 236,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT.mono,
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: '0.42em',
          color: C.gold,
          opacity: envelope(frame, 2, 150, 6, 6) * (Math.floor(frame / 5) % 2 ? 1 : 0.55),
        }}
      >
        ● THE PIRATE GAME
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <Sea y={830} frame={frame} bottom={980} />
        {/* 跳板与船长 */}
        <g opacity={plank}>
          <rect x={700} y={772} width={360} height={16} rx={3} fill={C.woodHot} />
          <g transform={`translate(${interpolate(plank, [0, 1], [1100, 930])}, 712) rotate(${Math.sin(frame * 0.25) * 4})`}>
            <Pirate n={1} r={48} captain={1} />
          </g>
        </g>
        {/* 金币堆：落下 → 滑向船长 */}
        {PILE.map((c, i) => {
          const fall = prog(frame, c.at - 8, c.at, ease.in);
          if (fall <= 0) return null;
          const keep = i !== 40 && i !== 42; // 绝大多数金币滑向船长，底层留下两枚
          const tx = keep ? interpolate(slide, [0, 1], [c.x, 900 + (hash(i * 3) - 0.5) * 140]) : c.x;
          const ty = keep ? interpolate(slide, [0, 1], [c.y, 640 + (hash(i * 5) - 0.5) * 80]) : c.y;
          const y = interpolate(fall, [0, 1], [300, ty]);
          return <Coin key={i} x={tx} y={y} r={c.r} spin={(1 - fall) * 6 + i} opacity={keep ? 1 - slide : 1} />;
        })}
        {big > 0 ? (
          <g>
            <CoinStack x={830} y={770} amount={98} unit={5} w={90} slice={11} p={big} />
            <text x={830} y={770 - 20 * 11 * Math.min(1, big) - 40} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 130}} fill={C.gold} opacity={Math.min(1, big)}>
              98
            </text>
          </g>
        ) : null}
      </svg>
      <div style={{position: 'absolute', top: 1000, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
        {lines.map((l, i) =>
          frame >= l.at ? (
            <KineticText
              key={i}
              text={l.text}
              frame={frame - l.at}
              duration={400}
              size={l.size}
              maxWidth={960}
              font={FONT.serif}
              weight={900}
              mode="slam"
              stagger={1.6}
              letterSpacing="0.04em"
              lineHeight={1.15}
              style={{opacity: i < 2 && frame > 86 ? 0.85 : 1}}
            />
          ) : (
            <div key={i} style={{height: l.size * 1.15}} />
          ),
        )}
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
 * 规则
 * ========================================================== */
const DECK_Y = 760;
const PX = [150, 290, 430, 570, 710];
const PY = DECK_Y - 56;

/** 两次投票演示：先通过，再不足一半 */
const votesAt = (f: number): Vote[] => {
  if (f >= 322 && f < 398) return ['yes', 'yes', 'yes', 'no', 'no'];
  if (f >= 402 && f < 418) return ['yes', 'no', 'no', 'no', 'no'];
  return [null, null, null, null, null];
};

export const RulesScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 150 || frame >= 604) return null;
  const o = envelope(frame, 150, 604, 12, 8);
  const votes = votesAt(frame);
  const voteP = frame < 398 ? prog(frame, 322, 332, ease.back) : prog(frame, 402, 410, ease.back);
  // 1 号走跳板：418 → 440 走到尽头，440 → 450 落水
  const walk = prog(frame, 418, 440, ease.inOut);
  const fall = prog(frame, 440, 452, ease.in);
  const gone = frame >= 452 && frame < 478;
  const back = prog(frame, 478, 490); // 演示结束：1 号回到甲板，重新开始
  const captain2 = envelope(frame, 456, 480, 10, 4);
  const card = prog(frame, 242, 256, ease.out) * (1 - prog(frame, 314, 322));
  const prefs = envelope(frame, 480, 560, 10, 6);
  const ask = prog(frame, 560, 574, ease.back);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <Sea y={DECK_Y + 130} frame={frame} bottom={1180} />
        <Deck y={DECK_Y} plank={prog(frame, 400, 414)} />
        {/* 资历箭头 */}
        <g opacity={prog(frame, 182, 196) * (1 - prog(frame, 236, 246))}>
          <line x1={PX[0]} x2={PX[4]} y1={DECK_Y + 70} y2={DECK_Y + 70} stroke={C.gold} strokeWidth={4} />
          <path d={`M ${PX[4]} ${DECK_Y + 70} l -18 -10 l 0 20 Z`} fill={C.gold} />
          <text x={PX[0]} y={DECK_Y + 110} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28}} fill={C.goldHot}>
            资历最高
          </text>
          <text x={PX[4]} y={DECK_Y + 110} textAnchor="end" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28}} fill={C.inkDim}>
            资历最低
          </text>
        </g>
        {PX.map((x, i) => {
          const p = prog(frame, 160 + i * 4, 174 + i * 4, ease.back);
          if (p <= 0) return null;
          const isOne = i === 0;
          if (isOne && gone) return null;
          const returned = isOne && frame >= 478;
          const px = isOne && !returned ? interpolate(walk, [0, 1], [x, 1000]) : x;
          const py = isOne && !returned ? PY + fall * 220 : PY;
          const rot = isOne && !returned ? fall * 70 : 0;
          const oo = isOne ? (returned ? back : 1 - prog(fall, 0.7, 1)) : 1;
          return (
            <g key={i} transform={`translate(${px}, ${py}) rotate(${rot}) scale(${p})`} opacity={oo}>
              <Pirate n={i + 1} r={50} captain={isOne ? 1 : i === 1 ? captain2 : 0} vote={votes[i]} voteP={voteP} />
            </g>
          );
        })}
        <Splash x={1000} y={DECK_Y + 135} p={prog(frame, 444, 474)} />
      </svg>
      {/* 1 号的方案卡 */}
      {card > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 70,
            top: 410,
            padding: '18px 28px',
            borderRadius: 18,
            background: C.panel,
            border: `3px solid ${C.gold}`,
            boxShadow: `0 0 40px ${C.gold}44`,
            opacity: card,
            transform: `translateY(${(1 - card) * 20}px)`,
          }}
        >
          <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30, color: C.gold}}>1 号的分配方案</div>
          <div style={{display: 'flex', gap: 16, marginTop: 8}}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} style={{width: 70, textAlign: 'center'}}>
                <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 24, color: C.inkDim}}>{n} 号</div>
                <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 48, color: C.goldHot}}>?</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {/* 投票结果 */}
      {frame >= 326 && frame < 398 ? (
        <div style={{position: 'absolute', right: 70, top: 440, textAlign: 'right', opacity: prog(frame, 326, 336)}}>
          <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 80, color: C.coop}}>3 / 5</div>
          <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34, color: C.coopHot}}>≥ 一半 · 通过</div>
        </div>
      ) : null}
      {frame >= 404 && frame < 452 ? (
        <div style={{position: 'absolute', right: 70, top: 440, textAlign: 'right', opacity: prog(frame, 404, 412)}}>
          <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 80, color: C.red}}>1 / 5</div>
          <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34, color: C.redHot}}>不到一半 · 扔下海</div>
        </div>
      ) : null}
      {frame >= 456 && frame < 480 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 460, textAlign: 'center', opacity: prog(frame, 456, 464)}}>
          <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.gold}}>2 号接着提方案</span>
        </div>
      ) : null}
      {/* 海盗的三条偏好 */}
      {prefs > 0 ? (
        <div style={{position: 'absolute', left: 90, right: 90, top: 372, display: 'flex', flexDirection: 'column', gap: 12, opacity: prefs}}>
          {[
            {k: '①', t: '先保命'},
            {k: '②', t: '再要钱'},
            {k: '③', t: '钱一样多时，宁可把人扔下海'},
          ].map((r, i) => {
            const p = prog(frame, 484 + i * 10, 496 + i * 10, ease.out);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  padding: '8px 26px',
                  borderRadius: 18,
                  background: C.panel,
                  border: `2px solid ${i === 2 ? C.red : C.gold}66`,
                  opacity: p,
                  transform: `translateX(${(1 - p) * -30}px)`,
                }}
              >
                <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 36, color: i === 2 ? C.red : C.gold}}>{r.k}</span>
                <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34, color: C.ink}}>{r.t}</span>
              </div>
            );
          })}
        </div>
      ) : null}
      {ask > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 440, textAlign: 'center', transform: `scale(${ask})`}}>
          <span style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 110, color: C.gold, textShadow: `0 0 40px ${C.gold}66`}}>1 号该怎么分？</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ============================================================
 * 直觉
 * ========================================================== */
export const GuessScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 600 || frame >= 784) return null;
  const o = envelope(frame, 600, 784, 10, 8);
  const plans = [
    {at: 610, label: '平分？', v: [20, 20, 20, 20, 20]},
    {at: 690, label: '多分给别人，保命？', v: [10, 25, 25, 20, 20]},
  ];
  return (
    <AbsoluteFill style={{opacity: o}}>
      {plans.map((pl, k) => {
        const p = prog(frame, pl.at, pl.at + 14, ease.out);
        if (p <= 0) return null;
        const cross = prog(frame, 756 + k * 4, 766 + k * 4, ease.out);
        return (
          <div key={k} style={{position: 'absolute', left: 90, right: 90, top: 440 + k * 290, opacity: p, transform: `translateY(${(1 - p) * 24}px)`}}>
            <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.ink, marginBottom: 14}}>{pl.label}</div>
            <div style={{position: 'relative', display: 'flex', gap: 14}}>
              {pl.v.map((v, i) => (
                <div key={i} style={{flex: 1, borderRadius: 16, background: C.panel, border: `2px solid ${C.gold}55`, padding: '10px 0', textAlign: 'center'}}>
                  <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 24, color: C.inkDim}}>{i + 1} 号</div>
                  <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 64, color: C.goldHot}}>{v}</div>
                </div>
              ))}
              {cross > 0 ? <div style={{position: 'absolute', left: -10, top: 70, height: 8, width: `${104 * cross}%`, borderRadius: 4, background: C.red, boxShadow: `0 0 16px ${C.red}`}} /> : null}
            </div>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1000, display: 'flex', justifyContent: 'center'}}>
        <Stamp text="都错了" sub="WRONG" color={C.red} p={prog(frame, 760, 768, ease.out)} rotate={-7} size={1.1} />
      </div>
    </AbsoluteFill>
  );
};
