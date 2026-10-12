import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {Backdrop} from '../components/Look';
import {C, F, ease} from '../theme';
import {BrainStage, NAC, PFC, projectBrainPoint, type BrainStageProps} from '../brain/BrainStage';
import {Bokeh, Dust} from '../components/Atmosphere';
import {Callout} from '../components/Callout';
import {SevenSeg} from '../components/SevenSeg';
import {prog} from '../lib/math';

// Brake (prefrontal cortex, cool blue) vs accelerator (reward system, gold) as the night wears on.
export const BrakeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const night = interpolate(frame, [10, 250], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
  const graphIn = prog(frame, 268, 34, ease.inOut);
  const pfc = 1.15 - night * 0.9 + noise2D('pf', frame * 0.2, 0) * 0.05 * night;
  const reward = 0.55 + night * 0.45;
  const stage: BrainStageProps = {
    frame,
    yaw: interpolate(frame, [0, 400], [-1.72, -1.42]),
    pitch: 0.12,
    scale: 0.98,
    position: [interpolate(graphIn, [0, 1], [0.42, -0.95]), 0.04, 0],
    camZ: 4.4,
    scan: 1,
    flow: 1,
    flowSpeed: 0.008 + night * 0.014,
    vta: reward,
    nac: reward,
    pfc,
    pfcColor: '#6aa8ff',
    structures: 0.3,
    xrayRim: '#8a90ad',
    xrayFill: '#343a55',
    burst: night * 0.4,
  };
  const pP = projectBrainPoint(PFC, stage);
  const pN = projectBrainPoint(NAC, stage);
  const mins = Math.floor(interpolate(frame, [10, 250], [23 * 60 + 5, 26 * 60 + 47], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut}));
  const hh = String(Math.floor(mins / 60) % 24).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  const hud = prog(frame, 16, 20, ease.out) * (1 - graphIn);

  return (
    <AbsoluteFill style={{background: C.void, overflow: 'hidden'}}>
      <Backdrop bg={`radial-gradient(ellipse 70% 70% at 55% 48%, #0b1020 0%, ${C.void} 80%)`} />
      <Bokeh seed="brkbk" count={16} colors={[[90, 140, 255], [255, 170, 60]]} opacity={0.2} />
      <AbsoluteFill style={{opacity: 1 - graphIn * 0.55}}>
        <BrainStage {...stage} />
      </AbsoluteFill>
      <Callout frame={frame} at={30} x={pP.x} y={pP.y} dx={-170} dy={-150} title="前额叶" sub="自控 · 刹车" color="#8fbcff" out={262} />
      <Callout frame={frame} at={52} x={pN.x} y={pN.y} dx={-200} dy={150} title="奖励系统" sub="冲动 · 油门" color="#ffc56b" out={262} />
      {/* two gauges, like a dashboard at night */}
      <div style={{position: 'absolute', left: 120, top: 330, width: 420, opacity: hud, transform: `translateX(${(1 - hud) * -20}px)`}}>
        <Gauge label="刹车" sub="前额叶" value={pfc} color="#6aa8ff" />
        <div style={{height: 46}} />
        <Gauge label="油门" sub="奖励系统" value={reward} color="#ffb547" />
      </div>
      <div style={{position: 'absolute', left: 120, top: 200, opacity: hud, filter: 'drop-shadow(0 0 10px rgba(255,40,30,0.8))'}}>
        <SevenSeg text={`${hh}:${mm}`} height={64} />
      </div>
      {graphIn > 0 ? <WantGraph frame={frame} appear={graphIn} /> : null}
      <Dust seed="brkdust" count={40} opacity={0.35} />
    </AbsoluteFill>
  );
};

