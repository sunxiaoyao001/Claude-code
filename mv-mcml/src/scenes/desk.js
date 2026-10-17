// 第一幕 a：俯视书桌。一本竖排的剧本《戦場のメリークリスマス》，旁边一封拆开的信、一支钢笔。
// 开场的五线谱在转场里拉宽，变成剧本封面的竖格线。
import { clamp, lerp, hash, vnoise } from '../lib.js';
import { camera, SNAP, GLIDE, kf, xform, rectPts, smooth } from '../util.js';
import { mk, draw as paint, mass, blot } from '../ink.js';
import { pline, GOLD } from '../geo.js';
import { line, column, FONT } from '../text.js';
import { memo } from '../figures.js';
import { TONES } from '../comp.js';
import { T, CAPS } from '../story.js';

// 剧本封面：中心、尺寸、转角（世界坐标）
export const BOOK = { cx: 540, cy: 1010, w: 560, h: 800, rot: -.045 };
const RULE_GAP = 84;

// 世界里的一个局部坐标系（剧本封面）
const bookPt = (x, y) => { const c = Math.cos(BOOK.rot), s = Math.sin(BOOK.rot); return [BOOK.cx + c * x - s * y, BOOK.cy + s * x + c * y]; };

// 剧本封面的竖格线位置（局部 x），gapK = 0..1 从谱线间距 30 拉宽到 84
export const ruleXs = gapK => [-2, -1, 0, 1, 2].map(k => k * lerp(30, RULE_GAP, gapK));

// 一笔墨线（预先建好，按种子固定形状）
const S = {};
function strokes() {
  if (S.ok) return S; S.ok = true;
  const { w, h } = BOOK, hw = w / 2, hh = h / 2;
  const edge = (a, b, seed, wd = 3.6) => mk([[...bookPt(...a), 1], [...bookPt(...b), .9]], { w: wd, tone: .8, dry: .35, prof: 'even', rough: .2, seed, nb: 8 });
  S.cover = [edge([-hw, -hh], [hw, -hh], 11), edge([hw, -hh], [hw, hh], 12), edge([hw, hh], [-hw, hh], 13), edge([-hw, hh], [-hw, -hh], 14)];
  // 装订边（竖排书在右侧装订）
  S.spine = [mk([[...bookPt(hw - 34, -hh + 4), 1], [...bookPt(hw - 34, hh - 4), 1]], { w: 2.2, tone: .6, dry: .5, prof: 'even', seed: 21, nb: 6 })];
  // 信封：右上
  const env = (x, y) => { const c = Math.cos(.21), s = Math.sin(.21); return [905 + c * x - s * y, 560 + s * x + c * y]; };
  S.envF = env;
  S.env = [
    mk([[...env(-150, -92), 1], [...env(150, -92), 1]], { w: 3, tone: .75, dry: .4, prof: 'even', seed: 31, nb: 7 }),
    mk([[...env(150, -92), 1], [...env(150, 92), 1]], { w: 3, tone: .75, dry: .4, prof: 'even', seed: 32, nb: 7 }),
    mk([[...env(150, 92), 1], [...env(-150, 92), 1]], { w: 3, tone: .75, dry: .4, prof: 'even', seed: 33, nb: 7 }),
    mk([[...env(-150, 92), 1], [...env(-150, -92), 1]], { w: 3, tone: .75, dry: .4, prof: 'even', seed: 34, nb: 7 }),
    // 打开的封舌（三角，翻到上方）
    mk([[...env(-150, -92), 1], [...env(0, -190), .8], [...env(150, -92), 1]], { w: 2.6, tone: .7, dry: .45, prof: 'even', seed: 35, nb: 7 }),
    // 抽出一半的信纸
    mk([[...env(-118, -60), 1], [...env(-118, -150), 1], [...env(104, -150), 1], [...env(104, -60), 1]], { w: 2, tone: .55, dry: .5, prof: 'even', seed: 36, nb: 6 }),
  ];
  S.envPoly = [env(-150, -92), env(150, -92), env(150, 92), env(-150, 92)];
  S.letterLines = [0, 1, 2].map(i => [env(-96, -128 + i * 22), env(lerp(70, 30, i / 2), -128 + i * 22)]);
  // 钢笔：左下斜放
  const pen = (x, y) => { const c = Math.cos(-.62), s = Math.sin(-.62); return [210 + c * x - s * y, 1560 + s * x + c * y]; };
  S.penBody = [pen(-170, -13), pen(120, -15), pen(150, -10), pen(150, 10), pen(120, 15), pen(-170, 13), pen(-182, 0)];
  S.penNib = [pen(150, -10), pen(205, -2), pen(212, 0), pen(205, 2), pen(150, 10)];
  S.penClip = mk([[...pen(-140, -15), 1], [...pen(-40, -17), .8]], { w: 3, tone: .5, dry: .2, prof: 'even', seed: 41, color: [203, 178, 122] });
  S.penEdge = mk(S.penBody.map(p => [...p, 1]).concat([[...S.penBody[0], 1]]), { w: 2.4, tone: .9, dry: .25, prof: 'even', seed: 42, nb: 6 });
  return S;
}

