import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '../lib/noise';
import {Backdrop} from '../components/Look';
import {C, F, ease} from '../theme';
import {RewardTrace} from '../components/Dopamine';
import {Dust} from '../components/Atmosphere';
import {prog} from '../lib/math';

// Two decks. Top: every card pays — the response fades as it becomes predictable.
// Bottom: a coin flip — anticipation never settles (Fiorillo, Tobler & Schultz, Science 2003).
const A_FLIPS = [128, 150, 172, 194, 216, 238];
const A_MAG = [0.42, 0.24, 0.14, 0.09, 0.07, 0.06];
const B_FLIPS = [270, 292, 314, 336, 358, 380, 402, 424, 446];
const B_WIN = [true, false, false, true, false, true, true, false, true];

const levelA = (t: number) => {
  let v = 0.12 + noise2D('la', t * 0.05, 0) * 0.02;
  A_FLIPS.forEach((at, i) => {
    const dt = t - at - 6;
    if (dt >= 0) v += A_MAG[i] * (dt < 3 ? dt / 3 : Math.exp(-(dt - 3) / 12));
  });
  return v;
};

const levelB = (t: number) => {
  let v = 0.12 + noise2D('lb', t * 0.05, 0) * 0.02;
  // sustained anticipation: activity climbs while the outcome is unknown
  const ramp = interpolate(t, [252, 300], [0, 0.26], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.soft});
  v += ramp;
  B_FLIPS.forEach((at, i) => {
    const pre = interpolate(t, [at - 18, at + 4], [0, 0.12], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    const dt = t - at - 6;
    const post = dt >= 0 ? (B_WIN[i] ? 0.5 : -0.16) * (dt < 3 ? dt / 3 : Math.exp(-(dt - 3) / 13)) : 0;
    v += (dt < 0 ? pre : pre * Math.exp(-dt / 6)) + post;
  });
  return v;
};

