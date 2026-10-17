// 钩子（0–6 s）：黑白的琴键特写。一个键被按下，五条谱线金的线从键上往上长出来（竖写的五线谱），
// 开场字幕的字像音符一样，按动机的节奏一个个落在谱线上。
import { clamp, lerp, hash } from '../lib.js';
import { camera, SNAP, GLIDE, kf, resampleN, lerpPts } from '../util.js';
import { BOOK, ruleXs } from './desk.js';
import { keyboard, staff, vStaff, GOLD } from '../geo.js';
import { notes } from '../text.js';
import { TONES } from '../comp.js';
import { T, CAPS, CUE, lastNote } from '../story.js';

export const KEY = { n: 9, keyW: 150, len: 920, y0: 1236 };
KEY.x0 = 540 - 4.5 * KEY.keyW;                 // 第 5 个白键（序号 4）正好在画面中线
export const STAFF_TOP = 210, STAFF_BOT = 1166, STAFF_GAP = 30;
// 动机按到的键（序号）：一个起伏的小乐句，只用来让画面有"有人在弹"的感觉
const KEYSEQ = [4, 5, 7, 5, 4, 5, 7, 8, 7, 5, 4, 2, 4, 5, 7, 5];

// 键的按下程度：按下 0.07 s 到底，0.32 s 后慢慢回弹
function pressOf(t, k) {
  const out = new Array(KEY.n).fill(0);
  CUE.motif.forEach((tn, i) => {
    if (tn > t + 1e-6) return;
    const ki = KEYSEQ[i % KEYSEQ.length], d = t - tn;
    const p = d < .07 ? SNAP(d / .07) : 1 - SNAP(clamp((d - .32) / .25));
    out[ki] = Math.max(out[ki], p * k);
  });
  return out;
}

export function draw(L, t, opts = {}) {
  const k0 = opts.keysOnly ?? false;
  // 镜头：极慢推进
  const z = lerp(1.0, 1.035, GLIDE(clamp(t / 6)));
  const cam = camera(540, 1000, z, 0, 540, 1000);
  cam.apply(L);
  const c = L.cc;
  // 顶光：琴键上方一团很淡的冷光
  c.save();
  const g = c.createRadialGradient(540, 1180, 40, 540, 1180, 820);
  g.addColorStop(0, 'rgba(190,188,182,.16)'); g.addColorStop(1, 'rgba(190,188,182,0)');
  c.fillStyle = g; c.fillRect(-200, 300, 1480, 1800); c.restore();
  keyboard(L, { ...KEY, press: pressOf(t, 1), startNote: 0 });
  if (k0) return { tone: TONES.mono, paperX: cam.paper(), bleed: 0, vig: .5 };

  // 五线谱：第一帧就有一道很淡的"影子"，第一个音之后从键上往上长
  const t0 = CUE.motif[0] ?? .05;
  let lines = vStaff(540, STAFF_BOT, STAFF_TOP, STAFF_GAP);
  // 转场前：五条线拉开、缩短、微微转动，落到下一幕剧本封面竖格线的位置上
  const morph = GLIDE(clamp((t - (T.inv - 1.25)) / 1.05));
  if (morph > 0) {
    const bp = (x, y) => { const c = Math.cos(BOOK.rot), s = Math.sin(BOOK.rot); return [BOOK.cx + c * x - s * y, BOOK.cy + s * x + c * y]; };
    const xs = ruleXs(1);
    lines = lines.map((P, i) => lerpPts(P, resampleN([cam.toWorld(...bp(xs[i], 330)), cam.toWorld(...bp(xs[i], -330))], P.length), morph));
  }
  staff(c, lines, { prog: 1, a: .1, w: 2.2 / z });
  const prog = [-2, -1, 0, 1, 2].map(i => clamp((t - t0 - Math.abs(i) * .05) / .75));
  staff(c, lines, { prog, a: .9, w: 2.6 / z });
  // 每个动机音：谱线上一个小小的金色符头亮一下（在字还没落下之前）
  const [ni, nd] = lastNote(CUE.motif, t);
  if (ni >= 0 && t < CAPS.c1.t[0]) {
    const yy = lerp(STAFF_BOT - 60, STAFF_BOT - 300, (ni % 4) / 3), xx = 540 + ((ni % 3) - 1) * STAFF_GAP;
    c.save(); c.globalAlpha = clamp(1 - nd / .5) * .9; c.fillStyle = `rgb(${GOLD.join(',')})`;
    c.beginPath(); c.ellipse(xx, yy, 15, 11, -.35, 0, 7); c.fill(); c.restore();
  }

  // 字幕①：每个字落在一个动机音上；字的左右偏移跟着乐句起伏（像音高）
  const cap = CAPS.c1, chars = [...cap.text];
  const times = [], pos = [];
  // 两个字一个动机音（十六分音符的密度），整句在 2 秒内落完，留足阅读时间
  const mt = CUE.motif.filter(x => x >= cap.t[0] - .05);
  const contour = [0, .5, 1, .5, 0, -.5, 0, .5, 1, .5, 0, -.5, 0];
  chars.forEach((ch, i) => {
    const a = mt[i >> 1], b = mt[(i >> 1) + 1];
    times.push(a != null && b != null ? (i & 1 ? (a + b) / 2 : a) : cap.t[0] + i * .16);
    pos.push(cam.toScreen(540 + contour[i % contour.length] * STAFF_GAP, 262 + i * 70));
  });
  notes(L, { id: 'c1', t, text: cap.text, pos, times, t1: cap.t[1], size: 62, tone: 'light', color: [240, 235, 224] });
  return { tone: TONES.mono, paperX: cam.paper(), bleed: 0, vig: .55 };
}
