// 第二幕：条件。两个人隔着矮桌对坐（侧影）：左边年轻的坂本，右边戴眼镜的大岛渚，背后是日式格子窗。
// 浮起的五线谱悬在两人头上方，「让我来写配乐。」一个字一个字落在谱线上。
// 回答只有一枚朱红的「请」字印。印章随后放大、变圆，成为下一幕海上的落日。
import { clamp, lerp, hash } from '../lib.js';
import { camera, SNAP, GLIDE, kf, smooth, resampleN, lerpPts } from '../util.js';
import { mk, draw as paint, mass } from '../ink.js';
import { pline, staff, GOLD } from '../geo.js';
import { notes } from '../text.js';
import { profileFigure, memo, stroke, blob } from '../figures.js';
import { seal, VERM } from '../seal.js';
import { TONES } from '../comp.js';
import { T, CAPS, CUE, lastNote } from '../story.js';
import { LIFT_STAFF } from './read.js';

export const SEAL = { x: 540, y: 905, S: 180 };
export const SUN = { x: 540, y: 760, r: 104 };      // 下一幕落日的位置（屏幕坐标）
const STAFF_Y = LIFT_STAFF.cy, STAFF_GAP = LIFT_STAFF.gap;

// 印章 → 落日：u = 0..1。返回当前的中心、半边长、圆角比例
export function sealToSun(u) {
  const e = GLIDE(u);
  return { x: lerp(SEAL.x, SUN.x, e), y: lerp(SEAL.y, SUN.y, e), h: lerp(SEAL.S / 2, SUN.r, e), round: SNAP(clamp(u * 1.4)) };
}

