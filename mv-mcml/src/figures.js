// 人物：水墨剪影 / 背影 / 侧影。真实人物只靠标志性特征（发型、眼镜、光头……）让人认出来，不画写实肖像。
// 每个形状 = 一块湿墨（会晕开）+ 几笔浓墨轮廓（干笔，带飞白）。坐标都在世界坐标里，调用者先设好镜头。
import { clamp, lerp, hash, vnoise } from './lib.js';
import { smooth, smoothClosed, xform } from './util.js';
import { mk, draw, mass } from './ink.js';

const cache = new Map();
// 同一组参数只建一次笔画（笔画的形状由种子决定，不随时间变）
export function memo(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }

// 遮挡：在三张画布上把人物轮廓里已经画好的背景挖掉（墨是叠加的，不挖的话背后的线会透过人）
export function knock(L, polys, per = 6) {
  for (const c of L.all) {
    c.save(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 1; c.fillStyle = '#000';
    for (const P of polys) { const Q = smoothClosed(P, per); c.beginPath(); Q.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath(); c.fill(); }
    c.restore();
  }
}
// 一块墨：闭合点列 → 平滑 → 湿墨块
export function blob(c, P, a, jit = 3, seed = 1, per = 6) { mass(c, smoothClosed(P, per), a, jit, seed); }
// 一笔：点列 → 笔画
export const stroke = (P, o) => mk(P.map(p => [p[0], p[1], p[2] ?? 1]), o);

// —— 年轻人的后脑和肩（背影，越肩镜头）——
// x, y = 后脑中心；s = 缩放（1 ≈ 头宽 300 px）；o.k = 显影进度；o.tilt = 头的微倾
export function backHead(L, x, y, s, o = {}) {
  const k = o.k ?? 1, tilt = o.tilt ?? 0, hairTone = o.hairTone ?? .86, grey = o.grey ?? 0;
  const X = P => xform(P, x, y, s, tilt);
  const S = memo('backHead', () => {
    // 头发外轮廓（后脑，略带 80 年代的蓬松，侧分）
    const hair = [[-150, -10], [-148, -80], [-120, -150], [-60, -192], [10, -200], [80, -180], [132, -132], [150, -60], [146, 20], [128, 80], [92, 120], [40, 138], [-30, 136], [-90, 116], [-132, 70]];
    const neck = [[-62, 110], [62, 110], [70, 260], [-70, 260]];
    const earL = [[-150, 0], [-176, -22], [-182, 20], [-170, 62], [-140, 58]];
    const earR = [[150, 0], [176, -22], [182, 20], [170, 62], [140, 58]];
    // 发丝方向：从发旋往外扫的几笔
    // 发丝：从左上的分缝往右后方梳过去，再顺着后脑往下
    const strands = [];
    for (let i = 0; i < 11; i++) {
      const u = i / 10, x0 = -70 + u * 40, y0 = -188 + u * 10;
      strands.push([[x0, y0], [x0 + 60 + u * 40, y0 + 30 + u * 40], [60 + u * 70, -60 + u * 70], [70 + u * 50, 60 + u * 50]]);
    }
    for (let i = 0; i < 5; i++) {
      const u = i / 4;
      strands.push([[-70 - u * 30, -182 + u * 20], [-118 - u * 12, -120 + u * 30], [-136 - u * 6, -20 + u * 40], [-124, 60 + u * 30]]);
    }
    return { hair, neck, earL, earR, strands };
  });
  const { cw, cd } = L;
  if (o.knock !== false) knock(L, [X(S.hair), X(S.neck), X(S.earL), X(S.earR)]);
  // 脖子和耳朵：淡墨
  blob(cw, X(S.neck), .16 * k, 4, 11);
  blob(cw, X(S.earL), .22 * k, 2, 12); blob(cw, X(S.earR), .22 * k, 2, 13);
  const ear = memo('earStrokes' + s.toFixed(3) + x.toFixed(0) + y.toFixed(0) + tilt.toFixed(3), () => [
    stroke(X([[-150, -4], [-176, -20], [-182, 22], [-168, 60], [-142, 56]]), { w: 3.4 * s, tone: .8, dry: .3, prof: 'even', seed: 51 }),
    stroke(X([[150, -4], [176, -20], [182, 22], [168, 60], [142, 56]]), { w: 3.4 * s, tone: .8, dry: .3, prof: 'even', seed: 52 }),
  ]);
  ear.forEach(st => draw(L.ink, st, k, .9));
  // 头发：一块浓墨 + 几笔发丝（干笔飞白），白发时变淡
  const hairA = lerp(hairTone, .22, grey) * k;
  blob(cw, X(S.hair), hairA * .75, 5, 14);
  blob(cd, X(S.hair), hairA * .45, 3, 15);
    // 发丝不随头的微动重建笔画（只建一次，画的时候整体平移旋转）
  const st = memo('strands', () => S.strands.map((P, i) => stroke(smooth(P, 6), { w: 9, tone: .95, dry: .8, prof: 'tip', seed: 60 + i, nb: 10 })));
  for (const c of [L.cw, L.cd]) { c.save(); c.translate(x, y); c.rotate(tilt); c.scale(s, s); }
  st.forEach((s1, i) => draw(L.ink, s1, clamp(k * 1.5 - i * .03), lerp(.42, .25, grey)));
  for (const c of [L.cw, L.cd]) c.restore();
}

// 越肩：肩膀和外套（深色外套 + 白衬衫领子）。x, y = 后颈根部
export function backShoulders(L, x, y, s, o = {}) {
  const k = o.k ?? 1;
  const X = P => xform(P, x, y, s, 0);
  const S = memo('backShoulders', () => ({
    coat: [[-80, -10], [-210, 30], [-360, 90], [-430, 200], [-450, 420], [450, 420], [440, 200], [380, 90], [220, 30], [80, -10], [0, 10]],
    collarL: [[-78, -14], [-30, 30], [0, 22]], collarR: [[78, -14], [30, 30], [0, 22]],
    shirt: [[-80, -16], [0, 22], [80, -16], [74, -40], [0, -10], [-74, -40]],
  }));
  if (o.knock !== false) knock(L, [X(S.coat)], 4);
  blob(L.cw, X(S.coat), .55 * k, 6, 21, 4);
  blob(L.cw, X(S.shirt), .05 * k, 2, 22, 4);
  const st = memo('shoulderStrokes' + x.toFixed(0) + y.toFixed(0) + s.toFixed(3), () => [
    stroke(X([[-80, -10], [-210, 30], [-360, 90], [-430, 200], [-452, 420]]), { w: 22 * s, tone: .9, dry: .5, prof: 'robe', seed: 71, nb: 18 }),
    stroke(X([[80, -10], [220, 30], [380, 90], [440, 200], [452, 420]]), { w: 22 * s, tone: .9, dry: .5, prof: 'robe', seed: 72, nb: 18 }),
    stroke(X(S.collarL), { w: 5 * s, tone: .8, dry: .3, prof: 'even', seed: 73 }),
    stroke(X(S.collarR), { w: 5 * s, tone: .8, dry: .3, prof: 'even', seed: 74 }),
  ]);
  st.forEach((s1, i) => draw(L.ink, s1, clamp(k * 1.4 - i * .05), .9));
}

// —— 侧面坐姿的人（只画桌面以上：头、肩、上身、搭在桌上的手臂）——
// x, y = 颈根；s = 缩放（1 ≈ 头高 200 px）；dir = 1 面朝右，-1 面朝左
// o.style: 'young'（80 年代的浓密黑发）| 'oshima'（短发、发际线靠后、眼镜）| 'cap'（军帽）| 'bald'（光头）
const PROFILE = [[0, -105], [48, -88], [66, -55], [72, -30], [68, -18], [72, -10], [92, 18], [74, 26], [76, 36], [78, 42], [72, 48], [76, 54], [70, 62], [74, 76], [58, 92], [20, 98], [-12, 72], [-58, 50], [-80, 10], [-82, -30], [-60, -85]];
export function profileFigure(L, x, y, s, dir = 1, o = {}) {
  const k = o.k ?? 1, style = o.style || 'young', tone = o.tone ?? 1;
  const hx = x + 6 * s * dir, hy = y - 128 * s + (o.headDy || 0) * s, hrot = (o.headRot || 0) * dir;
  const H = P => xform(P, hx, hy, s, hrot, dir);
  const B = P => xform(P, x, y, s, 0, dir);
  const key = `pf:${style}:${dir}:${x.toFixed(1)}:${y.toFixed(1)}:${s.toFixed(3)}:${hrot.toFixed(3)}:${(o.headDy || 0).toFixed(2)}`;
  // 上身（外套）：一块中墨 + 背线
  const torso = [[-30, -20], [40, -18], [86, 30], [96, 120], [104, 250], [-96, 250], [-92, 120], [-70, 20]];
  if (o.knock !== false) knock(L, [B(torso), H(PROFILE), H([[-34, 70], [38, 92], [44, 150], [-40, 150]]), H([[52, -78], [40, -104], [0, -126], [-52, -112], [-92, -60], [-92, 0], [-74, 50], [-40, 52]])]);
  blob(L.cw, B(torso), (o.coat ?? .5) * k * tone, 5, 31 + (dir > 0 ? 0 : 7), 4);
  // 脖子
  blob(L.cw, H([[-34, 70], [38, 92], [44, 150], [-40, 150]]), .2 * k * tone, 3, 32);
  // 脸：淡墨，侧脸轮廓用一笔浓墨
  blob(L.cw, H(PROFILE), (style === 'bald' ? .2 : .16) * k * tone, 2, 33, 4);
  const st = memo(key, () => {
    const S = {};
    S.face = stroke(smooth(H(PROFILE.slice(1, 16)), 4), { w: 4.2 * s, tone: .85, dry: .25, prof: 'even', seed: 34 });
    S.back = stroke(smooth(B([[-70, 20], [-92, 120], [-98, 250]]), 6), { w: 14 * s, tone: .9, dry: .55, prof: 'robe', seed: 35, nb: 14 });
    S.front = stroke(smooth(B([[40, -18], [86, 30], [96, 120]]), 6), { w: 9 * s, tone: .85, dry: .5, prof: 'robe', seed: 36, nb: 10 });
    // 手臂：从肩到肘再平放在桌上
    S.arm = stroke(smooth(B([[22, 34], [58, 118], [76, 186], [150, 212], [226, 214]]), 6), { w: 24 * s, tone: .72, dry: .5, prof: 'robe', seed: 37, nb: 16 });
    S.eye = stroke(H([[52, -18], [62, -15]]), { w: 4 * s, tone: .95, dry: .1, prof: 'tip', seed: 38 });
    S.brow = stroke(H([[44, -34], [66, -30]]), { w: 5 * s, tone: .9, dry: .4, prof: 'tip', seed: 39 });
    S.ear = stroke(smooth(H([[-4, -8], [-18, -14], [-24, 6], [-18, 30], [-4, 28]]), 4), { w: 3.6 * s, tone: .8, dry: .3, prof: 'even', seed: 40 });
    if (style === 'oshima') {
      S.glass = stroke(smooth(H([[48, -32], [74, -32], [76, -8], [50, -4], [46, -18], [48, -32]]), 4), { w: 4 * s, tone: .95, dry: .1, prof: 'even', seed: 41 });
      S.temple = stroke(H([[48, -22], [-10, -16]]), { w: 3.4 * s, tone: .9, dry: .2, prof: 'even', seed: 42 });
    }
    if (style === 'cap') {
      S.visor = stroke(smooth(H([[-50, -70], [20, -78], [60, -72], [96, -60]]), 5), { w: 12 * s, tone: .95, dry: .2, prof: 'even', seed: 43 });
    }
    return S;
  });
  // 头发 / 帽子
  if (style === 'young') blob(L.cw, H([[52, -78], [40, -104], [0, -122], [-50, -110], [-88, -60], [-90, 0], [-74, 50], [-40, 52], [-26, 10], [8, 4], [20, -30], [40, -52]]), .85 * k * tone, 4, 44, 5);
  if (style === 'oshima') blob(L.cw, H([[18, -96], [-20, -110], [-62, -92], [-86, -40], [-84, 10], [-64, 46], [-36, 40], [-30, 4], [-6, -6], [0, -40], [10, -76]]), .62 * k * tone, 3, 45, 5);
  if (style === 'cap') {
    blob(L.cw, H([[-74, -64], [-60, -120], [-10, -146], [56, -134], [90, -96], [70, -70], [0, -76]]), .82 * k * tone, 3, 46, 4);
    blob(L.cw, H([[-80, -40], [-90, 10], [-70, 44], [-40, 40], [-30, -10], [-10, -40], [-40, -64]]), .7 * k * tone, 3, 47, 4);
  }
  if (style === 'bald') blob(L.cw, H([[-10, -104], [-58, -86], [-82, -30], [-80, 10], [-40, 0], [10, -60], [40, -88]]), .07 * k * tone, 2, 48, 5);
  if (o.blond) {   // 金发：col 层的一层淡金（不是谱线金，是更淡的麦秆色）
    const P = smoothClosed(H([[56, -76], [44, -106], [0, -126], [-52, -112], [-90, -62], [-92, 0], [-70, 46], [-36, 46], [-24, 6], [10, 0], [24, -36], [44, -60]]), 5);
    L.cc.save(); L.cc.globalAlpha = .85 * k; L.cc.fillStyle = 'rgb(214,190,132)'; L.cc.beginPath(); P.forEach((p, i) => i ? L.cc.lineTo(...p) : L.cc.moveTo(...p)); L.cc.closePath(); L.cc.fill(); L.cc.restore();
  }
  const order = ['back', 'front', 'arm', 'face', 'ear', 'eye', 'brow', 'glass', 'temple', 'visor'];
  order.forEach((n, i) => { if (st[n]) draw(L.ink, st[n], clamp(k * 1.6 - i * .05), .92 * tone); });
}

// —— 背影：穿军装、戴军帽的人（站着，只画腰以上）。x, y = 颈根，s = 缩放 ——
export function backSoldier(L, x, y, s, o = {}) {
  const k = o.k ?? 1, sway = o.sway ?? 0;
  const X = P => xform(P, x, y, s, sway);
  const S = memo('backSoldier', () => ({
    coat: [[-60, -6], [-170, 30], [-230, 110], [-250, 330], [-238, 620], [238, 620], [250, 330], [230, 110], [170, 30], [60, -6]],
    head: [[-62, -40], [-70, -110], [-58, -140], [58, -140], [70, -110], [62, -40], [36, 0], [-36, 0]],
    nape: [[-60, -60], [-66, -128], [66, -128], [60, -60], [30, -48], [-30, -48]],
    cap: [[-96, -150], [-104, -200], [-70, -240], [0, -252], [70, -240], [104, -200], [96, -150], [0, -146]],
    band: [[-92, -156], [92, -156], [86, -128], [-86, -128]],
    earL: [[-64, -100], [-84, -110], [-88, -78], [-70, -62]], earR: [[64, -100], [84, -110], [88, -78], [70, -62]],
    collar: [[-58, -10], [58, -10], [52, 26], [-52, 26]],
  }));
  if (o.knock !== false) knock(L, [X(S.coat), X(S.head), X(S.cap), X(S.earL), X(S.earR), X(S.collar)], 4);
  blob(L.cw, X(S.coat), .58 * k, 5, 81, 4);
  blob(L.cw, X(S.head), .2 * k, 3, 82, 4);
  blob(L.cw, X(S.nape), .55 * k, 3, 79, 4);
  blob(L.cw, X(S.earL), .26 * k, 2, 77, 3); blob(L.cw, X(S.earR), .26 * k, 2, 78, 3);
  blob(L.cw, X(S.cap), .72 * k, 3, 83, 4);
  mass(L.cd, X(S.band), .85 * k, 1, 84);
  blob(L.cw, X(S.collar), .66 * k, 2, 85, 3);
  const st = memo('backSoldierSt' + x.toFixed(0) + y.toFixed(0) + s.toFixed(3) + sway.toFixed(3), () => [
    stroke(smooth(X([[-60, -6], [-170, 30], [-230, 110], [-250, 330], [-240, 620]]), 6), { w: 16 * s, tone: .9, dry: .5, prof: 'robe', seed: 86, nb: 16 }),
    stroke(smooth(X([[60, -6], [170, 30], [230, 110], [250, 330], [240, 620]]), 6), { w: 16 * s, tone: .9, dry: .5, prof: 'robe', seed: 87, nb: 16 }),
    stroke(X([[0, 40], [0, 600]]), { w: 4 * s, tone: .7, dry: .6, prof: 'even', seed: 88 }),            // 背缝
    stroke(smooth(X([[-200, 300], [0, 316], [200, 300]]), 4), { w: 10 * s, tone: .85, dry: .4, prof: 'even', seed: 89 }),  // 腰带
    stroke(smooth(X([[-96, -152], [-104, -200], [-70, -240], [0, -252], [70, -240], [104, -200], [96, -152]]), 5), { w: 6 * s, tone: .95, dry: .3, prof: 'even', seed: 90 }),
    stroke(smooth(X([[-84, -110], [-88, -78], [-70, -62]]), 3), { w: 4 * s, tone: .8, dry: .3, prof: 'even', seed: 91 }),
    stroke(smooth(X([[84, -110], [88, -78], [70, -62]]), 3), { w: 4 * s, tone: .8, dry: .3, prof: 'even', seed: 97 }),
  ]);
  st.forEach((s1, i) => draw(L.ink, s1, clamp(k * 1.5 - i * .05), .92));
}

// —— 正面站立的小人（远处），金发、白衬衫。x, y = 脚底，s = 缩放（1 ≈ 身高 600）——
export function frontFigure(L, x, y, s, o = {}) {
  const k = o.k ?? 1;
  const X = P => xform(P, x, y, s, 0);
  const S = memo('frontFigure', () => ({
    head: [[-38, -560], [-40, -610], [-22, -640], [22, -640], [40, -610], [38, -560], [20, -528], [-20, -528]],
    hair: [[-44, -588], [-46, -628], [-24, -662], [24, -664], [48, -630], [46, -588], [30, -612], [0, -622], [-30, -610]],
    shirt: [[-26, -520], [26, -520], [96, -490], [110, -300], [90, -230], [-90, -230], [-110, -300], [-96, -490]],
    legs: [[-84, -232], [84, -232], [70, 0], [16, 0], [0, -150], [-16, 0], [-70, 0]],
  }));
  if (o.knock !== false) knock(L, [X(S.legs), X(S.shirt), X(S.head), X(S.hair)], 4);
  blob(L.cw, X(S.legs), .55 * k, 3, 91, 4);
  const cc = L.cc;
  const fill = (P, rgb, a) => { const Q = smoothClosed(X(P), 4); cc.save(); cc.globalAlpha = a * k; cc.fillStyle = `rgb(${rgb})`; cc.beginPath(); Q.forEach((p, i) => i ? cc.lineTo(...p) : cc.moveTo(...p)); cc.closePath(); cc.fill(); cc.restore(); };
  fill(S.shirt, '238,232,218', .95);
  fill(S.head, '214,196,172', .95);
  fill(S.hair, '220,194,128', .95);
  const st = memo('frontFigureSt' + x.toFixed(0) + y.toFixed(0) + s.toFixed(3), () => [
    stroke(smooth(X(S.shirt.concat([S.shirt[0]])), 3), { w: 3.2 * s / .25, tone: .8, dry: .4, prof: 'even', seed: 92 }),
    stroke(smooth(X([[-96, -488], [-120, -380], [-118, -250]]), 4), { w: 12 * s / .25, tone: .5, dry: .5, prof: 'robe', seed: 93 }),
    stroke(smooth(X([[96, -488], [120, -380], [118, -250]]), 4), { w: 12 * s / .25, tone: .5, dry: .5, prof: 'robe', seed: 94 }),
    stroke(X([[-16, -592], [-8, -592]]), { w: 3 * s / .25, tone: .95, dry: .1, prof: 'tip', seed: 95 }),
    stroke(X([[8, -592], [16, -592]]), { w: 3 * s / .25, tone: .95, dry: .1, prof: 'tip', seed: 96 }),
  ]);
  // 眼睛、轮廓线：画在 col 层上面才看得见，所以单独描
  pline2(cc, smoothClosed(X(S.head), 3), 2.2 * s / .25, [90, 70, 56], .8 * k);
  pline2(cc, X([[-16, -592], [-7, -592]]), 2.6 * s / .25, [40, 30, 26], .9 * k);
  pline2(cc, X([[7, -592], [16, -592]]), 2.6 * s / .25, [40, 30, 26], .9 * k);
  pline2(cc, smoothClosed(X(S.shirt), 3), 2.2 * s / .25, [110, 96, 80], .7 * k);
  st.slice(1, 3).forEach(s1 => draw(L.ink, s1, k, .8));
}
function pline2(c, P, w, rgb, a) {
  c.save(); c.globalAlpha = a; c.strokeStyle = `rgb(${rgb.join(',')})`; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); P.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.stroke(); c.restore();
}

