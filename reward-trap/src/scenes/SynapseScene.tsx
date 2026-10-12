import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {C, F, ease} from '../theme';
import {prog, smoothstep} from '../lib/math';

// Geometry (1920×1080): presynaptic bouton on top, synaptic cleft, postsynaptic membrane with receptors.
const PRE = {cx: 960, cy: 20, rx: 920, ry: 420}; // bottom of the bouton at y = 440
const preY = (x: number) => {
  const u = (x - PRE.cx) / PRE.rx;
  return Math.abs(u) >= 1 ? -999 : PRE.cy + PRE.ry * Math.sqrt(1 - u * u);
};
const postY = (x: number) => 668 + 70 * ((x - 960) / 960) ** 2;
const RECEPTORS = [520, 660, 800, 940, 1080, 1220, 1360, 1500];

type Vesicle = {x: number; y: number; r: number; release?: number; dockX?: number};
const VESICLES: Vesicle[] = [
  {x: 700, y: 360, r: 40, release: 34, dockX: 760},
  {x: 1010, y: 330, r: 44, release: 72, dockX: 980},
  {x: 1240, y: 360, r: 38, release: 112, dockX: 1190},
  {x: 860, y: 300, r: 36, release: 176, dockX: 880},
  {x: 1130, y: 290, r: 40, release: 232, dockX: 1080},
  {x: 560, y: 330, r: 34},
  {x: 1400, y: 330, r: 36},
  {x: 640, y: 250, r: 30},
  {x: 1320, y: 250, r: 33},
  {x: 960, y: 220, r: 32},
  {x: 470, y: 260, r: 28},
  {x: 1500, y: 250, r: 30},
];
const BEADS_PER = 18;

/** Where a released bead is at time `age`; some beads find a receptor and stay bound. */
const beadPath = (v: Vesicle, i: number, age: number) => {
  const seed = `${v.x}-${i}`;
  const dx = v.dockX ?? v.x;
  const ox = dx + (random(`${seed}ox`) - 0.5) * 30;
  const oy = preY(dx) + 4;
  const ang = Math.PI / 2 + (random(`${seed}a`) - 0.5) * 2.2;
  const sp = 2.5 + random(`${seed}s`) * 5.5;
  const k = 0.9;
  const d = (sp * (1 - Math.pow(k, age))) / (1 - k);
  let x = ox + Math.cos(ang) * d * 1.6 + noise2D(`${seed}nx`, age * 0.025, 0) * Math.min(1, age / 24) * 120;
  let y = oy + Math.sin(ang) * d + age * 0.7 + noise2D(`${seed}ny`, 0, age * 0.03) * Math.min(1, age / 24) * 40;
  y = Math.min(y, postY(x) - 22);
  const target = random(`${seed}tg`) < 0.55 ? RECEPTORS[Math.floor(random(`${seed}r`) * RECEPTORS.length)] : null;
  let bound = 0;
  if (target !== null) {
    const tb = 26 + random(`${seed}tb`) * 26;
    bound = smoothstep(tb, tb + 18, age);
    const tx = target + (random(`${seed}tx`) - 0.5) * 8;
    const ty = postY(target) - 30;
    x = x + (tx - x) * bound;
    y = y + (ty - y) * bound;
  }
  return {x, y, bound, target};
};

