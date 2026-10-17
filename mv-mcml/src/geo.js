// 几何元素：五线谱（全片的主线）、琴键、胶片画框。全部是精确的几何，画进 col 层。
import { clamp, lerp, hash, vnoise } from './lib.js';
import { css } from './util.js';

export const GOLD = [203, 178, 122];
export const IVORY = [233, 227, 214];

// 画一条折线（col 层），w 为屏幕像素宽度时请自己除以镜头缩放
export function pline(c, P, w, rgb, a = 1, cap = 'round') {
  if (a <= .003 || P.length < 2) return;
  c.save(); c.globalAlpha = clamp(a); c.strokeStyle = css(rgb); c.lineWidth = w; c.lineCap = cap; c.lineJoin = 'round';
  c.beginPath(); P.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.restore();
}

// 五线谱：给每条线一个点列（同样点数），prog = 每条线已画出的比例（数组或数），从 from 端开始生长
export function staff(c, lines, o = {}) {
  const w = o.w ?? 2.6, rgb = o.rgb ?? GOLD, a = o.a ?? .92;
  lines.forEach((P, i) => {
    const p = Array.isArray(o.prog) ? o.prog[i] : (o.prog ?? 1);
    if (p <= 0) return;
    const n = Math.max(2, Math.round(1 + (P.length - 1) * clamp(p)));
    let Q = P.slice(0, n);
    if (p < 1) { // 末端插值，生长连续
      const m = (P.length - 1) * p, k = Math.floor(m), f = m - k;
      Q = P.slice(0, k + 1); if (k < P.length - 1) Q.push([lerp(P[k][0], P[k + 1][0], f), lerp(P[k][1], P[k + 1][1], f)]);
    }
    pline(c, Q, w, rgb, a * (o.alphas ? o.alphas[i] : 1));
  });
}
// 竖直五线谱（从下往上长）
export const vStaff = (cx, yBottom, yTop, gap = 30, n = 24) =>
  [-2, -1, 0, 1, 2].map(k => [...Array(n)].map((_, j) => [cx + k * gap, lerp(yBottom, yTop, j / (n - 1))]));
// 水平五线谱（从左往右）
export const hStaff = (x0, x1, cy, gap = 30, n = 24) =>
  [-2, -1, 0, 1, 2].map(k => [...Array(n)].map((_, j) => [lerp(x0, x1, j / (n - 1)), cy + k * gap]));

// 俯视琴键。x0 = 第一个白键左边，y0 = 琴键后沿，keyW 白键宽，len 白键长。press[i] = 第 i 个白键按下的程度
// tone: 'mono'（黑白）。返回每个白键的中心 x
export function keyboard(L, o) {
  const c = L.cc, n = o.n ?? 9, kw = o.keyW ?? 150, gap = o.gap ?? 5, len = o.len ?? 900, x0 = o.x0 ?? 0, y0 = o.y0 ?? 1200;
  const bw = kw * .58, blen = len * .6, press = o.press || [], light = o.light ?? 1, startNote = o.startNote ?? 0;
  const centers = [];
  // 白键
  for (let i = 0; i < n; i++) {
    const x = x0 + i * kw, p = clamp(press[i] || 0);
    const sh = 1 - .16 * p;                                      // 按下的键暗一点
    const ivory = IVORY.map(v => v * sh * (.97 + .03 * hash(i * 7.3 + 1)));
    const g = c.createLinearGradient(0, y0, 0, y0 + len);
    g.addColorStop(0, css(ivory.map(v => v * .78), light));
    g.addColorStop(.18, css(ivory, light));
    g.addColorStop(1, css(ivory.map(v => v * .86), light));
    c.fillStyle = g;
    c.fillRect(x + gap / 2, y0 + p * 4, kw - gap, len);
    // 按下时后沿露出一道暗缝
    if (p > 0) { c.fillStyle = css([8, 8, 9], .9 * p * light); c.fillRect(x + gap / 2, y0, kw - gap, 4 + p * 8); }
    centers.push(x + kw / 2);
  }
  // 黑键：C 大调排列（白键序号之后有黑键：0,1,3,4,5）
  const pat = [1, 1, 0, 1, 1, 1, 0];
  for (let i = 0; i < n - 1; i++) {
    if (!pat[(i + startNote) % 7]) continue;
    const x = x0 + (i + 1) * kw - bw / 2;
    c.fillStyle = css([14, 14, 15], light);
    c.fillRect(x, y0, bw, blen);
    const g = c.createLinearGradient(x, 0, x + bw, 0);       // 黑键侧面的一点反光
    g.addColorStop(0, css([60, 60, 62], .55 * light)); g.addColorStop(.18, css([34, 34, 36], .25 * light));
    g.addColorStop(.82, css([30, 30, 32], .2 * light)); g.addColorStop(1, css([70, 70, 72], .5 * light));
    c.fillStyle = g; c.fillRect(x, y0, bw, blen);
  }
  // 琴键后面的毛毡和琴身
  c.fillStyle = css([24, 23, 24], light); c.fillRect(x0 - 40, y0 - 70, n * kw + 80, 70);
  c.fillStyle = css([58, 30, 30], .55 * light); c.fillRect(x0 - 40, y0 - 14, n * kw + 80, 10);
  return centers;
}

// 竖直胶片条（竖屏）：左右两侧齿孔，中间画框。k = 0..1 进场程度（从下往上滑入），stretch = 齿孔拉长成黑键的程度
export function filmFrame(c, x, y, w, h, o = {}) {
  const side = o.side ?? 70, holeW = 30, holeH = 44, pitch = 76, off = o.off ?? 0, a = o.a ?? 1, stretch = o.stretch ?? 0;
  const base = o.rgb ?? [18, 17, 16];
  c.save(); c.globalAlpha = a;
  c.fillStyle = css(base);
  // 胶片两侧一直延伸到画面外；画框上下各一道隔条，隔条外是胶片片基的暗色
  c.fillRect(x - side, y - 2000, side, h + 4000); c.fillRect(x + w, y - 2000, side, h + 4000);
  c.fillRect(x - side, y - 2000, w + side * 2, 2000); c.fillRect(x - side, y + h, w + side * 2, 2000);
  // 齿孔
  c.fillStyle = css(o.holeRgb ?? [196, 190, 176], .9);
  const hh = lerp(holeH, pitch * .9, stretch);
  for (let k = -30; k < 60; k++) {
    const yy = y - 2000 + k * pitch + (off % pitch);
    if (yy > 1940 || yy + hh < -20) continue;
    for (const xx of [x - side / 2 - holeW / 2, x + w + side / 2 - holeW / 2]) { c.beginPath(); c.roundRect(xx, yy, holeW, hh, 6); c.fill(); }
  }
  c.restore();
}
