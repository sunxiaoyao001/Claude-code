/**
 * 开场两幕
 *  0:00 钩子：数字雨落在 0～100 的数轴上 → 平均数 → 目标 2/3 → “选 0 最聪明，却全输了”
 *  0:05 规则：甲乙丙丁戊各写一个数 → 平均 50 → ×2/3 = 33.3 → 写 30 的乙赢；暂停 3 秒想好你的数字
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {KineticText} from '../components/KineticText';
import {Axis, Marker, ax} from '../components/NumberLine';
import {Stamp, Token} from '../components/Token';
import {ease, envelope, prog} from '../lib/anim';
import {EXAMPLE, P, mean} from '../math/guess';
import {RAIN_AT} from '../timeline';
import {C, FONT} from '../theme';

/* ============================================================
 * 钩子
 * ========================================================== */
const RAIN = [73, 12, 50, 88, 35, 61, 27, 94];
const RAIN_AVG = mean(RAIN); // 55
const HOOK_Y = 820;

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= 152) return null;
  const out = prog(frame, 136, 150, ease.in);
  const avgP = prog(frame, 40, 48, ease.out);
  const tgt = prog(frame, 44, 56, ease.inOut);
  const zero = prog(frame, 86, 96, ease.back);
  const lines = [
    {text: '从 0～100，选一个数', at: 4, size: 84},
    {text: '猜中平均数的 <g>2/3</g> 就赢', at: 40, size: 92},
    {text: '选 0 最聪明，<r>却全输了</r>', at: 86, size: 100},
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
        ● GUESS 2/3 OF THE AVERAGE
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <Axis y={HOOK_Y} p={prog(frame, 0, 10, ease.out)} />
        {/* 数字雨 */}
        {RAIN.map((v, i) => {
          const at = RAIN_AT[i];
          const fall = prog(frame, at - 10, at, ease.in);
          if (fall <= 0) return null;
          const landed = frame >= at;
          const x = ax(v);
          const y = interpolate(fall, [0, 1], [360, HOOK_Y]);
          return landed ? (
            <g key={i}>
              <circle cx={x} cy={HOOK_Y} r={12} fill={C.blue} stroke="#fff" strokeWidth={2} />
              <text x={x} y={HOOK_Y - 28} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 34}} fill={C.blueHot}>
                {v}
              </text>
            </g>
          ) : (
            <text key={i} x={x} y={y} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 64}} fill={C.blue} opacity={0.4 + 0.6 * fall}>
              {v}
            </text>
          );
        })}
        <Marker v={RAIN_AVG} y={HOOK_Y} h={170} color={C.ink} label={`平均 ${Math.round(RAIN_AVG)}`} p={avgP} labelSize={34} width={3} />
        <Marker
          v={interpolate(tgt, [0, 1], [RAIN_AVG, RAIN_AVG * P])}
          y={HOOK_Y}
          h={260}
          color={C.gold}
          label={tgt >= 1 ? `2/3 → ${(RAIN_AVG * P).toFixed(1)}` : '× 2/3'}
          p={prog(frame, 44, 50)}
          labelSize={40}
        />
        {/* 0：最聪明的答案 */}
        {zero > 0 ? (
          <g transform={`translate(${ax(0)}, ${HOOK_Y}) scale(${zero})`}>
            <circle r={46} fill="rgba(244,238,227,0.12)" stroke={C.ink} strokeWidth={4} style={{filter: `drop-shadow(0 0 24px ${C.ink})`}} />
            <text y={22} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 64}} fill={C.ink}>
              0
            </text>
          </g>
        ) : null}
      </svg>
      <div style={{position: 'absolute', left: 60, top: 560}}>
        <Stamp text="全输了" sub="LOSE" color={C.red} p={prog(frame, 100, 108, ease.out)} rotate={-8} />
      </div>
      <div style={{position: 'absolute', top: 980, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
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
const NAMES = ['甲', '乙', '丙', '丁', '戊'];
const DROP_AT = [244, 250, 256, 262, 268];
const RULE_Y = 820;
const EX_AVG = mean(EXAMPLE); // 50
const EX_T = EX_AVG * P; // 33.3

const Example: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 150, 412, 12, 10);
  if (o <= 0) return null;
  const avgP = prog(frame, 284, 294, ease.out);
  const slide = prog(frame, 300, 316, ease.inOut);
  const win = prog(frame, 320, 332, ease.back);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {EXAMPLE.map((v, i) => {
          const x = 140 + i * 200;
          const p = prog(frame, 160 + i * 4, 176 + i * 4, ease.back);
          const card = prog(frame, 176 + i * 4, 190 + i * 4, ease.out);
          const winner = v === 30 ? win : 0;
          const col = winner > 0 ? C.coop : C.blue;
          return (
            <g key={i}>
              <g transform={`translate(${x}, 430) scale(${p})`}>
                <Token ch={NAMES[i]} color={col} r={56} spin={frame * 0.4} glow={0.5 + 0.5 * winner} />
              </g>
              <text x={x} y={556} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 56}} fill={col} opacity={card}>
                {v}
              </text>
            </g>
          );
        })}
        <Axis y={RULE_Y} p={prog(frame, 236, 252, ease.out)} />
        {EXAMPLE.map((v, i) => {
          const fall = prog(frame, DROP_AT[i] - 8, DROP_AT[i], ease.in);
          if (fall <= 0) return null;
          const y = interpolate(fall, [0, 1], [570, RULE_Y]);
          const isWin = v === 30 && win > 0;
          return (
            <circle key={i} cx={ax(v)} cy={y} r={isWin ? 14 + 4 * win : 12} fill={isWin ? C.coop : C.blue} stroke="#fff" strokeWidth={2} style={isWin ? {filter: `drop-shadow(0 0 16px ${C.coop})`} : undefined} />
          );
        })}
        <Marker v={EX_AVG} y={RULE_Y} h={110} color={C.ink} label={`平均 ${EX_AVG}`} p={avgP} labelSize={34} width={3} />
        <Marker
          v={interpolate(slide, [0, 1], [EX_AVG, EX_T])}
          y={RULE_Y}
          h={140}
          color={C.gold}
          label={slide >= 1 ? EX_T.toFixed(1) : '× 2/3'}
          sub={slide >= 1 ? '2/3' : undefined}
          p={prog(frame, 300, 306)}
        />
        {/* 赢家：离目标最近 */}
        {win > 0 ? (
          <g opacity={Math.min(1, win)}>
            <line x1={ax(30)} x2={ax(EX_T)} y1={RULE_Y + 70} y2={RULE_Y + 70} stroke={C.coop} strokeWidth={4} />
            <line x1={ax(30)} x2={ax(30)} y1={RULE_Y + 58} y2={RULE_Y + 82} stroke={C.coop} strokeWidth={4} />
            <line x1={ax(EX_T)} x2={ax(EX_T)} y1={RULE_Y + 58} y2={RULE_Y + 82} stroke={C.coop} strokeWidth={4} />
            <text x={(ax(30) + ax(EX_T)) / 2} y={RULE_Y + 116} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={C.coop}>
              最近 → 赢
            </text>
          </g>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};

/** 暂停 3 秒：输入框 + 倒数 */
const Countdown: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 408, 540, 10, 6);
  if (o <= 0) return null;
  const n = frame < 476 ? null : frame < 496 ? 3 : frame < 516 ? 2 : 1;
  const k = n === null ? 0 : prog(frame, 476 + (3 - n) * 20, 484 + (3 - n) * 20, ease.back);
  const caret = Math.floor(frame / 8) % 2 === 0;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 420, display: 'flex', justifyContent: 'center'}}>
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
          <span style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 96, color: C.gold, width: 200}}>{caret ? '_' : ' '}</span>
          <span style={{flex: 1}} />
          <span style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, color: C.inkDim}}>0～100</span>
        </div>
      </div>
      {n !== null ? (
        <div
          key={n}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 640,
            textAlign: 'center',
            fontFamily: FONT.num,
            fontWeight: 700,
            fontSize: 300,
            lineHeight: 1,
            color: C.gold,
            textShadow: `0 0 80px ${C.gold}88`,
            opacity: Math.min(1, k) * (1 - prog(frame, 476 + (3 - n) * 20 + 14, 476 + (3 - n) * 20 + 20)),
            transform: `scale(${interpolate(Math.min(1, k), [0, 1], [1.6, 1])})`,
          }}
        >
          {n}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const RulesScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 150 || frame >= 544) return null;
  return (
    <AbsoluteFill>
      <Example frame={frame} />
      <Countdown frame={frame} />
    </AbsoluteFill>
  );
};
