// 第三幕：1982，拉罗汤加岛。海上落日（就是那枚「请」字印），远处是岛上尖峭的火山峰，岸边椰树。
// 五线谱从天上落下，弯下去、长出刺，变成战俘营的五道铁丝网。
// 前景是穿军装、戴军帽的背影（他饰演的营长世野井），铁丝网后面站着金发的俘虏（大卫·鲍伊饰演），两人隔网对望。
import { clamp, lerp, hash, vnoise } from '../lib.js';
import { camera, SNAP, GLIDE, kf, smooth, resampleN, lerpPts, partial } from '../util.js';
import { mk, draw as paint, mass } from '../ink.js';
import { pline, staff, GOLD } from '../geo.js';
import { line } from '../text.js';
import { backSoldier, frontFigure, memo, stroke, blob } from '../figures.js';
import { seal, VERM } from '../seal.js';
import { TONES } from '../comp.js';
import { T, CAPS, CUE, lastNote } from '../story.js';
import { SUN } from './cond.js';
import { LIFT_STAFF } from './read.js';

const POSTS = [-80, 300, 680, 1060, 1440];
const WIRE_Y = [1236, 1276, 1316, 1356, 1396];
const FALL0 = T.isle + .5, FALL1 = T.isle + 2.6;     // 五线谱落下变铁丝网

// 镜头：先框住左边（落日 + 背影），再滑到右边露出铁丝网后的人
function camAt(t) {
  const c = kf(t, [[T.isle - 1, [540, 1000, 1.0]], [T.pan, [560, 1010, 1.04]], [T.pan + 2.4, [700, 1070, 1.1]], [T.night, [690, 1130, 1.16]]]);
  return camera(c[0], c[1], c[2], 0, 540, 1000);
}
// 铁丝在两根桩之间下垂
function wirePts(i, n = 64) {
  const out = [];
  for (let j = 0; j < n; j++) {
    const x = lerp(POSTS[0], POSTS[POSTS.length - 1], j / (n - 1));
    let seg = 0; while (seg < POSTS.length - 2 && x > POSTS[seg + 1]) seg++;
    const u = (x - POSTS[seg]) / (POSTS[seg + 1] - POSTS[seg]);
    out.push([x, WIRE_Y[i] + Math.sin(u * Math.PI) * (10 + i * 2)]);
  }
  return out;
}

