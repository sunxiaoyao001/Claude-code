// 镜头调度：按时间选镜头、处理两个镜头之间的转场，返回合成参数
import { clamp, lerp, vnoise } from './lib.js';
import { GLIDE, SNAP } from './util.js';
import { T } from './story.js';
import * as hook from './scenes/hook.js';
import * as desk from './scenes/desk.js';
import * as read from './scenes/read.js';
import * as cond from './scenes/cond.js';
import * as isle from './scenes/isle.js';
import * as night from './scenes/night.js';
import * as cell from './scenes/cell.js';
import { SNAP as _S } from './util.js';
import * as years from './scenes/years.js';
import * as nhk from './scenes/nhk.js';

// 竖条展开蒙版：从中线向两边打开，边缘带纸纤维一样的毛边
function bandMask(MX, u) {
  const hw = lerp(0, 700, GLIDE(u)); if (hw <= 0) return;
  MX.save(); MX.fillStyle = '#fff'; MX.filter = 'blur(5px)';
  MX.beginPath();
  const amp = 16 * Math.min(1, hw / 80);
  for (let y = -20; y <= 1940; y += 8) MX.lineTo(540 - hw - ((vnoise(y * .05 + 3) - .5) * .7 + (vnoise(y * .011 + 1) - .5)) * amp, y);
  for (let y = 1940; y >= -20; y -= 8) MX.lineTo(540 + hw + ((vnoise(y * .05 + 9) - .5) * .7 + (vnoise(y * .011 + 5) - .5)) * amp, y);
  MX.closePath(); MX.fill(); MX.restore();
}
// 横条展开蒙版：从某条水平线向上下打开
function hBandMask(MX, u, cy, maxH = 1300) {
  const hh = lerp(0, maxH, GLIDE(u)); if (hh <= 0) return;
  MX.save(); MX.fillStyle = '#fff'; MX.filter = 'blur(5px)';
  MX.beginPath();
  const amp = 16 * Math.min(1, hh / 80);
  for (let x = -20; x <= 1100; x += 8) MX.lineTo(x, cy - hh - ((vnoise(x * .05 + 3) - .5) * .7 + (vnoise(x * .011 + 1) - .5)) * amp);
  for (let x = 1100; x >= -20; x -= 8) MX.lineTo(x, cy + hh + ((vnoise(x * .05 + 9) - .5) * .7 + (vnoise(x * .011 + 5) - .5)) * amp);
  MX.closePath(); MX.fill(); MX.restore();
}
const pack = (oa, ob, trans) => ({ ...oa, B: ob, trans });

export function frame(t, A, B, MX) {
  // 钩子 → 剧本：竖条展开
  const x1 = [T.inv - .7, T.inv + .3];
  if (t < x1[0]) return hook.draw(A, t);
  if (t < x1[1]) {
    const u = (t - x1[0]) / (x1[1] - x1[0]);
    const oa = hook.draw(A, t), ob = desk.draw(B, t);
    bandMask(MX, u);
    return pack(oa, ob, [0, 0, 0, 2]);
  }
  // 剧本 → 读剧本：墨晕
  const x2 = [T.read - .5, T.read + .5];
  if (t < x2[0]) return desk.draw(A, t);
  if (t < x2[1]) {
    const u = (t - x2[0]) / (x2[1] - x2[0]);
    const oa = desk.draw(A, t), ob = read.draw(B, t);
    return pack(oa, ob, [560, 1080, 20 + 2400 * GLIDE(u), 1]);
  }
  // 读剧本 → 条件：从悬着的五线谱那一行向上下打开
  const x3 = [T.cond - .3, T.cond + .5];
  if (t < x3[0]) return read.draw(A, t);
  if (t < x3[1]) {
    const u = (t - x3[0]) / (x3[1] - x3[0]);
    const oa = read.draw(A, t), ob = cond.draw(B, t);
    hBandMask(MX, u, read.LIFT_STAFF.cy);
    return pack(oa, ob, [0, 0, 0, 2]);
  }
  // 条件 → 小岛：印章变成的落日为中心，墨晕扩散出海景
  const x4 = [T.isle - .9, T.isle + .5];
  if (t < x4[0]) return cond.draw(A, t);
  if (t < x4[1]) {
    const u = (t - x4[0]) / (x4[1] - x4[0]);
    const oa = cond.draw(A, t), ob = isle.draw(B, t);
    return pack(oa, ob, [cond.SUN.x, cond.SUN.y, cond.SUN.r + 2400 * GLIDE(u), 1]);
  }
  // 小岛 → 作曲之夜：墨晕从铁丝网的空隙里扩散（镜头穿过铁丝网进入夜色）
  const x5 = [T.night - .7, T.night + .5];
  if (t < x5[0]) return isle.draw(A, t);
  if (t < x5[1]) {
    const u = (t - x5[0]) / (x5[1] - x5[0]);
    const oa = isle.draw(A, t), ob = night.draw(B, t);
    return pack(oa, ob, [620, 1150, 20 + 2400 * GLIDE(u), 1]);
  }
  // 作曲之夜 → 1946 牢房：胶片从下面滑上来，胶片里就是牢房
  const x6 = [T.cell - .5, T.cell + .4];
  if (t < x6[0]) return night.draw(A, t);
  if (t < x6[1]) {
    const k = clamp((t - (T.cell - .5)) / .9), y = lerp(1920, 0, _S(k)) + 124;
    const oa = night.draw(A, t), ob = cell.draw(B, t);
    MX.save(); MX.fillStyle = '#fff'; MX.fillRect(0, y, 1080, 1920 - y + 10); MX.restore();
    return pack(oa, ob, [0, 0, 0, 2]);
  }
  // 牢房 → 四十年：胶片往上走一格（像放映机过片），下一格就是黑白的琴键
  const x7 = [T.years - .35, T.years + .25];
  if (t < x7[0]) return cell.draw(A, t);
  if (t < x7[1]) {
    const u = _S((t - x7[0]) / (x7[1] - x7[0])), y = lerp(1920, 0, u);
    const oa = cell.draw(A, t), ob = years.draw(B, t);
    MX.save(); MX.fillStyle = '#fff'; MX.fillRect(0, y, 1080, 1940); MX.restore();
    return pack(oa, ob, [0, 0, 0, 2]);
  }
  // 四十年 → 2022 NHK 509：墨晕从琴边扩散，推近成录音室
  const x8 = [T.nhk - .6, T.nhk + .4];
  if (t < x8[0]) return years.draw(A, t);
  if (t < x8[1]) {
    const u = (t - x8[0]) / (x8[1] - x8[0]);
    const oa = years.draw(A, t), ob = nhk.draw(B, t);
    return pack(oa, ob, [330, 900, 20 + 2400 * GLIDE(u), 1]);
  }
  // 尾声 → 回到开场：琴键俯视（最后一帧与第一帧相同，循环播放无缝）
  const x9 = [nhk.OUT, nhk.OUT + 1.2];
  if (t < x9[0]) return nhk.draw(A, t);
  if (t < x9[1]) {
    const u = (t - x9[0]) / (x9[1] - x9[0]);
    const oa = nhk.draw(A, t), ob = hook.draw(B, 0, { loop: true });
    return pack(oa, ob, [540, 1300, 20 + 2400 * GLIDE(u), 1]);
  }
  return hook.draw(A, 0, { loop: true });
}
