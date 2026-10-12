import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Look';
import {C, F, ease} from '../theme';
import {Phone} from '../components/phone/Phone';
import {Feed} from '../components/phone/FeedUI';
import {Bokeh, Dust, LightLeak} from '../components/Atmosphere';
import {GoldBurst} from '../components/Dopamine';
import {BedroomView} from './BedroomScene';
import {prog} from '../lib/math';

const SNAP = 58;

/** Gold chain links locked across the phone; at SNAP they burst apart. */
const Chains: React.FC<{frame: number}> = ({frame}) => {
  const links: React.ReactNode[] = [];
  const lines = [
    {x0: 560, y0: 160, x1: 1360, y1: 920},
    {x0: 1360, y0: 160, x1: 560, y1: 920},
  ];
  lines.forEach((ln, li) => {
    const n = 15;
    const ang = Math.atan2(ln.y1 - ln.y0, ln.x1 - ln.x0);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const bx = ln.x0 + (ln.x1 - ln.x0) * u;
      const by = ln.y0 + (ln.y1 - ln.y0) * u;
      const t = frame - SNAP;
      let x = bx;
      let y = by;
      let rot = (ang * 180) / Math.PI;
      let op = prog(frame, 4 + i * 1.2, 10, ease.out);
      if (t > 0) {
        const dx = bx - 960;
        const dy = by - 540;
        const d = Math.hypot(dx, dy) || 1;
        const sp = 9 + random(`cs${li}${i}`) * 14;
        x += (dx / d) * sp * t * 0.92 ** (t * 0.3);
        y += (dy / d) * sp * t * 0.92 ** (t * 0.3) + 0.35 * t * t;
        rot += (random(`cr${li}${i}`) - 0.5) * 30 * t;
        op *= Math.max(0, 1 - t / 40);
      }
      const edge = i % 2 === 1;
      links.push(
        <g key={`${li}-${i}`} transform={`translate(${x} ${y}) rotate(${rot})`} opacity={op}>
          {edge ? (
            <rect x={-34} y={-6} width={68} height={12} rx={6} fill="url(#chain-edge)" />
          ) : (
            <>
              <rect x={-36} y={-20} width={72} height={40} rx={20} fill="none" stroke="url(#chain-gold)" strokeWidth={10} />
              <rect x={-36} y={-20} width={72} height={40} rx={20} fill="none" stroke="#fff6dc" strokeWidth={2} opacity={0.5} strokeDasharray="20 140" strokeDashoffset={-frame * 3} />
            </>
          )}
        </g>,
      );
    }
  });
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id="chain-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff0c0" />
          <stop offset="0.35" stopColor="#ffbf4a" />
          <stop offset="0.6" stopColor="#a8600c" />
          <stop offset="1" stopColor="#ffd27a" />
        </linearGradient>
        <linearGradient id="chain-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe3a0" />
          <stop offset="0.5" stopColor="#c27612" />
          <stop offset="1" stopColor="#7a4206" />
        </linearGradient>
      </defs>
      {links}
    </svg>
  );
};

const TipNo: React.FC<{n: string; frame: number; at: number; out: number; x?: number}> = ({n, frame, at, out, x = 200}) => {
  const a = prog(frame, at, 18, ease.out) * (1 - prog(frame, out, 12));
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 330,
        opacity: a,
        transform: `translateY(${(1 - a) * 30}px)`,
        fontFamily: F.serif,
        fontWeight: 900,
        fontSize: 260,
        lineHeight: 1,
        color: 'transparent',
        WebkitTextStroke: '2px rgba(255,200,130,0.55)',
        letterSpacing: '0.02em',
      }}
    >
      {n}
    </div>
  );
};

