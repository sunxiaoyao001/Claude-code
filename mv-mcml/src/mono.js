// 黑白段落（四十年、NHK 509、尾声）用的人物和三角钢琴。
// 暗纸上墨是看不见的，所以这里全部画在颜色层：剪影是深灰，受光的边是一道亮线（顶光）——像《Opus》那样的黑白影调。
import { clamp, lerp, hash } from './lib.js';
import { smooth, smoothClosed, xform } from './util.js';

const fillP = (c, P, rgb, a = 1, per = 5) => { const Q = smoothClosed(P, per); c.save(); c.globalAlpha = a; c.fillStyle = `rgb(${rgb.join(',')})`; c.beginPath(); Q.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath(); c.fill(); c.restore(); };
const lineP = (c, P, w, rgb, a = 1, per = 5) => { if (a <= .003) return; const Q = smooth(P, per); c.save(); c.globalAlpha = a; c.strokeStyle = `rgb(${rgb.join(',')})`; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); Q.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.stroke(); c.restore(); };
// 按进度 k 只画出前一部分（"笔画顺序"的显现 / 反向消散）
const part = (P, k) => { if (k >= 1) return P; const n = Math.max(2, Math.round(P.length * k)); return P.slice(0, n); };

// 三角钢琴侧影（琴头朝右，键盘在左端）。x, y = 键盘前沿的位置；s 缩放
export function grandPiano(L, x, y, s, o = {}) {
  const c = L.cc, a = o.a ?? 1, X = P => xform(P, x, y, s, 0);
  const body = [[0, -20], [40, -40], [620, -40], [760, -30], [860, -6], [900, 20], [900, 60], [0, 60]];
  const lid = [[60, -42], [700, -330], [720, -318], [140, -42]];
  fillP(c, X(lid), [20, 20, 22], a * .98, 2);
  fillP(c, X(body), [16, 16, 17], a, 2);
  // 腿、踏板
  for (const lx of [40, 820]) fillP(c, X([[lx, 60], [lx + 30, 60], [lx + 24, 300], [lx + 6, 300]]), [16, 16, 17], a, 1);
  fillP(c, X([[300, 60], [340, 60], [334, 270], [306, 270]]), [16, 16, 17], a, 1);
  // 顶光照出的边：琴盖的长边、琴身上沿、键盘的一道白
  lineP(c, X([[60, -42], [700, -330]]), 3.2, [214, 212, 206], .8 * a, 2);
  lineP(c, X([[40, -40], [620, -40], [760, -30], [860, -6], [900, 20]]), 2.6, [190, 188, 182], .6 * a, 6);
  c.save(); c.globalAlpha = .9 * a; c.fillStyle = 'rgb(222,218,208)'; const k0 = X([[-60, -10]])[0], k1 = X([[10, 6]])[0];
  c.fillRect(k0[0], k0[1], k1[0] - k0[0], k1[1] - k0[1]); c.restore();
  // 琴凳
  fillP(c, X([[-330, 90], [-150, 90], [-150, 120], [-330, 120]]), [18, 18, 19], a, 1);
  for (const lx of [-320, -170]) fillP(c, X([[lx, 120], [lx + 14, 120], [lx + 14, 300], [lx, 300]]), [18, 18, 19], a, 1);
  lineP(c, X([[-330, 90], [-150, 90]]), 2.2, [180, 178, 172], .5 * a, 2);
}

// 弹琴的人（侧影，面朝右）。x, y = 坐在琴凳上的臀部位置；o.age 0..1：头发从黑到白；o.glasses；o.k 显现/消散
export function pianist(L, x, y, s, o = {}) {
  const c = L.cc, age = o.age ?? 0, k = o.k ?? 1, X = P => xform(P, x, y, s, o.rot || 0);
  if (k <= 0) return;
  const lift = o.lift ?? 0;          // 抬手（离开琴键）
  const body = [[-60, -40], [-80, -200], [-60, -330], [-10, -380], [40, -370], [80, -320], [96, -240], [86, -120], [70, -40], [60, 0], [-50, 0]];
  const head = [[-30, -390], [-44, -440], [-30, -490], [10, -506], [52, -494], [70, -462], [76, -440], [90, -424], [78, -414], [80, -398], [70, -380], [40, -370], [0, -372]];
  const hairCol = [lerp(26, 226, age), lerp(26, 224, age), lerp(28, 218, age)];
  const hair = [[-44, -430], [-48, -470], [-30, -508], [12, -522], [56, -510], [74, -480], [60, -476], [30, -488], [-6, -480], [-24, -456], [-20, -420]];
  const armY = lerp(0, -40, lift);
  const arm = [[30, -342], [120, -284], [206, -224 + armY], [262, -208 + armY], [266, -178 + armY], [204, -184 + armY], [110, -228], [16, -282]];
  const legs = [[-50, -10], [120, -10], [230, 0], [240, 220], [210, 220], [196, 40], [-40, 40]];
  const dk = [22, 22, 24], A = clamp(k * 1.2);
  fillP(c, X(legs), dk, A);
  fillP(c, X(body), dk, A);
  fillP(c, X(arm), [26, 26, 28], A);
  fillP(c, X(head), [30, 30, 32], A);
  fillP(c, X(hair), hairCol, A * (age > .5 ? .95 : 1));
  // 顶光：头顶、肩背、手臂上沿、侧脸的一道亮边（按 k 只画出一部分 = 笔画顺序）
  const rim = [214, 212, 206];
  lineP(c, part(X([[-44, -470], [-30, -508], [12, -522], [56, -510], [74, -480]]), k), 3.4, age > .5 ? [240, 238, 232] : rim, .75 * A);
  lineP(c, part(X([[-60, -330], [-10, -380], [40, -370], [120, -262], [200, -202 + armY], [250, -192 + armY]]), k), 2.8, rim, .6 * A);
  lineP(c, part(X([[52, -494], [70, -462], [76, -440], [90, -424], [78, -414], [80, -398], [70, -380]]), k), 2.4, rim, .55 * A);
  lineP(c, part(X([[-50, -10], [120, -10], [230, 0]]), k), 2.2, [170, 168, 162], .4 * A);
  if (o.glasses) { lineP(c, X([[56, -446], [80, -446], [80, -430], [58, -428], [56, -446]]), 2.4, [226, 224, 218], .85 * A, 3); lineP(c, X([[56, -440], [10, -436]]), 2, [200, 198, 192], .6 * A, 2); }
}