// k = 场景整体的"显影"进度（转场里从 0 到 1），gapK = 竖格线从谱线拉宽的进度
export function draw(L, t, o = {}) {
  strokes();
  const gapK = o.gapK ?? 1, k = o.k ?? 1;
  const z = kf(t, [[T.inv - .6, 1.0], [T.read + .4, 1.07]], t => t);
  const rot = kf(t, [[T.inv - .6, .0], [T.read + .4, .012]], t => t);
  const cam = camera(540, 1000, z, rot, 540, 1000);
  cam.apply(L);
  const { cw, cd, cc } = L;

  // 桌面：深色木纹（湿墨铺底 + 干笔木纹），左上方台灯照出一块暖光
  const D = memo('deskWood', () => {
    const grain = [];
    for (let i = 0; i < 70; i++) {
      const y = -260 + i * 34 + (hash(i * 3.7) - .5) * 30, x0 = -300 + hash(i * 1.3) * 200, x1 = 1400 - hash(i * 2.9) * 200;
      const wob = (hash(i * 5.1) - .5) * 26;
      grain.push(mk([[x0, y, .8], [lerp(x0, x1, .35), y + wob, 1], [lerp(x0, x1, .7), y - wob * .6, 1], [x1, y + wob * .3, .7]].map(p => { const c = Math.cos(BOOK.rot * .6), s2 = Math.sin(BOOK.rot * .6); return [540 + c * (p[0] - 540) - s2 * (p[1] - 1000), 1000 + s2 * (p[0] - 540) + c * (p[1] - 1000), p[2]]; }),
        { w: 3 + hash(i * 7.7) * 7, tone: .6, dry: .6, prof: 'even', rough: .25, seed: 300 + i, nb: 9 }));
    }
    return { grain };
  });
  cw.save(); cw.fillStyle = `rgba(0,0,0,${.62 * k})`; cw.fillRect(-400, -400, 1900, 2800); cw.restore();
  D.grain.forEach((g, i) => paint(L.ink, g, 1, .38 * k));
  cc.save(); cc.fillStyle = `rgba(120,78,44,${.22 * k})`; cc.fillRect(-400, -400, 1900, 2800); cc.restore();   // 木头的暖色
  cc.save(); const lg = cc.createRadialGradient(330, 640, 60, 330, 640, 1150);
  lg.addColorStop(0, `rgba(255,236,200,${.26 * k})`); lg.addColorStop(1, 'rgba(255,236,200,0)');
  cc.fillStyle = lg; cc.fillRect(-400, -400, 1900, 2800); cc.restore();

  // 剧本：投影（湿墨，会晕开）+ 奶白封面（col 层，盖在木纹上）+ 细细的纸边
  const poly = (P, c, fill) => { c.beginPath(); P.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath(); c.fillStyle = fill; c.fill(); };
  mass(cw, [bookPt(-262, -386), bookPt(298, -386), bookPt(306, 424), bookPt(-252, 426)].map(p => [p[0] + 18, p[1] + 22]), .5 * k, 8, 3);
  cc.save(); cc.globalAlpha = k;
  poly([bookPt(-280, -400), bookPt(280, -400), bookPt(280, 400), bookPt(-280, 400)], cc, 'rgb(244,237,221)');
  poly([bookPt(246, -400), bookPt(280, -400), bookPt(280, 400), bookPt(246, 400)], cc, 'rgba(120,100,80,.16)');   // 右侧装订边
  for (const yy of [-300, 0, 300]) poly([bookPt(258, yy - 16), bookPt(264, yy - 16), bookPt(264, yy + 16), bookPt(258, yy + 16)], cc, 'rgba(90,85,80,.7)');  // 订书钉
  cc.restore();
  pline(cc, [bookPt(-280, -400), bookPt(280, -400), bookPt(280, 400), bookPt(-280, 400), bookPt(-280, -400)], 1.6 / z, [120, 100, 80], .5 * k);

  // 竖格线：转场时是谱线金，慢慢沉成印刷的褐色细线
  const xs = ruleXs(gapK), gold = clamp(1 - (t - T.inv - .2) / 1.4);
  xs.forEach((x, i) => {
    const P = [bookPt(x, -330), bookPt(x, 330)];
    pline(cc, P, lerp(1.5, 2.6, gold) / z, gold > 0 ? GOLD.map((v, j) => lerp([120, 96, 72][j], v, gold)) : [120, 96, 72], lerp(.7, .95, gold) * k);
  });
  // 封面文字（竖排，印刷体，col 层里的深褐色）：片名在中线右边一栏，导演在左边一栏
  const titleK = clamp((t - T.inv + .1) / 1.0);
  if (titleK > 0) {
    const ctx = cc; ctx.save();
    const [tx, ty] = bookPt(xs[2] + (xs[3] - xs[2]) / 2, -300);
    ctx.translate(tx, ty); ctx.rotate(BOOK.rot);
    ctx.font = `700 50px NotoJP`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = 'rgb(40,30,24)';
    [...'戦場のメリークリスマス'].forEach((ch, i) => {
      const kk = SNAP(clamp(titleK * 2.4 - i * .12));
      if (kk <= 0) return;
      ctx.save(); ctx.beginPath(); ctx.rect(-40, i * 56 - 6, 80, 60); ctx.clip();
      ctx.globalAlpha = kk;
      const dy = (1 - kk) * 40;
      if (ch === 'ー') { ctx.translate(0, i * 56 + 25 + dy); ctx.rotate(Math.PI / 2); ctx.fillText(ch, 0, -25); }
      else ctx.fillText(ch, 0, i * 56 + dy);
      ctx.restore();
    });
    ctx.font = `700 28px NotoJP`; ctx.globalAlpha = .85 * SNAP(clamp(titleK * 1.6 - .6));
    ctx.translate(-(xs[2] - xs[1]), 0);
    [...'監督　大島渚'].forEach((ch, i) => ctx.fillText(ch, 0, 340 + i * 36));
    ctx.restore();
  }

  // 信封：先画抽出一半的信纸，再画信封盖住它的下半截，封舌翻在上面（都在 col 层，墨色细线勾边）
  const objK = clamp((t - T.inv + .1) / 1.2), E = S.envF;
  mass(cw, S.envPoly.map(p => [p[0] + 14, p[1] + 18]), .45 * objK, 6, 7);
  cc.save(); cc.globalAlpha = objK;
  const letter = [E(-112, -40), E(-112, -168), E(102, -168), E(102, -40)];
  poly(letter, cc, 'rgb(250,246,236)');
  pline(cc, letter.concat([letter[0]]), 1.4, [110, 92, 74], .7);
  for (let i = 0; i < 4; i++) pline(cc, [E(-90, -140 + i * 24), E(lerp(80, 20, i / 3), -140 + i * 24)], 2, [60, 50, 42], .55);
  poly(S.envPoly, cc, 'rgb(232,221,198)');
  poly([E(-150, -92), E(0, 6), E(150, -92)], cc, 'rgb(222,209,184)');                      // 信封背面的折痕三角
  pline(cc, [E(-150, -92), E(0, 6), E(150, -92)], 1.4, [130, 110, 90], .6);
  poly([E(-150, -92), E(150, -92), E(0, -200)].map(p => p), cc, 'rgba(236,226,204,0)');
  pline(cc, S.envPoly.concat([S.envPoly[0]]), 1.6, [110, 92, 74], .8);
  cc.restore();
  // 钢笔：黑色笔杆 + 金色笔夹 + 一道高光
  const penK = clamp((t - T.inv - .1) / 1.1);
  mass(cw, S.penBody.map(p => [p[0] + 10, p[1] + 14]), .4 * penK, 4, 8);
  cc.save(); cc.globalAlpha = penK; poly(S.penBody, cc, 'rgb(22,20,19)'); poly(S.penNib, cc, 'rgb(170,150,110)'); cc.restore();
  pline(cc, S.penBody.slice(0, 2).map(p => [p[0] + 3, p[1] + 5]), 2.4, [150, 140, 130], .5 * penK);
  paint(L.ink, S.penClip, penK, 1);

  // 字幕②：横排，放在剧本上方的留白
  line(L, { id: 'c2', t, t0: CAPS.c2.t[0], t1: CAPS.c2.t[1], text: CAPS.c2.text, x: 540, y: 280, size: 50, align: 'center', tone: 'light', color: [242, 233, 214] });
  return { tone: TONES.warm, paperX: cam.paper(), bleed: 5, rim: .9, vig: .2 };
}