export function draw(L, t, o = {}) {
  const z = kf(t, [[T.cond - .6, 1.16], [T.isle, 1.22]], u => u);
  const cam = camera(540, 1149, z, 0, 540, 1000);
  cam.apply(L);
  const { cw, cd, cc } = L;
  const S = memo('condStatic', () => {
    const shoji = [];
    // 格子窗：外框 + 竖格 + 横格（细墨线，纸面留白透光）
    const X0 = 30, X1 = 1050, Y0 = 200, Y1 = 1420;
    shoji.push(stroke([[X0, Y0], [X1, Y0]], { w: 10, tone: .8, dry: .4, prof: 'even', seed: 201 }));
    shoji.push(stroke([[X0, Y1], [X1, Y1]], { w: 12, tone: .85, dry: .4, prof: 'even', seed: 202 }));
    for (let i = 0; i <= 6; i++) { const x = lerp(X0, X1, i / 6); shoji.push(stroke([[x, Y0], [x, Y1]], { w: i % 3 ? 3 : 7, tone: .7, dry: .5, prof: 'even', seed: 210 + i })); }
    for (let j = 1; j < 8; j++) { const y = lerp(Y0, Y1, j / 8); shoji.push(stroke([[X0, y], [X1, y]], { w: 3, tone: .65, dry: .55, prof: 'even', seed: 220 + j })); }
    const table = [[-100, 1492], [1180, 1492], [1180, 1540], [-100, 1540]];
    const tableEdge = stroke([[-80, 1494], [1160, 1490]], { w: 8, tone: .85, dry: .4, prof: 'even', seed: 230 });
    // 桌上两只茶杯
    const cups = [stroke(smooth([[420, 1492], [416, 1452], [452, 1448], [458, 1492]], 4), { w: 4, tone: .85, dry: .3, prof: 'even', seed: 231 }),
                  stroke(smooth([[640, 1492], [636, 1454], [668, 1450], [674, 1492]], 4), { w: 4, tone: .85, dry: .3, prof: 'even', seed: 232 })];
    return { shoji, table, tableEdge, cups };
  });
  // 墙和格子窗：窗外的光是纸的白，格子框是墨
  cw.save(); cw.fillStyle = 'rgba(0,0,0,.18)'; cw.fillRect(-300, -300, 1700, 520); cw.fillRect(-300, 1420, 1700, 1300); cw.restore();
  S.shoji.forEach((s, i) => paint(L.ink, s, 1, .85));
  // 桌子与榻榻米
  mass(cw, S.table, .62, 3, 233);
  mass(cw, [[-300, 1540], [1400, 1540], [1400, 2300], [-300, 2300]], .3, 3, 234);
  paint(L.ink, S.tableEdge, 1, .9);
  S.cups.forEach(s => paint(L.ink, s, 1, .85));

  // 两个人：说话的人微微前倾；印章落下时大岛渚点头
  const [ni, nd] = lastNote(CUE.melody, t);
  const speak = SNAP(clamp((t - CAPS.c4.t[0]) / .6)) * (1 - SNAP(clamp((t - CAPS.c4.t[1]) / .6)));
  const nod = Math.exp(-Math.max(0, t - T.seal) * 2.5) * (t > T.seal ? 1 : 0);
  profileFigure(L, 236, 1220, 1.22, 1, { style: 'young', headRot: .05 * speak, headDy: -4 * speak });
  profileFigure(L, 846, 1226, 1.3, -1, { style: 'oshima', coat: .62, headRot: .12 * nod, headDy: 8 * nod });

  // 五线谱：就停在上一镜浮起的位置（两人头顶），落印之后散去
  const lines = [-2, -1, 0, 1, 2].map(i => resampleN([cam.toWorld(LIFT_STAFF.x0, STAFF_Y + i * STAFF_GAP), cam.toWorld(LIFT_STAFF.x1, STAFF_Y + i * STAFF_GAP)], 12));
  const staffA = 1 - SNAP(clamp((t - T.seal + .2) / .5));
  staff(cc, lines, { prog: 1, a: .95 * staffA, w: 2.6 / z });

  // 字幕④：字像音符一样落在谱线上（高低跟着旋律起伏）
  const cap = CAPS.c4, chars = [...cap.text], n = chars.length;
  const x0 = LIFT_STAFF.x0 + 50, x1 = LIFT_STAFF.x1 - 50, pitch = [0, -1, 0, 1, 0, -1, 1, 0, 0];
  const pos = chars.map((ch, i) => [lerp(x0, x1, (i + .5) / n), STAFF_Y + pitch[i] * STAFF_GAP * .5]);
  const mt = CUE.melody.filter(x => x >= cap.t[0] - .05);
  const times = chars.map((ch, i) => cap.t[0] + i * .14);
  notes(L, { id: 'c4', t, text: cap.text, pos, times, t1: cap.t[1], size: 64, tone: 'ink', color: [0, 0, 0] });

  // 「请」字印：落下（放大 1.06 → 1，0.15 s），然后变成落日
  const sk = SNAP(clamp((t - T.seal) / .15));
  if (sk > 0) {
    const u = clamp((t - (T.isle - 1.5)) / 1.5);
    if (u <= 0) seal(cc, { lines: ['请'], font: 'brush', seed: 7 }, SEAL.x - SEAL.S / 2, SEAL.y - SEAL.S / 2, SEAL.S, sk, -.04);
    else {
      // 印章外形变圆、文字褪去，同时移到落日的位置
      const g = sealToSun(u);
      seal(cc, { lines: ['请'], font: 'brush', seed: 7 }, g.x - g.h, g.y - g.h, g.h * 2, 1, -.04 * (1 - u), 1 - SNAP(clamp(u * 2)));
      cc.save(); cc.setTransform(1, 0, 0, 1, 0, 0); cc.fillStyle = `rgb(${VERM.join(',')})`; cc.globalAlpha = SNAP(clamp(u * 2));
      cc.beginPath(); cc.roundRect(g.x - g.h, g.y - g.h, g.h * 2, g.h * 2, g.h * g.round); cc.fill(); cc.restore();
    }
  }
  // 落印时纸面一震
  const shake = t > T.seal && t < T.seal + .25 ? Math.sin((t - T.seal) * 90) * 2 * (1 - (t - T.seal) / .25) : 0;
  return { tone: TONES.warm, paperX: [cam.paper()[0] + shake, cam.paper()[1], z], bleed: 5, rim: .9, vig: .24 };
}
