// 第六幕后半 + 第七幕：2022，NHK 509 录音室（黑白）。空旷的暗场，一台三角钢琴，一束顶光，
// 白发、戴圆眼镜的老人独自弹琴。手离开琴键；人像墨迹一样散去，只剩空琴凳。
// 最后：坂本龙一 1952–2023 / Ars longa, vita brevis / 艺术千秋，人生朝露，盖「千秋」印。
import { clamp, lerp, hash } from '../lib.js';
import { camera, SNAP, GLIDE, kf } from '../util.js';
import { line, FONT } from '../text.js';
import { grandPiano, pianist } from '../mono.js';
import { seal } from '../seal.js';
import { TONES } from '../comp.js';
import { T, CAPS, CUE } from '../story.js';

export const LIFT = T.end - 1.4, GONE0 = T.end + .2, GONE1 = T.end + 2.8, CARD = T.end + 3.4, OUT = T.end + 9.6;
let OFF = null;
const offCanvas = () => { if (!OFF) { OFF = document.createElement('canvas'); OFF.width = 1080; OFF.height = 1920; } return OFF; };
const M = { x: 300, y: 1270, s: 1.3 }, P = { x: 300 + 300 * 1.3, y: 1270 - 76 * 1.3, s: 1.3 };

export function draw(L, t, o = {}) {
  const c = kf(t, [[T.nhk - .6, [470, 1060, 1.12]], [T.end, [500, 1040, 1.02]], [CARD + 3, [520, 1000, .96]]]);
  const cam = camera(c[0], c[1], c[2], 0, 540, 1000); cam.apply(L);
  const { cc } = L;
  // 一束顶光
  cc.save(); const g = cc.createLinearGradient(500, 0, 500, 1400);
  g.addColorStop(0, 'rgba(210,208,202,.16)'); g.addColorStop(1, 'rgba(210,208,202,.02)');
  cc.fillStyle = g; cc.beginPath(); cc.moveTo(300, -100); cc.lineTo(520, -100); cc.lineTo(940, 1500); cc.lineTo(-160, 1500); cc.closePath(); cc.fill();
  const pool = cc.createRadialGradient(400, 1500, 20, 400, 1500, 640); pool.addColorStop(0, 'rgba(200,198,192,.13)'); pool.addColorStop(1, 'rgba(200,198,192,0)');
  cc.fillStyle = pool; cc.fillRect(-300, 1150, 1600, 800); cc.restore();
  grandPiano(L, P.x, P.y, P.s);
  // 弹琴（每个旋律音手微微一动），之后抬手，最后散去
  const play = t < LIFT ? CUE.melody.reduce((a, tn) => t >= tn && t < tn + .3 ? Math.sin((t - tn) / .3 * Math.PI) : a, 0) : 0;
  const lift = SNAP(clamp((t - LIFT) / 1.2));
  const gone = clamp((t - GONE0) / (GONE1 - GONE0));
  if (gone < 1) {
    // 人画在一张单独的画布上，散去时只擦这张（不擦到光）
    const off = offCanvas(), oc = off.getContext('2d');
    oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(0, 0, off.width, off.height); oc.setTransform(...cam.m);
    pianist({ cc: oc }, M.x, M.y, M.s, { age: 1, glasses: true, lift: Math.max(.35 * play, lift) });
    // 像墨迹被时间擦去：一个个不规则的小洞，从上往下、越来越多
    if (gone > 0) {
      const cc = oc;
      cc.save(); cc.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 520; i++) {
        const h = hash(i * 1.913), hy = hash(i * 7.37), r = 6 + hash(i * 3.1) * 26;
        const ty = lerp(M.y - 540 * M.s, M.y + 240 * M.s, hy);
        if (h * .55 + hy * .45 > gone * 1.25) continue;
        cc.globalAlpha = 1; cc.beginPath(); cc.arc(lerp(M.x - 120 * M.s, M.x + 280 * M.s, hash(i * 5.51)), ty, r, 0, 7); cc.fill();
      }
      cc.restore();
    }
    cc.save(); cc.setTransform(1, 0, 0, 1, 0, 0); cc.drawImage(off, 0, 0); cc.restore();
  }
  // 年份印 + 地名
  const sk = SNAP(clamp((t - T.nhk - .2) / .15)), sOut = 1 - GLIDE(clamp((t - T.nhk - 4.4) / .5));
  if (sk > 0 && sOut > 0) {
    seal(cc, { lines: ['20', '22'], font: 'serif', seed: 17 }, 110, 400, 96, sk, 0, sOut);
    line(L, { id: 'place2', t, t0: T.nhk + .4, t1: T.nhk + 4.9, text: 'NHK 509 录音室 · 东京', x: 226, y: 462, size: 32, tone: 'light', color: [214, 212, 206], ls: 3 });
  }
  line(L, { id: 'c12', t, t0: CAPS.c12.t[0], t1: CAPS.c12.t[1], text: CAPS.c12.text, x: 540, y: 290, size: 46, align: 'center', tone: 'light', color: [232, 230, 224] });
  // 片尾：三行字依次升起，最后落「千秋」印
  const end = T.end + 3.6, endOut = OUT;
  line(L, { id: 'e1', t, t0: end, t1: endOut, text: '坂本龙一  1952 – 2023', x: 540, y: 330, size: 40, align: 'center', tone: 'light', color: [206, 204, 198], ls: 6 });
  line(L, { id: 'e2', t, t0: end + .8, t1: endOut, text: 'Ars longa, vita brevis', x: 540, y: 470, size: 78, font: FONT.en(), align: 'center', tone: 'light', color: [240, 238, 232], ls: 1, stagger: .035 });
  line(L, { id: 'e3', t, t0: end + 1.6, t1: endOut, text: '艺术千秋，人生朝露', x: 540, y: 570, size: 42, align: 'center', tone: 'light', color: [222, 220, 214], ls: 8 });
  const s2 = SNAP(clamp((t - end - 2.6) / .15)), s2o = 1 - GLIDE(clamp((t - endOut + .4) / .4));
  if (s2 > 0 && s2o > 0) seal(cc, { lines: ['千', '秋'], font: 'brush', seed: 19 }, 490, 640, 100, s2, .03, s2o);
  return { tone: TONES.mono, paperX: cam.paper(), bleed: 0, vig: .5 };
}