export const SynapseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const dolly = 1.72 * interpolate(frame, [0, 360], [1.0, 1.12], {easing: ease.inOut});
  const pan = interpolate(frame, [0, 360], [40, -50], {easing: ease.inOut});
  const focus = interpolate(frame, [0, 26], [10, 0], {extrapolateRight: 'clamp', easing: ease.out});

  const beads: {x: number; y: number; s: number; o: number; bound: number; target: number | null}[] = [];
  const activation = new Map<number, number>();
  for (const v of VESICLES) {
    if (v.release === undefined) continue;
    const age = frame - v.release - 10;
    if (age < 0) continue;
    for (let i = 0; i < BEADS_PER; i++) {
      const p = beadPath(v, i, age);
      const life = 150 + random(`${v.x}-${i}life`) * 60;
      const o = Math.min(1, age / 4) * (age > life ? Math.max(0, 1 - (age - life) / 20) : 1);
      if (o <= 0) continue;
      beads.push({x: p.x, y: p.y, s: 6 + random(`${v.x}-${i}sz`) * 5, o, bound: p.bound, target: p.target});
      if (p.target !== null && p.bound > 0.9) activation.set(p.target, (activation.get(p.target) ?? 0) + o);
    }
  }

  return (
    <AbsoluteFill style={{background: C.void, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scale(${dolly}) translateX(${pan}px)`, transformOrigin: '960px 560px', filter: focus > 0.1 ? `blur(${focus}px)` : undefined, willChange: 'transform'}}>
        <svg width={1920} height={1080} viewBox="0 0 1920 1080">
          <defs>
            <radialGradient id="syn-bg" cx="0.5" cy="0.55" r="0.75">
              <stop offset="0" stopColor="#0d1a33" />
              <stop offset="1" stopColor="#03050c" />
            </radialGradient>
            <radialGradient id="syn-pre" cx="0.5" cy="0.95" r="0.9">
              <stop offset="0" stopColor="#174a6b" />
              <stop offset="0.45" stopColor="#0d2c46" />
              <stop offset="1" stopColor="#06131f" />
            </radialGradient>
            <linearGradient id="syn-post" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3a1f6e" />
              <stop offset="0.35" stopColor="#1d1040" />
              <stop offset="1" stopColor="#07040f" />
            </linearGradient>
            <radialGradient id="syn-bead" cx="0.36" cy="0.3" r="0.7">
              <stop offset="0" stopColor="#fffdf4" />
              <stop offset="0.2" stopColor="#ffe3a0" />
              <stop offset="0.5" stopColor="#ffb547" />
              <stop offset="0.85" stopColor="#d9640f" />
              <stop offset="1" stopColor="#8a3505" />
            </radialGradient>
            <radialGradient id="syn-halo">
              <stop offset="0" stopColor="#ffb547" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ffb547" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="syn-ves" cx="0.4" cy="0.35" r="0.7">
              <stop offset="0" stopColor="#3e8fb8" stopOpacity="0.35" />
              <stop offset="0.85" stopColor="#163b57" stopOpacity="0.55" />
              <stop offset="1" stopColor="#8fe8ff" stopOpacity="0.9" />
            </radialGradient>
            <linearGradient id="syn-rec" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3b2f9a" />
              <stop offset="0.45" stopColor="#8d7dff" />
              <stop offset="1" stopColor="#2a2075" />
            </linearGradient>
            <linearGradient id="syn-rec-on" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#a85a12" />
              <stop offset="0.45" stopColor="#ffe2a0" />
              <stop offset="1" stopColor="#9a4a0c" />
            </linearGradient>
            <radialGradient id="syn-glow">
              <stop offset="0" stopColor="#fff2cc" stopOpacity="0.95" />
              <stop offset="0.3" stopColor="#ffb547" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ff8a1f" stopOpacity="0" />
            </radialGradient>
            <filter id="syn-blur8">
              <feGaussianBlur stdDeviation="8" />
            </filter>
            <filter id="syn-blur3">
              <feGaussianBlur stdDeviation="3" />
            </filter>
            <clipPath id="syn-preclip">
              <ellipse cx={PRE.cx} cy={PRE.cy} rx={PRE.rx} ry={PRE.ry} />
            </clipPath>
          </defs>
          <rect width={1920} height={1080} fill="url(#syn-bg)" />
          {/* distant, defocused neurites */}
          <g opacity={0.5}>
            <path d="M-50 560 C 300 520, 420 620, 760 590" stroke="#1b3d7a" strokeWidth={56} fill="none" opacity={0.35} strokeLinecap="round" />
            <path d="M-50 560 C 300 520, 420 620, 760 590" stroke="#1b3d7a" strokeWidth={34} fill="none" opacity={0.6} strokeLinecap="round" />
            <path d="M1980 520 C 1600 500, 1500 600, 1180 570" stroke="#2a1f6b" strokeWidth={50} fill="none" opacity={0.35} strokeLinecap="round" />
            <path d="M1980 520 C 1600 500, 1500 600, 1180 570" stroke="#2a1f6b" strokeWidth={30} fill="none" opacity={0.6} strokeLinecap="round" />
          </g>
          {/* presynaptic bouton */}
          <ellipse cx={PRE.cx} cy={PRE.cy} rx={PRE.rx} ry={PRE.ry} fill="url(#syn-pre)" />
          <g clipPath="url(#syn-preclip)">
            {/* mitochondria */}
            {[
              [560, 90, -12],
              [1370, 70, 10],
            ].map(([mx, my, rot], k) => (
              <g key={k} transform={`translate(${mx} ${my}) rotate(${rot})`} opacity={0.75}>
                <rect x={-120} y={-34} width={240} height={68} rx={34} fill="#163a52" stroke="#4fb6d8" strokeOpacity={0.5} strokeWidth={2} />
                <path d="M-96 -18 q 12 30 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0" stroke="#5cc4e6" strokeOpacity={0.45} strokeWidth={2} fill="none" />
              </g>
            ))}
            {VESICLES.map((v, k) => {
              const rel = v.release ?? 9999;
              const t = frame - rel;
              const dock = v.dockX ?? v.x;
              const travel = smoothstep(-34, 0, t);
              const vx = v.x + (dock - v.x) * travel + noise2D(`vx${k}`, frame * 0.02, 0) * 6 * (1 - travel);
              const vy = v.y + (preY(dock) - v.r * 0.55 - v.y) * travel + noise2D(`vy${k}`, 0, frame * 0.02) * 6 * (1 - travel);
              const fuse = smoothstep(0, 14, t); // vesicle membrane merges into the plasma membrane
              if (fuse >= 1) return null;
              const inner = new Array(12).fill(0).map((_, i) => {
                const a = (i / 12) * Math.PI * 2 + frame * 0.02 * (i % 2 ? 1 : -1);
                const rr = v.r * (0.25 + 0.4 * random(`vb${k}${i}`));
                return <circle key={i} cx={vx + Math.cos(a) * rr} cy={vy + Math.sin(a) * rr + fuse * 20} r={4.2} fill="url(#syn-bead)" opacity={1 - fuse} />;
              });
              return (
                <g key={k}>
                  <circle cx={vx} cy={vy + fuse * v.r * 0.6} r={v.r * (1 - fuse * 0.5)} fill="url(#syn-ves)" opacity={1 - fuse * 0.9} />
                  {inner}
                </g>
              );
            })}
          </g>
          {/* plasma membrane: bilayer + lipid heads, with fusion pores that open and reseal */}
          <ellipse cx={PRE.cx} cy={PRE.cy} rx={PRE.rx} ry={PRE.ry} fill="none" stroke="#5fe0ff" strokeWidth={14} opacity={0.08} />
          <ellipse cx={PRE.cx} cy={PRE.cy} rx={PRE.rx} ry={PRE.ry} fill="none" stroke="#5fe0ff" strokeWidth={7} opacity={0.14} />
          <ellipse cx={PRE.cx} cy={PRE.cy} rx={PRE.rx} ry={PRE.ry} fill="none" stroke="#8ff0ff" strokeWidth={2.4} opacity={0.85} />
          <ellipse cx={PRE.cx} cy={PRE.cy} rx={PRE.rx - 9} ry={PRE.ry - 9} fill="none" stroke="#8ff0ff" strokeWidth={1.4} opacity={0.4} />
          <ellipse cx={PRE.cx} cy={PRE.cy} rx={PRE.rx + 1} ry={PRE.ry + 1} fill="none" stroke="#c9fbff" strokeWidth={4.5} strokeDasharray="0.1 11" strokeLinecap="round" opacity={0.55} />
          {VESICLES.filter((v) => v.release !== undefined).map((v, k) => {
            const t = frame - (v.release ?? 0);
            const open = t < 0 ? 0 : t < 12 ? t / 12 : Math.max(0, 1 - (t - 12) / 30);
            if (open <= 0) return null;
            const dx = v.dockX ?? v.x;
            return (
              <g key={`pore${k}`}>
                <ellipse cx={dx} cy={preY(dx) + 2} rx={26 * open} ry={7 * open} fill={C.void} />
                <circle cx={dx} cy={preY(dx) + 8} r={70 * open} fill="url(#syn-glow)" opacity={open * 0.7} />
              </g>
            );
          })}
          {/* postsynaptic membrane */}
          <path d={`M0 ${postY(0)} ${new Array(25).fill(0).map((_, i) => `L${i * 80} ${postY(i * 80)}`).join(' ')} L1920 1080 L0 1080 Z`} fill="url(#syn-post)" />
          <path d={`M0 ${postY(0)} ${new Array(25).fill(0).map((_, i) => `L${i * 80} ${postY(i * 80)}`).join(' ')}`} fill="none" stroke="#b49cff" strokeWidth={2.4} opacity={0.8} />
          <path d={`M0 ${postY(0) + 10} ${new Array(25).fill(0).map((_, i) => `L${i * 80} ${postY(i * 80) + 10}`).join(' ')}`} fill="none" stroke="#b49cff" strokeWidth={1.2} opacity={0.35} />
          <path d={`M0 ${postY(0) - 1} ${new Array(25).fill(0).map((_, i) => `L${i * 80} ${postY(i * 80) - 1}`).join(' ')}`} fill="none" stroke="#e0d4ff" strokeWidth={4.5} strokeDasharray="0.1 11" strokeLinecap="round" opacity={0.45} />
          {RECEPTORS.map((rx) => {
            const act = Math.min(1, (activation.get(rx) ?? 0) / 2.2);
            const ry = postY(rx);
            return (
              <g key={rx}>
                {act > 0.02 ? (
                  <>
                    <circle cx={rx} cy={ry - 20} r={80} fill="url(#syn-glow)" opacity={act * 0.7} />
                    {(() => {
                      const ph = (frame * 0.025 + rx * 0.001) % 1;
                      return <ellipse cx={rx} cy={ry + 40 + ph * 120} rx={26 + ph * 90} ry={6 + ph * 22} fill="none" stroke="#ffcf7a" strokeWidth={1.6} opacity={act * (1 - ph) * 0.45} />;
                    })()}
                  </>
                ) : null}
                {[-15, -5, 5, 15].map((o, j) => (
                  <g key={j}>
                    <rect x={rx + o - 6} y={ry - 34 + Math.abs(o) * 0.4} width={12} height={62} rx={6} fill="url(#syn-rec)" />
                    <rect x={rx + o - 6} y={ry - 34 + Math.abs(o) * 0.4} width={12} height={62} rx={6} fill="url(#syn-rec-on)" opacity={act} />
                  </g>
                ))}
                <path d={`M${rx - 14} ${ry - 34} Q${rx} ${ry - 18} ${rx + 14} ${ry - 34}`} stroke="#efe8ff" strokeWidth={2} fill="none" opacity={0.6} />
              </g>
            );
          })}
          {/* released dopamine */}
          {beads.map((b, i) => (
            <g key={i} opacity={b.o}>
              <circle cx={b.x} cy={b.y} r={b.s * 2.6} fill="url(#syn-halo)" />
              <circle cx={b.x} cy={b.y} r={b.s} fill="url(#syn-bead)" />
            </g>
          ))}
        </svg>
      </AbsoluteFill>
      {/* foreground defocused beads for depth */}
      {new Array(6).fill(0).map((_, i) => {
        const x = ((random(`fg${i}`) * 2200 + frame * (1.4 + i * 0.3)) % 2300) - 200;
        const y = 120 + random(`fgy${i}`) * 840 + Math.sin(frame * 0.02 + i) * 30;
        const s = 90 + random(`fgs${i}`) * 120;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - s / 2,
              top: y - s / 2,
              width: s,
              height: s,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,190,90,0.14) 0%, rgba(255,160,60,0.07) 45%, rgba(255,160,60,0) 70%)',
            }}
          />
        );
      })}
      <DopamineMolecule frame={frame} at={168} out={330} x={1490} y={300} />
    </AbsoluteFill>
  );
};

/** Skeletal formula of dopamine (3,4-dihydroxyphenethylamine), drawn stroke by stroke. */
const DopamineMolecule: React.FC<{frame: number; at: number; out: number; x: number; y: number}> = ({frame, at, out, x, y}) => {
  const t = frame - at;
  if (t < 0) return null;
  const draw = prog(frame, at, 30, ease.inOut);
  const txt = prog(frame, at + 18, 20, ease.out);
  const fade = interpolate(frame, [out, out + 16], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const R = 38;
  const v = new Array(6).fill(0).map((_, k) => {
    const a = (-90 + k * 60) * (Math.PI / 180);
    return [Math.cos(a) * R, Math.sin(a) * R] as [number, number];
  });
  const seg = (a: [number, number], b: [number, number], inset = 0) => {
    if (!inset) return `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`;
    const s = 1 - inset / R;
    return `M${a[0] * s} ${a[1] * s} L${b[0] * s} ${b[1] * s}`;
  };
  const A = v[1]; // C1 (upper right) carries the ethylamine chain
  const c1: [number, number] = [A[0] + 30, A[1] - 17];
  const c2: [number, number] = [c1[0] + 30, c1[1] + 17];
  const n: [number, number] = [c2[0] + 30, c2[1] - 17];
  const o3: [number, number] = [v[3][0], v[3][1] + 34];
  const o4: [number, number] = [v[4][0] - 30, v[4][1] + 17];
  const d = [
    ...v.map((p, k) => seg(p, v[(k + 1) % 6])),
    seg(v[0], v[1], 7),
    seg(v[2], v[3], 7),
    seg(v[4], v[5], 7),
    seg(A, c1),
    seg(c1, c2),
    seg(c2, n),
    seg(v[3], o3),
    seg(v[4], o4),
  ].join(' ');
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: fade}}>
      <svg width={360} height={240} viewBox="-90 -90 360 240" style={{overflow: 'visible'}}>
        <path d={d} stroke="#ffd58a" strokeWidth={3} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} style={{filter: 'drop-shadow(0 0 6px rgba(255,170,60,0.8))'}} />
        <g opacity={txt} fontFamily={F.mono} fontSize={20} fill="#ffe4b0">
          <text x={n[0] + 6} y={n[1] + 7}>NH₂</text>
          <text x={o3[0] - 14} y={o3[1] + 24}>OH</text>
          <text x={o4[0] - 46} y={o4[1] + 8}>HO</text>
        </g>
      </svg>
      <div style={{opacity: txt, marginTop: -20, transform: `translateY(${(1 - txt) * 10}px)`}}>
        <div style={{fontFamily: F.serif, fontWeight: 900, fontSize: 64, color: '#fff3dc', letterSpacing: '0.06em', textShadow: '0 0 28px rgba(255,160,50,0.6)'}}>多巴胺</div>
        <div style={{fontFamily: F.mono, fontSize: 18, color: '#ffbf66', letterSpacing: '0.28em', marginTop: 6}}>DOPAMINE · C₈H₁₁NO₂</div>
      </div>
    </div>
  );
};