export function draw(L, t, o = {}) {
  const cam = camAt(t); cam.apply(L);
  const z = cam.z, { cw, cd, cc } = L;
  const S = memo('isleStatic', () => {
    const S = {};
    // 远山：岛上尖峭的火山峰（淡墨），山脊线用浓一点的墨勾
    const ridge = [[-410, 960], [-350, 860], [-270, 800], [-210, 720], [-170, 690], [-140, 640], [-120, 655], [-80, 700], [-30, 650], [0, 560], [20, 548], [40, 600], [80, 690], [150, 740], [230, 800], [310, 860], [380, 920], [440, 960]];
    S.mtn = ridge.concat([[440, 1000], [-410, 1000]]);
    S.ridge = stroke(smooth(ridge, 4), { w: 7, tone: .55, dry: .7, prof: 'brush', seed: 401, nb: 14 });
    S.mtn2 = [[400, 960], [520, 900], [640, 870], [760, 900], [900, 940], [1100, 960], [1100, 1000], [400, 1000]];
    // 海浪：宋画式的平行波纹（干笔，近处密）
    S.waves = [];
    for (let i = 0; i < 26; i++) {
      const y = 975 + Math.pow(i / 25, 1.6) * 210, x0 = -300 + hash(i * 3.3) * 400, len = 300 + hash(i * 5.1) * 500;
      for (let x = x0; x < 1600; x += len + 120 + hash(i + x) * 200) {
        const P = []; for (let j = 0; j <= 8; j++) P.push([x + j * len / 8, y + Math.sin(j / 8 * Math.PI * 2 + i) * (2 + i * .25)]);
        S.waves.push({ s: stroke(P, { w: 2 + i * .12, tone: .5, dry: .7, prof: 'tip', seed: 410 + S.waves.length, nb: 5 }), y });
      }
    }
    // 椰树：弯的树干 + 一把扇形的叶子
    const palm = (x, y, h, lean, seed) => {
      const top = [x + lean, y - h];
      const trunk = stroke(smooth([[x, y], [x + lean * .3, y - h * .4], [x + lean * .75, y - h * .8], top], 6), { w: 18, tone: .85, dry: .55, prof: 'rise', seed, nb: 16 });
      const fronds = [];
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * .38 + (hash(seed + i) - .5) * .2, len = h * (.34 + hash(seed * 2 + i) * .12);
        const mid = [top[0] + Math.cos(a) * len * .55, top[1] + Math.sin(a) * len * .55 - len * .12];
        const end = [top[0] + Math.cos(a) * len, top[1] + Math.sin(a) * len + len * .35];
        fronds.push(stroke(smooth([top, mid, end], 6), { w: 26, tone: .85, dry: .6, prof: 'cone', seed: seed + 10 + i, nb: 22 }));
      }
      return { trunk, fronds };
    };
    S.palms = [palm(30, 1210, 560, 70, 430), palm(170, 1220, 440, -40, 450), palm(1300, 1200, 600, -90, 470)];
    // 铁丝网桩
    S.posts = POSTS.map((x, i) => stroke([[x, 1150], [x + (hash(i) - .5) * 10, 1470]], { w: 16, tone: .9, dry: .4, prof: 'even', seed: 480 + i, nb: 10 }));
    return S;
  });

  // 天空：近地平线一层暖色的余晖（col 层）
  cc.save(); const sky = cc.createLinearGradient(0, 480, 0, 990);
  sky.addColorStop(0, 'rgba(244,214,170,0)'); sky.addColorStop(1, 'rgba(240,196,150,.5)');
  cc.fillStyle = sky; cc.fillRect(-600, 300, 2600, 700); cc.restore();
  // 落日：朱红的圆（和上一幕的印章同一块红），慢慢下沉
  const sunY = SUN.y + (t - T.isle) * 6;
  const sunW = cam.toWorld(SUN.x, SUN.y);
  cc.save(); cc.fillStyle = `rgb(${VERM.join(',')})`; cc.globalAlpha = .96;
  cc.beginPath(); cc.arc(sunW[0], sunW[1] + (t - T.isle) * 6, SUN.r / z, 0, 7); cc.fill(); cc.restore();
  // 远山、海
  mass(cw, S.mtn, .3, 5, 402);
  mass(cw, S.mtn2, .16, 5, 403);
  paint(L.ink, S.ridge, 1, .7);
  mass(cw, [[-600, 1000], [2000, 1000], [2000, 1200], [-600, 1200]], .1, 3, 404);
  for (const w of S.waves) paint(L.ink, w.s, 1, .55);
  // 落日在海面的倒影：一串断开的朱红短横
  for (let i = 0; i < 9; i++) {
    const y = 1004 + i * 18, hw = (60 - i * 5) * (.6 + .4 * hash(i * 7 + Math.floor(t * 4)));
    pline(cc, [[sunW[0] - hw, y], [sunW[0] + hw * .7, y]], 5 - i * .35, VERM, .5 - i * .04);
  }
  // 沙滩
  mass(cw, [[-600, 1190], [2000, 1180], [2000, 2400], [-600, 2400]], .2, 4, 405);
  // 椰树（随风轻摆）
  S.palms.forEach((p, i) => {
    paint(L.ink, p.trunk, 1, .9);
    // 叶子绕树顶随风轻摆（确定性：只由 t 决定）
    const top = p.trunk.P[p.trunk.P.length - 1], ang = Math.sin(t * .9 + i * 1.7) * .035 + Math.sin(t * 2.3 + i) * .012;
    for (const c of [cw, cd]) { c.save(); c.translate(top[0], top[1]); c.rotate(ang); c.translate(-top[0], -top[1]); }
    p.fronds.forEach(f => paint(L.ink, f, 1, .85));
    for (const c of [cw, cd]) c.restore();
  });

  // 铁丝网后面的人：金发，白衬衫，看着这边
  const pk = SNAP(clamp((t - (T.pan - .4)) / 1.2));
  frontFigure(L, 960, 1336, .44, { k: 1 });

  // 五线谱落下 → 铁丝网：直线 → 下垂的铁丝，从谱线金沉成墨色，刺一个个长出来
  const fall = GLIDE(clamp((t - FALL0) / (FALL1 - FALL0)));
  const ink = clamp((t - FALL1 + .4) / 1.2);
  for (const p of S.posts) paint(L.ink, p, clamp((t - FALL1 + .6) / .8), .9);
  for (let i = 0; i < 5; i++) {
    const A = resampleN([cam.toWorld(LIFT_STAFF.x0, LIFT_STAFF.cy - 120 + (i - 2) * LIFT_STAFF.gap), cam.toWorld(LIFT_STAFF.x1, LIFT_STAFF.cy - 120 + (i - 2) * LIFT_STAFF.gap)], 64);
    const B = wirePts(i);
    const P = lerpPts(A, B, fall);
    const appear = clamp((t - FALL0 + .3) / .4);
    pline(cc, P, lerp(2.6 / z, 2.2, fall), GOLD, .95 * appear * (1 - ink));
    pline(cd, P, 2.6, [0, 0, 0], .85 * ink);
    // 刺：沿线每 70 px 一个小叉
    if (fall > .6) {
      const bk = clamp((fall - .6) / .4);
      for (let j = 2; j < 62; j += 3) {
        if (hash(i * 100 + j) > bk) continue;
        const [x, y] = P[j], r = 7;
        const col = ink > .5 ? [0, 0, 0] : GOLD, c = ink > .5 ? cd : cc;
        pline(c, [[x - r, y - r], [x + r, y + r]], 2.2, col, .9);
        pline(c, [[x - r, y + r], [x + r, y - r]], 2.2, col, .9);
      }
    }
  }

  // 前景：军装背影（他饰演的营长世野井），帽檐下的头随乐句微微转向铁丝网那边
  const look = SNAP(clamp((t - T.pan - .8) / 1.5));
  backSoldier(L, 330, 1470, 1.0, { sway: .02 * look });

  // 年份印 + 地名
  const sk = SNAP(clamp((t - T.isle - .3) / .15)), sOut = 1 - GLIDE(clamp((t - T.pan + .6) / .6));
  if (sk > 0 && sOut > 0) {
    seal(cc, { lines: ['19', '82'], font: 'serif', seed: 11 }, 96, 400, 104, sk, 0, sOut);
    line(L, { id: 'place1', t, t0: T.isle + .5, t1: T.pan - .1, text: '拉罗汤加岛 · 南太平洋', x: 222, y: 466, size: 34, tone: 'ink', ls: 3 });
  }
  line(L, { id: 'c5', t, t0: CAPS.c5.t[0], t1: CAPS.c5.t[1], text: CAPS.c5.text, x: 540, y: 300, size: 48, align: 'center', tone: 'ink' });
  line(L, { id: 'c6', t, t0: CAPS.c6.t[0], t1: CAPS.c6.t[1], text: CAPS.c6.text, x: 540, y: 300, size: 44, align: 'center', tone: 'ink' });
  return { tone: TONES.warm, paperX: cam.paper(), bleed: 5, rim: .9, vig: .26 };
}
