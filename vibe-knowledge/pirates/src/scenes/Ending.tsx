/**
 * 结尾两幕
 *  1:35 升华：海盗分金教会我们两件事 → ① 倒着想（从结局往回推）→ ② 规则给你权力，人心决定你能拿多少
 *       → 金句：算得太精的船长，会被扔下海（落水）
 *  1:46 片尾：如果你是 3 号，只分到 1 枚——赞成还是反对？点赞 / 评论 / 收藏 / 转发；下期预告
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Coin} from '../components/Coins';
import {KineticText} from '../components/KineticText';
import {Pirate} from '../components/Pirate';
import {Sea, Splash} from '../components/Sea';
import {Icon} from '../components/Token';
import {ease, envelope, prog} from '../lib/anim';
import {C, FONT} from '../theme';

/* ============================================================
 * 升华
 * ========================================================== */
const TwoThings: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2852, 2942, 10, 6);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <Coin x={540} y={520} r={110 * prog(frame, 2856, 2872, ease.back)} spin={frame * 0.08} />
      </svg>
      <div style={{position: 'absolute', top: 700, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
        <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 40, color: C.inkDim, opacity: prog(frame, 2860, 2872)}}>海盗分金，教会我们</div>
        {frame >= 2866 ? <KineticText text="<g>两件事</g>" frame={frame - 2866} duration={70} size={140} font={FONT.serif} weight={900} mode="slam" stagger={2.6} /> : null}
      </div>
    </AbsoluteFill>
  );
};

/** ① 倒着想：从结局往回推的箭头 */
const Backwards: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2942, 3022, 8, 8);
  if (o <= 0) return null;
  const draw = prog(frame, 2950, 2990, ease.inOut);
  const nodes = [5, 4, 3, 2, 1];
  const X = (i: number) => 160 + i * 190;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center'}}>
        <span style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 70, color: C.gold, marginRight: 20}}>①</span>
        <span style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 96, color: C.ink}}>倒着想</span>
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {nodes.map((n, i) => {
          const lit = draw >= 1 - i / (nodes.length - 1) - 0.001;
          return (
            <g key={n} transform={`translate(${X(i)}, 700)`}>
              <circle r={54} fill={C.panel} stroke={lit ? C.gold : C.inkFaint} strokeWidth={lit ? 4 : 2} style={lit ? {filter: `drop-shadow(0 0 12px ${C.gold})`} : undefined} />
              <text y={14} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 40}} fill={lit ? C.goldHot : C.inkDim}>
                {n}人
              </text>
            </g>
          );
        })}
        {/* 从右（结局）往左（现在）的箭头 */}
        <line x1={X(4)} x2={X(4) - (X(4) - X(0)) * draw} y1={800} y2={800} stroke={C.gold} strokeWidth={6} strokeLinecap="round" />
        <path d={`M ${X(4) - (X(4) - X(0)) * draw - 4} 800 l 22 -14 l 0 28 Z`} fill={C.gold} opacity={draw > 0.02 ? 1 : 0} />
        <text x={X(0)} y={880} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={C.ink}>
          现在
        </text>
        <text x={X(4)} y={880} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={C.goldHot}>
          结局
        </text>
      </svg>
    </AbsoluteFill>
  );
};

/** ② 规则给你权力，人心决定你能拿多少 */
const RulesAndHearts: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 3018, 3102, 10, 6);
  if (o <= 0) return null;
  const cards = [
    {a: '规则', b: '给你权力', col: C.gold, at: 3024},
    {a: '人心', b: '决定你能拿多少', col: C.coop, at: 3046},
  ];
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center'}}>
        <span style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 70, color: C.gold}}>②</span>
      </div>
      <div style={{position: 'absolute', left: 100, right: 100, top: 470, display: 'flex', flexDirection: 'column', gap: 30}}>
        {cards.map((c, i) => {
          const p = prog(frame, c.at, c.at + 14, ease.out);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                padding: '30px 40px',
                borderRadius: 28,
                background: C.panel,
                border: `3px solid ${c.col}`,
                boxShadow: `0 0 ${40 * p}px ${c.col}44`,
                opacity: p,
                transform: `translateX(${(1 - p) * (i ? 40 : -40)}px)`,
              }}
            >
              <span style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 80, color: c.col}}>{c.a}</span>
              <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 46, color: C.ink}}>{c.b}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** 金句：算得太精的船长，会被扔下海 */
