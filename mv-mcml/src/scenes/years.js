// 第六幕：四十年（黑白）。一排琴键横贯画面，每个白键上一个年份，从 1983 走到 2022。
// 键的上方是同一个人在不同的舞台上弹琴；随着年份往右走，他的头发从黑变白。
import { clamp, lerp, hash } from '../lib.js';
import { camera, SNAP, GLIDE, kf } from '../util.js';
import { keyboard } from '../geo.js';
import { line, FONT } from '../text.js';
import { grandPiano, pianist } from '../mono.js';
import { seal } from '../seal.js';
import { TONES } from '../comp.js';
import { T, CAPS, CUE } from '../story.js';

const KW = 132, KY = 1330, Y0 = 1983, Y1 = 2022;
// 当前的年份（带小数），前慢中快后慢
export const yearAt = t => lerp(Y0, Y1, GLIDE(clamp((t - T.years - .3) / (T.nhk - T.years - 1.0))));

export function draw(L, t, o = {}) {
  const cam = camera(540, 1000, 1, 0); cam.apply(L);
  const { cc } = L;
  const yr = yearAt(t), fi = yr - Y0;
  // 舞台：顶光的光锥
  cc.save(); const g = cc.createLinearGradient(540, 300, 540, 1250);
  g.addColorStop(0, 'rgba(200,198,192,.0)'); g.addColorStop(.25, 'rgba(200,198,192,.10)'); g.addColorStop(1, 'rgba(200,198,192,.02)');
  cc.fillStyle = g; cc.beginPath(); cc.moveTo(470, 300); cc.lineTo(610, 300); cc.lineTo(960, 1250); cc.lineTo(120, 1250); cc.closePath(); cc.fill(); cc.restore();
  // 背后换着的场馆轮廓（拱门 / 管风琴 / 幕布），随年份滑过去
  cc.save(); cc.strokeStyle = 'rgba(150,148,142,.22)'; cc.lineWidth = 2;
  for (let j = Math.floor(fi) - 2; j <= Math.floor(fi) + 2; j++) {
    const x = 540 + (j - fi) * 520, kind = ((j % 3) + 3) % 3;
    if (kind === 0) { for (let a = 0; a < 3; a++) { cc.beginPath(); cc.arc(x - 160 + a * 160, 820, 70, Math.PI, 0); cc.lineTo(x - 90 + a * 160, 1060); cc.moveTo(x - 230 + a * 160, 820); cc.lineTo(x - 230 + a * 160, 1060); cc.stroke(); } }
    if (kind === 1) { for (let a = 0; a < 11; a++) { const h = 180 + Math.abs(5 - a) * -14 + 120; cc.beginPath(); cc.moveTo(x - 200 + a * 40, 1060); cc.lineTo(x - 200 + a * 40, 1060 - h - 260); cc.stroke(); } }
    if (kind === 2) { for (let a = 0; a < 9; a++) { cc.beginPath(); cc.moveTo(x - 240 + a * 60, 560); cc.quadraticCurveTo(x - 220 + a * 60, 820, x - 240 + a * 60, 1080); cc.stroke(); } }
  }
  cc.restore();
  // 舞台地面
  cc.save(); cc.fillStyle = 'rgba(70,68,64,.35)'; cc.fillRect(0, 1250, 1080, 3); cc.restore();
  // 弹琴的人 + 三角钢琴（同一个构图，头发随年份变白）
  const age = clamp((yr - 1995) / 24);
  const play = CUE.melody.reduce((a, tn) => t >= tn && t < tn + .25 ? Math.sin((t - tn) / .25 * Math.PI) : a, 0);
  grandPiano(L, 380, 1040, .62);
  pianist(L, 196, 1086, .62, { age, glasses: yr > 2005, lift: .15 * play });
  // 1984 年：一座小奖杯在琴上亮一下
  const tro = clamp(1 - Math.abs(yr - 1984.3) / 1.2);
  if (tro > 0) { cc.save(); cc.globalAlpha = tro; cc.fillStyle = 'rgb(214,196,140)'; cc.beginPath(); cc.moveTo(790, 990); cc.lineTo(830, 990); cc.lineTo(822, 1020); cc.lineTo(814, 1028); cc.lineTo(814, 1040); cc.lineTo(826, 1046); cc.lineTo(794, 1046); cc.lineTo(806, 1040); cc.lineTo(806, 1028); cc.lineTo(798, 1020); cc.closePath(); cc.fill(); cc.restore(); }
  // 大号年份（谱线金的数字），在键盘上方
  const yi = Math.min(Y1, Math.floor(yr + 1e-6));
  cc.save(); cc.font = '600 150px Cormorant'; cc.textAlign = 'center'; cc.textBaseline = 'alphabetic'; cc.fillStyle = 'rgb(203,178,122)'; cc.globalAlpha = SNAP(clamp((t - T.years) / .5));
  cc.fillText(String(yi), 540, 1238); cc.restore();
  // 琴键：每个白键一个年份，滚动到当前年份落在画面中线
  const x0 = 540 - KW / 2 - fi * KW - KW * 3;
  const press = []; for (let i = 0; i < 48; i++) press.push(clamp(1 - Math.abs(i - 3 - fi) * 1.5));
  keyboard(L, { n: 48, keyW: KW, len: 640, x0, y0: KY, press, startNote: 2 });
  cc.save(); cc.font = '500 30px Cormorant'; cc.textAlign = 'center'; cc.fillStyle = 'rgb(60,58,54)';
  for (let i = 0; i < 40; i++) { const x = x0 + (i + 3) * KW + KW / 2; if (x < -80 || x > 1160) continue; cc.globalAlpha = .85; cc.fillText(String(Y0 + i), x, KY + 600); }
  cc.restore();
  line(L, { id: 'c11', t, t0: CAPS.c11.t[0], t1: CAPS.c11.t[1], text: CAPS.c11.text, x: 540, y: 290, size: 48, align: 'center', tone: 'light', color: [232, 230, 224] });
  return { tone: TONES.mono, paperX: cam.paper(), bleed: 0, vig: .45 };
}
