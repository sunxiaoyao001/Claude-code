// 第一幕 b：越肩镜头。他坐在窗前读剧本（背影），读完合上。封面的五条竖格线浮起来，转成横的，
// 变成下一幕悬在两人之间的五线谱。
import { clamp, lerp, hash } from '../lib.js';
import { camera, SNAP, GLIDE, kf, xform, smooth, lerpPts, resampleN } from '../util.js';
import { mk, draw as paint, mass } from '../ink.js';
import { pline, GOLD, staff } from '../geo.js';
import { line } from '../text.js';
import { backHead, backShoulders, memo, stroke, blob } from '../figures.js';
import { TONES } from '../comp.js';
import { T, CAPS, CUE, lastNote } from '../story.js';

const CLOSE0 = T.read + 4.2, CLOSE1 = CLOSE0 + 1.2;     // 合上剧本
export const LIFT0 = CLOSE1 + .3, LIFT1 = T.cond - .3;   // 五条线浮起、转平
// 书（打开时）：中缝、左右页的四个角（世界坐标）
const G0 = [724, 1046], G1 = [708, 1300];
const LP = [[498, 1068], [478, 1322]], RP = [[956, 1030], [968, 1270]];
// 浮起后五线谱的目标（下一幕开头它就在这里）
export const LIFT_STAFF = { x0: 190, x1: 890, cy: 600, gap: 34 };

function bookPage(c, a, b, cTop, cBot, alpha) {
  c.save(); c.fillStyle = `rgba(250,245,233,${alpha})`;
  c.beginPath(); c.moveTo(...a); c.quadraticCurveTo(lerp(a[0], cTop[0], .5), a[1] - 18, ...cTop); c.lineTo(...cBot); c.quadraticCurveTo(lerp(b[0], cBot[0], .5), b[1] - 10, ...b); c.closePath(); c.fill(); c.restore();
}

