/**
 * 开场三幕
 *  0:00 钩子：光刀把 100 元切成 80 / 20 →“拒绝”印章 → 两半碎成灰，0 : 0
 *  0:05 规则：提议者 / 回应者；分配条可拖动；接受 → 按你说的分，拒绝 → 0 : 0
 *  0:18 理性答案：博弈树逆向归纳 → 给 1 元，留 99 元；1982 年科隆大学的第一次实验
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {KineticText} from '../components/KineticText';
import {Banknote} from '../components/Props';
import {SplitBar, SplitNote, Verdict} from '../components/Split';
import {Stamp, Token} from '../components/Token';
import {Kicker} from '../components/ui';
import {ease, envelope, prog} from '../lib/anim';
import {C, FONT} from '../theme';

/* ============================================================
 * 钩子
 * ========================================================== */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= 152) return null;
  const out = prog(frame, 136, 150, ease.in);
  const zero = prog(frame, 104, 116, ease.back);
  const lines = [
    {text: '给你 <g>100 元</g>，分给陌生人', at: 4, size: 80},
    {text: '他只要说<r>“不”</r>', at: 44, size: 104},
    {text: '你俩<r>一分都拿不到</r>', at: 88, size: 100},
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
          color: C.red,
          opacity: envelope(frame, 2, 150, 6, 6) * (Math.floor(frame / 5) % 2 ? 1 : 0.55),
        }}
      >
        ● THE ULTIMATUM GAME
      </div>
      <div style={{position: 'absolute', left: 240, top: 430}}>
        <SplitNote frame={frame} w={600} share={0.8} cutAt={6} splitAt={14} rejectAt={90} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 480, display: 'flex', justifyContent: 'center'}}>
        <Stamp text="拒绝" sub="REJECT" color={C.red} p={prog(frame, 44, 52, ease.out) * (1 - prog(frame, 92, 100))} rotate={-9} size={1.1} />
      </div>
      {zero > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', transform: `scale(${zero})`}}>
          <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 190, color: C.red, textShadow: `0 0 70px ${C.red}88`, lineHeight: 1}}>
            0 <span style={{color: C.inkDim, fontSize: 120}}>:</span> 0
          </div>
        </div>
      ) : null}
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
              style={{opacity: i < 2 && frame > 88 ? 0.85 : 1}}
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
const keepAt = (f: number) => {
  if (f < 244) return 50;
  if (f < 316) return 62 + 12 * Math.sin(((f - 244) / 72) * Math.PI * 1.5);
  return 60;
};

