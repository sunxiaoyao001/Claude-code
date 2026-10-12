import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, F, ease} from '../theme';

export type Cue = {start: number; end: number; text: string};

/**
 * Narration subtitles. `{word}` marks a key word, rendered in dopamine gold.
 * Lines arrive with a soft focus-pull and a 1-frame per-glyph cascade.
 */
const parse = (text: string) => {
  const parts: {t: string; hi: boolean}[] = [];
  const re = /\{([^}]+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({t: text.slice(last, m.index), hi: false});
    parts.push({t: m[1], hi: true});
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({t: text.slice(last), hi: false});
  return parts;
};

const Line: React.FC<{cue: Cue; frame: number}> = ({cue, frame}) => {
  const local = frame - cue.start;
  const outT = interpolate(frame, [cue.end - 9, cue.end], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const glyphs: {ch: string; hi: boolean}[] = [];
  for (const p of parse(cue.text)) for (const ch of p.t) glyphs.push({ch, hi: p.hi});
  const outBlur = (1 - outT) * 6;
  return (
    <div
      style={{
        fontFamily: F.sans,
        fontWeight: 500,
        fontSize: 44,
        letterSpacing: '0.09em',
        color: C.ink,
        lineHeight: 1.25,
        whiteSpace: 'pre',
        opacity: outT,
        filter: outBlur > 0.05 ? `blur(${outBlur}px)` : undefined,
        textShadow: '0 0 22px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.75)',
      }}
    >
      {glyphs.map((g, i) => {
        const t = interpolate(local - i * 0.9, [0, 13], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: ease.out,
        });
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: t,
              transform: `translateY(${(1 - t) * 16}px)`,
              filter: t < 0.98 ? `blur(${(1 - t) * 9}px)` : undefined,
              color: g.hi ? C.goldHi : undefined,
              textShadow: g.hi
                ? '0 0 18px rgba(255,170,60,0.75), 0 0 42px rgba(255,140,30,0.45), 0 2px 6px rgba(0,0,0,0.7)'
                : undefined,
            }}
          >
            {g.ch === ' ' ? ' ' : g.ch}
          </span>
        );
      })}
    </div>
  );
};

export const Subtitles: React.FC<{cues: Cue[]}> = ({cues}) => {
  const frame = useCurrentFrame();
  const active = cues.filter((c) => frame >= c.start && frame < c.end);
  // Gentle bottom scrim only while text is on screen, so dark scenes keep their blacks.
  const scrim = cues.reduce((acc, c) => {
    const a = interpolate(frame, [c.start - 6, c.start + 6, c.end - 6, c.end + 6], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return Math.max(acc, a);
  }, 0);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', willChange: 'transform'}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 260,
          opacity: scrim * 0.85,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(2,3,8,0.45) 60%, rgba(2,3,8,0.6) 100%)',
        }}
      />
      {active.map((cue) => (
        <div
          key={cue.start + cue.text}
          style={{position: 'absolute', left: 0, right: 0, bottom: 74, display: 'flex', justifyContent: 'center'}}
        >
          <Line cue={cue} frame={frame} />
        </div>
      ))}
    </AbsoluteFill>
  );
};
