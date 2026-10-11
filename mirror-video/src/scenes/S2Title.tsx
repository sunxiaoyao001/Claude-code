import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {Rig} from '../three/Rig';
import {Studio} from '../three/Lights';
import {Mirror} from '../three/Mirror';
import {Head} from '../three/Head';
import {Dust} from '../three/Dust';
import {Beam} from '../three/Beam';
import {C, FONT} from '../theme';
import {E, map, track3} from '../lib/anim';
import {LABELS} from '../copy';

/**
 * Title. A tall bronze mirror alone in the dark. Nobody stands in front of it —
 * yet a face looks back from the glass.
 */
export const S2Title: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cam = track3(
    f,
    [
      [0, [1.9, 0.55, 3.6]],
      [120, [0.55, 0.3, 2.3]],
      [175, [0.05, 0.22, 0.95]],
    ],
    E.soft,
  );
  const target = track3(f, [
    [0, [-0.62, 0.25, 0]],
    [120, [-0.5, 0.22, 0]],
    [175, [0, 0.2, 0]],
  ]);
  const fadeIn = map(f, [0, 16], [1, 0]);
  const exit = map(f, [150, 175], [0, 1], E.in);

  const titleIn = (d: number) => map(f, [d, d + 26], [0, 1], E.out);
  const titleOut = map(f, [132, 156], [1, 0], E.in);

  const renderLine = (text: string, delay: number, size: number, hiFrom = -1) => (
    <div style={{display: 'flex', justifyContent: 'flex-start'}}>
      {Array.from(text).map((ch, i) => {
        const p = titleIn(delay + i * 2.2);
        const hi = hiFrom >= 0 && i >= hiFrom;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontFamily: FONT.serif,
              fontWeight: 900,
              fontSize: size,
              letterSpacing: '0.04em',
              color: hi ? C.gold : C.text,
              opacity: p,
              transform: `translateY(${(1 - p) * 30}px) scale(${0.9 + p * 0.1})`,
              filter: p < 1 ? `blur(${(1 - p) * 12}px)` : undefined,
              textShadow: hi ? `0 0 40px ${C.amber}88, 0 6px 40px rgba(0,0,0,0.9)` : '0 6px 40px rgba(0,0,0,0.9)',
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );

  const sub = titleIn(70);
  const rule = map(f, [64, 100], [0, 1], E.expoOut);

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Stage post={{bloom: 1.2, threshold: 0.5, vignette: 0.7, noise: 0.04}} fog={['#04060b', 3, 9]}>
        <Rig position={cam} target={target} fov={30} />
        <Studio mood="mirror" intensity={0.8} />
        {/* the face only exists in the reflection (layer 1) */}
        <Head layer={1} position={[0, -0.02, 0.85]} rotation={[0, Math.PI + 0.06 * Math.sin(t * 0.7), 0]} gaze={[-cam[0], cam[1] + 0.02, cam[2] + 0.85]} />
        <pointLight position={[0.35, 0.55, 0.25]} intensity={2.2} color="#ffd4a0" distance={3} decay={2} />
        <pointLight position={[-0.45, 0.2, 0.3]} intensity={0.8} color="#ffb070" distance={3} decay={2} />
        <Mirror position={[0, 0.15, 0]} width={0.95} height={1.9} frame="bronze" sweep={map(f, [30, 130], [-1.0, 1.8], E.inOut)} />
        <Beam position={[0.6, 2.6, 0.9]} rotation={[0, 0, 0.25]} length={4} radius={1.2} opacity={0.12} />
        <Dust count={1400} box={[7, 4, 7]} center={[0, 0.3, 0.5]} color="#ffd7a6" size={0.016} />
      </Stage>

      {/* title */}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 150, opacity: titleOut}}>
        <div style={{transform: `translateY(-20px)`}}>
          {renderLine(LABELS.title1, 18, 96)}
          <div style={{height: 8}} />
          {renderLine(LABELS.title2, 34, 112, 4)}
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 26, marginTop: 38, opacity: sub}}>
            <div style={{height: 2, width: 90 * rule, background: C.gold}} />
            <div style={{fontFamily: FONT.sans, fontWeight: 500, fontSize: 36, letterSpacing: '0.42em', color: C.gold, textShadow: `0 0 24px ${C.amber}66`}}>
              {LABELS.titleSub.replace(/[「」]/g, '')}
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{background: '#ffdcae', opacity: fadeIn * 0.9}} />
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 42%, #fff4e4, #ffc27a 45%, rgba(4,6,11,0) 80%)', opacity: exit}} />
    </AbsoluteFill>
  );
};
