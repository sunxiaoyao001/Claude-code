import React, {useLayoutEffect, useRef} from 'react';
import {random} from 'remotion';
import {noise2D} from '../lib/noise';

// Dopamine is the film's only warm light: glossy amber beads with a white-hot core.
export const GOLD_BEAD =
  'radial-gradient(circle at 36% 30%, #fffdf4 0%, #ffe7a8 14%, #ffc15a 32%, #ff951f 56%, rgba(255,130,30,0.35) 63%, rgba(255,130,30,0) 74%)';

export const GoldOrb: React.FC<{x: number; y: number; size: number; opacity?: number; glow?: number}> = ({x, y, size, opacity = 1, glow = 1}) => (
  <>
    {glow > 0 ? (
      <div
        style={{
          position: 'absolute',
          left: x - size * 2.2,
          top: y - size * 2.2,
          width: size * 4.4,
          height: size * 4.4,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255,170,60,${0.32 * glow * opacity}) 0%, rgba(255,140,40,${0.1 * glow * opacity}) 40%, rgba(255,140,40,0) 70%)`,
          pointerEvents: 'none',
        }}
      />
    ) : null}
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        background: GOLD_BEAD,
        opacity,
        pointerEvents: 'none',
      }}
    />
  </>
);

export type BurstEvent = {
  at: number;
  x: number;
  y: number;
  count?: number;
  power?: number;
  seed?: string;
  up?: number;
  life?: number;
  size?: number;
  /** preferred direction (radians) and spread (0 = all directions … 1 = tight cone) */
  dir?: number;
  focus?: number;
};

let beadSprite: HTMLCanvasElement | null = null;
let glowSprite: HTMLCanvasElement | null = null;
const sprites = () => {
  if (!beadSprite) {
    const S = 128;
    beadSprite = document.createElement('canvas');
    beadSprite.width = beadSprite.height = S;
    const g = beadSprite.getContext('2d')!;
    const grd = g.createRadialGradient(S * 0.36, S * 0.3, 0, S * 0.5, S * 0.5, S * 0.5);
    grd.addColorStop(0, '#fffdf4');
    grd.addColorStop(0.14, '#ffe7a8');
    grd.addColorStop(0.36, '#ffc15a');
    grd.addColorStop(0.72, '#ff951f');
    grd.addColorStop(0.86, 'rgba(255,130,30,0.35)');
    grd.addColorStop(1, 'rgba(255,130,30,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, S, S);
    glowSprite = document.createElement('canvas');
    glowSprite.width = glowSprite.height = S;
    const h = glowSprite.getContext('2d')!;
    const gg = h.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gg.addColorStop(0, 'rgba(255,170,60,0.32)');
    gg.addColorStop(0.4, 'rgba(255,140,40,0.1)');
    gg.addColorStop(1, 'rgba(255,140,40,0)');
    h.fillStyle = gg;
    h.fillRect(0, 0, S, S);
  }
  return {bead: beadSprite, glow: glowSprite!};
};

/** Particle bursts with drag, buoyancy and a little turbulence; fast beads leave light streaks. Drawn on one canvas. */
export const GoldBurst: React.FC<{frame: number; events: BurstEvent[]; width?: number; height?: number}> = ({frame, events, width = 1920, height = 1080}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = events.some((e) => frame >= e.at && frame <= e.at + (e.life ?? 70) + 10);
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext('2d')!;
    g.clearRect(0, 0, width, height);
    const {bead, glow} = sprites();
    for (const e of events) {
      const age = frame - e.at;
      const lifeMax = e.life ?? 70;
      if (age < 0 || age > lifeMax + 10) continue;
      const n = e.count ?? 40;
      const seed = e.seed ?? `b${e.at}`;
      for (let i = 0; i < n; i++) {
        const ang =
          e.dir === undefined
            ? random(`${seed}a${i}`) * Math.PI * 2
            : e.dir + (random(`${seed}a${i}`) - 0.5) * Math.PI * 2 * (1 - (e.focus ?? 0.5));
        const sp = (e.power ?? 1) * (4 + random(`${seed}s${i}`) * 13);
        const life = lifeMax * (0.55 + 0.45 * random(`${seed}l${i}`));
        if (age > life) continue;
        const k = 0.9;
        const pos = (t: number) => {
          const d = (sp * (1 - Math.pow(k, t))) / (1 - k);
          const wob = noise2D(`${seed}w${i}`, t * 0.04, 0) * 18;
          return {
            x: e.x + Math.cos(ang) * d + wob,
            y: e.y + Math.sin(ang) * d * 0.85 - (e.up ?? 0.05) * t * t * 0.5 - t * 0.4,
          };
        };
        const p = pos(age);
        const q = pos(Math.max(0, age - 2.5));
        const fade = Math.min(1, age / 3) * Math.pow(1 - age / life, 0.8);
        const size = (e.size ?? 1) * (5 + random(`${seed}z${i}`) * 13) * (1 - 0.3 * (age / life));
        if (Math.hypot(p.x - q.x, p.y - q.y) > 4) {
          g.globalAlpha = fade * 0.45;
          g.strokeStyle = '#ffcf7a';
          g.lineCap = 'round';
          g.lineWidth = size * 0.35;
          g.beginPath();
          g.moveTo(q.x, q.y);
          g.lineTo(p.x, p.y);
          g.stroke();
        }
        g.globalAlpha = fade * 0.8;
        g.drawImage(glow, p.x - size * 2.2, p.y - size * 2.2, size * 4.4, size * 4.4);
        g.globalAlpha = fade;
        g.drawImage(bead, p.x - size / 2, p.y - size / 2, size, size);
      }
    }
    g.globalAlpha = 1;
  }, [frame, events, width, height, live]);
  if (!live) return null;
  return <canvas ref={ref} width={width} height={height} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none', willChange: 'transform'}} />;
};

export type Spike = {at: number; mag: number};

/** Dopamine level at time t: phasic spikes (fast rise, slow decay) on a breathing baseline. */
export const dopamineLevel = (t: number, spikes: Spike[], base = 0.12, seed = 'trace') => {
  let v = base + noise2D(seed, t * 0.05, 0) * 0.025 + noise2D(seed + 'f', t * 0.35, 1) * 0.012;
  for (const s of spikes) {
    const dt = t - s.at;
    if (dt < 0) continue;
    v += s.mag * (dt < 3 ? dt / 3 : Math.exp(-(dt - 3) / 15));
  }
  return v;
};

/** A live, scrolling neural trace with phosphor glow. The write-head sits at the right edge. */
export const RewardTrace: React.FC<{
  frame: number;
  spikes: Spike[];
  x: number;
  y: number;
  w: number;
  h: number;
  windowFrames?: number;
  opacity?: number;
  label?: string;
  base?: number;
  uid?: string;
  levelFn?: (t: number) => number;
  color?: string;
}> = ({frame, spikes, x, y, w, h, windowFrames = 150, opacity = 1, label, base = 0.12, uid = 'tr', levelFn}) => {
  const pts: [number, number][] = [];
  const steps = 160;
  for (let i = 0; i <= steps; i++) {
    const t = frame - windowFrames + (i / steps) * windowFrames;
    const v = t < 0 ? base : levelFn ? levelFn(t) : dopamineLevel(t, spikes, base, uid);
    pts.push([x + (i / steps) * w, y + h - Math.min(1.05, v) * h]);
  }
  const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const area = `${d} L${x + w} ${y + h} L${x} ${y + h} Z`;
  const head = pts[pts.length - 1];
  return (
    <svg
      width={w + 120}
      height={h + 140}
      viewBox={`${x - 40} ${y - 90} ${w + 120} ${h + 140}`}
      style={{position: 'absolute', left: x - 40, top: y - 90, opacity, overflow: 'visible', willChange: 'transform'}}
    >
      <defs>
        <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb547" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffb547" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.25" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={`${uid}-mask`}>
          <rect x={x - 20} y={y - 60} width={w + 40} height={h + 80} fill={`url(#${uid}-fade)`} />
        </mask>
        <radialGradient id={`${uid}-head`}>
          <stop offset="0" stopColor="#ffb547" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffb547" stopOpacity="0" />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={x} x2={x + w} y1={y + h * g} y2={y + h * g} stroke="#9fb4ff" strokeOpacity={0.07} strokeDasharray="2 8" />
      ))}
      <line x1={x} x2={x + w} y1={y + h} y2={y + h} stroke="#9fb4ff" strokeOpacity={0.18} />
      <g mask={`url(#${uid}-mask)`}>
        <path d={area} fill={`url(#${uid}-fill)`} />
        <path d={d} stroke="#ff9a2e" strokeWidth={18} fill="none" opacity={0.08} strokeLinejoin="round" />
        <path d={d} stroke="#ff9a2e" strokeWidth={9} fill="none" opacity={0.2} strokeLinejoin="round" />
        <path d={d} stroke="#ffc874" strokeWidth={3} fill="none" strokeLinejoin="round" />
        <path d={d} stroke="#fff4d6" strokeWidth={1.2} fill="none" strokeLinejoin="round" opacity={0.9} />
      </g>
      <circle cx={head[0]} cy={head[1]} r={22} fill={`url(#${uid}-head)`} />
      <circle cx={head[0]} cy={head[1]} r={6} fill="#fff6dc" />
      {label ? (
        <g>
          <circle cx={x + 6} cy={y - 30} r={5} fill="#ffb547" />
          <text x={x + 22} y={y - 20} fill="#ffe2b0" fontFamily="Noto Sans SC" fontWeight={500} fontSize={30} letterSpacing="0.14em" opacity={0.92}>
            {label}
          </text>
        </g>
      ) : null}
    </svg>
  );
};
