import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Look';
import {C, F, ease} from '../theme';
import {Phone} from '../components/phone/Phone';
import {Feed} from '../components/phone/FeedUI';
import {Thumb, feedPositionAt, tapOverlay, thumbPoseAt} from '../components/phone/Thumb';
import {CLIP_TINT, type ClipId} from '../components/phone/contents';
import {galaxyCards, headPoints} from '../components/pointcloud';
import {Bokeh, Dust} from '../components/Atmosphere';
import {clamp, lerp, prog} from '../lib/math';

const SWIPES = [20, 58, 100, 132].map((at) => ({at}));
const TAPS = [78, 84];
const ITEMS: ClipId[] = ['neon', 'cat', 'paint', 'ocean', 'aurora'];

const CHIPS: {at: number; text: string; hot?: boolean}[] = [
  {at: 10, text: '停留 4.2s'},
  {at: 24, text: '划走 0.6s'},
  {at: 36, text: '完播 ✓', hot: true},
  {at: 48, text: '重播 ×2', hot: true},
  {at: 62, text: '划走 0.4s'},
  {at: 80, text: '点赞 ♥', hot: true},
  {at: 92, text: '评论 +1'},
  {at: 104, text: '停留 9.8s', hot: true},
  {at: 114, text: '分享'},
  {at: 124, text: '凌晨 02:47'},
  {at: 136, text: '暂停 1.1s'},
  {at: 146, text: '关注 +1', hot: true},
];
const FLY = 44;

const TAGS = [
  {t: '#猫咪', v: 0.92, dx: -420, dy: -230},
  {t: '#深夜美食', v: 0.78, dx: 250, dy: -250},
  {t: '#解压', v: 0.71, dx: 310, dy: -40},
  {t: '#旅行', v: 0.64, dx: 260, dy: 170},
  {t: '#宇宙', v: 0.55, dx: -440, dy: 150},
];

const SELECTED = [37, 211, 402, 655, 870, 1102, 1390, 1655];

// closed Catmull-Rom loop through the three actors: you (phone) → model (head) → library (galaxy)
const LOOP_PTS: [number, number][] = [
  [430, 600], [700, 340], [1080, 250], [1420, 330], [1560, 560], [1330, 780], [960, 840], [600, 790],
];
const sampleLoop = (n: number) => {
  const pts: [number, number][] = [];
  const m = LOOP_PTS.length;
  for (let i = 0; i < n; i++) {
    const u = (i / n) * m;
    const k = Math.floor(u);
    const t = u - k;
    const p0 = LOOP_PTS[(k - 1 + m) % m];
    const p1 = LOOP_PTS[k % m];
    const p2 = LOOP_PTS[(k + 1) % m];
    const p3 = LOOP_PTS[(k + 2) % m];
    const cr = (a: number, b: number, c: number, d: number) =>
      0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    pts.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
  }
  return pts;
};
const LOOP = sampleLoop(720);
const TINTS = Object.values(CLIP_TINT);