const Card: React.FC<{x: number; y: number; flipAt: number; win: boolean; frame: number; appear: number; dim?: number}> = ({x, y, flipAt, win, frame, appear, dim = 0}) => {
  const p = prog(frame, flipAt, 12, ease.inOut);
  const lift = Math.sin(p * Math.PI) * 26;
  const glow = win ? prog(frame, flipAt + 8, 10, ease.out) * (1 - prog(frame, flipAt + 30, 40)) : 0;
  return (
    <div style={{position: 'absolute', left: x, top: y - lift, width: 96, height: 134, perspective: 900, opacity: appear * (1 - dim * 0.5), transform: `translateY(${(1 - appear) * 30}px)`}}>
      {win && glow > 0.01 ? (
        <div style={{position: 'absolute', left: -70, top: -70, width: 236, height: 274, borderRadius: '50%', opacity: glow, background: 'radial-gradient(ellipse, rgba(255,160,50,0.55) 0%, rgba(255,160,50,0.18) 40%, rgba(255,160,50,0) 70%)'}} />
      ) : null}
      <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateY(${p * 180}deg)`}}>
        {/* back */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 14,
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(150deg, #1d2440 0%, #0d1124 100%)',
            border: '1.5px solid rgba(255,190,110,0.35)',
            boxShadow: '0 10px 18px rgba(0,0,0,0.45)',
            overflow: 'hidden',
          }}
        >
          <div style={{position: 'absolute', inset: 8, borderRadius: 9, border: '1px solid rgba(255,190,110,0.18)', backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,190,110,0.05) 0 2px, rgba(0,0,0,0) 2px 10px)'}} />
          <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.serif, fontWeight: 900, fontSize: 52, color: 'rgba(255,200,130,0.55)'}}>?</div>
        </div>
        {/* face */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 14,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: win ? 'linear-gradient(160deg, #2a1d0c 0%, #120c06 100%)' : 'linear-gradient(160deg, #1a1c22 0%, #0c0d11 100%)',
            border: win ? '1.5px solid rgba(255,190,110,0.7)' : '1.5px solid rgba(255,255,255,0.12)',
            boxShadow: '0 10px 18px rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {win ? (
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 36% 30%, #fffdf4 0%, #ffe7a8 16%, #ffc15a 38%, #e07a14 78%, #9a4a08 100%)',
                boxShadow: '0 0 16px rgba(255,170,60,0.75), inset 0 -4px 8px rgba(120,50,0,0.5)',
              }}
            />
          ) : (
            <div style={{fontFamily: F.sans, fontWeight: 300, fontSize: 64, color: 'rgba(255,255,255,0.25)'}}>×</div>
          )}
        </div>
      </div>
    </div>
  );
};

export const UncertaintyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const aIn = prog(frame, 16, 24, ease.out);
  const bIn = prog(frame, 34, 24, ease.out);
  const aDim = prog(frame, 262, 30, ease.inOut);
  const bFocus = prog(frame, 360, 40, ease.inOut);
  const push = interpolate(frame, [0, 470], [1, 1.06], {easing: ease.inOut});

  const Lane: React.FC<{y: number; title: string; sub: string; appear: number; dim: number; children: React.ReactNode}> = ({y, title, sub, appear, dim, children}) => (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, opacity: 1 - dim * 0.55}}>
      <div style={{position: 'absolute', left: 120, top: y + 30, opacity: appear, transform: `translateX(${(1 - appear) * -20}px)`}}>
        <div style={{fontFamily: F.serif, fontWeight: 900, fontSize: 46, color: C.ink, letterSpacing: '0.06em'}}>{title}</div>
        <div style={{fontFamily: F.sans, fontSize: 24, color: C.inkDim, marginTop: 10, letterSpacing: '0.1em'}}>{sub}</div>
      </div>
      {children}
    </div>
  );

  return (
    <AbsoluteFill style={{background: C.void, overflow: 'hidden'}}>
      <Backdrop bg={`radial-gradient(ellipse 80% 70% at 50% 50%, #0d1120 0%, ${C.void} 85%)`} />
      <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(140,160,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(140,160,255,0.035) 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
      <AbsoluteFill style={{transform: `scale(${push})`, willChange: 'transform'}}>
        <Lane y={150} title="确定的奖励" sub="每一张都有" appear={aIn} dim={aDim}>
          {A_FLIPS.map((at, i) => (
            <Card key={i} x={450 + i * 82} y={186} flipAt={at} win frame={frame} appear={prog(frame, 20 + i * 3, 18, ease.out)} />
          ))}
          <RewardTrace frame={frame} spikes={[]} levelFn={levelA} x={1240} y={150} w={580} h={220} windowFrames={190} opacity={aIn} uid="trA" />
        </Lane>
        <div style={{position: 'absolute', left: 120, right: 120, top: 498, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.12), rgba(255,255,255,0))', opacity: bIn}} />
        <Lane y={560} title="不确定的奖励" sub="有时有，有时没有" appear={bIn} dim={0}>
          {B_FLIPS.map((at, i) => (
            <Card key={i} x={450 + i * 82} y={596} flipAt={at} win={B_WIN[i]} frame={frame} appear={prog(frame, 38 + i * 3, 18, ease.out)} />
          ))}
          <div style={{position: 'absolute', left: 1200, top: 520, width: 660, height: 320, borderRadius: 30, background: 'radial-gradient(ellipse, rgba(255,150,40,0.16), rgba(255,150,40,0) 70%)', opacity: bFocus}} />
          <RewardTrace frame={frame} spikes={[]} levelFn={levelB} x={1240} y={560} w={580} h={220} windowFrames={190} opacity={bIn} uid="trB" />
          <div style={{position: 'absolute', left: 1600, top: 512, fontFamily: F.sans, fontWeight: 500, fontSize: 30, color: C.goldHi, letterSpacing: '0.14em', opacity: bFocus, textShadow: '0 0 18px rgba(255,160,50,0.7)'}}>持续兴奋</div>
        </Lane>
        <div style={{position: 'absolute', left: 1240, top: 110, fontFamily: F.sans, fontSize: 22, color: 'rgba(238,241,248,0.5)', letterSpacing: '0.16em', opacity: aIn * (1 - aDim * 0.5)}}>多巴胺神经元活动</div>
        <div style={{position: 'absolute', left: 1240, top: 520, fontFamily: F.sans, fontSize: 22, color: 'rgba(238,241,248,0.5)', letterSpacing: '0.16em', opacity: bIn * (1 - bFocus)}}>多巴胺神经元活动</div>
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 56, top: 44, fontFamily: F.mono, fontSize: 16, color: 'rgba(238,241,248,0.38)', letterSpacing: '0.12em'}}>Fiorillo, Tobler &amp; Schultz · Science · 2003</div>
      <Dust seed="undust" count={40} opacity={0.35} />
    </AbsoluteFill>
  );
};
