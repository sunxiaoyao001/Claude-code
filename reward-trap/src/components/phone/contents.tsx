import React from 'react';
import {random} from 'remotion';

// Hand-built "short videos" that play inside the phone. Every clip is a 390×844 SVG driven by t (frames).
export const SW = 390;
export const SH = 844;

type Clip = React.FC<{t: number; id?: string}>;

const Svg: React.FC<{children: React.ReactNode; bg?: string}> = ({children, bg}) => (
  <svg viewBox={`0 0 ${SW} ${SH}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{display: 'block', background: bg}}>
    {children}
  </svg>
);

// ------------------------------------------------------------------------------------------------
export const OceanSunset: Clip = ({t, id = 'ocean'}) => {
  const push = 1 + t * 0.0006;
  return (
    <Svg>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141c4f" />
          <stop offset="0.35" stopColor="#5a2f86" />
          <stop offset="0.62" stopColor="#e2566a" />
          <stop offset="0.8" stopColor="#ffa25c" />
          <stop offset="1" stopColor="#ffd38a" />
        </linearGradient>
        <linearGradient id={`${id}-sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff9c62" />
          <stop offset="0.12" stopColor="#b8506a" />
          <stop offset="0.45" stopColor="#3a2457" />
          <stop offset="1" stopColor="#0c0f2c" />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stopColor="#fffbe8" />
          <stop offset="0.25" stopColor="#ffe6a3" />
          <stop offset="0.32" stopColor="#ffcf73" stopOpacity="0.9" />
          <stop offset="0.6" stopColor="#ff9a52" stopOpacity="0.25" />
          <stop offset="1" stopColor="#ff7a45" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform={`translate(195 470) scale(${push}) translate(-195 -470)`}>
        <rect width={SW} height={480} fill={`url(#${id}-sky)`} />
        {[0, 1, 2, 3].map((i) => (
          <ellipse
            key={i}
            cx={((80 + i * 130 + t * (0.25 + i * 0.08)) % 560) - 80}
            cy={170 + i * 62}
            rx={110 + i * 30}
            ry={9 + i * 3}
            fill={i < 2 ? '#c95b8a' : '#ff9f7a'}
            opacity={0.35 + i * 0.08}
          />
        ))}
        <circle cx={195} cy={452} r={190} fill={`url(#${id}-sun)`} />
        <rect y={470} width={SW} height={SH - 470} fill={`url(#${id}-sea)`} />
        {new Array(34).fill(0).map((_, i) => {
          const y = 476 + i * i * 0.33 + i * 4;
          const spread = 18 + i * 4.2;
          const x = 195 + Math.sin(t * 0.18 + i * 1.7) * spread * 0.35;
          const w = spread * (0.6 + 0.4 * Math.sin(t * 0.21 + i));
          return <rect key={i} x={x - w / 2} y={y} width={w} height={2 + i * 0.12} rx={1} fill="#ffe0a0" opacity={Math.max(0, 0.85 - i * 0.024) * (0.6 + 0.4 * Math.sin(t * 0.4 + i * 2.1))} />;
        })}
        {new Array(22).fill(0).map((_, i) => {
          const y = 500 + i * 15 + (i * i) % 7;
          const x = ((random(`w${i}`) * SW + t * (0.6 + random(`ws${i}`))) % (SW + 120)) - 60;
          return <rect key={`w${i}`} x={x} y={y} width={40 + random(`wl${i}`) * 70} height={1.4} fill="#ffb98a" opacity={0.18} />;
        })}
        <path d="M58 468 L74 468 L72 472 L60 472 Z M66 468 L66 432 L78 462 Z" fill="#1d1430" opacity={0.85} />
        {[0, 1].map((i) => {
          const gx = ((t * (1.2 + i * 0.4) + i * 140) % 520) - 60;
          const gy = 300 + i * 40 + Math.sin(t * 0.08 + i) * 10;
          const flap = Math.sin(t * 0.35 + i * 2) * 5;
          return (
            <path
              key={`g${i}`}
              d={`M${gx - 12} ${gy + flap} Q${gx - 6} ${gy - 4} ${gx} ${gy} Q${gx + 6} ${gy - 4} ${gx + 12} ${gy + flap}`}
              stroke="#2a1838"
              strokeWidth={2.2}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
      </g>
    </Svg>
  );
};

// ------------------------------------------------------------------------------------------------
export const NeonRain: Clip = ({t, id = 'neon'}) => {
  const buildings = [
    [0, 230, 90], [80, 160, 80], [150, 260, 70], [210, 120, 95], [295, 210, 100],
  ];
  return (
    <Svg bg="#07071a">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b0b26" />
          <stop offset="0.6" stopColor="#2a1446" />
          <stop offset="1" stopColor="#4a1f4f" />
        </linearGradient>
        <linearGradient id={`${id}-street`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b0f2e" />
          <stop offset="1" stopColor="#05050f" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${id}-soft`}>
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <rect width={SW} height={560} fill={`url(#${id}-sky)`} />
      {buildings.map(([x, top, w], i) => (
        <g key={i}>
          <rect x={x} y={top} width={w} height={560 - top} fill={i % 2 ? '#120f26' : '#0e0c1f'} />
          {new Array(Math.floor((560 - top) / 26)).fill(0).map((_, r) =>
            new Array(Math.floor(w / 20)).fill(0).map((__, c) => {
              const on = random(`win${i}-${r}-${c}`) > 0.55;
              const flick = random(`wf${i}${r}${c}${Math.floor(t / 40)}`) > 0.97 ? 0.3 : 1;
              return on ? (
                <rect key={`${r}-${c}`} x={x + 6 + c * 20} y={top + 12 + r * 26} width={9} height={13} fill="#ffcf7a" opacity={0.55 * flick} />
              ) : null;
            }),
          )}
        </g>
      ))}
      <g>
        <rect x={34} y={300} width={56} height={150} rx={8} fill="none" stroke="#ff4fa3" strokeWidth={14} opacity={0.18} />
        <rect x={34} y={300} width={56} height={150} rx={8} fill="#ff4fa3" opacity={0.1} />
        <rect x={34} y={300} width={56} height={150} rx={8} fill="none" stroke="#ff4fa3" strokeWidth={3} />
        <text x={62} y={355} textAnchor="middle" fontSize={38} fontWeight={900} fill="#ffd1ea" fontFamily="Noto Sans SC">夜</text>
        <text x={62} y={410} textAnchor="middle" fontSize={38} fontWeight={900} fill="#ffd1ea" fontFamily="Noto Sans SC">宵</text>
        <rect x={250} y={250} width={110} height={44} rx={8} fill="none" stroke="#3ff0ff" strokeWidth={12} opacity={0.16} />
        <rect x={250} y={250} width={110} height={44} rx={8} fill="none" stroke="#3ff0ff" strokeWidth={3} opacity={0.6 + 0.4 * (Math.sin(t * 0.7) > -0.8 ? 1 : 0)} />
        <text x={305} y={281} textAnchor="middle" fontSize={26} fontWeight={700} fill="#c8fbff" fontFamily="Noto Sans SC">拉面 · 24h</text>
      </g>
      <rect y={560} width={SW} height={SH - 560} fill={`url(#${id}-street)`} />
      <defs>
        <linearGradient id={`${id}-refl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}-reflm`}>
          <rect x={0} y={560} width={SW} height={300} fill={`url(#${id}-refl)`} />
        </mask>
      </defs>
      <g opacity={0.6} mask={`url(#${id}-reflm)`}>
        <rect x={40} y={580} width={44} height={200} rx={20} fill="#ff4fa3" opacity={0.4} />
        <rect x={262} y={575} width={90} height={150} rx={30} fill="#3ff0ff" opacity={0.3} />
        {new Array(8).fill(0).map((_, i) => (
          <rect key={i} x={10 + i * 50} y={580} width={14} height={120 + random(`rf${i}`) * 90} fill="#ffcf7a" opacity={0.18} />
        ))}
      </g>
      {/* umbrella walker */}
      {(() => {
        const wx = ((t * 1.1) % 520) - 70;
        const bob = Math.abs(Math.sin(t * 0.22)) * 3;
        return (
          <g transform={`translate(${wx} ${612 - bob})`}>
            <path d="M-34 0 Q0 -40 34 0 Q24 -6 17 0 Q8 -6 0 0 Q-8 -6 -17 0 Q-24 -6 -34 0 Z" fill="#0a0814" />
            <rect x={-1.2} y={0} width={2.4} height={22} fill="#0a0814" />
            <path d="M-9 8 Q0 2 9 8 L11 60 L4 60 L2 88 L-4 88 L-6 60 L-11 60 Z" fill="#0a0814" />
          </g>
        );
      })()}
      {new Array(110).fill(0).map((_, i) => {
        const sp = 18 + random(`rs${i}`) * 16;
        const x0 = random(`rx${i}`) * (SW + 120);
        const y = ((random(`ry${i}`) * SH + t * sp) % (SH + 60)) - 60;
        const x = x0 - (y / SH) * 90;
        return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 26} stroke="#b9c8ff" strokeWidth={1.1} opacity={0.18 + random(`ro${i}`) * 0.3} />;
      })}
      {new Array(14).fill(0).map((_, i) => {
        const cx = random(`sp${i}`) * SW;
        const cy = 600 + random(`spy${i}`) * 230;
        const age = ((t + random(`spt${i}`) * 30) % 30) / 30;
        return <ellipse key={`s${i}`} cx={cx} cy={cy} rx={2 + age * 14} ry={0.8 + age * 4} fill="none" stroke="#c9d6ff" strokeWidth={1} opacity={(1 - age) * 0.5} />;
      })}
    </Svg>
  );
};

// ------------------------------------------------------------------------------------------------
const ribbon = (t: number, base: number, amp: number, phase: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= 16; i++) {
    const x = -40 + (i / 16) * (SW + 80);
    const y = base + Math.sin(i * 0.7 + t * 0.03 + phase) * amp + Math.sin(i * 1.9 + t * 0.05 + phase * 2) * amp * 0.35;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts;
};

export const Aurora: Clip = ({t, id = 'aurora'}) => {
  return (
    <Svg bg="#030714">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#02040f" />
          <stop offset="0.55" stopColor="#06213a" />
          <stop offset="0.75" stopColor="#0c3b4a" />
        </linearGradient>
        <linearGradient id={`${id}-curtain`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d5cff" stopOpacity="0" />
          <stop offset="0.35" stopColor="#53ffc4" stopOpacity="0.55" />
          <stop offset="0.8" stopColor="#2dffa0" stopOpacity="0.85" />
          <stop offset="1" stopColor="#2dffa0" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <linearGradient id={`${id}-lake`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d4a52" />
          <stop offset="1" stopColor="#020611" />
        </linearGradient>
      </defs>
      <rect width={SW} height={SH} fill={`url(#${id}-sky)`} />
      {new Array(90).fill(0).map((_, i) => (
        <circle key={i} cx={random(`st${i}`) * SW} cy={random(`sty${i}`) * 420} r={0.5 + random(`str${i}`) * 1.2} fill="#fff" opacity={0.3 + 0.6 * Math.abs(Math.sin(t * 0.05 + i))} />
      ))}
      <g>
        {[0, 1, 2].map((k) => {
          const top = ribbon(t, 140 + k * 55, 38 - k * 6, k * 1.3);
          const bottom = ribbon(t, 330 + k * 40, 30, k * 1.3 + 0.4).reverse();
          return <polygon key={k} points={[...top, ...bottom].join(' ')} fill={`url(#${id}-curtain)`} opacity={0.75 - k * 0.15} />;
        })}
      </g>
      <path d="M0 470 L60 390 L110 430 L170 350 L230 420 L290 360 L350 410 L390 380 L390 520 L0 520 Z" fill="#0b1a2a" />
      <path d="M0 500 L50 450 L95 480 L150 420 L210 470 L270 430 L330 480 L390 450 L390 540 L0 540 Z" fill="#071220" />
      <path d="M165 352 L178 368 L170 366 L160 372 Z M286 362 L298 378 L290 376 L280 381 Z" fill="#cfe8ff" opacity={0.7} />
      <rect y={540} width={SW} height={SH - 540} fill={`url(#${id}-lake)`} />
      <g opacity={0.4} transform={`translate(0 ${540 * 2}) scale(1 -1)`}>
        {[0, 1].map((k) => {
          const top = ribbon(t, 140 + k * 55, 38 - k * 6, k * 1.3);
          const bottom = ribbon(t, 330 + k * 40, 30, k * 1.3 + 0.4).reverse();
          return <polygon key={k} points={[...top, ...bottom].join(' ')} fill={`url(#${id}-curtain)`} opacity={0.5} />;
        })}
      </g>
      {new Array(10).fill(0).map((_, i) => (
        <rect key={`l${i}`} x={((random(`lk${i}`) * SW + t * 0.4) % SW) - 30} y={560 + i * 26} width={60 + random(`lw${i}`) * 80} height={1.2} fill="#9ff7ff" opacity={0.12} />
      ))}
    </Svg>
  );
};

// ------------------------------------------------------------------------------------------------
const BURSTS = [
  {at: 4, x: 120, y: 260, c: '#ffcf5a'},
  {at: 22, x: 270, y: 200, c: '#ff4fa3'},
  {at: 40, x: 190, y: 330, c: '#5af0ff'},
  {at: 58, x: 90, y: 180, c: '#ff8a3d'},
  {at: 74, x: 300, y: 300, c: '#ffe9a8'},
  {at: 92, x: 170, y: 220, c: '#b07bff'},
];

export const Fireworks: Clip = ({t, id = 'fw'}) => {
  const loop = t % 110;
  let flash = 0;
  for (const b of BURSTS) {
    const age = loop - b.at;
    if (age >= 0 && age < 14) flash = Math.max(flash, 1 - age / 14);
  }
  return (
    <Svg bg="#04030c">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05030f" />
          <stop offset="0.75" stopColor="#1a0f2e" />
          <stop offset="1" stopColor="#331a3d" />
        </linearGradient>
        <radialGradient id={`${id}-flash`}>
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={SW} height={SH} fill={`url(#${id}-sky)`} />
      <circle cx={195} cy={260} r={380} fill={`url(#${id}-flash)`} opacity={flash} />
      {BURSTS.map((b, bi) => {
        const age = loop - b.at;
        if (age < -16 || age > 46) return null;
        if (age < 0) {
          const p = (age + 16) / 16;
          const y = 700 - (700 - b.y) * (1 - (1 - p) * (1 - p));
          return <line key={bi} x1={b.x} y1={y} x2={b.x} y2={y + 30} stroke="#ffdca0" strokeWidth={2} opacity={0.8} strokeLinecap="round" />;
        }
        const life = 1 - age / 46;
        return (
          <g key={bi}>
            {new Array(44).fill(0).map((_, k) => {
              const ang = (k / 44) * Math.PI * 2 + random(`fa${bi}${k}`) * 0.1;
              const spd = 3.2 + random(`fs${bi}${k}`) * 1.6;
              const drag = (1 - Math.pow(0.93, age)) / (1 - 0.93);
              const x = b.x + Math.cos(ang) * spd * drag;
              const y = b.y + Math.sin(ang) * spd * drag + 0.05 * age * age;
              const pd = (1 - Math.pow(0.93, Math.max(0, age - 3))) / (1 - 0.93);
              const px = b.x + Math.cos(ang) * spd * pd;
              const py = b.y + Math.sin(ang) * spd * pd + 0.05 * Math.max(0, age - 3) ** 2;
              return (
                <g key={k}>
                  <line x1={px} y1={py} x2={x} y2={y} stroke={b.c} strokeWidth={1.8} opacity={life * 0.7} strokeLinecap="round" />
                  <circle cx={x} cy={y} r={1.8} fill="#fff8e6" opacity={life} />
                </g>
              );
            })}
          </g>
        );
      })}
      <path
        d="M0 700 L0 640 L30 640 L30 610 L55 610 L55 650 L80 650 L80 580 L100 560 L120 580 L120 640 L150 640 L150 600 L175 600 L175 520 L185 500 L195 520 L195 640 L225 640 L225 590 L260 590 L260 630 L290 630 L290 570 L320 570 L320 650 L350 650 L350 615 L390 615 L390 700 Z"
        fill="#07050f"
      />
      {new Array(40).fill(0).map((_, i) => (
        <rect key={i} x={random(`cw${i}`) * 380} y={600 + random(`cwy${i}`) * 90} width={3} height={4} fill="#ffcf7a" opacity={0.5} />
      ))}
      <rect y={700} width={SW} height={SH - 700} fill="#05040b" />
      <rect y={700} width={SW} height={SH - 700} fill={`url(#${id}-flash)`} opacity={flash * 0.6} />
    </Svg>
  );
};

// ------------------------------------------------------------------------------------------------
export const Cat: Clip = ({t, id = 'cat'}) => {
  const tilt = Math.sin(t * 0.045) * 6;
  const blink = (() => {
    const p = t % 75;
    return p > 66 && p < 72 ? Math.abs(Math.sin(((p - 66) / 6) * Math.PI)) : 0;
  })();
  const look = Math.sin(t * 0.03) * 6;
  return (
    <Svg bg="#f3dcc0">
      <defs>
        <radialGradient id={`${id}-bg`} cx="0.5" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#fff1dc" />
          <stop offset="0.6" stopColor="#f0cfa6" />
          <stop offset="1" stopColor="#c9946a" />
        </radialGradient>
        <radialGradient id={`${id}-fur`} cx="0.45" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#ffc27a" />
          <stop offset="0.55" stopColor="#f39a45" />
          <stop offset="1" stopColor="#c76a25" />
        </radialGradient>
        <radialGradient id={`${id}-eye`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#d9f27a" />
          <stop offset="0.6" stopColor="#8fbf3a" />
          <stop offset="1" stopColor="#4c7a1c" />
        </radialGradient>
        <radialGradient id={`${id}-muzzle`} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#fff7ec" />
          <stop offset="1" stopColor="#f6d7b4" />
        </radialGradient>
      </defs>
      <rect width={SW} height={SH} fill={`url(#${id}-bg)`} />
      <circle cx={70} cy={140} r={60} fill="#fff" opacity={0.25} />
      <g transform={`translate(195 470) rotate(${tilt}) translate(-195 -470)`}>
        <path d="M60 740 Q60 560 195 540 Q330 560 330 740 L330 844 L60 844 Z" fill={`url(#${id}-fur)`} />
        <path d="M150 600 Q195 580 240 600 L235 760 Q195 790 155 760 Z" fill="#fff4e4" opacity={0.85} />
        <path d="M78 250 L100 420 L180 330 Z" fill="#e88a3a" />
        <path d="M312 250 L290 420 L210 330 Z" fill="#e88a3a" />
        <path d="M92 285 L108 400 L162 338 Z" fill="#f7b3a4" />
        <path d="M298 285 L282 400 L228 338 Z" fill="#f7b3a4" />
        <ellipse cx={195} cy={470} rx={150} ry={135} fill={`url(#${id}-fur)`} />
        {[-1, 0, 1].map((k) => (
          <path key={k} d={`M${195 + k * 26} 340 Q${195 + k * 30} 372 ${195 + k * 20} 400`} stroke="#c0611d" strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.7} />
        ))}
        <path d="M60 470 Q90 462 105 474" stroke="#c0611d" strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.6} />
        <path d="M330 470 Q300 462 285 474" stroke="#c0611d" strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.6} />
        <ellipse cx={195} cy={525} rx={78} ry={56} fill={`url(#${id}-muzzle)`} />
        {[-1, 1].map((s) => (
          <g key={s} transform={`translate(${195 + s * 62} 455)`}>
            <ellipse rx={36} ry={34 * (1 - blink * 0.92)} fill="#2a1a0c" />
            <ellipse rx={32} ry={30 * (1 - blink * 0.92)} fill={`url(#${id}-eye)`} />
            <ellipse cx={look} rx={9} ry={26 * (1 - blink * 0.92)} fill="#120a04" />
            <circle cx={-10 + look * 0.4} cy={-12 * (1 - blink)} r={7 * (1 - blink)} fill="#fff" opacity={0.95} />
            <circle cx={8 + look * 0.4} cy={10 * (1 - blink)} r={3 * (1 - blink)} fill="#fff" opacity={0.7} />
          </g>
        ))}
        <path d="M181 505 Q195 498 209 505 Q203 518 195 520 Q187 518 181 505 Z" fill="#e8737a" />
        <path d="M195 520 L195 536 M195 536 Q182 552 168 542 M195 536 Q208 552 222 542" stroke="#6b3a2a" strokeWidth={3} fill="none" strokeLinecap="round" />
        {[-1, 1].map((s) =>
          [0, 1, 2].map((k) => (
            <path
              key={`${s}${k}`}
              d={`M${195 + s * 60} ${528 + k * 10} Q${195 + s * 120} ${518 + k * 14} ${195 + s * 175} ${514 + k * 22}`}
              stroke="#fffaf0"
              strokeWidth={1.8}
              fill="none"
              opacity={0.85}
            />
          )),
        )}
      </g>
      <rect width={SW} height={SH} fill="#ffb070" opacity={0.06} />
    </Svg>
  );
};

// ------------------------------------------------------------------------------------------------
export const Galaxy: Clip = ({t, id = 'gal'}) => {
  const rot = t * 0.08;
  return (
    <Svg bg="#02020a">
      <defs>
        <radialGradient id={`${id}-neb1`}>
          <stop offset="0" stopColor="#b84dff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#b84dff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-neb2`}>
          <stop offset="0" stopColor="#29c5ff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#29c5ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-planet`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffe3b5" />
          <stop offset="0.45" stopColor="#d9935a" />
          <stop offset="0.85" stopColor="#5a2a1a" />
          <stop offset="1" stopColor="#1a0b08" />
        </radialGradient>
        <linearGradient id={`${id}-ring`} x1="0" x2="1">
          <stop offset="0" stopColor="#ffe0b0" stopOpacity="0.1" />
          <stop offset="0.5" stopColor="#ffe9c7" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffe0b0" stopOpacity="0.1" />
        </linearGradient>
        <clipPath id={`${id}-front`}>
          <rect x="0" y="430" width={SW} height="200" />
        </clipPath>
      </defs>
      <circle cx={110} cy={260} r={260} fill={`url(#${id}-neb1)`} />
      <circle cx={300} cy={560} r={300} fill={`url(#${id}-neb2)`} />
      {new Array(150).fill(0).map((_, i) => (
        <circle key={i} cx={random(`gx${i}`) * SW} cy={random(`gy${i}`) * SH} r={0.4 + random(`gr${i}`) * 1.3} fill="#fff" opacity={0.25 + 0.7 * Math.abs(Math.sin(t * 0.04 + i * 3))} />
      ))}
      <g transform={`translate(195 430) rotate(-18)`}>
        <ellipse rx={175} ry={34} fill="none" stroke={`url(#${id}-ring)`} strokeWidth={16} opacity={0.75} />
        <circle r={98} fill={`url(#${id}-planet)`} transform={`rotate(${rot * 0.2})`} />
        {[0, 1, 2, 3].map((k) => (
          <ellipse key={k} cy={-40 + k * 26} rx={96 - Math.abs(k - 1.5) * 18} ry={5} fill="#7a3b1c" opacity={0.25} />
        ))}
        <g clipPath={`url(#${id}-front)`} transform="translate(0 -430)">
          <ellipse cy={430} rx={175} ry={34} fill="none" stroke={`url(#${id}-ring)`} strokeWidth={16} opacity={0.9} />
        </g>
      </g>
    </Svg>
  );
};

// ------------------------------------------------------------------------------------------------
export const PaintSwirl: Clip = ({t, id = 'paint'}) => {
  // acrylic pour seen from above: glossy bands of paint spiralling out from a falling stream
  const cols = ['#ff4f7b', '#ffd36b', '#3fe0d0', '#5b8cff', '#fff4e2', '#b06bff', '#ff8a3d'];
  const cx = 195;
  const cy = 470;
  const bands = 26;
  return (
    <Svg bg="#120f1c">
      <defs>
        <radialGradient id={`${id}-shade`} cx="0.5" cy="0.55" r="0.65">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        <linearGradient id={`${id}-stream`} x1="0" x2="1">
          <stop offset="0" stopColor="#ff4f7b" />
          <stop offset="0.35" stopColor="#ffd36b" />
          <stop offset="0.65" stopColor="#3fe0d0" />
          <stop offset="1" stopColor="#5b8cff" />
        </linearGradient>
        <filter id={`${id}-soft`}>
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
      <g>
        {new Array(bands).fill(0).map((_, k) => {
          const i = bands - 1 - k;
          const r = 30 + i * 22 + ((t * 0.9) % 22);
          const pts: string[] = [];
          for (let s2 = 0; s2 <= 72; s2++) {
            const a = (s2 / 72) * Math.PI * 2;
            const wob = Math.sin(a * 3 + i * 0.7 + t * 0.03) * (6 + i * 0.9) + Math.sin(a * 7 - t * 0.05 + i) * 3;
            const sw = a + r * 0.006 + t * 0.004;
            pts.push(`${(cx + Math.cos(sw) * (r + wob)).toFixed(1)},${(cy + Math.sin(sw) * (r + wob) * 1.08).toFixed(1)}`);
          }
          return <polygon key={k} points={pts.join(' ')} fill={cols[(i + Math.floor(t * 0.9 / 22)) % cols.length]} />;
        })}
      </g>
      {/* wet highlights */}
      {new Array(9).fill(0).map((_, k) => {
        const r = 60 + k * 48;
        const a0 = -2.2 + k * 0.15 + t * 0.004;
        return (
          <path
            key={`h${k}`}
            d={`M${cx + Math.cos(a0) * r} ${cy + Math.sin(a0) * r * 1.08} A${r} ${r * 1.08} 0 0 1 ${cx + Math.cos(a0 + 0.6) * r} ${cy + Math.sin(a0 + 0.6) * r * 1.08}`}
            stroke="#fff"
            strokeWidth={3}
            fill="none"
            opacity={0.35}
            strokeLinecap="round"
          />
        );
      })}
      {/* the pour */}
      <path d={`M${cx - 7 + Math.sin(t * 0.2) * 2} 0 C${cx - 6} 200 ${cx - 10} 380 ${cx - 16} ${cy} L${cx + 16} ${cy} C${cx + 10} 380 ${cx + 6} 200 ${cx + 7 + Math.sin(t * 0.2) * 2} 0 Z`} fill={`url(#${id}-stream)`} opacity={0.95} />
      <path d={`M${cx - 2} 0 C${cx - 2} 200 ${cx - 4} 380 ${cx - 6} ${cy - 6}`} stroke="#fff" strokeWidth={2} opacity={0.5} fill="none" />
      <ellipse cx={cx} cy={cy} rx={30} ry={14} fill="#fff4e2" opacity={0.85} />
      <rect width={SW} height={SH} fill={`url(#${id}-shade)`} />
    </Svg>
  );
};

// ------------------------------------------------------------------------------------------------
export const AdClip: Clip = ({t, id = 'ad'}) => {
  const bob = Math.sin(t * 0.08) * 6;
  return (
    <Svg bg="#e9e7e3">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2f0ec" />
          <stop offset="1" stopColor="#cfccc6" />
        </linearGradient>
        <linearGradient id={`${id}-bottle`} x1="0" x2="1">
          <stop offset="0" stopColor="#8a8f96" />
          <stop offset="0.35" stopColor="#e3e6ea" />
          <stop offset="0.55" stopColor="#b6bbc2" />
          <stop offset="1" stopColor="#6c7178" />
        </linearGradient>
      </defs>
      <rect width={SW} height={SH} fill={`url(#${id}-bg)`} />
      <ellipse cx={195} cy={560} rx={96} ry={15} fill="#000" opacity={0.12} />
      <g transform={`translate(0 ${bob})`}>
        <rect x={148} y={270} width={94} height={272} rx={26} fill={`url(#${id}-bottle)`} />
        <rect x={156} y={238} width={78} height={42} rx={9} fill="#5b6067" />
        <rect x={148} y={372} width={94} height={50} fill="#d4523e" opacity={0.9} />
        <text x={195} y={404} textAnchor="middle" fontSize={20} fontWeight={700} fill="#fff" fontFamily="Noto Sans SC">保温杯</text>
      </g>
      <rect x={30} y={120} width={330} height={92} rx={14} fill="#d4523e" />
      <text x={195} y={180} textAnchor="middle" fontSize={44} fontWeight={900} fill="#fff" fontFamily="Noto Sans SC">限时特惠 ¥59.9</text>
      <rect x={70} y={598} width={250} height={58} rx={29} fill="#d4523e" />
      <text x={195} y={636} textAnchor="middle" fontSize={24} fontWeight={700} fill="#fff" fontFamily="Noto Sans SC">立即购买</text>
      <rect x={24} y={226} width={46} height={24} rx={5} fill="#000" opacity={0.22} />
      <text x={47} y={243} textAnchor="middle" fontSize={14} fill="#fff" fontFamily="Noto Sans SC">广告</text>
    </Svg>
  );
};

// ------------------------------------------------------------------------------------------------
export const RainWindow: Clip = ({t, id = 'rw'}) => {
  return (
    <Svg bg="#1a2230">
      <defs>
        <filter id={`${id}-bokeh`}>
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <radialGradient id={`${id}-drop`} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.3" stopColor="#c8d6ea" stopOpacity="0.35" />
          <stop offset="1" stopColor="#0d1420" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <rect width={SW} height={SH} fill="#202a3a" />
      {['#ffb35c', '#ff6f6f', '#7fb6ff', '#ffe08a'].map((c, k) => (
        <radialGradient key={c} id={`${id}-bk${k}`}>
          <stop offset="0" stopColor={c} stopOpacity="0.55" />
          <stop offset="0.6" stopColor={c} stopOpacity="0.25" />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </radialGradient>
      ))}
      {new Array(16).fill(0).map((_, i) => (
        <circle key={i} cx={random(`bk${i}`) * SW} cy={300 + random(`bky${i}`) * 420} r={36 + random(`bkr${i}`) * 40} fill={`url(#${id}-bk${i % 4})`} />
      ))}
      <rect width={SW} height={SH} fill="#4a5a74" opacity={0.25} />
      {new Array(70).fill(0).map((_, i) => {
        const r = 2 + random(`dr${i}`) * 6;
        const slide = random(`ds${i}`) > 0.85 ? ((t * (1 + random(`dv${i}`) * 2)) % 900) : 0;
        const cx = random(`dx${i}`) * SW;
        const cy = ((random(`dy${i}`) * SH + slide) % SH);
        return (
          <g key={i}>
            {slide ? <rect x={cx - r * 0.35} y={cy - 80} width={r * 0.7} height={80} fill="#9fb2cc" opacity={0.12} /> : null}
            <ellipse cx={cx} cy={cy} rx={r} ry={r * 1.15} fill={`url(#${id}-drop)`} />
          </g>
        );
      })}
    </Svg>
  );
};

export const CLIPS = {
  ad: AdClip,
  ocean: OceanSunset,
  rain: RainWindow,
  cat: Cat,
  fireworks: Fireworks,
  aurora: Aurora,
  neon: NeonRain,
  galaxy: Galaxy,
  paint: PaintSwirl,
} as const;
export type ClipId = keyof typeof CLIPS;

/** Dominant colours per clip — used for screen-light spill and tiny thumbnails. */
export const CLIP_TINT: Record<ClipId, [number, number, number]> = {
  ad: [214, 210, 204],
  ocean: [255, 150, 100],
  rain: [120, 140, 180],
  cat: [245, 170, 90],
  fireworks: [255, 140, 120],
  aurora: [70, 255, 190],
  neon: [255, 80, 170],
  galaxy: [150, 90, 255],
  paint: [255, 120, 140],
};
