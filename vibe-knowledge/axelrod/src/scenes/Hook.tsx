/**
 * 0:00 钩子：CRT 开机，打出冠军程序的 4 行代码；“冠军”“胜 0”两枚印章；三行大字砸下
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {KineticText} from '../components/KineticText';
import {Terminal, type TermLine} from '../components/Terminal';
import {Stamp} from '../components/Token';
import {ease, envelope, prog} from '../lib/anim';
import {C, FONT} from '../theme';

export const TFT_CODE: TermLine[] = [
  {text: '第一回合：合作', color: C.coop},
  {text: '之后每一回合：'},
  {text: '对手上次合作 → 我合作', color: C.coop, indent: 1},
  {text: '对手上次背叛 → 我背叛', color: C.red, indent: 1},
];

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= 152) return null;
  const out = prog(frame, 136, 150, ease.in);
  const lines = [
    {text: '一场算计大赛的冠军', at: 4},
    {text: '只有 <g>4 行代码</g>', at: 42},
    {text: '而且<r>一局都没赢过</r>', at: 88},
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
          color: C.amber,
          opacity: envelope(frame, 2, 150, 6, 6) * (Math.floor(frame / 5) % 2 ? 1 : 0.6),
        }}
      >
        ● COMPUTER TOURNAMENT · 1980
      </div>
      <Terminal
        frame={frame}
        x={110}
        y={300}
        w={860}
        h={430}
        title="ENTRY_01 · TIT FOR TAT"
        lines={TFT_CODE}
        boot={0}
        typeAt={8}
        cps={1.3}
        fontSize={42}
      />
      {/* 印章：冠军 / 胜 0 */}
      <div style={{position: 'absolute', left: 650, top: 690}}>
        <Stamp text="冠军" sub="CHAMPION" color={C.gold} p={prog(frame, 42, 50, ease.out)} rotate={-9} size={0.9} />
      </div>
      <div style={{position: 'absolute', left: 140, top: 712}}>
        <Stamp text="胜 0 场" sub="WINS · 0" color={C.red} p={prog(frame, 88, 96, ease.out)} rotate={7} size={0.85} />
      </div>
      <div style={{position: 'absolute', top: 1010, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
        {lines.map((l, i) =>
          frame >= l.at ? (
            <KineticText
              key={i}
              text={l.text}
              frame={frame - l.at}
              duration={400}
              size={i === 0 ? 86 : 104}
              font={FONT.serif}
              weight={900}
              mode="slam"
              stagger={1.6}
              letterSpacing="0.04em"
              lineHeight={1.15}
              style={{opacity: i < 2 && frame > 88 ? 0.85 : 1}}
            />
          ) : (
            <div key={i} style={{height: (i === 0 ? 86 : 104) * 1.15}} />
          ),
        )}
      </div>
    </AbsoluteFill>
  );
};
