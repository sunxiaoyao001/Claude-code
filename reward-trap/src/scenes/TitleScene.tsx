import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {noise2D} from '../lib/noise';
import {Backdrop} from '../components/Look';
import {C, ease} from '../theme';
import {CLIP_TINT, type ClipId} from '../components/phone/contents';
import {clamp} from '../lib/math';

const TITLE = '为什么你刷短视频停不下来？';
const SUB = '大脑的「奖励陷阱」';
const TITLE_FONT = '900 112px "Noto Serif SC"';
const SUB_FONT = '600 62px "Noto Serif SC"';
const T_Y = 500;
const S_Y = 628;
const N = 2600;

type P = {tx: number; ty: number; gold: boolean; ang: number; rad: number; delay: number; size: number};

// Sample glyph pixels so the particle cloud can condense into the actual title.
const samplePoints = (): P[] => {
  const c = document.createElement('canvas');
  c.width = 1920;
  c.height = 1080;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = TITLE_FONT;
  g.fillText(TITLE, 960, T_Y);
  g.font = SUB_FONT;
  (g as CanvasRenderingContext2D & {letterSpacing: string}).letterSpacing = '7px';
  g.fillText(SUB, 963, S_Y);
  const data = g.getImageData(0, 0, 1920, 1080).data;
  const pts: {x: number; y: number}[] = [];
  for (let y = 340; y < 680; y += 3) {
    for (let x = 160; x < 1760; x += 3) {
      if (data[(y * 1920 + x) * 4 + 3] > 140) pts.push({x, y});
    }
  }
  const out: P[] = [];
  for (let i = 0; i < N; i++) {
    const p = pts[Math.floor(random(`tp${i}`) * pts.length)];
    out.push({
      tx: p.x,
      ty: p.y,
      gold: p.y > 560,
      ang: random(`ta${i}`) * Math.PI * 2,
      rad: 90 + Math.pow(random(`tr${i}`), 0.7) * 560,
      delay: random(`td${i}`) * 34 + (p.x - 160) / 1600 * 16,
      size: 0.6 + Math.pow(random(`ts${i}`), 3) * 2.6,
    });
  }
  return out;
};

