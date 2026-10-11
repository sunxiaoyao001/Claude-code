import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {E, map} from '../lib/anim';

/** Small editorial chapter marker, top-left. Local frames (inside its Sequence). */
export const Chapter: React.FC<{index: number; name: string; dur?: number}> = ({index, name, dur = 120}) => {
  const f = useCurrentFrame();
  const inP = map(f, [6, 26], [0, 1], E.out);
  const outP = map(f, [dur - 18, dur], [1, 0], E.in);
  const a = inP * outP;
  const line = map(f, [10, 40], [0, 1], E.expoOut);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 84, top: 70, opacity: a}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
          <span style={{fontFamily: FONT.mono, fontWeight: 600, fontSize: 22, letterSpacing: '0.2em', color: C.gold}}>
            {String(index).padStart(2, '0')}
          </span>
          <span
            style={{
              fontFamily: FONT.sans,
              fontWeight: 500,
              fontSize: 26,
              letterSpacing: '0.24em',
              color: C.text,
              transform: `translateX(${(1 - inP) * -14}px)`,
              display: 'inline-block',
            }}
          >
            {name}
          </span>
        </div>
        <div style={{marginTop: 12, height: 1, width: 220 * line, background: `linear-gradient(90deg, ${C.gold}, rgba(255,200,121,0))`}} />
      </div>
    </AbsoluteFill>
  );
};