// —— 背影：坐在琴凳上、俯身写谱的人（头发浓黑，3/4 背面）。x, y = 颈根 ——
export function backWriter(L, x, y, s, o = {}) {
  const k = o.k ?? 1, lean = o.lean ?? 0, tone = o.tone ?? 1;
  const X = P => xform(P, x, y, s, lean);
  const S = memo('backWriter', () => ({
    body: [[-40, -10], [-150, 30], [-200, 140], [-210, 380], [-180, 560], [170, 560], [210, 380], [196, 140], [150, 30], [40, -10]],
    head: [[-70, -40], [-92, -110], [-80, -180], [-30, -214], [36, -212], [84, -178], [94, -110], [74, -40], [30, -14], [-30, -14]],
    hair: [[-80, -100], [-96, -150], [-80, -196], [-30, -226], [36, -224], [88, -192], [98, -140], [84, -96], [60, -120], [0, -132], [-50, -118]],
    arm: [[150, 40], [230, 120], [262, 220], [250, 300]],
    bench: [[-260, 560], [300, 560], [300, 600], [-260, 600]],
  }));
  if (o.knock !== false) knock(L, [X(S.body), X(S.head), X(S.hair)], 4);
  blob(L.cw, X(S.body), .5 * k * tone, 5, 141, 4);
  blob(L.cw, X(S.head), .16 * k * tone, 3, 142, 4);
  blob(L.cw, X(S.hair), .86 * k * tone, 4, 143, 4);
  const st = memo('backWriterSt' + x.toFixed(0) + y.toFixed(0) + s.toFixed(3) + lean.toFixed(3), () => [
    stroke(smooth(X([[-40, -10], [-150, 30], [-200, 140], [-210, 380], [-180, 560]]), 6), { w: 14 * s, tone: .9, dry: .5, prof: 'robe', seed: 144, nb: 14 }),
    stroke(smooth(X([[40, -10], [150, 30], [196, 140], [210, 380], [170, 560]]), 6), { w: 14 * s, tone: .9, dry: .5, prof: 'robe', seed: 145, nb: 14 }),
    stroke(smooth(X(S.arm), 6), { w: 26 * s, tone: .75, dry: .5, prof: 'robe', seed: 146, nb: 16 }),
    stroke(smooth(X([[-92, -110], [-104, -96], [-100, -70], [-84, -64]]), 3), { w: 4 * s, tone: .8, dry: .3, prof: 'even', seed: 147 }),
  ]);
  st.forEach((s1, i) => draw(L.ink, s1, clamp(k * 1.5 - i * .05), .92 * tone));
  // 暗场里：在颜色层上再盖一层剪影（灯光是画在颜色层的，不盖的话光会把人洗淡），再沿受光的一侧描一道暖色轮廓光
  if (o.sil) {
    // 举起来写谱的右臂：从肩膀伸到谱架上，手里一支笔
    const w = o.write ?? 0, hx = 236 + w * 10, hy = -112 - w * 6;
    const arm = [[110, 16], [200, 34], [286, 70], [300, 16], [hx + 20, hy + 26], [hx, hy], [hx - 22, hy + 14], [232, -14], [180, 0], [120, -14]];
    silhouette(L, [X(S.body), X(S.head), X(S.hair), X(arm)], o.sil, o.rim, [X([[40, -14], [150, 30], [200, 140], [210, 300]]), X([[30, -226], [88, -192], [98, -140], [84, -96]]), X([[200, 34], [286, 70], [300, 16], [hx + 20, hy + 26]])]);
    const pen = X([[hx - 4, hy + 6], [hx + 26, hy - 46]]);
    const c = L.cc; c.save(); c.strokeStyle = 'rgb(214,170,110)'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(...pen[0]); c.lineTo(...pen[1]); c.stroke(); c.restore();
  }
}
export function silhouette(L, polys, rgb, rim, rimPaths = []) {
  const c = L.cc;
  c.save(); c.fillStyle = `rgb(${rgb.join(',')})`; c.globalAlpha = .96;
  for (const P of polys) { const Q = smoothClosed(P, 5); c.beginPath(); Q.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath(); c.fill(); }
  c.restore();
  if (rim) for (const P of rimPaths) {
    const Q = smooth(P, 6);
    c.save(); c.strokeStyle = `rgb(${rim.join(',')})`; c.lineWidth = 3; c.lineCap = 'round'; c.globalAlpha = .7;
    c.beginPath(); Q.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.stroke(); c.restore();
  }
}

