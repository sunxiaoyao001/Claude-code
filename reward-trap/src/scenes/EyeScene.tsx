import React, {useMemo} from 'react';
import {AbsoluteFill, Img, interpolate, random, useCurrentFrame} from 'remotion';
import {noise2D} from '../lib/noise';
import {C, ease} from '../theme';
import {irisTexture} from '../components/iris';
import {Feed} from '../components/phone/FeedUI';
import {CLIP_TINT, type ClipId} from '../components/phone/contents';
import {feedPositionAt, type Swipe} from '../components/phone/Thumb';
import {lerp} from '../lib/math';

// Extreme macro of an eye at 2:47 a.m. The only light is the phone, reflected in the cornea.
const ITEMS: ClipId[] = ['neon', 'cat', 'fireworks', 'ocean', 'aurora', 'paint', 'galaxy', 'ad', 'cat', 'fireworks', 'aurora', 'neon', 'ocean', 'paint', 'galaxy', 'cat', 'rain', 'fireworks', 'aurora', 'neon', 'ocean', 'cat'];
const SWIPE_AT = [8, 28, 46, 60, 72, 82, 91, 99, 106, 112, 117, 122, 126, 130, 133, 136, 139, 142, 145];
const SWIPES: Swipe[] = SWIPE_AT.map((at) => ({at}));
const STOP = 150;

const IX = 960;
const IY = 560;
const IR = 470;

