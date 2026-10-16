/**
 * 0:18 一层一层地想
 *  ① 套娃思维：镜头一层层拉远，L0 随便选（平均 50）→ L1 选 33 → L2 选 22 → L3 选 15 → 越来越快 → 收敛到 0
 *     顶部数轴同步落下每一层的数字，金色目标一路滑向 0
 *  ② 纳什均衡：五个人都选 0，平均 0 × 2/3 = 0；有人改选 5 只会离目标更远
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {KineticText} from '../components/KineticText';
import {LIMIT, MiniBust, Mind, levelLabel} from '../components/Mind';
import {Axis, ax} from '../components/NumberLine';
import {Stamp} from '../components/Token';
import {ease, envelope, prog} from '../lib/anim';
import {levelValue} from '../math/guess';
import {C, FONT} from '../theme';

const AXIS_Y = 360;
const FX = 340;
const FY = 975;
const G = 1.0;

/** 镜头所在的层级（连续值） */
const levelAt = (f: number) => {
  if (f < 620) return 0;
  if (f < 640) return prog(f, 620, 640, ease.inOut);
  if (f < 700) return 1;
  if (f < 720) return 1 + prog(f, 700, 720, ease.inOut);
  if (f < 780) return 2;
  if (f < 800) return 2 + prog(f, 780, 800, ease.inOut);
  if (f < 862) return 3;
  if (f < 946) return 3 + 6 * prog(f, 862, 946, ease.in);
  return 9 + 6 * prog(f, 946, 980, ease.out);
};

const Levels: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 544, 1054, 10, 12);
  if (o <= 0) return null;
  const t = levelAt(frame);
  const k = Math.round(t);
  const zero = prog(frame, 950, 962, ease.back);
  const mindFade = 1 - prog(frame, 952, 1000);
  const hud = prog(frame, 560, 576) * (1 - prog(frame, 944, 952));
  const shown = Math.min(14, Math.floor(t + 0.5));
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', top: 250, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, letterSpacing: '0.4em', color: C.hud, opacity: prog(frame, 548, 562)}}>
        LEVEL-K THINKING · 层级推理
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <Axis y={AXIS_Y} p={prog(frame, 548, 566, ease.out)} />
        {/* 每一层落下的数字 */}
        {Array.from({length: shown + 1}).map((_, j) => {
          const v = levelValue(j);
          const p = prog(frame, j === 0 ? 566 : 0, j === 0 ? 576 : 1, ease.back);
          return (
            <g key={j} opacity={j === 0 ? p : 1}>
              <circle cx={ax(v)} cy={AXIS_Y} r={j === 0 ? 11 : 9} fill={j === 0 ? C.blue : C.gold} stroke="#fff" strokeWidth={2} />
              {j <= 5 ? (
                <text x={ax(v)} y={AXIS_Y - 24} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 26}} fill={j === 0 ? C.blueHot : C.goldHot}>
                  {levelLabel(j)}
                </text>
              ) : null}
            </g>
          );
        })}
        {/* 金色目标：随层级连续滑向 0 */}
        <path
          d={`M ${ax(levelValue(t)) - 14} ${AXIS_Y - 70} L ${ax(levelValue(t)) + 14} ${AXIS_Y - 70} L ${ax(levelValue(t))} ${AXIS_Y - 52} Z`}
          fill={zero > 0 ? C.ink : C.gold}
          opacity={prog(frame, 600, 612)}
        />
        <Mind t={t} fx={FX} fy={FY} g={G} frame={frame} fade={mindFade} />
        {/* 收敛点：0 */}
        {zero > 0 ? (
          <g transform={`translate(${FX + G * LIMIT.x}, ${FY + G * LIMIT.y}) scale(${zero})`}>
            <circle r={120} fill="rgba(244,238,227,0.08)" stroke={C.ink} strokeWidth={5} style={{filter: `drop-shadow(0 0 40px ${C.ink})`}} />
            <circle r={120 + 60 * prog(frame, 950, 990)} fill="none" stroke={C.ink} strokeWidth={3} opacity={1 - prog(frame, 950, 990)} />
            <text y={58} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 170}} fill={C.ink}>
              0
            </text>
          </g>
        ) : null}
        {zero > 0 ? (
          <text x={FX + G * LIMIT.x} y={FY + G * LIMIT.y + 180} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40}} fill={C.ink} opacity={prog(frame, 962, 974)}>
            想到第 ∞ 层
          </text>
        ) : null}
      </svg>
      {/* 当前层级 */}
      {hud > 0 ? (
        <div style={{position: 'absolute', right: 70, top: 930, textAlign: 'right', opacity: hud}}>
          <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 34, color: C.inkDim}}>{k >= 8 ? '第 ∞ 层' : `第 ${k} 层`}</div>
          <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 120, lineHeight: 1.05, color: k === 0 ? C.blue : C.gold, textShadow: `0 0 40px ${k === 0 ? C.blue : C.gold}66`}}>
            {k >= 8 ? '→ 0' : k === 0 ? '≈50' : levelLabel(k)}
          </div>
          <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 26, color: C.inkDim}}>{k === 0 ? '大家随便选' : k >= 8 ? '' : `以为别人在第 ${k - 1} 层`}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** 纳什均衡：五个人都选 0 */
const NAMES = ['甲', '乙', '丙', '丁', '戊'];

const Nash: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 1046, 1230, 10, 8);
  if (o <= 0) return null;
  const dev = frame >= 1086 && frame < 1120;
  const devP = prog(frame, 1086, 1094, ease.back) * (1 - prog(frame, 1114, 1120));
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        {frame >= 1052 ? (
          <KineticText
            text={dev ? '平均 1 × 2/3 ≈ <g>0.67</g>' : '平均 0 × 2/3 = <w>0</w>'}
            frame={dev ? frame - 1086 : frame - 1052}
            duration={400}
            size={76}
            font={FONT.num}
            weight={700}
            mode="rise"
            stagger={0.6}
          />
        ) : null}
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {NAMES.map((n, i) => {
          const p = prog(frame, 1052 + i * 4, 1066 + i * 4, ease.back);
          const isDev = i === 3 && devP > 0;
          return (
            <g key={n} transform={`translate(${140 + i * 200}, ${560 - (isDev ? 30 * devP : 0)}) scale(${0.62 * p})`}>
              <MiniBust head={n} chest={isDev ? '5' : '0'} color={isDev ? C.red : C.ink} />
            </g>
          );
        })}
        {devP > 0 ? (
          <g opacity={Math.min(1, devP)}>
            <text x={740} y={760} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34}} fill={C.red}>
              改选 5：离目标更远 ×
            </text>
          </g>
        ) : null}
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 860, display: 'flex', justifyContent: 'center'}}>
        <Stamp text="纳什均衡" sub="NASH EQUILIBRIUM" color={C.ink} p={prog(frame, 1138, 1146, ease.out)} rotate={-6} size={1.15} />
      </div>
    </AbsoluteFill>
  );
};

export const ReasonScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 540 || frame >= 1230) return null;
  return (
    <AbsoluteFill>
      <Levels frame={frame} />
      <Nash frame={frame} />
    </AbsoluteFill>
  );
};
