/**
 * 1:35 弱点：误会
 *  两个以牙还牙，一方手滑一次 → 互相报复的交替循环；
 *  宽容版：对方原谅一次 → 回到合作
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Beads} from '../components/Beads';
import {Kicker} from '../components/ui';
import {ease, envelope, hash, prog} from '../lib/anim';
import type {Move} from '../math/ipd';
import {C, FONT} from '../theme';

const T0 = 2850;
const T1 = 3094;
const N = 10;
const SLIP = 2;

/** 两个以牙还牙互相对打，A 在第 SLIP 回合手滑；forgiveAt：B 在该回合选择原谅 */
const echo = (forgiveAt = -1) => {
  const a: Move[] = [];
  const b: Move[] = [];
  for (let i = 0; i < N; i++) {
    const ma: Move = i === SLIP ? 'D' : i === 0 ? 'C' : b[i - 1];
    const mb: Move = i === 0 ? 'C' : i === forgiveAt ? 'C' : a[i - 1];
    a.push(ma);
    b.push(mb);
  }
  return {a, b};
};

export const CaveatScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= T1) return null;
  const o = envelope(frame, T0, T1, 10, 8);
  const loop = echo();
  const kind = echo(SLIP + 1);
  const glitch = envelope(frame, 2876, 2892, 1, 8);
  const loopTag = prog(frame, 2940, 2954, ease.out);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="WEAKNESS · NOISE" zh="弱点：误会" opacity={prog(frame, 2854, 2870)} y={290} color={C.red} />
      <div style={{transform: glitch > 0 ? `translateX(${(hash(frame) - 0.5) * 24 * glitch}px)` : undefined, filter: glitch > 0.3 ? 'hue-rotate(40deg) saturate(1.6)' : undefined}}>
        <Beads
          frame={frame}
          x={40}
          y={480}
          top={{label: '以牙还牙 A', moves: loop.a, color: C.gold}}
          bottom={{label: '以牙还牙 B', moves: loop.b, color: C.gold}}
          start={2862}
          step={6}
          size={46}
          gap={14}
          echoArrows
          marks={[{row: 'top', i: SLIP, label: '手滑', color: C.redHot}]}
          showScore={false}
        />
      </div>
      {/* 报复循环标注 */}
      {loopTag > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 250 + 3 * 60,
            width: 7 * 60,
            top: 650,
            height: 12,
            borderBottom: `4px solid ${C.red}`,
            borderLeft: `4px solid ${C.red}`,
            borderRight: `4px solid ${C.red}`,
            opacity: loopTag,
          }}
        >
          <div style={{position: 'absolute', top: 24, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.sans, fontWeight: 900, fontSize: 30, color: C.red, whiteSpace: 'nowrap'}}>
            互相报复 · 没完没了
          </div>
        </div>
      ) : null}
      {/* 宽容版 */}
      <div style={{opacity: envelope(frame, 3016, T1, 10, 6)}}>
        <div style={{position: 'absolute', top: 800, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, letterSpacing: '0.3em', color: C.coop}}>
          GENEROUS TIT FOR TAT · 宽容版
        </div>
        <Beads
          frame={frame}
          x={40}
          y={900}
          top={{label: '宽容版 A', moves: kind.a, color: C.coop}}
          bottom={{label: '宽容版 B', moves: kind.b, color: C.coop}}
          start={3020}
          step={5}
          size={46}
          gap={14}
          marks={[
            {row: 'top', i: SLIP, label: '手滑', color: C.redHot},
            {row: 'bottom', i: SLIP + 1, label: '原谅', color: C.coop},
          ]}
          showScore={false}
        />
      </div>
    </AbsoluteFill>
  );
};