export const EyeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const iris = useMemo(() => irisTexture(), []);
  const pos = feedPositionAt(Math.min(frame, STOP), SWIPES);
  const i0 = Math.floor(pos);
  const f = pos - i0;
  const ta = CLIP_TINT[ITEMS[i0]] ?? CLIP_TINT.neon;
  const tb = CLIP_TINT[ITEMS[Math.min(ITEMS.length - 1, i0 + 1)]] ?? ta;
  const tint: [number, number, number] = [lerp(ta[0], tb[0], f), lerp(ta[1], tb[1], f), lerp(ta[2], tb[2], f)];

  // Each new video is a flash of light: the pupil reflexively narrows, then relaxes.
  let flash = 0;
  for (const at of SWIPE_AT) {
    const t = frame - at - 6;
    if (t >= 0 && frame < STOP + 4) flash = Math.max(flash, Math.exp(-t / 9));
  }
  const wake = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp', easing: ease.out});
  const after = interpolate(frame, [STOP, STOP + 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
  const pupil = 150 - flash * 22 + after * 46 + noise2D('pup', frame * 0.03, 0) * 4;
  const light = wake * (0.72 + flash * 0.45) * (1 - after * 0.45);

  // micro-saccades
  let sx = 0;
  let sy = 0;
  for (const [at, dx, dy] of [
    [52, 7, -3],
    [97, -9, 4],
    [138, 5, 5],
  ] as const) {
    const p = interpolate(frame, [at, at + 3], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.out});
    sx += dx * p;
    sy += dy * p;
  }
  const breathe = noise2D('eyecam', frame * 0.01, 0) * 6;
  const pull = interpolate(frame, [STOP + 4, 180], [1, 0.84], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
  const push = interpolate(frame, [0, STOP], [1.08, 1.0], {easing: ease.soft});
  const strobe = frame > 118 && frame < STOP ? (random(`strobe${frame}`) - 0.5) * 6 : 0;
  const [r, g, b] = tint;

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `translate(${breathe + strobe}px, ${breathe * 0.6}px) scale(${push * pull})`, transformOrigin: `${IX}px ${IY}px`, willChange: 'transform'}}>
        {/* sclera */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 48% 60% at 50% 56%, rgba(${150 + r * 0.25},${140 + g * 0.22},${145 + b * 0.22},${0.62 * light}) 0%, rgba(120,95,100,${0.42 * light}) 40%, rgba(40,24,28,${0.75 * light}) 68%, #000 92%)`,
          }}
        />
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: light, willChange: 'transform'}}>
          {new Array(26).fill(0).map((_, k) => {
            const side = k % 2 ? 1 : -1;
            const y0 = 360 + random(`v${k}`) * 420;
            const x0 = IX + side * (IR + 30 + random(`vx${k}`) * 380);
            const x1 = IX + side * (IR + 10);
            const y1 = y0 + (random(`vy${k}`) - 0.5) * 120;
            return (
              <path
                key={k}
                d={`M${x0} ${y0} Q${(x0 + x1) / 2} ${y0 + (random(`vq${k}`) - 0.5) * 140} ${x1} ${y1}`}
                stroke="#b5303a"
                strokeWidth={0.8 + random(`vw${k}`) * 1.6}
                fill="none"
                opacity={0.3}
              />
            );
          })}
        </svg>
        {/* iris */}
        <div style={{position: 'absolute', left: IX - IR + sx, top: IY - IR + sy, width: IR * 2, height: IR * 2}}>
          <Img src={iris} style={{width: '100%', height: '100%', opacity: Math.min(1, light * 1.15)}} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: `radial-gradient(circle at 45% 40%, rgba(${r},${g},${b},${0.16 * light}) 0%, rgba(${r},${g},${b},${0.06 * light}) 50%, rgba(${r},${g},${b},0) 80%)`,
            }}
          />
          {/* the upper lid shades the top of the iris; the lower half catches the screen */}
          <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(180deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 22%, rgba(0,0,0,0) 46%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.35) 100%)'}} />
          {/* pupil with a soft edge */}
          <div
            style={{
              position: 'absolute',
              left: IR - pupil,
              top: IR - pupil,
              width: pupil * 2,
              height: pupil * 2,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #000 0%, #000 86%, rgba(0,0,0,0.6) 94%, rgba(0,0,0,0) 100%)',
            }}
          />
          {/* corneal reflection of the phone: mirrored, curved, glowing */}
          <div
            style={{
              position: 'absolute',
              left: IR - 250,
              top: IR - 300,
              width: 176,
              height: 380,
              borderRadius: 26,
              overflow: 'hidden',
              transform: 'perspective(500px) rotateY(-16deg) rotateX(9deg) rotateZ(-4deg) scaleX(-1)',
              opacity: wake * (1 - after * 0.25) * 0.92,
              mixBlendMode: 'screen',
              filter: `blur(${frame > 118 && frame < STOP ? 2.2 : 0.9}px) saturate(1.2)`,
              boxShadow: `0 0 40px rgba(${r},${g},${b},0.6)`,
            }}
          >
            <div style={{width: 390, height: 844, transform: `scale(${176 / 390})`, transformOrigin: 'top left'}}>
              <Feed items={ITEMS} position={pos} t={frame} uid="eyefeed" />
            </div>
          </div>
          {/* soft secondary catchlight */}
          <div style={{position: 'absolute', left: IR + 140, top: IR - 260, width: 70, height: 46, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%)', opacity: light}} />
          {/* corneal dome sheen */}
          <div style={{position: 'absolute', inset: -10, borderRadius: '50%', background: 'radial-gradient(circle at 38% 30%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%)', opacity: light}} />
        </div>
        <Lids light={light} tint={tint} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 65% at 50% 52%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)`, willChange: 'transform'}} />
      <AbsoluteFill style={{background: '#000', opacity: interpolate(frame, [0, 6], [1, 0], {extrapolateRight: 'clamp'})}} />
      <AbsoluteFill style={{background: C.void, opacity: interpolate(frame, [168, 180], [0, 0.7], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}} />
    </AbsoluteFill>
  );
};

const up = (x: number) => 165 + 0.00026 * (x - 960) ** 2;
const lo = (x: number) => 1015 - 0.00021 * (x - 960) ** 2;
const edge = (f: (x: number) => number, dy = 0) => new Array(25).fill(0).map((_, i) => `L${i * 80} ${f(i * 80) + dy}`).join(' ');

// Lids, lashes and the lid shadow never change: painted once into a bitmap (SVG blur filters
// are re-run every frame by the software rasteriser, which made this the costliest layer of the film).
let lidsUrl: string | null = null;
const lidsImage = () => {
  if (lidsUrl) return lidsUrl;
  const c = document.createElement('canvas');
  c.width = 1920;
  c.height = 1080;
  const g = c.getContext('2d')!;
  const curve = (f: (x: number) => number, dy = 0) => {
    for (let i = 0; i <= 24; i++) g.lineTo(i * 80, f(i * 80) + dy);
  };
  g.save();
  g.filter = 'blur(5px)';
  g.globalAlpha = 0.55;
  g.fillStyle = '#000';
  g.beginPath();
  g.moveTo(0, 0);
  curve(up, 60);
  g.lineTo(1920, 0);
  g.closePath();
  g.fill();
  g.restore();
  const gu = g.createLinearGradient(0, 0, 0, up(0));
  gu.addColorStop(0, '#000');
  gu.addColorStop(0.7, '#120a09');
  gu.addColorStop(1, '#3a2622');
  g.fillStyle = gu;
  g.beginPath();
  g.moveTo(0, 0);
  curve(up);
  g.lineTo(1920, 0);
  g.closePath();
  g.fill();
  const gl = g.createLinearGradient(0, 1080, 0, lo(0));
  gl.addColorStop(0, '#000');
  gl.addColorStop(0.75, '#140b0a');
  gl.addColorStop(1, '#4a302c');
  g.fillStyle = gl;
  g.beginPath();
  g.moveTo(0, 1080);
  curve(lo);
  g.lineTo(1920, 1080);
  g.closePath();
  g.fill();
  // draw every lash sharp on a scratch canvas, then blur the whole set in one pass
  const lc = document.createElement('canvas');
  lc.width = 1920;
  lc.height = 1080;
  const l = lc.getContext('2d')!;
  l.lineCap = 'round';
  for (let k = 0; k < 170; k++) {
    const x = (k / 170) * 2000 - 40 + random(`lx${k}`) * 10;
    const y = up(x) - 2;
    const len = 60 + random(`ll${k}`) * 110;
    const lean = (x - 960) / 960;
    const dx = lean * 70 + (random(`le${k}`) - 0.5) * 50;
    // lashes droop toward the camera, then curl back up at the tips
    l.strokeStyle = 'rgba(4,2,2,0.92)';
    l.lineWidth = 3.5 + random(`lw${k}`) * 4;
    l.beginPath();
    l.moveTo(x, y);
    l.bezierCurveTo(x + dx * 0.3, y + len * 0.55, x + dx * 0.8, y + len * 0.75, x + dx, y + len * 0.45);
    l.stroke();
  }
  for (let k = 0; k < 70; k++) {
    const x = (k / 70) * 1900 + random(`dx${k}`) * 20;
    const y = lo(x) + 6;
    const len = 26 + random(`dl${k}`) * 30;
    const lean = (x - 960) / 960;
    l.strokeStyle = '#0a0606';
    l.lineWidth = 2 + random(`dw${k}`) * 1.5;
    l.beginPath();
    l.moveTo(x, y);
    l.quadraticCurveTo(x + lean * 10, y + len * 0.6, x + lean * 30, y + len);
    l.stroke();
  }
  g.save();
  g.filter = 'blur(2.4px)';
  g.drawImage(lc, 0, 0);
  g.restore();
  lidsUrl = c.toDataURL('image/png');
  return lidsUrl;
};

const StaticLids: React.FC = React.memo(() => <Img src={lidsImage()} style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080}} />);

/** Wet lid margins catching the screen colour (cheap: three strokes). */
const Lids: React.FC<{light: number; tint: [number, number, number]}> = ({light, tint}) => {
  const [r, g, b] = tint;
  return (
    <>
      <StaticLids />
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <path d={`M0 ${up(0)} ${edge(up)}`} stroke={`rgba(${180 + r * 0.2},${120 + g * 0.2},${120 + b * 0.2},${0.55 * light})`} strokeWidth={4} fill="none" />
        <path d={`M0 ${lo(0)} ${edge(lo)}`} stroke={`rgba(255,240,240,${0.5 * light})`} strokeWidth={2.4} fill="none" />
        <path d={`M0 ${lo(0) - 4} ${edge(lo, -4)}`} stroke={`rgba(${r},${g},${b},${0.35 * light})`} strokeWidth={1.4} fill="none" />
      </svg>
    </>
  );
};
