// 第四幕：作曲之夜（夜靛）。窗外是海和月亮，一台立式钢琴，谱架上的稿纸，他俯身写谱（背影）。
// 每一个旋律音，稿纸的五线谱上就落下一个音符。然后音符一个个飞出窗外，在热带的夜里变成雪。
import { clamp, lerp, hash, vnoise } from '../lib.js';
import { camera, SNAP, GLIDE, kf, smooth, resampleN, lerpPts, ellPts } from '../util.js';
import { mk, draw as paint, mass } from '../ink.js';
import { pline, staff, GOLD } from '../geo.js';
import { line } from '../text.js';
import { backWriter, memo, stroke, blob, knock } from '../figures.js';
import { TONES } from '../comp.js';
import { T, CAPS, CUE } from '../story.js';

// 稿纸：谱架上的一张纸（世界坐标）
const SHEET = { x: 330, y: 760, w: 420, h: 300 };
const STAVES = [0, 1].map(r => [-2, -1, 0, 1, 2].map(i => SHEET.y + 70 + r * 130 + i * 14));
const WIN = { x0: 690, x1: 1010, y0: 360, y1: 900 };
const MOON = [900, 470];

// 第 i 个音符在稿纸上的位置（两行谱，每行 9 个）
function notePos(i) {
  const row = Math.floor(i / 9) % 2, col = i % 9;
  const x = SHEET.x + 40 + col * 40, line = (hash(i * 7.31) * 9) | 0;
  return [x, STAVES[row][2] + 14 * 2 - line * 7];
}
// 雪花：音符飞出窗外后的轨迹（确定性：由序号和时间算）
function flake(i, t, t0) {
  const [x0, y0] = notePos(i);
  const u = clamp((t - t0) / 1.6), e = GLIDE(u);
  const wx = lerp(WIN.x0 + 40, WIN.x1 - 30, hash(i * 3.3)), wy = lerp(WIN.y0 + 60, WIN.y1 - 160, hash(i * 5.7));
  const cx = lerp(x0, wx, e) + Math.sin(e * Math.PI) * -60, cy = lerp(y0, wy, e) - Math.sin(e * Math.PI) * 120;
  const fall = Math.max(0, t - t0 - 1.6);
  return [cx + Math.sin(fall * 1.3 + i) * 14, cy + fall * 46, u];
}

