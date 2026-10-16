/**
 * 0:05 规则：聚光灯下的拍品 + 三张规则卡（第三张“第二名也要付钱”盖上特殊规则印章）
 *  最后卡片退场，一块写着“？”的号码牌升起：如果是你，会出价吗？
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {KineticText} from '../components/KineticText';
import {Banknote, Paddle} from '../components/Props';
import {Stamp} from '../components/Token';
import {ease, envelope, prog} from '../lib/anim';
import {C, FONT} from '../theme';

const T0 = 150;
const T1 = 562;

const RULES = [
  {at: 238, text: '起价 <g>¥5</g> · 每次加 <g>¥5</g>', icon: '¥5', color: C.gold},
  {at: 268, text: '出价最高的人 → 拿走 <c>¥100</c>', icon: '100', color: C.coop},
  {at: 392, text: '第二名 → <r>也要付钱</r>', icon: '2', color: C.red},
];

export const RulesScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= T1) return null;
  const o = envelope(frame, T0, T1, 12, 8);
  const cardsOut = prog(frame, 474, 488, ease.in);
  const ask = prog(frame, 484, 500, ease.out);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: 310, top: 300, transform: `scale(${1 - 0.06 * ask})`}}>
        <Banknote frame={frame} w={460} spin={Math.sin(frame * 0.03) * 10} />
      </div>
      {RULES.map((r, i) => {
        const p = prog(frame, r.at, r.at + 12, ease.out);
        if (p <= 0) return null;
        const special = i === 2;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 90,
              right: 90,
              top: 596 + i * 150,
              height: 126,
              borderRadius: 22,
              border: `${special ? 3 : 2}px solid ${special ? C.red : C.inkFaint}`,
              background: special ? 'rgba(40,10,8,0.88)' : C.panel,
              boxShadow: special ? `0 0 50px ${C.red}44` : '0 12px 40px rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              gap: 26,
              padding: '0 30px',
              opacity: p * (1 - cardsOut),
              transform: `translateX(${(1 - p) * 60}px)`,
            }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                flexShrink: 0,
                border: `3px solid ${r.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONT.num,
                fontWeight: 700,
                fontSize: 30,
                color: r.color,
              }}
            >
              {r.icon}
            </div>
            <KineticText text={r.text} frame={frame - r.at} duration={400} size={44} maxWidth={660} font={FONT.sans} weight={900} mode="rise" stagger={0.8} align="left" />
          </div>
        );
      })}
      {/* 特殊规则印章 */}
      <div style={{position: 'absolute', right: 70, top: 870, opacity: 1 - cardsOut}}>
        <Stamp text="特殊规则" color={C.red} p={prog(frame, 392, 400, ease.out)} rotate={-10} size={0.6} />
      </div>
      {/* 如果是你，会出价吗？ */}
      {ask > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', justifyContent: 'center', opacity: ask}}>
          <Paddle label="？" color={C.gold} size={210} raise={prog(frame, 486, 506)} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
