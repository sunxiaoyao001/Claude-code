// 第五幕：电影的最后（1946，夜靛）。一条竖着的胶片从下面滑进来：我们进了电影里。
// 五线谱的五条线转成竖的，变成牢房的铁栏杆。光头的男人坐在床沿，高窗里的月光和雪落进来。
// 镜头穿过栏杆推近；切到大特写：他笑着，眼里有泪光。最强的和弦上，「Merry Christmas, Mr. Lawrence.」
import { clamp, lerp, hash, vnoise } from '../lib.js';
import { camera, SNAP, GLIDE, kf, smooth, resampleN, lerpPts } from '../util.js';
import { mk, draw as paint, mass } from '../ink.js';
import { pline, staff, GOLD, filmFrame } from '../geo.js';
import { line, FONT } from '../text.js';
import { haraFace, memo, stroke, blob, knock } from '../figures.js';
import { seal } from '../seal.js';
import { TONES } from '../comp.js';
import { T, CAPS, CUE } from '../story.js';

export const CUT = T.cell + 3.4;                  // 切到大特写
const BARS_X = [150, 345, 540, 735, 930];          // 栏杆（世界坐标，前景）
const WIN = { x: 760, y: 300, w: 200, h: 170 };    // 高窗
const SIT = { x: 520, y: 900, s: .42 };            // 中景里他的脸

// 胶片条（屏幕坐标）：k 滑入进度，stretch 齿孔拉长成黑键
export function film(c, k, stretch = 0, off = 0) {
  if (k <= 0) return;
  const y = lerp(1920, 0, SNAP(k));
  filmFrame(c, 70, y + 150, 940, 1620, { side: 70, off, a: .96, stretch, rgb: [12, 14, 20], holeRgb: [150, 160, 176] });
}
// 雪：屏幕空间里飘的雪片（n 片，种子 seed），在 [x0,x1] 里
function snow(c, t, n, seed, a = .9, big = 1) {
  for (let i = 0; i < n; i++) {
    const h1 = hash(seed + i * 1.37), h2 = hash(seed + i * 2.11), h3 = hash(seed + i * 3.7);
    const sp = 40 + h3 * 70, y = ((h2 * 2200 + t * sp) % 2200) - 140, x = h1 * 1180 - 50 + Math.sin(t * .8 + i) * 18;
    c.save(); c.globalAlpha = a * (.5 + .5 * h3); c.fillStyle = 'rgb(236,240,246)';
    c.beginPath(); c.arc(x, y, (1.4 + h3 * 2.6) * big, 0, 7); c.fill(); c.restore();
  }
}

function wide(L, t) {
  const c = kf(t, [[T.cell - .6, [540, 1000, 1.0]], [T.cell + .8, [540, 990, 1.02]], [CUT, [530, 930, 1.9]]], GLIDE);
  const cam = camera(c[0], c[1], c[2], 0, 540, 1000); cam.apply(L);
  const z = cam.z, { cw, cd, cc } = L;
  // 石墙：深色底 + 几道砖缝（干笔）
  const S = memo('cellWide', () => {
    const bricks = [];
    for (let r = 0; r < 18; r++) for (let q = 0; q < 6; q++) {
      const y = 120 + r * 70, x = -60 + q * 220 + (r % 2) * 110;
      bricks.push(stroke([[x, y], [x + 200, y + (hash(r * 9 + q) - .5) * 6]], { w: 3, tone: .6, dry: .7, prof: 'even', seed: 600 + r * 6 + q, nb: 5 }));
    }
    return { bricks };
  });
  cw.save(); cw.fillStyle = 'rgba(0,0,0,.3)'; cw.fillRect(-400, -400, 1900, 2800); cw.restore();
  S.bricks.forEach(b => paint(L.ink, b, 1, .5));
  // 高窗：冷光的小方窗 + 三根窗栏 + 斜照下来的月光柱
  cc.save(); cc.fillStyle = 'rgba(150,170,205,.6)'; cc.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  cc.fillStyle = 'rgba(14,18,28,.95)'; for (let i = 1; i < 4; i++) cc.fillRect(WIN.x + i * WIN.w / 4 - 5, WIN.y, 10, WIN.h);
  const beam = cc.createLinearGradient(WIN.x + WIN.w / 2, WIN.y, 460, 1300);
  beam.addColorStop(0, 'rgba(170,190,225,.3)'); beam.addColorStop(1, 'rgba(170,190,225,0)');
  cc.fillStyle = beam; cc.beginPath(); cc.moveTo(WIN.x, WIN.y + WIN.h); cc.lineTo(WIN.x + WIN.w, WIN.y + WIN.h); cc.lineTo(760, 1500); cc.lineTo(240, 1500); cc.closePath(); cc.fill();
  cc.restore();
  // 床沿（木板）
  mass(cw, [[100, 1250], [980, 1250], [980, 1300], [100, 1300]], .6, 2, 610);
  cc.save(); cc.fillStyle = 'rgba(160,176,206,.18)'; cc.fillRect(100, 1246, 880, 5); cc.restore();
  // 他：坐在床沿，脸朝着我们（中景）
  haraFace(L, SIT.x, SIT.y, SIT.s, { smile: .6, light: .8 });
  // 膝盖和搭在膝上的手（淡墨）
  blob(cw, [[340, 1180], [700, 1180], [720, 1260], [320, 1260]], .26, 3, 611, 3);
  // 光里的雪
  const sc = L.cc; sc.save(); sc.setTransform(...cam.m);
  for (let i = 0; i < 26; i++) {
    const h1 = hash(i * 1.7), h2 = hash(i * 2.9), sp = 40 + h2 * 40;
    const u = ((h2 * 1000 + (t - T.cell) * sp) % 1000) / 1000;
    const x = lerp(WIN.x + h1 * WIN.w, lerp(280, 740, h1), u) + Math.sin(t + i) * 10, y = lerp(WIN.y + WIN.h, 1400, u);
    sc.globalAlpha = .8 * Math.sin(u * Math.PI); sc.fillStyle = 'rgb(232,238,246)'; sc.beginPath(); sc.arc(x, y, 2 + h1 * 2, 0, 7); sc.fill();
  }
  sc.restore();
  // 前景的铁栏杆：五线谱的五条线从横转竖，然后沉成铁（暗色 + 一道冷的高光）
  const rot = GLIDE(clamp((t - (T.cell - .4)) / 1.1));
  const iron = clamp((t - T.cell - .6) / .8);
  BARS_X.forEach((bx, i) => {
    // 横着的谱线（屏幕中部）→ 竖着的栏杆
    const ang = lerp(Math.PI / 2, 0, rot), cy = 1000, cx = lerp(540, bx, rot), yOff = lerp((i - 2) * 34, 0, rot);
    const L0 = lerp(700, 2400, rot);
    const a = [cx - Math.sin(ang) * L0 / 2, cy + yOff - Math.cos(ang) * L0 / 2], b = [cx + Math.sin(ang) * L0 / 2, cy + yOff + Math.cos(ang) * L0 / 2];
    const P = [cam.toWorld(...a), cam.toWorld(...b)];
    // 栏杆在镜头前，推镜时比墙走得快（视差）
    const par = 1 + (z - 1) * .8;
    const Q = P.map(p => [540 + (p[0] - 540) * par, p[1]]);
    pline(cc, Q, lerp(2.6, 26, iron) / z, GOLD.map((v, j) => lerp(v, [16, 18, 26][j], iron)), .96);
    if (iron > 0) pline(cc, Q.map(p => [p[0] + 7 / z, p[1]]), 3 / z, [150, 166, 196], .45 * iron);
  });
  return cam;
}

