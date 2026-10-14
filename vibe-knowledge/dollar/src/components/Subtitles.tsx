/**
 * 全局字幕轨：全片唯一的“旁白”
 * 位于抖音安全区（避开底部文案区和右侧互动按钮），
 * 每句逐字浮现，重点词按颜色语义高亮，换句时顶部细线重新划出。
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ease, prog} from '../lib/anim';
import {SUBTITLES} from '../timeline';
import {C, FONT} from '../theme';
import {KineticText} from './KineticText';

export const SUB_Y = 1268; // 字幕块顶部
const MAX_W = 820;

export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = SUBTITLES.find((c) => frame >= c.from && frame < c.to);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* 字幕区柔和压暗，保证任何背景下都清晰 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: SUB_Y - 120,
          height: 420,
          background: 'radial-gradient(60% 50% at 50% 50%, rgba(5,4,3,0.55), rgba(5,4,3,0) 70%)',
        }}
      />
      {cue ? (
        <div
          key={cue.from}
          style={{
            position: 'absolute',
            top: SUB_Y,
            left: (1080 - MAX_W) / 2,
            width: MAX_W,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* 换句提示线 */}
          <div
            style={{
              width: 64 * prog(frame - cue.from, 0, 12, ease.out),
              height: 3,
              marginBottom: 22,
              borderRadius: 2,
              background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
              opacity: 0.9 * (1 - prog(frame, cue.to - 7, cue.to)),
            }}
          />
          <KineticText
            text={cue.text}
            frame={frame - cue.from}
            duration={cue.to - cue.from}
            size={58}
            maxWidth={MAX_W}
            font={FONT.sans}
            weight={700}
            mode="rise"
            stagger={0.85}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