export const RulesScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 150 || frame >= 544) return null;
  const o = envelope(frame, 150, 544, 12, 8);
  const accept = envelope(frame, 322, 406, 6, 4);
  const reject = prog(frame, 410, 420, ease.out);
  const ask = prog(frame, 482, 496);
  const keep = keepAt(frame);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {[
          {x: 230, ch: '你', color: C.gold, role: '提议者', at: 162},
          {x: 850, ch: '他', color: C.blue, role: '回应者', at: 170},
        ].map((t) => {
          const p = prog(frame, t.at, t.at + 14, ease.back);
          return (
            <g key={t.ch} transform={`translate(${t.x}, 400) scale(${p})`}>
              <Token ch={t.ch} color={t.color} r={64} spin={frame * 0.4} glow={t.ch === '他' ? 0.6 + 0.4 * ask : 0.8} />
              <text y={108} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28}} fill={t.color}>
                {t.role}
              </text>
            </g>
          );
        })}
        <text x={540} y={412} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 60}} fill={C.inkFaint}>
          ¥100
        </text>
      </svg>
      {/* 你拿到 100 元：钞票先登场，再化成分配条 */}
      {frame < 254 ? (
        <div
          style={{
            position: 'absolute',
            left: 310,
            top: 556,
            opacity: envelope(frame, 164, 254, 10, 14),
            transform: `scale(${interpolate(prog(frame, 164, 184, ease.back), [0, 1], [0.8, 1]) * (1 - 0.15 * prog(frame, 238, 254))})`,
          }}
        >
          <Banknote frame={frame} w={460} spin={Math.sin(frame * 0.05) * 10} />
        </div>
      ) : null}
      <div style={{position: 'absolute', left: 110, top: 590, opacity: prog(frame, 238, 252)}}>
        <SplitBar keep={keep} w={860} state={reject > 0 ? 'reject' : accept > 0 ? 'accept' : 'pending'} stateP={reject > 0 ? reject : accept} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 830, display: 'flex', justifyContent: 'center', gap: 60}}>
        <Verdict kind="accept" p={prog(frame, 320, 332, ease.back)} active={accept} />
        <Verdict kind="reject" p={prog(frame, 406, 418, ease.back)} active={reject * (1 - ask)} />
      </div>
      {/* 结果 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1000, textAlign: 'center'}}>
        {accept > 0 ? (
          <div style={{opacity: accept, fontFamily: FONT.num, fontWeight: 700, fontSize: 84, color: C.coop}}>
            <span style={{color: C.gold}}>60</span> : <span style={{color: C.blue}}>40</span>
            <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 28, color: C.inkDim}}>按你说的分</div>
          </div>
        ) : reject > 0 ? (
          <div style={{opacity: reject * (1 - ask), fontFamily: FONT.num, fontWeight: 700, fontSize: 84, color: C.red}}>
            0 : 0<div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 28, color: C.inkDim}}>两个人都没有</div>
          </div>
        ) : null}
      </div>
      {ask > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 990, textAlign: 'center', opacity: ask}}>
          <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 110, color: C.gold, textShadow: `0 0 40px ${C.gold}66`}}>给他多少？</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ============================================================
 * 理性答案
 * ========================================================== */
export const RationalScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 540 || frame >= 904) return null;
  const o = envelope(frame, 540, 904, 10, 8);
  const treeO = 1 - prog(frame, 792, 806);
  const cmp = prog(frame, 630, 650, ease.out);
  const x = Math.round(interpolate(prog(frame, 712, 740, ease.inOut), [0, 1], [40, 1]));
  const card = prog(frame, 800, 820, ease.out);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="GAME THEORY" zh="经济学的标准答案" opacity={prog(frame, 550, 566) * treeO} y={262} color={C.hud} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: treeO}}>
        {/* 边 */}
        <line x1={540} y1={556} x2={540} y2={676} stroke={C.ink} strokeOpacity={0.5} strokeWidth={4} />
        <line x1={540} y1={740} x2={300} y2={900} stroke={C.coop} strokeOpacity={0.4 + 0.6 * cmp} strokeWidth={4 + 4 * cmp} />
        <line x1={540} y1={740} x2={780} y2={900} stroke={C.red} strokeOpacity={0.5 - 0.3 * cmp} strokeWidth={4} strokeDasharray={cmp > 0.5 ? '10 10' : undefined} />
        <text x={560} y={628} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={C.ink}>
          给他 <tspan style={{fontFamily: FONT.num, fontSize: 44}} fill={C.blue}>{x}</tspan> 元
        </text>
        <g transform="translate(540, 496)">
          <Token ch="你" color={C.gold} r={52} spin={frame * 0.4} />
        </g>
        <g transform="translate(540, 720)">
          <Token ch="他" color={C.blue} r={52} spin={-frame * 0.4} />
        </g>
        {/* 叶子 */}
        <g transform="translate(300, 960)">
          <rect x={-150} y={-56} width={300} height={150} rx={22} fill="rgba(6,26,20,0.85)" stroke={C.coop} strokeWidth={3 + 3 * cmp} />
          <text y={-12} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34}} fill={C.coop}>
            接受
          </text>
          <text y={56} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 54}} fill={C.ink}>
            <tspan fill={C.gold}>{100 - x}</tspan> : <tspan fill={C.blue}>{x}</tspan>
          </text>
        </g>
        <g transform="translate(780, 960)" opacity={1 - 0.5 * cmp}>
          <rect x={-150} y={-56} width={300} height={150} rx={22} fill="rgba(30,8,6,0.85)" stroke={C.red} strokeWidth={3} />
          <text y={-12} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34}} fill={C.red}>
            拒绝
          </text>
          <text y={56} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 54}} fill={C.ink}>
            0 : 0
          </text>
        </g>
        {cmp > 0 ? (
          <text x={540} y={1150} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 44}} fill={C.coopHot} opacity={cmp}>
            {x} &gt; 0 → 理性的人会接受
          </text>
        ) : null}
      </svg>
      {/* 1982 */}
      {card > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center', opacity: card}}>
          <div
            style={{
              fontFamily: FONT.num,
              fontWeight: 700,
              fontSize: 230,
              lineHeight: 1,
              color: 'transparent',
              WebkitTextStroke: `3px ${C.gold}`,
              textShadow: `0 0 60px ${C.gold}44`,
              transform: `scale(${interpolate(card, [0, 1], [1.2, 1])})`,
            }}
          >
            1982
          </div>
          <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, letterSpacing: '0.24em', color: C.inkDim, marginTop: 10}}>GÜTH · SCHMITTBERGER · SCHWARZE</div>
          <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 46, color: C.ink, marginTop: 8}}>
            最后通牒博弈 <span style={{fontWeight: 500, fontSize: 30, color: C.inkDim}}>德国 · 科隆大学</span>
          </div>
          <div style={{marginTop: 50, display: 'inline-block'}}>
            <SplitBar keep={99} w={760} />
          </div>
          <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34, color: C.gold, marginTop: 6}}>理论预测：99 : 1</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