// The title's glow never changes shape: blur it once, then just fade the bitmap each frame.
let glowCache: HTMLCanvasElement | null = null;
const titleGlow = () => {
  if (glowCache) return glowCache;
  const c = document.createElement('canvas');
  c.width = 1920;
  c.height = 1080;
  const g = c.getContext('2d')!;
  g.textAlign = 'center';
  g.font = TITLE_FONT;
  g.shadowColor = 'rgba(255,190,110,0.45)';
  g.shadowBlur = 30;
  g.fillStyle = 'rgba(233,228,220,0.01)';
  g.fillText(TITLE, 960, T_Y);
  g.font = SUB_FONT;
  (g as CanvasRenderingContext2D & {letterSpacing: string}).letterSpacing = '7px';
  g.shadowColor = 'rgba(255,150,40,0.7)';
  g.shadowBlur = 26;
  g.fillStyle = 'rgba(255,190,90,0.01)';
  g.fillText(SUB, 963, S_Y);
  glowCache = c;
  return c;
};

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const pts = useMemo(samplePoints, []);

  const textIn = interpolate(frame, [62, 96], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.out});
  const subIn = interpolate(frame, [84, 112], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.out});
  const sweep = interpolate(frame, [96, 150], [-0.25, 1.25], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
  const rule = interpolate(frame, [100, 132], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
  const embers = interpolate(frame, [140, 200], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.in});
  const push = interpolate(frame, [0, 200], [1.04, 1.0], {easing: ease.soft});

  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext('2d')!;
    g.clearRect(0, 0, 1920, 1080);
    g.globalCompositeOperation = 'lighter';
    const posAt = (p: P, i: number, f: number) => {
      const t = clamp((f - 6 - p.delay) / 52);
      const e = ease.inOut(t);
      // a tilted vortex disc that spirals inward as the particles condense onto the glyphs
      const spin = p.ang + f * 0.05 * (1 - e) + (1 - e) * 2.4;
      const rr = p.rad * (1 - e * 0.85);
      const sx = 960 + Math.cos(spin) * rr * 1.5;
      const sy = 520 + Math.sin(spin) * rr * 0.32;
      let x = sx + (p.tx - sx) * e;
      let y = sy + (p.ty - sy) * e;
      x += noise2D(`px${i}`, f * 0.04, 0) * (1.5 + (1 - e) * 8);
      y += noise2D(`py${i}`, 0, f * 0.04) * (1.5 + (1 - e) * 8);
      const lift = embers * (0.3 + random(`le${i}`) * 0.7);
      y -= lift * lift * 260;
      x += lift * noise2D(`lx${i}`, f * 0.02, 1) * 80;
      return {x, y, e};
    };
    // Batch thousands of streaks into a few dozen draw calls: bucket by colour, alpha and width.
    const ALPHA_STEPS = 6;
    const lines = new Map<string, number[]>();
    const glows = new Map<string, number[]>();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const {x, y, e} = posAt(p, i, frame);
      const prev = posAt(p, i, frame - 1.6);
      const settle = Math.max(0, e - textIn * 0.75);
      const depth = 0.45 + 0.55 * random(`dp${i}`);
      const a = clamp(Math.min(1, frame / 10) * depth * (0.3 + 0.6 * (1 - e) + 0.6 * settle) * (1 - embers * 0.6));
      if (a < 0.02) continue;
      const r = p.size * (1 + (1 - e) * 0.5);
      const tone = random(`c${i}`) > 0.5 ? 1 : 0;
      const aq = Math.max(1, Math.round(a * ALPHA_STEPS));
      const wq = Math.max(1, Math.round(r * 1.6 * 2));
      const key = `${p.gold ? 'g' : 'w'}${tone}|${aq}|${wq}`;
      let arr = lines.get(key);
      if (!arr) lines.set(key, (arr = []));
      arr.push(prev.x, prev.y, x + 0.01, y);
      if (r > 2) {
        const gk = `${p.gold ? 'g' : 'w'}|${aq}`;
        let ga = glows.get(gk);
        if (!ga) glows.set(gk, (ga = []));
        ga.push(x, y, r * 5);
      }
    }
    g.lineCap = 'round';
    lines.forEach((arr, key) => {
      const [kind, aq, wq] = key.split('|');
      const a = Number(aq) / ALPHA_STEPS;
      const gold = kind[0] === 'g';
      const tone = kind[1] === '1';
      g.strokeStyle = gold ? `rgba(255,${tone ? 205 : 170},60,${a})` : `rgba(255,${tone ? 238 : 214},${tone ? 210 : 165},${a})`;
      g.lineWidth = Number(wq) / 2;
      g.beginPath();
      for (let k = 0; k < arr.length; k += 4) {
        g.moveTo(arr[k], arr[k + 1]);
        g.lineTo(arr[k + 2], arr[k + 3]);
      }
      g.stroke();
    });
    glows.forEach((arr, key) => {
      const [kind, aq] = key.split('|');
      const a = Number(aq) / ALPHA_STEPS;
      g.fillStyle = kind === 'g' ? `rgba(255,150,40,${a * 0.16})` : `rgba(255,200,140,${a * 0.12})`;
      g.beginPath();
      for (let k = 0; k < arr.length; k += 3) {
        g.moveTo(arr[k] + arr[k + 2], arr[k + 1]);
        g.arc(arr[k], arr[k + 1], arr[k + 2], 0, Math.PI * 2);
      }
      g.fill();
    });
    g.globalCompositeOperation = 'source-over';
    // the crisp title, with a light sweep travelling across it
    if (textIn > 0) {
      g.save();
      g.globalAlpha = Math.max(textIn, subIn);
      g.drawImage(titleGlow(), 0, 0);
      g.restore();
      g.save();
      g.textAlign = 'center';
      g.font = TITLE_FONT;
      g.globalAlpha = textIn;
      const grad = g.createLinearGradient(160, 0, 1760, 0);
      const s = sweep;
      grad.addColorStop(0, '#e9e4dc');
      grad.addColorStop(clamp(s - 0.12), '#e9e4dc');
      grad.addColorStop(clamp(s), '#fffaf0');
      grad.addColorStop(clamp(s + 0.001), '#ffffff');
      grad.addColorStop(clamp(s + 0.12), '#e9e4dc');
      grad.addColorStop(1, '#e9e4dc');
      g.fillStyle = grad;
      g.fillText(TITLE, 960, T_Y);
      g.restore();
    }
    if (subIn > 0) {
      g.save();
      g.textAlign = 'center';
      g.font = SUB_FONT;
      (g as CanvasRenderingContext2D & {letterSpacing: string}).letterSpacing = '7px';
      g.globalAlpha = subIn;
      const gg = g.createLinearGradient(0, S_Y - 60, 0, S_Y + 10);
      gg.addColorStop(0, '#ffe9b8');
      gg.addColorStop(0.55, '#ffbf5a');
      gg.addColorStop(1, '#ff8f2a');
      g.fillStyle = gg;
      g.fillText(SUB, 963, S_Y);
      g.restore();
    }
    if (rule > 0) {
      g.save();
      const w = 520 * rule;
      const lg = g.createLinearGradient(960 - w, 0, 960 + w, 0);
      lg.addColorStop(0, 'rgba(255,190,110,0)');
      lg.addColorStop(0.5, 'rgba(255,210,150,0.85)');
      lg.addColorStop(1, 'rgba(255,190,110,0)');
      g.fillStyle = lg;
      g.fillRect(960 - w, 548, w * 2, 1.5);
      g.font = '500 21px "JetBrains Mono"';
      (g as CanvasRenderingContext2D & {letterSpacing: string}).letterSpacing = '10px';
      g.textAlign = 'center';
      g.globalAlpha = rule * 0.72;
      g.fillStyle = '#c9cfdc';
      g.fillText("WHY YOU CAN'T STOP SCROLLING", 965, 708);
      g.restore();
    }
  }, [frame, pts, textIn, subIn, sweep, rule, embers]);

  return (
    <AbsoluteFill style={{background: C.void, overflow: 'hidden'}}>
      <Backdrop bg={`radial-gradient(ellipse 70% 60% at 50% 46%, #121019 0%, #07060c 55%, ${C.void} 100%)`} />
      <FeedFloor frame={frame} opacity={0.15} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 50% 32% at 50% 48%, rgba(255,150,60,0.12), rgba(255,150,60,0) 70%)'}} />
      <AbsoluteFill style={{transform: `scale(${push})`, willChange: 'transform'}}>
        <canvas ref={ref} width={1920} height={1080} style={{position: 'absolute', inset: 0}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** An endless floor of video cards sliding away from camera — the feed as landscape. */
const FLOOR: ClipId[] = ['cat', 'ocean', 'neon', 'fireworks', 'aurora', 'paint', 'galaxy', 'rain', 'ad'];
export const FeedFloor: React.FC<{frame: number; opacity?: number; speed?: number}> = ({frame, opacity = 0.32, speed = 2.2}) => {
  const cols = 19;
  const rows = 22;
  const cw = 84;
  const ch = 150;
  const gap = 18;
  const period = ch + gap;
  const scroll = (frame * speed) % period;
  const shift = Math.floor((frame * speed) / period);
  return (
    <AbsoluteFill style={{perspective: 700, perspectiveOrigin: '50% 40%', opacity, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: 960 - (cols * (cw + gap)) / 2,
          top: 760,
          width: cols * (cw + gap),
          height: rows * period,
          transform: 'rotateX(76deg)',
          transformOrigin: '50% 0%',
        }}
      >
        {/* the whole grid slides as one cached layer; colours step one row per period */}
        <div style={{position: 'absolute', inset: 0, transform: `translate3d(0, ${-scroll}px, 0)`, willChange: 'transform'}}>
          {new Array(rows).fill(0).map((_, r) =>
            new Array(cols).fill(0).map((__, c) => {
              const id = FLOOR[((r + shift) * 7 + c * 3) % FLOOR.length];
              const [cr, cg, cb] = CLIP_TINT[id];
              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    position: 'absolute',
                    left: c * (cw + gap),
                    top: r * period,
                    width: cw,
                    height: ch,
                    borderRadius: 10,
                    background: `linear-gradient(160deg, rgba(${cr},${cg},${cb},0.5), rgba(${cr * 0.3},${cg * 0.3},${cb * 0.3},0.35))`,
                  }}
                />
              );
            }),
          )}
        </div>
      </div>
      {/* fog: the floor dissolves toward the horizon and the near edge */}
      <AbsoluteFill style={{background: 'linear-gradient(to bottom, #07060c 0%, #07060c 66%, rgba(7,6,12,0.6) 72%, rgba(7,6,12,0) 80%, rgba(7,6,12,0.2) 86%, rgba(7,6,12,0.95) 100%)', willChange: 'transform'}} />
    </AbsoluteFill>
  );
};
