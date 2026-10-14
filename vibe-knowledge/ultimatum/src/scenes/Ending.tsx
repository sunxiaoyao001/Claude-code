/**
 * 结尾两幕
 *  1:34 升华：巨大的“不”发出冲击波，把 92 : 8 的出价推回 60 : 40（不敢太过分）
 *       → 呼应第二集：“牙”（以牙还牙）与“不”：会反击，才有合作
 *       → 金句：公平从来不是施舍，是敢说“不”换来的
 *  1:46 片尾：你的底线是多少？滑块扫过 50 → 1；点赞 / 评论 / 收藏 / 转发；下期预告
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {KineticText} from '../components/KineticText';
import {SplitBar} from '../components/Split';
import {Icon, Token} from '../components/Token';
import {Kicker} from '../components/ui';
import {ease, envelope, prog} from '../lib/anim';
import {C, FONT} from '../theme';

/* ============================================================
 * 升华
 * ========================================================== */
const No: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2822, 2998, 10, 10);
  if (o <= 0) return null;
  const inP = prog(frame, 2824, 2840, ease.out);
  const pull = prog(frame, 2924, 2980, ease.inOut);
  const keep = interpolate(pull, [0, 1], [92, 60]);
  return (
    <AbsoluteFill style={{opacity: o}}>
      {/* 冲击波 */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {[0, 1, 2].map((k) => {
          const t = ((frame - 2830 + k * 20) % 60) / 60;
          if (frame < 2830) return null;
          return <circle key={k} cx={540} cy={630} r={180 + t * 380} fill="none" stroke={C.red} strokeWidth={4 * (1 - t)} opacity={0.6 * (1 - t)} />;
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 330,
          textAlign: 'center',
          fontFamily: FONT.serif,
          fontWeight: 900,
          fontSize: 520,
          lineHeight: 1.1,
          color: C.red,
          textShadow: `0 0 90px ${C.red}aa, 0 0 30px ${C.red}`,
          opacity: inP,
          transform: `scale(${interpolate(inP, [0, 1], [1.6, 1]) * (1 + 0.02 * Math.sin(frame * 0.2))})`,
        }}
      >
        不
      </div>
      <div style={{position: 'absolute', left: 160, top: 960, opacity: prog(frame, 2916, 2930)}}>
        <SplitBar keep={keep} w={760} state="accept" stateP={prog(frame, 2976, 2990)} />
      </div>
    </AbsoluteFill>
  );
};

const Callback: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2996, 3082, 10, 8);
  if (o <= 0) return null;
  const link = prog(frame, 3012, 3030, ease.inOut);
  const coop = prog(frame, 3040, 3054, ease.back);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="EP.02 · TIT FOR TAT" zh="想起以牙还牙了吗" opacity={prog(frame, 2998, 3012)} y={300} color={C.gold} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <line x1={460} x2={460 + 160 * link} y1={640} y2={640} stroke={C.ink} strokeOpacity={0.7} strokeWidth={4} strokeDasharray="10 8" />
        <text x={540} y={612} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={C.inkDim} opacity={link}>
          都会反击
        </text>
        {[
          {x: 330, ch: '牙', color: C.gold, cap: '以牙还牙', at: 3000},
          {x: 750, ch: '不', color: C.red, cap: '说“不”的人', at: 3006},
        ].map((t) => {
          const p = prog(frame, t.at, t.at + 14, ease.back);
          return (
            <g key={t.ch} transform={`translate(${t.x}, 640) scale(${p})`}>
              <Token ch={t.ch} color={t.color} r={100} spin={frame * 0.4} />
              <text y={160} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 32}} fill={t.color}>
                {t.cap}
              </text>
            </g>
          );
        })}
      </svg>
      {coop > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 900, textAlign: 'center', opacity: Math.min(1, coop), transform: `scale(${coop})`}}>
          <span
            style={{
              display: 'inline-block',
              padding: '14px 44px',
              borderRadius: 999,
              border: `4px solid ${C.coop}`,
              background: `${C.coop}22`,
              boxShadow: `0 0 50px ${C.coop}55`,
              fontFamily: FONT.serif,
              fontWeight: 900,
              fontSize: 64,
              color: C.coopHot,
              letterSpacing: '0.1em',
            }}
          >
            → 合作
          </span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Punchline: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 3080, 3182, 4, 10);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', top: 470, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26}}>
        <KineticText text="公平从来不是施舍" frame={frame - 3082} duration={400} size={88} font={FONT.serif} weight={900} mode="slam" stagger={1.6} />
        {frame >= 3096 ? (
          <KineticText text="是<g>敢说“不”</g>换来的" frame={frame - 3096} duration={400} size={124} font={FONT.serif} weight={900} mode="slam" stagger={2.4} maxWidth={980} />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

export const MeaningScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 2820 || frame >= 3182) return null;
  return (
    <AbsoluteFill>
      <No frame={frame} />
      <Callback frame={frame} />
      <Punchline frame={frame} />
    </AbsoluteFill>
  );
};

/* ============================================================
 * 片尾
 * ========================================================== */
/** 底线滑块：他给你多少，你才接受？从 50 一路扫到 1 */
const lineAt = (f: number) => Math.round(interpolate(f, [3200, 3330], [50, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut}));

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 3180) return null;
  const head = prog(frame, 3184, 3200, ease.out);
  const v = lineAt(frame);
  const W = 820;
  const X0 = 130;
  const x = X0 + (v / 50) * W;
  const hot = v < 20 ? C.red : v < 35 ? C.gold : C.coop;
  const icons = [
    {k: 'like' as const, t: '点赞', c: C.red},
    {k: 'comment' as const, t: '评论', c: C.gold},
    {k: 'star' as const, t: '收藏', c: C.ink},
    {k: 'share' as const, t: '转发', c: C.ink},
  ];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: head}}>
        <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 36, color: C.inkDim, letterSpacing: '0.16em'}}>
          100 元，他给你多少
        </div>
        <KineticText text="你才<g>接受</g>？" frame={frame - 3186} duration={400} size={120} font={FONT.serif} weight={900} mode="slam" stagger={2.2} />
      </div>
      {/* 滑块 */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: prog(frame, 3196, 3210)}}>
        <defs>
          <linearGradient id="line-track" x1="0" x2="1">
            <stop offset="0%" stopColor={C.red} />
            <stop offset="45%" stopColor={C.gold} />
            <stop offset="100%" stopColor={C.coop} />
          </linearGradient>
        </defs>
        <rect x={X0} y={640} width={W} height={16} rx={8} fill="url(#line-track)" opacity={0.35} />
        <rect x={x} y={640} width={X0 + W - x} height={16} rx={8} fill="url(#line-track)" />
        {[0, 10, 20, 30, 40, 50].map((t) => (
          <text key={t} x={X0 + (t / 50) * W} y={700} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 500, fontSize: 24}} fill={C.inkDim}>
            ¥{t}
          </text>
        ))}
        <circle cx={x} cy={648} r={26} fill="#fff" style={{filter: `drop-shadow(0 0 16px ${hot})`}} />
        <text x={x} y={606} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 64}} fill={hot}>
          ¥{v}?
        </text>
      </svg>
      <div style={{position: 'absolute', top: 850, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 64}}>
        {icons.map((ic, i) => {
          const p = prog(frame, 3256 + i * 5, 3268 + i * 5, ease.back);
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
          opacity: prog(frame, 3290, 3304),
        }}
      >
        <span style={{fontFamily: FONT.mono, color: C.gold, marginRight: 14}}>NEXT</span>下期拆解：猜平均数的 2/3
      </div>
    </AbsoluteFill>
  );
};
