import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Look';
import {C, F, ease} from '../theme';
import {Bokeh, Dust, LightLeak} from '../components/Atmosphere';
import {GoldBurst} from '../components/Dopamine';
import {Phone} from '../components/phone/Phone';
import {Feed} from '../components/phone/FeedUI';
import {Thumb, feedPositionAt, thumbPoseAt} from '../components/phone/Thumb';
import {prog, springAt} from '../lib/math';

type Sym = 'heart' | 'cat' | 'star' | 'seven' | 'gem';
const STRIP: Sym[] = ['heart', 'cat', 'star', 'seven', 'gem', 'cat', 'heart', 'star', 'gem', 'seven', 'cat', 'star'];
const N = STRIP.length;
const SYM_H = 168;

// pulls of the lever and the symbol index each reel lands on
const PULLS = [
  {at: 28, stops: [60, 72, 86], land: [1, 4, 7]}, // cat · gem · star — nothing
  {at: 112, stops: [140, 152, 196], land: [0, 6, 1]}, // heart · heart · (slows…) cat — so close
  {at: 214, stops: [242, 256, 290], land: [6, 0, 6]}, // heart · heart · heart — jackpot
];
const SYNC = [322, 366]; // lever and thumb, in lockstep

const reelPos = (frame: number, reel: number) => {
  let pos = [2, 5, 9][reel];
  for (const p of PULLS) {
    const t0 = p.at + reel * 2;
    const t1 = p.stops[reel];
    if (frame < t0) break;
    const target = p.land[reel];
    const cycles = 3 + reel;
    const from = pos;
    let delta = ((target - from) % N + N) % N + cycles * N;
    if (delta < N) delta += N;
    if (frame >= t1) {
      const settle = springAt(frame - t1, {stiffness: 380, damping: 16});
      pos = from + delta + (1 - settle) * -0.18;
    } else {
      const u = (frame - t0) / (t1 - t0);
      // fast spin-up, long coast, gentle landing
      const e = u < 0.12 ? (u / 0.12) * (u / 0.12) * 0.06 : 0.06 + (1 - Math.pow(1 - (u - 0.12) / 0.88, 2.6)) * 0.94;
      pos = from + delta * e;
    }
  }
  return pos;
};

const reelVel = (frame: number, reel: number) => Math.abs(reelPos(frame + 0.5, reel) - reelPos(frame - 0.5, reel));

const Symbol: React.FC<{s: Sym; x: number; y: number}> = ({s, x, y}) => {
  switch (s) {
    case 'heart':
      return (
        <g transform={`translate(${x - 44} ${y - 42}) scale(3.7)`}>
          <path d="M12 21.3s-7.6-4.7-10-9.4C.4 8.6 2.2 4.6 5.9 4.2c2.3-.2 4.1 1 5.3 2.8 1.2-1.8 3-3 5.3-2.8 3.7.4 5.5 4.4 3.9 7.7-2.4 4.7-10.4 9.4-10.4 9.4z" fill="url(#slot-heart)" />
          <path d="M6 6.4c-1.6.5-2.4 1.9-2.1 3.4" stroke="#fff" strokeWidth="1" fill="none" opacity={0.7} strokeLinecap="round" />
        </g>
      );
    case 'cat':
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M-46 -18 L-40 -54 L-14 -34 Z M46 -18 L40 -54 L14 -34 Z" fill="#f09a45" />
          <ellipse rx={50} ry={42} fill="url(#slot-cat)" />
          <ellipse cx={-18} cy={-4} rx={8} ry={11} fill="#2b1a0b" />
          <ellipse cx={18} cy={-4} rx={8} ry={11} fill="#2b1a0b" />
          <circle cx={-15} cy={-8} r={3} fill="#fff" />
          <circle cx={21} cy={-8} r={3} fill="#fff" />
          <path d="M-5 12 L5 12 L0 18 Z" fill="#e8737a" />
        </g>
      );
    case 'star':
      return (
        <g transform={`translate(${x - 48} ${y - 48}) scale(4)`}>
          <path d="M12 2.6l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z" fill="url(#slot-gold)" stroke="#8a4a08" strokeWidth={0.4} />
        </g>
      );
    case 'seven':
      return (
        <text x={x} y={y + 40} textAnchor="middle" fontFamily={F.serif} fontWeight={900} fontSize={120} fill="url(#slot-red)" stroke="#5a0610" strokeWidth={3}>
          7
        </text>
      );
    default:
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M-40 -14 L-22 -40 L22 -40 L40 -14 L0 44 Z" fill="url(#slot-gem)" />
          <path d="M-40 -14 L40 -14 M-22 -40 L-8 -14 L0 44 M22 -40 L8 -14 L0 44" stroke="#e6fbff" strokeWidth={2} opacity={0.6} fill="none" />
        </g>
      );
  }
};