function close(L, t) {
  const z = kf(t, [[CUT, 1.0], [T.years, 1.1]], u => u);
  const cam = camera(540, 880, z, 0, 540, 880); cam.apply(L);
  const { cw, cc } = L;
  cw.save(); cw.fillStyle = 'rgba(0,0,0,.34)'; cw.fillRect(-400, -400, 1900, 2800); cw.restore();
  // 背后的墙上，月光斜着打过来的一块亮
  cc.save(); const g = cc.createRadialGradient(820, 420, 40, 760, 600, 760); g.addColorStop(0, 'rgba(150,170,210,.22)'); g.addColorStop(1, 'rgba(150,170,210,0)'); cc.fillStyle = g; cc.fillRect(-200, -200, 1500, 2400); cc.restore();
  const smile = SNAP(clamp((t - CUT - .6) / 1.6));
  const tear = SNAP(clamp((t - (T.climax - 1.6)) / 2.0));
  // 很轻的呼吸和点头
  const nod = Math.sin((t - CUT) * .9) * .012, bob = Math.sin((t - CUT) * 1.3) * 4;
  haraFace(L, 540, 860 + bob, 2.25, { smile: lerp(.5, 1, smile), tear, light: 1, rot: nod });
  return cam;
}

export function draw(L, t, o = {}) {
  const cam = t < CUT ? wide(L, t) : close(L, t);
  const { cc } = L;
  // 画面前面飘的雪（屏幕空间），高潮时更密
  cc.save(); cc.setTransform(1, 0, 0, 1, 0, 0);
  const dens = t < CUT ? 0 : lerp(14, 40, clamp((t - T.climax + .5) / 1.5));
  snow(cc, t, dens | 0, 900, .85, 1.3);
  cc.restore();
  // 胶片条：进来，最后齿孔拉长成黑键（过渡到下一幕）
  cc.save(); cc.setTransform(1, 0, 0, 1, 0, 0);
  film(cc, clamp((t - (T.cell - .5)) / .9), SNAP(clamp((t - (T.years - .6)) / .6)), (t - T.cell) * 24 * 3 % 76);
  cc.restore();
  // 年份印
  const sk = SNAP(clamp((t - T.cell - .5) / .15)), sOut = 1 - GLIDE(clamp((t - CUT + .4) / .4));
  if (sk > 0 && sOut > 0) seal(cc, { lines: ['19', '46'], font: 'serif', seed: 13 }, 120, 380, 96, sk, 0, sOut);
  line(L, { id: 'c9', t, t0: CAPS.c9.t[0], t1: CAPS.c9.t[1], text: CAPS.c9.text, x: 540, y: 270, size: 44, align: 'center', tone: 'light', color: [232, 228, 218] });
  // 英文大字：逐词从遮罩里升起，每个词对齐一个重和弦
  const cap = CAPS.c10, words = ['Merry', 'Christmas,', 'Mr.', 'Lawrence.'];
  const wt = CUE.chords.length >= 4 ? CUE.chords.slice(0, 4) : [0, .5, 1.1, 1.6].map(d => cap.t[0] + d);
  const lines2 = [[0, 1], [2, 3]];
  lines2.forEach((ix, r) => {
    const txt = ix.map(i => words[i]).join(' ');
    line(L, { id: 'c10_' + r, t, t0: wt[ix[0]], t1: cap.t[1], text: txt, x: 540, y: 1420 + r * 112, size: 96, font: FONT.en(), align: 'center', tone: 'light', color: [240, 236, 226], ls: 1, stagger: .045, din: .6 });
  });
  return { tone: TONES.night, paperX: cam.paper(), bleed: 4, rim: .6, vig: .42 };
}
