import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {FlashPhoto, MirrorPOV} from '../three/Views';
import {Viewfinder} from '../ui/Viewfinder';
import {C, FONT} from '../theme';
import {E, map, wobble} from '../lib/anim';
import {LABELS} from '../copy';

/**
 * 0–5.8s. Frame 0 is already the payoff image: one face, split down the middle —
 * the left half is the warm mirror reflection, the right half a cold flash selfie.
 */
export const S1Hook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;

  // slide the halves apart to show both faces whole
  const slide = map(f, [64, 104], [0, 1], E.inOut);
  const shift = 480 * slide;
  // slow push-ins
  const push = map(f, [0, 175], [0, 1], E.soft);
  const shutter = f >= 30;
  const flashA = map(f, [30, 31, 40], [0, 1, 0]);
  const shake = f >= 30 && f < 40 ? Math.sin(f * 7) * (40 - f) * 0.5 : 0;

  // exit: mirror side blooms and swallows the frame
  const exit = map(f, [150, 175], [0, 1], E.in);

  const label = (text: string, color: string, x: number, delay: number) => {
    const p = map(f, [delay, delay + 16], [0, 1], E.out);
    return (
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: x - 300,
          width: 600,
          textAlign: 'center',
          fontFamily: FONT.serif,
          fontWeight: 900,
          fontSize: 56,
          letterSpacing: '0.16em',
          color,
          opacity: p * (1 - exit),
          transform: `translateY(${(1 - p) * 18}px)`,
          textShadow: `0 0 30px ${color}55, 0 4px 30px rgba(0,0,0,0.8)`,
        }}
      >
        {text}
      </div>
    );
  };

  const q1 = map(f, [104, 118], [0, 1], E.out);
  const q2 = map(f, [110, 128], [0, 1], E.out);

  return (
    <AbsoluteFill style={{background: C.ink}}>
      {/* LEFT: mirror reflection (physically rendered) */}
      <AbsoluteFill style={{clipPath: `inset(0 ${960}px 0 0)`}}>
        <AbsoluteFill style={{transform: `translateX(${-shift}px)`}}>
          <Stage post={{bloom: 1.1, threshold: 0.55, vignette: 0.5, noise: 0.03}} exposure={1.05}>
            <MirrorPOV
              mirrorW={0.5}
              mirrorH={0.74}
              mirrorZ={1.05}
              sweep={map(f, [0, 90], [-0.8, 1.6])}
              fov={21 - push * 2.2}
              camOffset={[0.002 * wobble(t, 1), 0.002 * wobble(t, 2), 0]}
              headRot={[0.02, -0.04 + 0.03 * Math.sin(t * 0.8), 0]}
            />
          </Stage>
        </AbsoluteFill>
        {/* warm grade + soft halation */}
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 40% 35%, rgba(255,190,120,0.16), rgba(0,0,0,0) 60%)', mixBlendMode: 'screen'}} />
      </AbsoluteFill>

      {/* RIGHT: phone flash selfie */}
      <AbsoluteFill style={{clipPath: `inset(0 0 0 ${960}px)`}}>
        <AbsoluteFill style={{transform: `translateX(${shift + shake}px)`}}>
          <Stage shadows post={{bloom: 0.35, threshold: 0.9, vignette: 0.35, noise: shutter ? 0.12 : 0.07, ca: 0.0012}} exposure={1.0}>
            <FlashPhoto dist={0.74 - push * 0.04} fov={47 + push * 2} flash={1} headRot={[-0.06, 0.03, 0.0]} />
          </Stage>
          <AbsoluteFill style={{background: 'rgba(120,160,200,0.08)', mixBlendMode: 'color'}} />
          <Viewfinder
            opacity={0.85 * (1 - exit)}
            faceBox={{x: 960 - 210, y: 250, w: 420, h: 500}}
            lock={map(f, [8, 24], [0, 1], E.out)}
            info={shutter ? '1/60   ƒ2.2   ISO 800   ●' : 'ISO 800   1/60   ƒ2.2   24mm'}
          />
        </AbsoluteFill>
        <AbsoluteFill style={{background: 'white', opacity: flashA}} />
      </AbsoluteFill>

      {/* the seam */}
      <div
        style={{
          position: 'absolute',
          left: 959,
          top: 0,
          width: 2,
          height: 1080,
          background: 'linear-gradient(180deg, rgba(255,240,220,0), rgba(255,240,220,0.95) 30%, rgba(200,230,255,0.95) 70%, rgba(200,230,255,0))',
          boxShadow: '0 0 24px 4px rgba(255,220,180,0.45)',
          opacity: 1 - exit,
        }}
      />

      {label(LABELS.hookMirror, C.gold, 480, 34)}
      {label(LABELS.hookPhoto, C.ice, 1440, 40)}

      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(0,0,0,0.75) 100%)', opacity: q1 * (1 - exit)}} />
      {/* the hook question */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 96, textAlign: 'center', opacity: 1 - exit}}>
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: 30,
            letterSpacing: '0.5em',
            color: C.textDim,
            opacity: q1,
            transform: `translateY(${(1 - q1) * 12}px)`,
          }}
        >
          {LABELS.hookQ1}
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: FONT.serif,
            fontWeight: 900,
            fontSize: 74,
            letterSpacing: '0.06em',
            color: C.text,
            opacity: q2,
            transform: `translateY(${(1 - q2) * 20}px) scale(${0.96 + q2 * 0.04})`,
            textShadow: '0 6px 40px rgba(0,0,0,0.9)',
          }}
        >
          {LABELS.hookQ2}
        </div>
      </div>

      {/* exit light */}
      <AbsoluteFill style={{background: `radial-gradient(circle at 30% 45%, rgba(255,214,160,${exit}), rgba(255,170,90,${exit * 0.8}) 40%, rgba(4,6,11,${exit}) 100%)`}} />
    </AbsoluteFill>
  );
};