const Machine: React.FC<{frame: number; jackpot: number; lever: number}> = ({frame, jackpot, lever}) => {
  const W = 620;
  const reelsX = [-170, 0, 170];
  const bulbs = 26;
  const flashAll = jackpot > 0 && Math.floor(frame / 4) % 2 === 0;
  const knobY = interpolate(lever, [0, 1], [-300, 40]);
  const rodScale = 1 - Math.sin(lever * Math.PI) * 0.7;
  return (
    <svg width={900} height={1000} viewBox="-450 -520 900 1000" style={{overflow: 'visible'}}>
      <defs>
        <linearGradient id="slot-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a0610" />
          <stop offset="0.25" stopColor="#b3122a" />
          <stop offset="0.5" stopColor="#d81c35" />
          <stop offset="0.75" stopColor="#a10f24" />
          <stop offset="1" stopColor="#3c040c" />
        </linearGradient>
        <linearGradient id="slot-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f5f7" />
          <stop offset="0.35" stopColor="#8d929b" />
          <stop offset="0.5" stopColor="#e8eaee" />
          <stop offset="0.7" stopColor="#5d626b" />
          <stop offset="1" stopColor="#c9ccd2" />
        </linearGradient>
        <linearGradient id="slot-chromeH" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5d626b" />
          <stop offset="0.3" stopColor="#f4f5f7" />
          <stop offset="0.55" stopColor="#8d929b" />
          <stop offset="0.8" stopColor="#e8eaee" />
          <stop offset="1" stopColor="#5d626b" />
        </linearGradient>
        <linearGradient id="slot-reel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a9a9a" />
          <stop offset="0.18" stopColor="#f2efe8" />
          <stop offset="0.5" stopColor="#ffffff" />
          <stop offset="0.82" stopColor="#f2efe8" />
          <stop offset="1" stopColor="#9a9a9a" />
        </linearGradient>
        <linearGradient id="slot-heart" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6b8a" />
          <stop offset="1" stopColor="#d4102f" />
        </linearGradient>
        <radialGradient id="slot-cat" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#ffd08a" />
          <stop offset="1" stopColor="#e07a25" />
        </radialGradient>
        <linearGradient id="slot-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1c4" />
          <stop offset="0.5" stopColor="#ffc247" />
          <stop offset="1" stopColor="#d9780f" />
        </linearGradient>
        <linearGradient id="slot-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6b6b" />
          <stop offset="1" stopColor="#b5061c" />
        </linearGradient>
        <linearGradient id="slot-gem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bff6ff" />
          <stop offset="0.5" stopColor="#36c6e8" />
          <stop offset="1" stopColor="#0a6f9a" />
        </linearGradient>
        <radialGradient id="slot-bulb">
          <stop offset="0" stopColor="#fffbe8" />
          <stop offset="0.4" stopColor="#ffd36b" />
          <stop offset="1" stopColor="#ff9a1f" stopOpacity="0" />
        </radialGradient>
        {[0, 1, 2].map((r) => (
          <filter key={r} id={`slot-mb${r}`} x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur stdDeviation={`0 ${Math.min(26, reelVel(frame, r) * 70)}`} />
          </filter>
        ))}
        <clipPath id="slot-window">
          <rect x={-250} y={-150} width={500} height={300} rx={18} />
        </clipPath>
      </defs>
      {/* shadow */}
      <ellipse cx={0} cy={470} rx={380} ry={30} fill="#000" opacity={0.6} />
      {/* lever: pivot on the right flank, red knob on a chrome rod */}
      <g>
        <rect x={W / 2 - 4} y={-40} width={44} height={110} rx={14} fill="url(#slot-chromeH)" />
        <line x1={W / 2 + 40} y1={10} x2={W / 2 + 70} y2={10 + (knobY - 10) * rodScale} stroke="url(#slot-chromeH)" strokeWidth={16} strokeLinecap="round" />
        <circle cx={W / 2 + 70} cy={10 + (knobY - 10) * rodScale} r={34} fill="url(#slot-red)" />
        <circle cx={W / 2 + 60} cy={10 + (knobY - 10) * rodScale - 10} r={10} fill="#fff" opacity={0.6} />
      </g>
      {/* cabinet */}
      <path d={`M${-W / 2} -300 Q${-W / 2} -460 0 -470 Q${W / 2} -460 ${W / 2} -300 L${W / 2} 440 L${-W / 2} 440 Z`} fill="url(#slot-body)" />
      <path d={`M${-W / 2 + 20} -300 Q${-W / 2 + 20} -440 0 -448 Q${W / 2 - 20} -440 ${W / 2 - 20} -300`} fill="none" stroke="url(#slot-chrome)" strokeWidth={8} />
      {/* marquee */}
      <rect x={-230} y={-410} width={460} height={110} rx={20} fill="#1a0306" stroke="url(#slot-chrome)" strokeWidth={6} />
      <text x={0} y={-332} textAnchor="middle" fontFamily={F.serif} fontWeight={900} fontSize={70} fill="url(#slot-gold)" letterSpacing="6" style={{filter: `drop-shadow(0 0 ${jackpot > 0 ? 20 : 8}px rgba(255,180,60,0.9))`}}>
        JACKPOT
      </text>
      {new Array(bulbs).fill(0).map((_, i) => {
        const a = Math.PI + (i / (bulbs - 1)) * Math.PI;
        const bx = Math.cos(a) * 285;
        const by = -300 + Math.sin(a) * 160;
        const on = jackpot > 0 ? flashAll : (i + Math.floor(frame / 3)) % 3 === 0;
        return (
          <g key={i}>
            <circle cx={bx} cy={by} r={on ? 20 : 0} fill="url(#slot-bulb)" />
            <circle cx={bx} cy={by} r={7} fill={on ? '#fff6d8' : '#5a3a20'} />
          </g>
        );
      })}
      {/* reel bay */}
      <rect x={-270} y={-170} width={540} height={340} rx={26} fill="url(#slot-chrome)" />
      <rect x={-256} y={-156} width={512} height={312} rx={20} fill="#0b0b0d" />
      <g clipPath="url(#slot-window)">
        {reelsX.map((rx, r) => {
          const pos = reelPos(frame, r);
          const base = Math.floor(pos);
          const items = [];
          for (let k = -2; k <= 2; k++) {
            const idx = (((base + k) % N) + N) % N;
            const y = (base + k - pos) * SYM_H;
            items.push(<Symbol key={k} s={STRIP[idx]} x={rx} y={y} />);
          }
          return (
            <g key={r}>
              <rect x={rx - 78} y={-150} width={156} height={300} fill="url(#slot-reel)" />
              <g filter={`url(#slot-mb${r})`}>{items}</g>
              <rect x={rx - 78} y={-150} width={156} height={300} fill="url(#slot-reel)" opacity={0} />
            </g>
          );
        })}
        {/* curved glass shading */}
        <rect x={-256} y={-150} width={512} height={300} fill="url(#slot-shade)" />
      </g>
      <defs>
        <linearGradient id="slot-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.75" />
          <stop offset="0.28" stopColor="#000" stopOpacity="0" />
          <stop offset="0.72" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      {[-85, 85].map((x) => (
        <rect key={x} x={x - 4} y={-156} width={8} height={312} fill="url(#slot-chromeH)" />
      ))}
      <line x1={-256} x2={256} y1={0} y2={0} stroke="#ffcf6b" strokeWidth={jackpot > 0 ? 5 : 2} opacity={0.5 + jackpot * 0.5} style={{filter: jackpot > 0 ? 'drop-shadow(0 0 12px #ffb547)' : undefined}} />
      {/* lower panel + payout tray */}
      <rect x={-230} y={210} width={460} height={70} rx={12} fill="#2a0408" stroke="url(#slot-chrome)" strokeWidth={4} />
      {[-150, -50, 50, 150].map((x, i) => (
        <rect key={x} x={x - 38} y={226} width={76} height={38} rx={8} fill={['#ffcf4a', '#ff4f6b', '#4fd2ff', '#9bff6b'][i]} opacity={0.85} />
      ))}
      <path d="M-200 340 L200 340 L170 420 L-170 420 Z" fill="#14020a" stroke="url(#slot-chrome)" strokeWidth={6} />
    </svg>
  );
};