const Gauge: React.FC<{label: string; sub: string; value: number; color: string}> = ({label, sub, value, color}) => {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 14}}>
        <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: 40, color, letterSpacing: '0.1em', textShadow: `0 0 18px ${color}99`}}>{label}</span>
        <span style={{fontFamily: F.sans, fontSize: 24, color: 'rgba(238,241,248,0.55)', letterSpacing: '0.12em'}}>{sub}</span>
        <span style={{marginLeft: 'auto', fontFamily: F.mono, fontSize: 26, color, fontVariantNumeric: 'tabular-nums'}}>{Math.round(v * 100)}%</span>
      </div>
      <div style={{marginTop: 14, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden'}}>
        <div style={{width: `${v * 100}%`, height: 12, borderRadius: 6, background: `linear-gradient(90deg, ${color}66, ${color})`, boxShadow: `0 0 16px ${color}`}} />
      </div>
    </div>
  );
};

/** Wanting stays high while liking drains away: the gap between them is the emptiness. */
const WantGraph: React.FC<{frame: number; appear: number}> = ({frame, appear}) => {
  const x0 = 900;
  const y0 = 790;
  const w = 860;
  const h = 520;
  const draw = prog(frame, 290, 90, ease.inOut);
  const n = 60;
  const want: [number, number][] = [];
  const like: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * draw;
    const x = x0 + u * w;
    const wv = 0.62 + 0.22 * u + 0.05 * Math.sin(u * 30) * u;
    const lv = 0.68 * Math.exp(-u * 2.1) + 0.07 + 0.03 * Math.sin(u * 26);
    want.push([x, y0 - wv * h]);
    like.push([x, y0 - lv * h]);
  }
  const path = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const gap = `${path(want)} ${like
    .slice()
    .reverse()
    .map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ')} Z`;
  const wEnd = want[want.length - 1];
  const lEnd = like[like.length - 1];
  return (
    <div style={{position: 'absolute', inset: 0, opacity: appear}}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="gapfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffb547" stopOpacity="0.18" />
            <stop offset="1" stopColor="#9fb4ff" stopOpacity="0.08" />
          </linearGradient>
          <filter id="wg-blur">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <line x1={x0} y1={y0} x2={x0 + w} y2={y0} stroke="rgba(255,255,255,0.25)" />
        <line x1={x0} y1={y0} x2={x0} y2={y0 - h - 20} stroke="rgba(255,255,255,0.25)" />
        <text x={x0 + w} y={y0 + 44} textAnchor="end" fontFamily={F.sans} fontSize={26} fill="rgba(238,241,248,0.55)" letterSpacing="3">
          刷过的视频 →
        </text>
        <path d={gap} fill="url(#gapfill)" />
        <path d={path(want)} stroke="#ff9a2e" strokeWidth={12} fill="none" opacity={0.5} filter="url(#wg-blur)" />
        <path d={path(want)} stroke="#ffc874" strokeWidth={4} fill="none" strokeLinecap="round" />
        <path d={path(like)} stroke="#e9eefc" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.85} />
        <circle cx={wEnd[0]} cy={wEnd[1]} r={7} fill="#fff1d6" />
        <circle cx={lEnd[0]} cy={lEnd[1]} r={6} fill="#e9eefc" />
      </svg>
      <div style={{position: 'absolute', left: Math.min(wEnd[0] + 18, 1780), top: wEnd[1] - 56, fontFamily: F.sans, fontWeight: 700, fontSize: 36, color: C.goldHi, letterSpacing: '0.1em', textShadow: '0 0 18px rgba(255,160,50,0.7)'}}>想要</div>
      <div style={{position: 'absolute', left: Math.min(lEnd[0] + 18, 1760), top: lEnd[1] + 14, fontFamily: F.sans, fontWeight: 500, fontSize: 32, color: '#e9eefc', letterSpacing: '0.1em'}}>满足感</div>
      <div
        style={{
          position: 'absolute',
          left: x0 + w * 0.6,
          top: y0 - h * 0.5,
          fontFamily: F.serif,
          fontWeight: 900,
          fontSize: 52,
          color: 'rgba(238,241,248,0.88)',
          letterSpacing: '0.4em',
          opacity: prog(frame, 360, 24),
        }}
      >
        空虚
      </div>
    </div>
  );
};