// —— 正脸：光头、笑着的人（原军曹）。cx, cy = 脸中心；s = 缩放（1 ≈ 脸宽 300）——
// 月光从右上方来：右半边脸亮（col 层的冷白），左半边在墨色阴影里。o.tear = 0..1 泪光
const FACE = [[0, -206], [70, -198], [124, -160], [148, -100], [152, -40], [150, 10], [138, 70], [112, 128], [70, 170], [26, 192], [0, 196], [-26, 192], [-70, 170], [-112, 128], [-138, 70], [-150, 10], [-152, -40], [-148, -100], [-124, -160], [-70, -198]];
export function haraFace(L, cx, cy, s, o = {}) {
  const k = o.k ?? 1, smile = o.smile ?? 1, tear = o.tear ?? 0, light = o.light ?? 1;
  const X = P => xform(P, cx, cy, s, o.rot || 0);
  const { cw, cd, cc } = L;
  const earL = [[-148, -50], [-178, -64], [-188, -20], [-176, 30], [-146, 34]], earR = earL.map(p => [-p[0], p[1]]);
  const neck = [[-84, 150], [84, 150], [96, 300], [-96, 300]];
  const shirt = [[-96, 250], [-240, 300], [-330, 420], [-350, 700], [350, 700], [330, 420], [240, 300], [96, 250], [0, 360]];
  if (o.knock !== false) knock(L, [X(FACE), X(earL), X(earR), X(neck), X(shirt)], 5);
  // 衣服（囚服：灰白的粗布）、脖子
  blob(cw, X(shirt), .28 * k, 4, 161, 4);
  blob(cw, X(neck), .2 * k, 3, 162, 4);
  // 脸和耳朵：淡墨底，左半边再压一层阴影
  blob(cw, X(FACE), .16 * k, 2, 163, 4);
  blob(cw, X(earL), .2 * k, 2, 164, 3); blob(cw, X(earR), .14 * k, 2, 165, 3);
  blob(cw, X([[0, -206], [-70, -198], [-124, -160], [-148, -100], [-152, -40], [-150, 10], [-138, 70], [-112, 128], [-70, 170], [-26, 192], [-6, 196], [-20, 120], [-40, 40], [-36, -60], [-20, -150]]), .2 * k, 3, 166, 4);
  // 光头的发茬：头顶一层很淡的灰
  blob(cw, X([[0, -206], [70, -198], [124, -160], [142, -110], [100, -130], [0, -146], [-100, -130], [-142, -110], [-124, -160], [-70, -198]]), .12 * k, 2, 167, 4);
  // 月光：右半边脸、右耳、肩上的冷白（col 层）
  // 月光是从右上方斜照过来的：用一道从右往左渐弱的光（不是一刀切的半边脸）
  const [g0, g1] = X([[170, -120], [-40, 40]]);
  const lg = cc.createLinearGradient(g0[0], g0[1], g1[0], g1[1]);
  lg.addColorStop(0, 'rgba(204,214,230,.55)'); lg.addColorStop(.55, 'rgba(204,214,230,.3)'); lg.addColorStop(1, 'rgba(204,214,230,0)');
  const lit = (P, a, fill = 'rgb(204,214,230)') => { const Q = smoothClosed(X(P), 5); cc.save(); cc.globalAlpha = a * k * light; cc.fillStyle = fill; cc.beginPath(); Q.forEach((p, i) => i ? cc.lineTo(...p) : cc.moveTo(...p)); cc.closePath(); cc.fill(); cc.restore(); };
  lit(FACE, 1, lg);
  lit([[150, -44], [178, -60], [186, -20], [174, 28], [148, 30]], .3);
  lit([[96, 250], [240, 300], [330, 420], [340, 560], [200, 420], [110, 320]], .3);
  const st = memo('hara' + cx.toFixed(1) + cy.toFixed(1) + s.toFixed(3) + smile.toFixed(2), () => {
    const sm = smile;
    const W = (w) => w * s;
    return {
      face: stroke(smooth(X(FACE.concat([FACE[0]])), 4), { w: W(7), tone: .85, dry: .35, prof: 'even', seed: 170 }),
      earL: stroke(smooth(X([[-150, -50], [-178, -62], [-188, -20], [-176, 28], [-148, 34]]), 4), { w: W(6), tone: .85, dry: .3, prof: 'even', seed: 171 }),
      earR: stroke(smooth(X([[150, -50], [178, -62], [188, -20], [176, 28], [148, 34]]), 4), { w: W(6), tone: .7, dry: .35, prof: 'even', seed: 172 }),
      browL: stroke(smooth(X([[-104, -70], [-76, -80], [-38, -74]]), 4), { w: W(15), tone: .9, dry: .55, prof: 'tip', seed: 173, nb: 12 }),
      browR: stroke(smooth(X([[38, -74], [76, -80], [104, -70]]), 4), { w: W(15), tone: .9, dry: .55, prof: 'tip', seed: 174, nb: 12 }),
      // 眯起来笑的眼睛：向上弯的弧
      eyeL: stroke(smooth(X([[-98, -26 + 4 * sm], [-74, -38 - 4 * sm], [-44, -28 + 4 * sm]]), 5), { w: W(8), tone: .95, dry: .2, prof: 'tip', seed: 175 }),
      eyeR: stroke(smooth(X([[44, -28 + 4 * sm], [74, -38 - 4 * sm], [98, -26 + 4 * sm]]), 5), { w: W(8), tone: .95, dry: .2, prof: 'tip', seed: 176 }),
      nose: stroke(smooth(X([[-6, -24], [-10, 30], [-28, 52], [-10, 62], [0, 58], [10, 62], [28, 52]]), 4), { w: W(5), tone: .8, dry: .35, prof: 'even', seed: 177 }),
      // 笑纹
      foldL: stroke(smooth(X([[-40, 54], [-72, 92], [-86, 128]]), 4), { w: W(6), tone: .7, dry: .5, prof: 'tip', seed: 178 }),
      foldR: stroke(smooth(X([[40, 54], [72, 92], [86, 128]]), 4), { w: W(6), tone: .6, dry: .5, prof: 'tip', seed: 179 }),
      // 咧开的嘴：上唇线、下唇弧
      lipU: stroke(smooth(X([[-62, 100 - 9 * sm], [-30, 108], [0, 110], [30, 108], [62, 100 - 9 * sm]]), 5), { w: W(8), tone: .95, dry: .25, prof: 'tip', seed: 180 }),
      lipD: stroke(smooth(X([[-50, 110 - 4 * sm], [-24, 128 + 4 * sm], [0, 132 + 4 * sm], [24, 128 + 4 * sm], [50, 110 - 4 * sm]]), 5), { w: W(7), tone: .85, dry: .3, prof: 'tip', seed: 181 }),
      collar: stroke(smooth(X([[-96, 250], [-40, 330], [0, 360], [40, 330], [96, 250]]), 5), { w: W(8), tone: .85, dry: .4, prof: 'even', seed: 182 }),
      shoulders: stroke(smooth(X([[-96, 250], [-240, 300], [-330, 420], [-350, 700]]), 6), { w: W(16), tone: .85, dry: .5, prof: 'robe', seed: 183, nb: 14 }),
      shouldersR: stroke(smooth(X([[96, 250], [240, 300], [330, 420], [350, 700]]), 6), { w: W(16), tone: .7, dry: .5, prof: 'robe', seed: 184, nb: 14 }),
    };
  });
  // 牙（笑开的嘴里一线白）
  const teeth = smoothClosed(X([[-52, 104 - 7 * smile], [0, 111], [52, 104 - 7 * smile], [26, 116 + 2 * smile], [0, 119 + 2 * smile], [-26, 116 + 2 * smile]]), 4);
  cc.save(); cc.globalAlpha = .9 * k; cc.fillStyle = 'rgb(232,228,214)'; cc.beginPath(); teeth.forEach((p, i) => i ? cc.lineTo(...p) : cc.moveTo(...p)); cc.closePath(); cc.fill(); cc.restore();
  Object.values(st).forEach((s1, i) => draw(L.ink, s1, clamp(k * 1.6 - i * .03), .95));
  // 嘴和眼睛在 col 层上再描一遍（牙和月光在 col 层，会盖住墨线）
  const ink2 = (P, w, a = .9) => { const Q = smooth(X(P), 5); cc.save(); cc.globalAlpha = a * k; cc.strokeStyle = 'rgb(20,18,22)'; cc.lineWidth = w * s; cc.lineCap = 'round'; cc.beginPath(); Q.forEach((p, i) => i ? cc.lineTo(...p) : cc.moveTo(...p)); cc.stroke(); cc.restore(); };
  ink2([[-62, 100 - 9 * smile], [-30, 108], [0, 110], [30, 108], [62, 100 - 9 * smile]], 6);
  ink2([[-50, 108 - 5 * smile], [-26, 120 + 2 * smile], [0, 123 + 2 * smile], [26, 120 + 2 * smile], [50, 108 - 5 * smile]], 4, .6);
  ink2([[44, -28 + 4 * smile], [74, -38 - 4 * smile], [98, -26 + 4 * smile]], 7);
  ink2([[38, -74], [76, -80], [104, -70]], 10, .8);
  ink2([[40, 54], [72, 92], [86, 128]], 4, .45);
  ink2([[150, -44], [176, -60], [186, -20], [174, 28], [148, 32]], 4, .5);
  // 泪光：右眼下一点亮光，顺着脸颊一道细细的亮线
  if (tear > 0) {
    const e = X([[60, -16]])[0];
    cc.save(); cc.globalAlpha = tear * k; cc.fillStyle = 'rgb(240,244,250)'; cc.beginPath(); cc.arc(e[0], e[1], 5 * s, 0, 7); cc.fill();
    const path = smooth(X([[60, -14], [64, 20], [62, 60 * tear + 10]]), 5);
    cc.strokeStyle = 'rgba(236,242,250,.75)'; cc.lineWidth = 3.5 * s; cc.lineCap = 'round'; cc.beginPath(); path.forEach((p, i) => i ? cc.lineTo(...p) : cc.moveTo(...p)); cc.stroke(); cc.restore();
  }
}