export const AlgorithmScene: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const head = useMemo(() => headPoints(4200), []);
  const galaxy = useMemo(() => galaxyCards(2200), []);

  // ----- choreography -----
  const toC = prog(frame, 268, 60, ease.inOut); // head & phone make room for the galaxy
  const toD = prog(frame, 418, 60, ease.inOut); // everything joins the loop
  const vortex = prog(frame, 560, 100, ease.in);
  const arrived = CHIPS.filter((c) => frame >= c.at + FLY).length;
  const fill = clamp(interpolate(frame, [CHIPS[0].at + FLY - 10, CHIPS[CHIPS.length - 1].at + FLY + 10], [0.04, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const headX = lerp(lerp(1360, 1490, toC), 1460, toD);
  const headY = lerp(lerp(500, 300, toC), 360, toD);
  const headR = lerp(lerp(300, 170, toC), 150, toD);
  const phoneX = lerp(lerp(470, 330, toC), 430, toD);
  const phoneY = lerp(540, 620, toC);
  const phoneS = lerp(lerp(0.8, 0.6, toC), 0.56, toD);
  const galaxyIn = prog(frame, 278, 50, ease.out);
  const galaxyCx = lerp(960, 1140, toD);
  const galaxyCy = lerp(600, 760, toD);
  const galaxyScale = lerp(560, 330, toD);
  const loopSpeed = interpolate(frame, [430, 660], [0.004, 0.045], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.in});


  const pos = feedPositionAt(frame, SWIPES);
  const th = tapOverlay(frame, thumbPoseAt(frame, SWIPES), TAPS, 200, 420);
  const liked = prog(frame, TAPS[0], 10);

  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext('2d')!;
    g.clearRect(0, 0, 1920, 1080);
    g.globalCompositeOperation = 'lighter';

    // --- galaxy of videos ---
    if (galaxyIn > 0) {
      const yaw = frame * 0.004;
      const pitch = 1.05;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const pulse = prog(frame, 318, 26, ease.out);
      for (let i = 0; i < galaxy.length; i++) {
        const c = galaxy[i];
        const x1 = c.x * cy - c.z * sy;
        const z1 = c.x * sy + c.z * cy;
        const y2 = c.y * cp - z1 * sp;
        const z2 = c.y * sp + z1 * cp;
        const f = 3.2 / (3.2 - z2);
        const sx = galaxyCx + x1 * galaxyScale * f;
        const syy = galaxyCy - y2 * galaxyScale * f;
        const sel = SELECTED.indexOf(i);
        const [r, gg, b] = TINTS[c.tint];
        const w = 7 * c.s * f;
        const h = 12 * c.s * f;
        if (sel >= 0) {
          // chosen ones: flare gold, then fly into the phone
          const fly = prog(frame, 350 + sel * 6, 40, ease.inOut);
          if (fly >= 1 && frame < 420) continue;
          const tx = phoneX;
          const ty = phoneY - 40;
          const fx = lerp(sx, tx, fly);
          const fy = lerp(syy, ty, fly) - Math.sin(fly * Math.PI) * 120;
          const big = 1 + pulse * 1.8 * (1 - fly * 0.7);
          g.fillStyle = `rgba(255,190,90,${0.25 * galaxyIn * pulse})`;
          g.beginPath();
          g.arc(fx, fy, 26 * big, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = `rgba(${r},${gg},${b},${galaxyIn})`;
          g.fillRect(fx - (w * big) / 2, fy - (h * big) / 2, w * big, h * big);
          g.strokeStyle = `rgba(255,214,140,${galaxyIn * (0.4 + pulse * 0.6)})`;
          g.lineWidth = 2;
          g.strokeRect(fx - (w * big) / 2 - 2, fy - (h * big) / 2 - 2, w * big + 4, h * big + 4);
          continue;
        }
        const a = galaxyIn * (0.18 + 0.4 * clamp((z2 + 1) / 2)) * (1 - vortex * 0.6);
        g.fillStyle = `rgba(${r},${gg},${b},${a})`;
        g.fillRect(sx - w / 2, syy - h / 2, w, h);
      }
      // galactic core glow
      const grd = g.createRadialGradient(galaxyCx, galaxyCy, 0, galaxyCx, galaxyCy, galaxyScale * 0.5);
      grd.addColorStop(0, `rgba(170,150,255,${0.25 * galaxyIn})`);
      grd.addColorStop(1, 'rgba(170,150,255,0)');
      g.fillStyle = grd;
      g.fillRect(galaxyCx - galaxyScale, galaxyCy - galaxyScale, galaxyScale * 2, galaxyScale * 2);
    }

    // --- the twin: a point-cloud head ---
    {
      const yaw = -1.15 + Math.sin(frame * 0.012) * 0.28;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const scanY = 1.2 - ((frame * 0.018) % 2.6);
      for (let i = 0; i < head.length; i++) {
        const p = head[i];
        if (p.w > fill * 1.08) continue;
        const x1 = p.x * cy + p.z * sy;
        const z1 = -p.x * sy + p.z * cy;
        const f = 3 / (3 - z1);
        const sx = headX + x1 * headR * f;
        const syy = headY - (p.y + 0.2) * headR * f;
        const depth = clamp((z1 + 1) / 2);
        const scan = Math.exp(-(((p.y - scanY) / 0.06) ** 2));
        const fresh = clamp((fill * 1.08 - p.w) * 12);
        const gold = p.w > 0.9;
        const a = (0.18 + 0.62 * depth + scan * 0.5) * fresh;
        g.fillStyle = gold ? `rgba(255,190,90,${a})` : `rgba(${110 + scan * 140},${210 + scan * 40},255,${a})`;
        const s = (1.1 + depth * 1.3) * (headR / 300) * 1.4;
        g.fillRect(sx - s / 2, syy - s / 2, s, s);
      }
      const halo = g.createRadialGradient(headX, headY, 0, headX, headY, headR * 1.4);
      halo.addColorStop(0, `rgba(80,170,255,${0.1 * fill})`);
      halo.addColorStop(1, 'rgba(80,170,255,0)');
      g.fillStyle = halo;
      g.fillRect(headX - headR * 1.5, headY - headR * 1.5, headR * 3, headR * 3);
    }

    // --- the loop ---
    if (toD > 0) {
      const n = 300;
      const spin = frame * loopSpeed;
      const shrink = 1 - vortex * 0.8;
      const rot = vortex * vortex * 4;
      const at = (u: number) => {
        const q = LOOP[Math.floor((((u % 1) + 1) % 1) * LOOP.length)];
        const dx = (q[0] - 960) * shrink;
        const dy = (q[1] - 560) * shrink;
        return [960 + dx * Math.cos(rot) - dy * Math.sin(rot), 560 + dx * Math.sin(rot) + dy * Math.cos(rot)];
      };
      g.strokeStyle = `rgba(255,200,120,${0.12 * toD})`;
      g.lineWidth = 2;
      g.beginPath();
      for (let i = 0; i <= 120; i++) {
        const [x, y] = at(i / 120);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      for (let i = 0; i < n; i++) {
        const u = i / n + spin;
        const [x, y] = at(u);
        const [px, py] = at(u - loopSpeed * 3 - 0.004);
        const al = toD * (0.35 + 0.65 * random(`lp${i}`));
        g.strokeStyle = `rgba(255,${170 + Math.floor(random(`lc${i}`) * 60)},80,${al})`;
        g.lineWidth = 1.5 + random(`lw${i}`) * 2.5;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(x, y);
        g.stroke();
      }
    }
    g.globalCompositeOperation = 'source-over';
  }, [frame, head, galaxy, fill, headX, headY, headR, galaxyIn, galaxyCx, galaxyCy, galaxyScale, toD, loopSpeed, vortex, phoneX, phoneY]);

  // node labels sit on their actors
  const nodes = [
    {label: '你刷', x: 430, y: 330},
    {label: '它学', x: 1640, y: 250},
    {label: '它推', x: 1410, y: 900},
  ];

  return (
    <AbsoluteFill style={{background: C.void, overflow: 'hidden'}}>
      <Backdrop bg={`radial-gradient(ellipse 80% 75% at 55% 45%, #0b1226 0%, #05070f 55%, ${C.void} 100%)`} />
      <Bokeh seed="algbk" count={18} colors={[[80, 170, 255], [140, 110, 255]]} opacity={0.22} />
      <AbsoluteFill style={{transform: `scale(${1 + vortex * 0.25}) rotate(${vortex * 25}deg)`, filter: vortex > 0.6 ? `blur(${(vortex - 0.6) * 12}px)` : undefined, willChange: 'transform'}}>
        <canvas ref={ref} width={1920} height={1080} style={{position: 'absolute', inset: 0}} />
        {/* phone */}
        <div
          style={{
            position: 'absolute',
            left: phoneX - 210,
            top: phoneY - 437,
            transform: `scale(${phoneS * (1 - vortex * 0.5)}) perspective(1800px) rotateY(10deg)`,
            opacity: 1 - vortex * 0.8,
          }}
        >
          <Phone tint={[120, 180, 255]} glow={0.9} overlay={frame < 170 ? <Thumb x={th.x} y={th.y} lift={th.lift} press={th.press} uid="algthumb" /> : null}>
            <Feed items={ITEMS} position={pos} t={frame} liked={{2: liked}} uid="algfeed" />
          </Phone>
        </div>
        {/* behavioural data streaming into the model */}
        {CHIPS.map((c, i) => {
          const t = (frame - c.at) / FLY;
          if (t < 0 || t > 1.15) return null;
          const e = ease.inOut(clamp(t));
          const x0 = 470 + (random(`cx${i}`) - 0.3) * 160;
          const y0 = 380 + random(`cy${i}`) * 300;
          const x1 = 1360 + (random(`tx${i}`) - 0.5) * 160;
          const y1 = 500 + (random(`ty${i}`) - 0.5) * 300;
          const mx = (x0 + x1) / 2;
          const my = Math.min(y0, y1) - 160 - random(`my${i}`) * 140;
          const x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * mx + e * e * x1;
          const y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * my + e * e * y1;
          const pop = clamp(t * 6);
          const fade = t > 0.85 ? clamp(1 - (t - 0.85) / 0.3) : 1;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: `translate(-50%, -50%) scale(${(0.6 + pop * 0.4) * (1 - e * 0.35)})`,
                opacity: pop * fade,
                padding: '10px 18px',
                borderRadius: 999,
                fontFamily: F.mono,
                fontSize: 27,
                fontWeight: 600,
                color: c.hot ? '#ffe2b0' : '#cfe8ff',
                background: c.hot ? 'rgba(255,150,40,0.16)' : 'rgba(90,160,255,0.14)',
                border: `1px solid ${c.hot ? 'rgba(255,190,110,0.6)' : 'rgba(140,200,255,0.45)'}`,
                boxShadow: c.hot ? '0 0 24px rgba(255,150,40,0.35)' : '0 0 20px rgba(80,160,255,0.25)',
                whiteSpace: 'nowrap',
              }}
            >
              {c.text}
            </div>
          );
        })}
        {/* interest profile */}
        {TAGS.map((tg, i) => {
          const a = prog(frame, 168 + i * 9, 18, ease.out) * (1 - toC);
          if (a <= 0.01) return null;
          const bar = prog(frame, 176 + i * 9, 30, ease.out);
          return (
            <div key={tg.t} style={{position: 'absolute', left: headX + tg.dx, top: headY + tg.dy, opacity: a, transform: `translateY(${(1 - a) * 12}px)`}}>
              <div style={{fontFamily: F.sans, fontWeight: 500, fontSize: 28, color: C.ink, letterSpacing: '0.04em'}}>
                {tg.t} <span style={{fontFamily: F.mono, fontSize: 22, color: C.gold, marginLeft: 6}}>{Math.round(tg.v * 100 * bar)}%</span>
              </div>
              <div style={{width: 200, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', marginTop: 8}}>
                <div style={{width: `${tg.v * 100 * bar}%`, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #ff9a2e, #ffd27a)', boxShadow: '0 0 10px rgba(255,170,60,0.6)'}} />
              </div>
            </div>
          );
        })}
        {/* the arrived count: the model's appetite */}
        <div style={{position: 'absolute', left: headX - 130, top: headY + headR * 1.25, width: 260, textAlign: 'center', opacity: (1 - toC) * prog(frame, 40, 20), fontFamily: F.mono, fontSize: 20, color: 'rgba(160,210,255,0.7)', letterSpacing: '0.18em'}}>
          用户画像 · {String(arrived * 137 + Math.floor(frame * 3.1)).padStart(5, '0')} 条
        </div>
        {/* scanning beam from the model into the library */}
        {galaxyIn > 0 && toD < 1 ? (
          <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: prog(frame, 296, 30) * (1 - toD)}}>
            <defs>
              <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#8fd0ff" stopOpacity="0.35" />
                <stop offset="1" stopColor="#8fd0ff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`${headX - 30},${headY + 40} ${headX + 30},${headY + 40} ${galaxyCx + 380},${galaxyCy + 60} ${galaxyCx - 280},${galaxyCy + 120}`} fill="url(#beam)" />
          </svg>
        ) : null}
        <div style={{position: 'absolute', left: galaxyCx - 300, top: galaxyCy + galaxyScale * 0.42, width: 600, textAlign: 'center', opacity: galaxyIn * (1 - toD), fontFamily: F.mono, fontSize: 22, color: 'rgba(200,190,255,0.7)', letterSpacing: '0.2em'}}>
          视频库 · 数以亿计
        </div>
        {/* loop node labels */}
        {toD > 0
          ? nodes.map((n, i) => {
              const a = prog(frame, 430 + i * 14, 18, ease.out);
              return (
                <div
                  key={n.label}
                  style={{
                    position: 'absolute',
                    left: n.x,
                    top: n.y,
                    transform: `translate(-50%, -50%) scale(${0.8 + a * 0.2})`,
                    opacity: a * (1 - vortex),
                    padding: '12px 26px',
                    borderRadius: 999,
                    background: 'rgba(10,12,24,0.75)',
                    border: '1.5px solid rgba(255,190,110,0.7)',
                    boxShadow: '0 0 30px rgba(255,150,40,0.35)',
                    fontFamily: F.sans,
                    fontWeight: 700,
                    fontSize: 34,
                    color: C.goldHi,
                    letterSpacing: '0.12em',
                  }}
                >
                  {n.label}
                </div>
              );
            })
          : null}
      </AbsoluteFill>
      {vortex > 0.01 ? <AbsoluteFill style={{background: `radial-gradient(circle at 50% 48%, rgba(255,190,110,${vortex * 0.5}) 0%, rgba(0,0,0,0) ${20 + vortex * 30}%)`}} /> : null}
      <Dust seed="algdust" count={50} opacity={0.35} />
    </AbsoluteFill>
  );
};