export function draw(L, t, o = {}) {
  const k = o.k ?? 1;
  const z = kf(t, [[T.read - .8, 1.0], [T.cond + .4, 1.06]], u => u);
  const cam = camera(560, 1060, z, 0, 560, 1060);
  cam.apply(L);
  const { cw, cd, cc } = L;

  // 墙：一层淡墨，窗洞留白（光从窗外进来）
  const S = memo('readStatic', () => ({
    wall: [[-200, -200], [1300, -200], [1300, 1300], [-200, 1300]],
    win: [[588, 380], [1010, 380], [1010, 940], [588, 940]],
    frame: [
      stroke([[588, 380], [1010, 380]], { w: 7, tone: .75, dry: .45, prof: 'even', seed: 101 }),
      stroke([[588, 380], [588, 940]], { w: 7, tone: .75, dry: .45, prof: 'even', seed: 102 }),
      stroke([[1010, 380], [1010, 940]], { w: 7, tone: .75, dry: .45, prof: 'even', seed: 103 }),
      stroke([[580, 944], [1020, 944]], { w: 10, tone: .8, dry: .4, prof: 'even', seed: 104 }),
      stroke([[799, 380], [799, 940]], { w: 5, tone: .7, dry: .5, prof: 'even', seed: 105 }),
      stroke([[588, 660], [1010, 660]], { w: 5, tone: .7, dry: .5, prof: 'even', seed: 106 }),
    ],
    desk: [[-200, 984], [1300, 966], [1300, 2100], [-200, 2100]],
    deskEdge: stroke([[-100, 986], [500, 978], [1200, 966]], { w: 6, tone: .7, dry: .5, prof: 'even', seed: 107 }),
    lamp: [stroke([[150, 980], [150, 960], [230, 940]], { w: 9, tone: .85, dry: .3, prof: 'even', seed: 120 }), stroke([[230, 940], [190, 760]], { w: 7, tone: .85, dry: .3, prof: 'even', seed: 121 }), stroke([[190, 760], [300, 700]], { w: 7, tone: .85, dry: .3, prof: 'even', seed: 122 })],
    shade: [[262, 652], [334, 628], [426, 748], [404, 768], [318, 800], [300, 794]],
    // 窗外：远处的树影（淡墨几点）
    tree: [[640, 940], [660, 760], [700, 700], [760, 690], [800, 720], [840, 700], [900, 730], [930, 800], [960, 940]],
  }));
  // 墙面：在窗洞外面铺淡墨（窗洞用 evenodd 挖掉）
  cw.save(); cw.globalAlpha = 1; cw.fillStyle = `rgba(0,0,0,${.2 * k})`;
  cw.beginPath(); S.wall.forEach((p, i) => i ? cw.lineTo(...p) : cw.moveTo(...p)); cw.closePath();
  S.win.forEach((p, i) => i ? cw.lineTo(...p) : cw.moveTo(...p)); cw.closePath(); cw.fill('evenodd'); cw.restore();
  S.frame.forEach((s, i) => paint(L.ink, s, clamp(k * 1.5 - i * .06), .9));
  // 窗光落在桌上：一块暖光（col 层）
  cc.save(); const g = cc.createLinearGradient(820, 940, 560, 1300);
  g.addColorStop(0, `rgba(255,248,230,${.5 * k})`); g.addColorStop(1, 'rgba(255,248,230,0)');
  cc.fillStyle = g; cc.beginPath(); cc.moveTo(600, 950); cc.lineTo(1010, 950); cc.lineTo(1100, 1400); cc.lineTo(420, 1400); cc.closePath(); cc.fill(); cc.restore();
  // 桌面
  mass(cw, S.desk, .26 * k, 4, 109);
  paint(L.ink, S.deskEdge, k, .9);
  // 台灯（左边，被他的头挡住一半）：灯罩下一团暖光
  S.lamp.forEach((s1, i) => paint(L.ink, s1, clamp(k * 1.5 - i * .1), .9));
  mass(cw, S.shade, .66 * k, 1.5, 123);
  mass(cd, S.shade, .3 * k, 0, 124);
  cc.save(); const lg = cc.createRadialGradient(370, 800, 10, 370, 860, 420);
  lg.addColorStop(0, `rgba(255,236,196,${.42 * k})`); lg.addColorStop(1, 'rgba(255,236,196,0)');
  cc.fillStyle = lg; cc.fillRect(0, 600, 900, 700); cc.restore();

  // —— 剧本：打开 → 合上 ——
  const close = SNAP(clamp((t - CLOSE0) / (CLOSE1 - CLOSE0)));
  // 书在桌上的影子
  mass(cw, [[LP[0][0] + 10, LP[0][1] + 30], [RP[0][0] + 16, RP[0][1] + 30], [RP[1][0] + 20, RP[1][1] + 26], [LP[1][0] + 12, LP[1][1] + 26]], .12 * k, 6, 110);
  bookPage(cc, G0, G1, LP[0], LP[1], .97 * k);   // 左页
  // 左页上的竖排字（灰色短竖线，从右往左一栏栏排）
  const textCols = (a0, a1, b0, b1, n, seed, alpha) => {
    for (let i = 0; i < n; i++) {
      const u = (i + .7) / (n + .4), top = [lerp(a0[0], b0[0], u), lerp(a0[1], b0[1], u)], bot = [lerp(a1[0], b1[0], u), lerp(a1[1], b1[1], u)];
      const len = .55 + .38 * hash(seed + i * 1.7);
      pline(cc, [[lerp(top[0], bot[0], .1), lerp(top[1], bot[1], .1)], [lerp(top[0], bot[0], .1 + len * .8), lerp(top[1], bot[1], .1 + len * .8)]], 3, [70, 60, 50], .55 * alpha);
    }
  };
  textCols(G0, G1, LP[0], LP[1], 9, 7, k);
  // 右页：合上时外沿翻过中缝，翻过去之后露出封面（带片名和竖格线）
  const flip = close;                       // 0 打开，1 合上
  const ox = lerp(RP[0][0], LP[0][0], flip), oy0 = lerp(RP[0][1], LP[0][1], flip) - Math.sin(flip * Math.PI) * 60, oy1 = lerp(RP[1][1], LP[1][1], flip) - Math.sin(flip * Math.PI) * 40;
  const ox1 = lerp(RP[1][0], LP[1][0], flip);
  const showCover = flip > .5;
  bookPage(cc, G0, G1, [ox, oy0], [ox1, oy1], .98 * k);
  if (!showCover) textCols(G0, G1, [ox, oy0], [ox1, oy1], 9, 19, k * (1 - flip * 2));
  // 页边墨线
  const edgeA = .85 * k;
  pline(cc, [G0, G1], 2.2, [120, 100, 80], .7 * k);
  pline(cc, [LP[0], LP[1]], 2, [120, 100, 80], .6 * k);
  pline(cc, [[ox, oy0], [ox1, oy1]], 2.2, [120, 100, 80], edgeA);
  
  // 封面（合上之后）：五条竖格线 + 片名
  if (showCover) {
    const cv = (u, v) => [lerp(lerp(G0[0], ox, u), lerp(G1[0], ox1, u), v), lerp(lerp(G0[1], oy0, u), lerp(G1[1], oy1, u), v)];
    const lift = GLIDE(clamp((t - LIFT0) / (LIFT1 - LIFT0)));
    const ruleA = clamp((flip - .5) * 3);
    [.2, .35, .5, .65, .8].forEach((u, i) => {
      const P = [cv(u, .12), cv(u, .88)];
      pline(cc, P, 1.6, [120, 96, 72], .8 * ruleA * (1 - clamp(lift * 3)));
    });
    // 片名（小字，竖排）
    cc.save(); cc.globalAlpha = .9 * ruleA; cc.font = '700 21px NotoJP'; cc.fillStyle = 'rgb(40,30,24)'; cc.textAlign = 'center'; cc.textBaseline = 'top';
    const [tx, ty] = cv(.42, .14);
    [...'戦場のメリークリスマス'].forEach((ch, i) => { if ('ー'.includes(ch)) { cc.save(); cc.translate(tx, ty + i * 17 + 9); cc.rotate(Math.PI / 2); cc.fillText(ch, 0, -9); cc.restore(); } else cc.fillText(ch, tx, ty + i * 17); });
    cc.restore();
  }

  // 他：越肩的后脑和肩膀。读的时候头随乐句轻轻点一下；合书时微微抬头
  const [ni, nd] = lastNote(CUE.melody, t);
  const nod = Math.exp(-nd * 3) * .012 * (ni % 2 ? 1 : -1);
  const tilt = -.05 + nod + .03 * SNAP(clamp((t - CLOSE0) / 1.6));
  backShoulders(L, 300, 1450, 1.0, { k });
  backHead(L, 300, 1260, .95, { k, tilt });

  // 浮起的五条线（谱线金）：从封面的竖格线位置升起、转平、拉长
  if (t >= LIFT0) {
    const lift = GLIDE(clamp((t - LIFT0) / (LIFT1 - LIFT0)));
    const cv = (u, v) => [lerp(lerp(G0[0], LP[0][0], u), lerp(G1[0], LP[1][0], u), v), lerp(lerp(G0[1], LP[0][1], u), lerp(G1[1], LP[1][1], u), v)];
    const { x0, x1, cy, gap } = LIFT_STAFF;
    const lines = [.2, .35, .5, .65, .8].map((u, i) => {
      const A = resampleN([cv(u, .12), cv(u, .88)], 16);
      const tw = cam.toWorld(0, 0); // 屏幕坐标 → 世界：目标在屏幕上固定
      const B = resampleN([cam.toWorld(x0, cy + (i - 2) * gap), cam.toWorld(x1, cy + (i - 2) * gap)], 16);
      // 中途带一点弧线（像被风托起）
      return lerpPts(A, B, lift).map((p, j) => [p[0], p[1] - Math.sin(lift * Math.PI) * 120 * Math.sin(j / 15 * Math.PI) * (.6 + i * .1)]);
    });
    staff(cc, lines, { prog: 1, a: .95 * clamp((t - LIFT0) / .3), w: 2.6 / z });
  }

  line(L, { id: 'c3', t, t0: CAPS.c3.t[0], t1: CAPS.c3.t[1], text: CAPS.c3.text, x: 540, y: 300, size: 50, align: 'center', tone: 'ink' });
  return { tone: TONES.warm, paperX: cam.paper(), bleed: 5, rim: .9, vig: .24 };
}