export function draw(L, t, o = {}) {
  const c = kf(t, [[T.night - 1, [560, 900, 1.06]], [T.fly, [580, 860, 1.12]], [T.cell - .6, [800, 700, 1.3]]]);
  const cam = camera(c[0], c[1], c[2], 0, 540, 1000); cam.apply(L);
  const z = cam.z, { cw, cd, cc } = L;
  const S = memo('nightStatic', () => {
    const S = {};
    // 窗框（暗的墙上一扇亮窗）
    S.frame = [
      stroke([[WIN.x0, WIN.y0], [WIN.x1, WIN.y0]], { w: 10, tone: .9, dry: .3, prof: 'even', seed: 501 }),
      stroke([[WIN.x0, WIN.y0], [WIN.x0, WIN.y1]], { w: 10, tone: .9, dry: .3, prof: 'even', seed: 502 }),
      stroke([[WIN.x1, WIN.y0], [WIN.x1, WIN.y1]], { w: 10, tone: .9, dry: .3, prof: 'even', seed: 503 }),
      stroke([[WIN.x0 - 10, WIN.y1], [WIN.x1 + 10, WIN.y1]], { w: 14, tone: .9, dry: .3, prof: 'even', seed: 504 }),
      stroke([[(WIN.x0 + WIN.x1) / 2, WIN.y0], [(WIN.x0 + WIN.x1) / 2, WIN.y1]], { w: 6, tone: .9, dry: .3, prof: 'even', seed: 505 }),
    ];
    // 立式钢琴：琴身、谱架、键盘
    S.piano = [[120, 700], [880, 700], [880, 1360], [120, 1360]];
    S.pianoTop = stroke([[100, 700], [900, 700]], { w: 12, tone: .9, dry: .3, prof: 'even', seed: 510 });
    S.keybed = [[90, 1120], [910, 1120], [910, 1170], [90, 1170]];
    return S;
  });
  // 窗：月光的冷光 + 月亮 + 海平线（col 层，亮色画在暗纸上）
  cc.save(); cc.fillStyle = 'rgba(70,92,130,.55)'; cc.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
  const mg = cc.createRadialGradient(...MOON, 10, ...MOON, 260); mg.addColorStop(0, 'rgba(210,222,240,.55)'); mg.addColorStop(1, 'rgba(210,222,240,0)');
  cc.fillStyle = mg; cc.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
  cc.fillStyle = 'rgba(232,236,240,.95)'; cc.beginPath(); cc.arc(...MOON, 34, 0, 7); cc.fill();
  cc.fillStyle = 'rgba(30,40,62,.8)'; cc.fillRect(WIN.x0, 700, WIN.x1 - WIN.x0, WIN.y1 - 700);           // 海
  for (let i = 0; i < 6; i++) { cc.fillStyle = `rgba(210,222,240,${.5 - i * .07})`; cc.fillRect(MOON[0] - 50 + i * 6, 716 + i * 22, 100 - i * 12, 3); }   // 月光倒影
  cc.restore();
  S.frame.forEach(s => paint(L.ink, s, 1, .95));
  // 窗光落进屋里：一块很淡的斜光
  cc.save(); cc.fillStyle = 'rgba(150,170,205,.08)'; cc.beginPath(); cc.moveTo(WIN.x0, WIN.y1); cc.lineTo(WIN.x1, WIN.y1); cc.lineTo(WIN.x1 - 200, 1500); cc.lineTo(WIN.x0 - 380, 1500); cc.closePath(); cc.fill(); cc.restore();
  // 台灯：钢琴上的一盏小灯，一团暖光照着稿纸
  const lampG = cc.createRadialGradient(640, 700, 10, 560, 820, 540);
  lampG.addColorStop(0, 'rgba(240,196,128,.42)'); lampG.addColorStop(1, 'rgba(240,196,128,0)');
  cc.save(); cc.fillStyle = lampG; cc.fillRect(0, 300, 1100, 1100); cc.restore();
  // 钢琴（暗的剪影，琴身边缘有一点暖光）
  mass(cw, S.piano, .5, 3, 511);
  paint(L.ink, S.pianoTop, 1, .9);
  cc.save(); cc.fillStyle = 'rgba(240,196,128,.16)'; cc.fillRect(100, 694, 800, 6); cc.restore();
  // 谱架上的稿纸（暖白，被台灯照亮）
  cc.save(); cc.fillStyle = 'rgba(242,232,210,.96)'; cc.beginPath(); cc.moveTo(SHEET.x, SHEET.y); cc.lineTo(SHEET.x + SHEET.w, SHEET.y - 6); cc.lineTo(SHEET.x + SHEET.w + 4, SHEET.y + SHEET.h); cc.lineTo(SHEET.x + 2, SHEET.y + SHEET.h + 4); cc.closePath(); cc.fill(); cc.restore();
  // 稿纸上的两行五线谱：第一行就是一路跟来的那五条线（谱线金），第二行是印刷的灰线
  STAVES.forEach((row, r) => row.forEach(y => pline(cc, [[SHEET.x + 20, y], [SHEET.x + SHEET.w - 20, y]], r ? 1.3 : 1.8, r ? [140, 128, 110] : GOLD, r ? .8 : .95)));
  // 音符：每个旋律音落一个（符头 + 符干），飞走的音符从稿纸上消失
  const notes = CUE.melody.filter(x => x >= T.night - .2 && x < T.fly + 1.8);
  notes.forEach((tn, i) => {
    if (t < tn) return;
    const tf = T.fly + i * .16;            // 第 i 个音符开始飞
    const [x, y] = notePos(i);
    if (t < tf) {
      const k = SNAP(clamp((t - tn) / .18));
      cc.save(); cc.fillStyle = 'rgb(36,30,26)'; cc.globalAlpha = k;
      cc.beginPath(); cc.ellipse(x, y, 7.5 * k, 5.5 * k, -.35, 0, 7); cc.fill();
      cc.fillRect(x + 6, y - 34 * k, 2, 34 * k); cc.restore();
    } else {
      // 飞出窗外，形状从音符渐变成六角雪花
      const [fx, fy, u] = flake(i, t, tf);
      const m = SNAP(clamp((u - .3) / .5));
      cc.save(); cc.translate(fx, fy); cc.rotate(u * 2 + i);
      cc.strokeStyle = `rgba(236,238,242,${.95})`; cc.fillStyle = `rgba(${lerp(36, 236, m)},${lerp(30, 238, m)},${lerp(26, 242, m)},.95)`;
      if (m < 1) { cc.globalAlpha = 1 - m; cc.beginPath(); cc.ellipse(0, 0, 7.5, 5.5, -.35, 0, 7); cc.fill(); cc.fillRect(6, -34, 2, 34); }
      cc.globalAlpha = m; cc.lineWidth = 2;
      for (let a = 0; a < 6; a++) { cc.beginPath(); cc.moveTo(0, 0); cc.lineTo(Math.cos(a * Math.PI / 3) * 9, Math.sin(a * Math.PI / 3) * 9); cc.stroke(); }
      cc.restore();
    }
  });
  // 谱架的横档
  cc.save(); cc.fillStyle = 'rgba(70,50,36,.9)'; cc.fillRect(SHEET.x - 30, SHEET.y + SHEET.h, SHEET.w + 60, 16); cc.restore();
  // 琴键：被台灯照亮的一排白键 + 黑键（col 层）
  cc.save();
  const KX0 = 100, KX1 = 900, KY = 1112, kw = (KX1 - KX0) / 22;
  cc.fillStyle = 'rgba(40,30,24,.95)'; cc.fillRect(KX0 - 10, KY - 14, KX1 - KX0 + 20, 14);
  for (let i = 0; i < 22; i++) { const g = .55 + .45 * Math.exp(-Math.pow((KX0 + i * kw - 560) / 300, 2)); cc.fillStyle = `rgba(${236 * g | 0},${226 * g | 0},${206 * g | 0},.95)`; cc.fillRect(KX0 + i * kw + 1, KY, kw - 2, 54); }
  const pat = [1, 1, 0, 1, 1, 1, 0];
  for (let i = 0; i < 21; i++) if (pat[i % 7]) { cc.fillStyle = 'rgba(14,12,12,.96)'; cc.fillRect(KX0 + (i + 1) * kw - kw * .3, KY, kw * .6, 32); }
  cc.restore();
  // 写谱的人：背影剪影（被台灯从右前方照出一道暖色轮廓），随每个音符手动一下（写）
  const write = CUE.melody.reduce((a, tn) => t >= tn && t < tn + .3 ? Math.sin((t - tn) / .3 * Math.PI) : a, 0);
  backWriter(L, 250, 1010, 1.0, { lean: -.03 - .015 * write, sil: [9, 12, 20], rim: [232, 182, 116], write });
  // 琴上的小台灯
  cc.save(); cc.fillStyle = 'rgb(16,16,22)'; cc.beginPath(); cc.moveTo(600, 640); cc.lineTo(680, 640); cc.lineTo(700, 690); cc.lineTo(580, 690); cc.closePath(); cc.fill();
  cc.fillRect(636, 690, 8, 10); cc.fillStyle = 'rgba(250,214,150,.95)'; cc.fillRect(590, 686, 100, 5); cc.restore();
  // 窗外飘的雪（更多的雪，从窗外往下落）
  const snowK = clamp((t - T.fly - 1) / 2);
  for (let i = 0; i < 40 * snowK; i++) {
    const x = lerp(WIN.x0 + 10, WIN.x1 - 10, hash(i * 1.7)), y = WIN.y0 + ((hash(i * 2.3) * 540 + (t - T.fly) * (30 + hash(i) * 30)) % 540);
    cc.save(); cc.fillStyle = 'rgba(236,238,242,.85)'; cc.beginPath(); cc.arc(x + Math.sin(t + i) * 6, y, 1.5 + hash(i * 4.1) * 2, 0, 7); cc.fill(); cc.restore();
  }
  line(L, { id: 'c7', t, t0: CAPS.c7.t[0], t1: CAPS.c7.t[1], text: CAPS.c7.text, x: 540, y: 290, size: 50, align: 'center', tone: 'light', color: [232, 228, 218] });
  line(L, { id: 'c8', t, t0: CAPS.c8.t[0], t1: CAPS.c8.t[1], text: CAPS.c8.text, x: 540, y: 290, size: 48, align: 'center', tone: 'light', color: [232, 228, 218] });
  return { tone: TONES.night, paperX: cam.paper(), bleed: 4, rim: .6, vig: .38 };
}