export const SlotScene: React.FC = () => {
  const frame = useCurrentFrame();
  const jackpot = frame >= 292 ? 1 : 0;
  // lever travel for each pull (and the synced pulls at the end)
  let lever = 0;
  for (const at of [...PULLS.map((p) => p.at), ...SYNC]) {
    const t = frame - at;
    if (t >= -8 && t < 26) {
      lever = t < 0 ? interpolate(t, [-8, 0], [0, 1], {easing: ease.in}) : 1 - springAt(t, {stiffness: 120, damping: 14});
    }
  }
  const split = prog(frame, 300, 36, ease.inOut);
  const machineX = interpolate(split, [0, 1], [960, 600]);
  const machineScale = interpolate(split, [0, 1], [0.86, 0.72]);
  const phoneIn = prog(frame, 306, 36, ease.out);
  const swipes = SYNC.map((at) => ({at}));
  const pos = feedPositionAt(frame, swipes);
  const th = thumbPoseAt(frame, swipes);
  const zoomIn = prog(frame, 0, 30, ease.out);

  return (
    <AbsoluteFill style={{background: C.void, overflow: 'hidden'}}>
      <Backdrop bg={`radial-gradient(ellipse 70% 70% at 50% 45%, #1c0a12 0%, #0a0509 55%, ${C.void} 100%)`} />
      <Bokeh seed="slotbk" count={26} colors={[[255, 60, 80], [255, 181, 71], [255, 120, 60]]} opacity={0.32} />
      <LightLeak color={[255, 60, 80]} x={0.2} y={0.15} intensity={0.2} seed="sl1" />
      <LightLeak color={[255, 170, 60]} x={0.5} y={0.25} size={900} intensity={0.25 + jackpot * 0.35 * (Math.floor(frame / 4) % 2 ? 1 : 0.5)} seed="sl2" />
      <div
        style={{
          position: 'absolute',
          left: machineX - 450,
          top: 560 - 560,
          width: 900,
          height: 1000,
          transform: `scale(${machineScale * (0.92 + zoomIn * 0.08)})`,
          transformOrigin: '450px 560px',
          opacity: zoomIn,
        }}
      >
        <div style={{position: 'absolute', left: 0, top: 40}}>
          <Machine frame={frame} jackpot={jackpot} lever={lever} />
        </div>
      </div>
      {phoneIn > 0 ? (
        <div style={{position: 'absolute', left: 1300 - 210, top: 540 - 437, opacity: phoneIn, transform: `translateX(${(1 - phoneIn) * 120}px) scale(0.86) perspective(2000px) rotateY(-12deg)`}}>
          <Phone tint={[255, 170, 90]} glow={0.8} overlay={<Thumb x={th.x} y={th.y} lift={th.lift} press={th.press} uid="slotthumb" />}>
            <Feed items={['cat', 'fireworks', 'ocean']} position={pos} t={frame} uid="slotfeed" />
          </Phone>
        </div>
      ) : null}
      {phoneIn > 0 ? (
        <div style={{position: 'absolute', left: 870, top: 470, width: 200, textAlign: 'center', opacity: prog(frame, 340, 20), fontFamily: F.serif, fontWeight: 900, fontSize: 90, color: C.goldHi, textShadow: '0 0 30px rgba(255,160,50,0.7)'}}>=</div>
      ) : null}
      <GoldBurst
        frame={frame}
        events={[
          {at: 292, x: 960, y: 520, count: 120, power: 2.2, seed: 'jp1', life: 100, size: 1.3},
          {at: 298, x: 960, y: 760, count: 60, power: 1.6, seed: 'jp2', life: 90, up: -0.1},
        ]}
      />
      <Dust seed="slotdust" count={50} opacity={0.4} color="255,210,160" />
    </AbsoluteFill>
  );
};