const Punchline: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 3098, 3184, 4, 8);
  if (o <= 0) return null;
  const fall = prog(frame, 3098, 3106, ease.in);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <Sea y={930} frame={frame} bottom={1180} />
        {frame < 3108 ? (
          <g transform={`translate(800, ${interpolate(fall, [0, 1], [760, 940])}) rotate(${fall * 90})`}>
            <Pirate n={1} r={50} captain={1} />
          </g>
        ) : null}
        <Splash x={800} y={940} p={prog(frame, 3106, 3136)} />
      </svg>
      <div style={{position: 'absolute', top: 400, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20}}>
        <KineticText text="算得太精的船长" frame={frame - 3100} duration={400} size={92} font={FONT.serif} weight={900} mode="slam" stagger={1.6} />
        {frame >= 3112 ? <KineticText text="<r>会被扔下海</r>" frame={frame - 3112} duration={400} size={130} font={FONT.serif} weight={900} mode="slam" stagger={2.4} /> : null}
      </div>
    </AbsoluteFill>
  );
};

export const MeaningScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 2850 || frame >= 3184) return null;
  return (
    <AbsoluteFill>
      <TwoThings frame={frame} />
      <Backwards frame={frame} />
      <RulesAndHearts frame={frame} />
      <Punchline frame={frame} />
    </AbsoluteFill>
  );
};

/* ============================================================
 * 片尾
 * ========================================================== */
export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 3180) return null;
  const head = prog(frame, 3184, 3200, ease.out);
  const yes = 1 + 0.06 * Math.max(0, Math.sin(frame * 0.18));
  const no = 1 + 0.06 * Math.max(0, -Math.sin(frame * 0.18));
  const icons = [
    {k: 'like' as const, t: '点赞', c: C.red},
    {k: 'comment' as const, t: '评论', c: C.gold},
    {k: 'star' as const, t: '收藏', c: C.ink},
    {k: 'share' as const, t: '转发', c: C.ink},
  ];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 280, left: 0, right: 0, textAlign: 'center', opacity: head, fontFamily: FONT.sans, fontWeight: 700, fontSize: 40, color: C.inkDim, letterSpacing: '0.16em'}}>
        如果你是
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(420, 440) scale(${prog(frame, 3188, 3204, ease.back)})`}>
          <Pirate n={3} r={70} color={C.blue} />
        </g>
        <Coin x={650} y={440} r={56 * prog(frame, 3196, 3210, ease.back)} spin={frame * 0.1} />
        <text x={720} y={456} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 44}} fill={C.goldHot} opacity={prog(frame, 3204, 3216)}>
          只分到 1 枚
        </text>
      </svg>
      <div style={{position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        {frame >= 3206 ? <KineticText text="你投赞成，还是反对？" frame={frame - 3206} duration={400} size={84} font={FONT.serif} weight={900} mode="slam" stagger={1.6} maxWidth={960} /> : null}
      </div>
      <div style={{position: 'absolute', top: 720, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 60, opacity: prog(frame, 3226, 3240)}}>
        {[
          {t: '赞成', col: C.coop, s: yes},
          {t: '反对', col: C.red, s: no},
        ].map((b) => (
          <div
            key={b.t}
            style={{
              width: 300,
              height: 110,
              borderRadius: 55,
              border: `4px solid ${b.col}`,
              background: `${b.col}22`,
              boxShadow: `0 0 ${30 * (b.s - 1) * 10}px ${b.col}88`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONT.sans,
              fontWeight: 900,
              fontSize: 50,
              letterSpacing: '0.16em',
              color: b.col,
              transform: `scale(${b.s})`,
            }}
          >
            {b.t}
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', top: 880, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 64}}>
        {icons.map((ic, i) => {
          const p = prog(frame, 3266 + i * 5, 3278 + i * 5, ease.back);
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
          top: 1100,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT.sans,
          fontWeight: 500,
          fontSize: 30,
          color: C.inkDim,
          letterSpacing: '0.12em',
          opacity: prog(frame, 3300, 3314),
        }}
      >
        <span style={{fontFamily: FONT.mono, color: C.gold, marginRight: 14}}>NEXT</span>下期拆解：胆小鬼博弈
      </div>
    </AbsoluteFill>
  );
};