const Timer: React.FC<{frame: number}> = ({frame}) => {
  const left = 20 * 60 - Math.max(0, frame - 150) * 2;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const ring = prog(frame, 128, 40, ease.out) * (1 - (Math.max(0, frame - 150) * 2) / 1200);
  const R = 130;
  const circ = 2 * Math.PI * R;
  return (
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, #11182c, #04060c)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 170}}>
      <div style={{fontFamily: F.sans, fontSize: 20, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.2em'}}>今日刷视频时长</div>
      <svg width={320} height={320} style={{marginTop: 30}}>
        <circle cx={160} cy={160} r={R} stroke="rgba(255,255,255,0.1)" strokeWidth={14} fill="none" />
        <circle cx={160} cy={160} r={R} stroke="#ffb547" strokeWidth={14} fill="none" strokeLinecap="round" strokeDasharray={`${circ * ring} ${circ}`} transform="rotate(-90 160 160)" style={{filter: 'drop-shadow(0 0 10px rgba(255,170,60,0.8))'}} />
        <text x={160} y={178} textAnchor="middle" fontFamily={F.ui} fontWeight={700} fontSize={64} fill="#fff" style={{fontVariantNumeric: 'tabular-nums'}}>
          {mm}:{ss}
        </text>
      </svg>
      <div style={{marginTop: 40, padding: '14px 40px', borderRadius: 999, background: '#ffb547', color: '#1a1206', fontFamily: F.sans, fontWeight: 700, fontSize: 22}}>到点提醒我停下</div>
    </div>
  );
};

const Toggle: React.FC<{on: number}> = ({on}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 22, padding: '22px 30px', borderRadius: 22, background: 'rgba(28,30,38,0.92)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)'}}>
    <div style={{fontFamily: F.sans, fontWeight: 500, fontSize: 30, color: '#f2f3f7', letterSpacing: '0.06em'}}>灰度模式</div>
    <div style={{width: 92, height: 54, borderRadius: 27, background: on > 0.5 ? '#34c759' : 'rgba(120,120,128,0.36)', position: 'relative', transition: 'none'}}>
      <div style={{position: 'absolute', top: 4, left: 4 + on * 38, width: 46, height: 46, borderRadius: 23, background: '#fff', boxShadow: '0 3px 8px rgba(0,0,0,0.3)'}} />
    </div>
  </div>
);

export const BreakFreeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const calm = prog(frame, SNAP, 40, ease.out);
  const tip2 = prog(frame, 218, 18, ease.inOut) * (1 - prog(frame, 316, 16, ease.inOut));
  const screenTimer = prog(frame, 118, 14, ease.inOut) * (1 - prog(frame, 214, 10));
  const gray = prog(frame, 352, 26, ease.inOut);
  const toggleOn = prog(frame, 344, 8, ease.inOut);
  const phoneX = interpolate(frame, [110, 140], [960, 1130], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
  const tint: [number, number, number] = gray > 0 ? [Math.round(255 - gray * 75), Math.round(170 + gray * 10), Math.round(110 + gray * 70)] : [255, 170, 110];

  return (
    <AbsoluteFill style={{background: C.void, overflow: 'hidden'}}>
      <Backdrop bg={`radial-gradient(ellipse 70% 70% at 55% 48%, #121626 0%, ${C.void} 80%)`} />
      <Bokeh seed="bfbk" count={18} colors={[[255, 181, 71], [120, 160, 255]]} opacity={0.22 * (1 - gray * 0.7)} />
      <LightLeak color={[255, 170, 90]} x={0.55} y={0.4} size={1200} intensity={0.2 + (1 - calm) * 0.2} seed="bf1" />
      <div style={{position: 'absolute', left: phoneX - 210, top: 540 - 437, transform: `scale(0.86) translateY(${(1 - prog(frame, 0, 20, ease.out)) * 40}px)`, filter: gray > 0.001 ? `saturate(${1 - gray}) brightness(${1 - gray * 0.15})` : undefined}}>
        <Phone tint={tint} glow={0.9 - gray * 0.4}>
          <Feed items={['fireworks', 'cat', 'aurora']} position={frame > 300 ? 1 : 0} t={frame} uid="bffeed" />
          <div style={{position: 'absolute', inset: 0, opacity: screenTimer}}>
            <Timer frame={frame} />
          </div>
        </Phone>
      </div>
      {frame < SNAP + 50 ? <Chains frame={frame} /> : null}
      {Math.abs(frame - SNAP) < 6 ? <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, rgba(255,230,180,${Math.max(0, 1 - Math.abs(frame - SNAP) / 6) * 0.6}) 0%, rgba(0,0,0,0) 45%)`}} /> : null}
      <GoldBurst frame={frame} events={[{at: SNAP, x: 960, y: 540, count: 110, power: 2.3, seed: 'snap', life: 80, size: 1.1}]} />
      <TipNo n="01" frame={frame} at={124} out={210} x={300} />
      <TipNo n="03" frame={frame} at={326} out={430} x={300} />
      <div style={{position: 'absolute', left: 300, top: 640, opacity: prog(frame, 330, 16) * (1 - prog(frame, 420, 10)), transform: `translateY(${(1 - prog(frame, 330, 16, ease.out)) * 20}px)`}}>
        <Toggle on={toggleOn} />
      </div>
      {tip2 > 0 ? (
        <AbsoluteFill style={{opacity: tip2}}>
          <BedroomView frame={frame - 218} sleeping />
          <TipNo n="02" frame={frame} at={222} out={312} x={1300} />
        </AbsoluteFill>
      ) : null}
      <Dust seed="bfdust" count={40} opacity={0.35} />
    </AbsoluteFill>
  );
};
