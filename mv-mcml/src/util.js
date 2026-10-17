// 缓动、镜头、路径工具。所有函数只依赖输入（确定性渲染：同一个 t 永远画出同一帧）
import { clamp, lerp, seg } from './lib.js';
import { W, H } from './comp.js';

// CSS cubic-bezier 缓动（牛顿迭代解 x→t）
export function bez(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    x = clamp(x); if (x === 0 || x === 1) return x;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-6) break; if (Math.abs(d) < 1e-6) break; t -= e / d; }
    t = clamp(t);
    return Y(t);
  };
}
export const SNAP = bez(.7, 0, .2, 1);     // 几何吸附、印章
export const GLIDE = bez(.45, 0, .15, 1);  // 镜头、滑行
export const lin = t => clamp(t);
export const sine = t => .5 - .5 * Math.cos(Math.PI * clamp(t));

// 关键帧：[[t, v], ...]，v 可以是数或数组；ease 作用在每一段上
export function kf(t, keys, ease = GLIDE) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t <= t1) {
      const e = (keys[i + 1][2] || ease)((t - t0) / (t1 - t0));
      return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], e)) : lerp(v0, v1, e);
    }
  }
  return keys[keys.length - 1][1];
}

// 镜头：世界点 (cx, cy) 放在屏幕 (sx, sy)，缩放 z，旋转 rot。返回 { m: [a,b,c,d,e,f], toScreen, toWorld }
export function camera(cx, cy, z = 1, rot = 0, sx = W / 2, sy = H / 2) {
  const c = Math.cos(rot) * z, s = Math.sin(rot) * z;
  const e = sx - (c * cx - s * cy), f = sy - (s * cx + c * cy);
  const m = [c, s, -s, c, e, f];
  return {
    m, z, rot,
    toScreen: (x, y) => [c * x - s * y + e, s * x + c * y + f],
    toWorld: (X, Y) => { const dx = X - e, dy = Y - f, d = z * z; return [(c * dx + s * dy) / d, (-s * dx + c * dy) / d]; },
    apply: L => L.set(...m),
    // 纸纹跟着镜头：comp 的 paperX = [偏移x, 偏移y, 缩放]
    paper: () => [-e, -f, z],
  };
}

// Catmull-Rom 加密（开放曲线）
export function smooth(P, per = 8) {
  if (P.length < 3) return P.map(p => [p[0], p[1]]);
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push([P[P.length - 1][0], P[P.length - 1][1]]);
  return out;
}
// 闭合曲线
export function smoothClosed(P, per = 8) {
  const n = P.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}
// 点列变换
export const xform = (P, x, y, s = 1, rot = 0, fx = 1) => {
  const c = Math.cos(rot), sn = Math.sin(rot);
  return P.map(p => { const px = p[0] * s * fx, py = p[1] * s; return [x + c * px - sn * py, y + sn * px + c * py, p[2]]; });
};
export const lerpPts = (A, B, k) => A.map((p, i) => [lerp(p[0], B[i][0], k), lerp(p[1], B[i][1], k)]);
// 折线按弧长重采样成 n 个点（让两条不同的线可以逐点插值）
export function resampleN(P, n) {
  const acc = [0];
  for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = acc[acc.length - 1] || 1e-6, out = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = L * i / (n - 1);
    while (j < P.length - 2 && acc[j + 1] < s) j++;
    const u = clamp((s - acc[j]) / ((acc[j + 1] - acc[j]) || 1e-6));
    out.push([lerp(P[j][0], P[j + 1][0], u), lerp(P[j][1], P[j + 1][1], u)]);
  }
  return out;
}
// 折线截取前 p（0..1，按弧长）
export function partial(P, p) {
  if (p >= 1) return P; if (p <= 0) return [P[0]];
  const acc = [0];
  for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = acc[acc.length - 1] * p, out = [P[0]];
  for (let i = 1; i < P.length; i++) {
    if (acc[i] <= L) out.push(P[i]);
    else { const u = (L - acc[i - 1]) / (acc[i] - acc[i - 1]); out.push([lerp(P[i - 1][0], P[i][0], u), lerp(P[i - 1][1], P[i][1], u)]); break; }
  }
  return out;
}
export const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export function ellPts(cx, cy, rx, ry, n = 40, rot = 0) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + c * x - s * y, cy + s * x + c * y]); }
  return out;
}
export const env = (t, a, b, fi = .3, fo = .3) => Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b));
export const css = (rgb, a = 1) => `rgba(${rgb.map(v => Math.round(v)).join(',')},${a})`;
export const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
