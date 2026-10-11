import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CUES, Cue} from '../copy';
import {C, FONT} from '../theme';
import {E, clamp, map} from '../lib/anim';

type Seg = {t: string; hi: boolean};
export const parseHi = (s: string): Seg[] => {
  const out: Seg[] = [];
  const re = /「([^」]*)」/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({t: s.slice(last, m.index), hi: false});
    out.push({t: m[1], hi: true});
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({t: s.slice(last), hi: false});
  return out;
};

const Line: React.FC<{cue: Cue; frame: number}> = ({cue, frame}) => {
  const local = frame - cue.from;
  const dur = cue.to - cue.from;
  const out = map(local, [dur - 9, dur], [1, 0], E.in);
  const segs = parseHi(cue.text);
  let idx = 0;
  const outBlur = (1 - out) * 10;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 74,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: out,
        filter: outBlur > 0.05 ? `blur(${outBlur}px)` : undefined,
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: -40,
          width: 1300,
          height: 190,
          background: 'radial-gradient(closest-side, rgba(0,0,0,0.55), rgba(0,0,0,0))',
          opacity: map(local, [0, 10], [0, 1]),
        }}
      />
      <div
        style={{
          position: 'relative',
          fontFamily: FONT.sans,
          fontWeight: 500,
          fontSize: 46,
          letterSpacing: '0.06em',
          color: C.text,
          textShadow: '0 2px 20px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.6)',
          whiteSpace: 'pre',
        }}
      >
        {segs.map((seg, si) => (
          <span key={si} style={{color: seg.hi ? C.gold : C.text, fontWeight: seg.hi ? 700 : 500}}>
            {Array.from(seg.t).map((ch, ci) => {
              const i = idx++;
              const p = clamp((local - i * 0.75) / 11);
              const e = E.out(p);
              return (
                <span
                  key={ci}
                  style={{
                    display: 'inline-block',
                    opacity: e,
                    transform: `translateY(${(1 - e) * 16}px)`,
                    filter: p < 1 ? `blur(${(1 - e) * 8}px)` : undefined,
                  }}
                >
                  {ch === ' ' ? ' ' : ch}
                </span>
              );
            })}
          </span>
        ))}
      </div>
      {cue.cite ? (
        <div
          style={{
            position: 'relative',
            marginTop: 12,
            fontFamily: FONT.mono,
            fontSize: 20,
            letterSpacing: '0.12em',
            color: C.textDim,
            opacity: map(local, [14, 26], [0, 1]),
          }}
        >
          — {cue.cite}
        </div>
      ) : null}
    </div>
  );
};

export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const active = CUES.filter((c) => frame >= c.from && frame < c.to);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {active.map((c) => (
        <Line key={c.from} cue={c} frame={frame} />
      ))}
    </AbsoluteFill>
  );
};
