/**
 * 0:00 钩子：落槌 → 拍品钞票在聚光灯下翻转入场 → 报价器狂飙，冲破 100 时警报变红
 * 三行大字：拍卖一张 100 元 / 第二名也要付钱 / 价格会冲破 100
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {KineticText} from '../components/KineticText';
import {Banknote, Gavel, Ticker} from '../components/Props';
import {ease, envelope, prog} from '../lib/anim';
import {C, FONT} from '../theme';

/** 钩子里的报价：5 → 100（第 96 帧）→ 235 */
const hookPrice = (f: number) => {
  if (f < 96) return interpolate(f, [6, 96], [5, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.in});
  return interpolate(f, [96, 146], [100, 235], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => t * t});
};

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= 152) return null;
  const out = prog(frame, 136, 150, ease.in);
  const spin = interpolate(prog(frame, 0, 22, ease.out), [0, 1], [80, 0]) + Math.sin(frame * 0.05) * 6;
  const price = Math.round(hookPrice(frame) / 5) * 5;
  const alarm = frame >= 96 ? 0.5 + 0.5 * Math.sin(frame * 0.9) : 0;
  const lines = [
    {text: '拍卖一张 <c>100 元</c>', at: 4, size: 88},
    {text: '<r>第二名</r>也要付钱', at: 44, size: 104},
    {text: '价格会<r>冲破 100</r>', at: 92, size: 104},
  ];
  return (
    <AbsoluteFill style={{opacity: 1 - out}}>
      {/* 冲破面值时的红色警报边框 */}
      {alarm > 0 ? <AbsoluteFill style={{boxShadow: `inset 0 0 ${140 * alarm}px ${C.red}aa`}} /> : null}
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
          color: C.red,
          opacity: envelope(frame, 2, 150, 6, 6) * (Math.floor(frame / 5) % 2 ? 1 : 0.55),
        }}
      >
        ● LIVE AUCTION · 拍卖进行中
      </div>
      <div style={{position: 'absolute', left: 260, top: 300}}>
        <Banknote frame={frame} w={560} spin={spin} />
      </div>
      <div style={{position: 'absolute', left: 30, top: 640}}>
        <Gavel frame={frame} strikeAt={2} size={170} />
      </div>
      <div style={{position: 'absolute', left: 300, right: 60, top: 600}}>
        <Ticker value={price} size={150} />
      </div>
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
              style={{opacity: i < 2 && frame > 92 ? 0.85 : 1}}
            />
          ) : (
            <div key={i} style={{height: l.size * 1.15}} />
          ),
        )}
      </div>
    </AbsoluteFill>
  );
};
