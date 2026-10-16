/**
 * 0:49 以牙还牙：
 *  CRT 里逐行高亮 4 行代码；下方用出招珠串演示三种情形：
 *  对永远背叛（只吃亏一次）/ 对回头的人（立刻原谅）/ 对自己（永远合作）
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Beads} from '../components/Beads';
import {Terminal} from '../components/Terminal';
import {ease, envelope, prog} from '../lib/anim';
import {tftAgainst, type Move} from '../math/ipd';
import {C, FONT} from '../theme';
import {TFT_CODE} from './Hook';

const T0 = 1470;
const T1 = 1984;

const seq = (s: string): Move[] => [...s] as Move[];
const ALLD = seq('DDDDDDDDDD');
const TURNER = seq('CCDDCCCCCC'); // 中途背叛两次又回头的人
const ALLC10 = seq('CCCCCCCCCC');

const DEMOS = [
  {from: 1719, to: 1802, top: tftAgainst(ALLD), bottom: ALLD, label: '永远背叛', color: C.red, marks: [{row: 'top' as const, i: 0, label: '吃亏一次', color: C.red}]},
  {
    from: 1802,
    to: 1885,
    top: tftAgainst(TURNER),
    bottom: TURNER,
    label: '回头的人',
    color: C.blue,
    marks: [
      {row: 'bottom' as const, i: 4, label: '回头', color: C.coop},
      {row: 'top' as const, i: 5, label: '原谅', color: C.coop},
    ],
  },
  {from: 1885, to: T1, top: ALLC10, bottom: ALLC10, label: '以牙还牙', color: C.gold, marks: []},
];

export const TftScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= T1) return null;
  const o = envelope(frame, T0, T1, 8, 8);
  const hl = (i: number) => {
    if (i === 0) return envelope(frame, 1558, 1642, 6, 6);
    if (i >= 2) return envelope(frame, 1641, 1720, 6, 6);
    return envelope(frame, 1641, 1720, 6, 6) * 0.4;
  };
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Terminal
        frame={frame}
        x={90}
        y={290}
        w={900}
        h={410}
        title="TIT_FOR_TAT · 4 LINES"
        lines={TFT_CODE}
        boot={1472}
        typeAt={1486}
        cps={1.3}
        highlight={hl}
        fontSize={42}
      />
      {/* 图例 */}
      <div
        style={{
          position: 'absolute',
          top: 768,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 40,
          fontFamily: FONT.sans,
          fontWeight: 700,
          fontSize: 26,
          color: C.inkDim,
          opacity: prog(frame, 1719, 1730),
        }}
      >
        <span>
          <span style={{color: C.coop}}>●</span> 合作
        </span>
        <span>
          <span style={{color: C.red}}>●</span> 背叛
        </span>
        <span style={{fontFamily: FONT.mono, fontSize: 22}}>每格 = 一回合</span>
      </div>
      {DEMOS.map((d, k) => {
        const dO = envelope(frame, d.from, d.to, 6, 6);
        if (dO <= 0) return null;
        return (
          <Beads
            key={k}
            frame={frame}
            x={40}
            y={858}
            top={{label: '以牙还牙', moves: d.top, color: C.gold}}
            bottom={{label: d.label, moves: d.bottom, color: d.color}}
            start={d.from + 4}
            step={4}
            size={46}
            gap={14}
            echoArrows={k < 2}
            marks={d.marks}
            opacity={dO}
          />
        );
      })}
      {/* 三条品格 */}
      <div
        style={{
          position: 'absolute',
          top: 1100,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 22,
        }}
      >
        {[
          {t: '不先害人', c: C.coop},
          {t: '不吃哑巴亏', c: C.red},
          {t: '不记仇', c: C.gold},
        ].map((x, i) => {
          const p = prog(frame, 1890 + i * 8, 1902 + i * 8, ease.back);
          return (
            <div
              key={i}
              style={{
                padding: '12px 26px',
                borderRadius: 999,
                border: `2px solid ${x.c}`,
                background: `${x.c}1a`,
                fontFamily: FONT.sans,
                fontWeight: 900,
                fontSize: 32,
                color: x.c,
                opacity: Math.min(1, p),
                transform: `scale(${p})`,
              }}
            >
              {x.t}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
