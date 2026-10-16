/**
 * 1:43 启示：
 *  ① 阿克塞尔罗德的四条建议（2×2 卡片），第一条“不嫉妒”点亮
 *  ② “重复的游戏”：多层合作珠串在纵深里无限流动
 *  ③ 片尾金句 + 互动按钮 + 下期预告
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {KineticText} from '../components/KineticText';
import {Icon} from '../components/Token';
import {Kicker} from '../components/ui';
import {ease, envelope, hash, prog} from '../lib/anim';
import {C, FONT} from '../theme';

const T0 = 3090;

const RULES = [
  {no: '01', zh: '不嫉妒', en: "DON'T BE ENVIOUS"},
  {no: '02', zh: '不先背叛', en: "DON'T DEFECT FIRST"},
  {no: '03', zh: '有来有往', en: 'RECIPROCATE'},
  {no: '04', zh: '别太聪明', en: "DON'T BE TOO CLEVER"},
];

const Rules: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 3094, 3268, 8, 12);
  if (o <= 0) return null;
  const focus = prog(frame, 3184, 3198, ease.out);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="AXELROD'S ADVICE" zh="四条建议" opacity={prog(frame, 3096, 3110)} y={290} color={C.gold} />
      {RULES.map((r, i) => {
        const p = prog(frame, 3110 + i * 12, 3122 + i * 12, ease.back);
        const col = i % 2;
        const row = Math.floor(i / 2);
        const isFirst = i === 0;
        const dim = isFirst ? 1 : 1 - 0.55 * focus;
        return (
          <div
            key={r.no}
            style={{
              position: 'absolute',
              left: 90 + col * 460,
              top: 470 + row * 330,
              width: 440,
              height: 300,
              borderRadius: 26,
              border: `2px solid ${isFirst && focus > 0 ? C.gold : C.inkFaint}`,
              background: isFirst && focus > 0 ? `linear-gradient(160deg, ${C.gold}33, rgba(12,10,8,0.9) 70%)` : C.panel,
              boxShadow: isFirst ? `0 0 ${70 * focus}px ${C.gold}66` : 'none',
              padding: '30px 34px',
              opacity: Math.min(1, p) * dim,
              transform: `scale(${interpolate(p, [0, 1], [0.8, 1]) * (isFirst ? 1 + 0.05 * focus : 1)})`,
            }}
          >
            <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 44, color: isFirst ? C.gold : C.inkDim}}>{r.no}</div>
            <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 76, color: C.ink, marginTop: 18, letterSpacing: '0.06em'}}>{r.zh}</div>
            <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 20, color: C.inkDim, marginTop: 16, letterSpacing: '0.16em'}}>{r.en}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** 无限流动的合作珠串：近大远小的多层“传送带” */
const Infinite: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 3262, 3356, 12, 14);
  if (o <= 0) return null;
  const rows = 7;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {Array.from({length: rows}).map((_, k) => {
          const depth = k / (rows - 1); // 0 远 → 1 近
          const y = 430 + depth * depth * 660;
          const r = 6 + depth * 22;
          const pitch = r * 2.8;
          const speed = 2 + depth * 9;
          const offset = (frame * speed) % pitch;
          const n = Math.ceil(1200 / pitch) + 2;
          return (
            <g key={k} opacity={0.25 + 0.75 * depth}>
              {Array.from({length: n}).map((__, i) => {
                const x = -pitch + i * pitch + offset;
                const gold = hash(i * 13 + k * 7 + Math.floor((frame * speed + i * pitch) / (pitch * 40))) > 0.93;
                return <circle key={i} cx={x} cy={y} r={r} fill={gold ? C.gold : C.coop} opacity={0.85} />;
              })}
            </g>
          );
        })}
      </svg>
      <div style={{position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center'}}>
        <KineticText text="<g>重复的游戏</g>" frame={frame - 3270} duration={84} size={110} font={FONT.serif} weight={900} mode="slam" stagger={3} />
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{frame: number}> = ({frame}) => {
  if (frame < 3352) return null;
  const icons = [
    {k: 'like' as const, t: '点赞', c: C.red},
    {k: 'comment' as const, t: '评论', c: C.gold},
    {k: 'star' as const, t: '收藏', c: C.ink},
    {k: 'share' as const, t: '转发', c: C.ink},
  ];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 460, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20}}>
        <KineticText text="你不必赢过眼前的人" frame={frame - 3356} duration={400} size={80} font={FONT.serif} weight={900} mode="slam" stagger={1.8} />
        <KineticText text="<g>只要让合作继续下去</g>" frame={frame - 3378} duration={400} size={92} font={FONT.serif} weight={900} mode="slam" stagger={2} />
      </div>
      <div style={{position: 'absolute', top: 860, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 64}}>
        {icons.map((ic, i) => {
          const p = prog(frame, 3404 + i * 5, 3416 + i * 5, ease.back);
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
          opacity: prog(frame, 3430, 3444),
        }}
      >
        <span style={{fontFamily: FONT.mono, color: C.gold, marginRight: 14}}>NEXT</span>下期拆解：美元拍卖的陷阱
      </div>
    </AbsoluteFill>
  );
};

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0) return null;
  return (
    <AbsoluteFill>
      <Rules frame={frame} />
      <Infinite frame={frame} />
      <EndCard frame={frame} />
    </AbsoluteFill>
  );
};
