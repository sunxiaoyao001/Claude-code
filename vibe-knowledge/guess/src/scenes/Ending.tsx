/**
 * 结尾两幕
 *  1:38 升华：聪明 ≠ 想得最深 → 层级梯子上，别人停在第 1～2 层，你只多走一级 → “真正的高手，是最懂人的人”
 *  1:47 片尾：你最开始选的是几？输入框里的数字滚动；点赞 / 评论 / 收藏 / 转发；下期预告
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {KineticText} from '../components/KineticText';
import {Mind} from '../components/Mind';
import {Icon, Token} from '../components/Token';
import {ease, envelope, hash, prog} from '../lib/anim';
import {C, FONT} from '../theme';

/* ============================================================
 * 升华
 * ========================================================== */
const NotDeepest: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2944, 3032, 10, 8);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.35}}>
        <Mind t={4 + (frame - 2944) * 0.03} fx={340} fy={975} g={1.0} frame={frame} />
      </svg>
      <div style={{position: 'absolute', top: 500, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <KineticText text="聪明 <r>≠</r> 想得最深" frame={frame - 2950} duration={82} size={120} font={FONT.serif} weight={900} mode="slam" stagger={2.2} maxWidth={960} />
      </div>
    </AbsoluteFill>
  );
};

const Ladder: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 3028, 3112, 10, 6);
  if (o <= 0) return null;
  const rungY = (l: number) => 1040 - l * 100;
  const band = prog(frame, 3034, 3048, ease.out);
  const climb = interpolate(prog(frame, 3052, 3076, ease.inOut), [0, 1], [0, 3]);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <line x1={420} x2={420} y1={rungY(-0.4)} y2={rungY(5.4)} stroke={C.inkFaint} strokeWidth={6} />
        <line x1={660} x2={660} y1={rungY(-0.4)} y2={rungY(5.4)} stroke={C.inkFaint} strokeWidth={6} />
        {[0, 1, 2, 3, 4, 5].map((l) => (
          <g key={l}>
            <line x1={420} x2={660} y1={rungY(l)} y2={rungY(l)} stroke={C.ink} strokeOpacity={0.45} strokeWidth={5} />
            <text x={392} y={rungY(l) + 10} textAnchor="end" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 30}} fill={C.inkDim}>
              L{l}
            </text>
          </g>
        ))}
        {/* 别人停在这里 */}
        <rect x={430} y={rungY(2) - 6} width={220 * band} height={rungY(1) - rungY(2) + 12} rx={12} fill={C.blue} opacity={0.22} />
        <text x={690} y={(rungY(1) + rungY(2)) / 2 + 12} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34}} fill={C.blueHot} opacity={band}>
          别人想到这里
        </text>
        {/* 你：多走一级 */}
        <g transform={`translate(540, ${rungY(climb) - 50})`} opacity={prog(frame, 3048, 3056)}>
          <Token ch="你" color={C.gold} r={44} spin={frame * 0.5} glow={0.6 + 0.4 * prog(frame, 3070, 3080)} />
        </g>
        <text x={690} y={rungY(3) - 30} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34}} fill={C.gold} opacity={prog(frame, 3074, 3084)}>
          多想一步
        </text>
      </svg>
    </AbsoluteFill>
  );
};

const Punchline: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 3106, 3212, 4, 10);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', top: 470, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26}}>
        <KineticText text="真正的高手，不是最理性的人" frame={frame - 3108} duration={400} size={70} font={FONT.serif} weight={900} mode="slam" stagger={1.4} maxWidth={960} />
        {frame >= 3122 ? <KineticText text="是<g>最懂人</g>的人" frame={frame - 3122} duration={400} size={140} font={FONT.serif} weight={900} mode="slam" stagger={2.6} maxWidth={980} /> : null}
      </div>
    </AbsoluteFill>
  );
};

export const MeaningScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 2940 || frame >= 3212) return null;
  return (
    <AbsoluteFill>
      <NotDeepest frame={frame} />
      <Ladder frame={frame} />
      <Punchline frame={frame} />
    </AbsoluteFill>
  );
};

/* ============================================================
 * 片尾
 * ========================================================== */
export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 3210) return null;
  const head = prog(frame, 3214, 3230, ease.out);
  // 输入框里的数字先飞快滚动，越来越慢，最后停在“?”
  const rolling = frame < 3300;
  const step = Math.floor(Math.pow(Math.max(0, frame - 3214), 0.8));
  const digits = rolling ? String(Math.floor(hash(step * 3.1) * 101)) : '?';
  const caret = Math.floor(frame / 8) % 2 === 0;
  const icons = [
    {k: 'like' as const, t: '点赞', c: C.red},
    {k: 'comment' as const, t: '评论', c: C.gold},
    {k: 'star' as const, t: '收藏', c: C.ink},
    {k: 'share' as const, t: '转发', c: C.ink},
  ];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 290, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: head}}>
        <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 38, color: C.inkDim, letterSpacing: '0.16em'}}>从 0～100 里，你最开始</div>
        <KineticText text="选的是<g>几</g>？" frame={frame - 3216} duration={400} size={124} font={FONT.serif} weight={900} mode="slam" stagger={2.2} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 590, display: 'flex', justifyContent: 'center', opacity: prog(frame, 3226, 3240)}}>
        <div
          style={{
            width: 640,
            height: 170,
            borderRadius: 30,
            border: `4px solid ${C.gold}`,
            background: C.panel,
            boxShadow: `0 0 50px ${C.gold}44`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 44px',
            gap: 24,
            boxSizing: 'border-box',
          }}
        >
          <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 56, color: C.ink}}>我选：</span>
          <span style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 96, color: rolling ? C.blueHot : C.gold, minWidth: 160}}>{digits}</span>
          {!rolling && caret ? <span style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 96, color: C.gold}}>|</span> : null}
          <span style={{flex: 1}} />
          <span style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, color: C.inkDim}}>0～100</span>
        </div>
      </div>
      <div style={{position: 'absolute', top: 850, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 64}}>
        {icons.map((ic, i) => {
          const p = prog(frame, 3286 + i * 5, 3298 + i * 5, ease.back);
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
          opacity: prog(frame, 3310, 3324),
        }}
      >
        <span style={{fontFamily: FONT.mono, color: C.gold, marginRight: 14}}>NEXT</span>下期拆解：海盗分金
      </div>
    </AbsoluteFill>
  );
};
