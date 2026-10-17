// 入口：window.render(t) 画出第 t 秒的那一帧（纯函数，任何顺序、任何进程都能单独画）
import { makeComp, layerSet, W, H } from './comp.js';
import { textsReset, texts } from './text.js';
import { load, DUR } from './story.js';
import { frame } from './shots.js';

await load();
for (const spec of ['500 40px NotoSC', '700 40px NotoSC', '700 40px NotoJP', '400 40px MaShan', 'italic 500 40px CormorantI', '500 40px Cormorant', '600 40px Cormorant'])
  await document.fonts.load(spec, spec.includes('Noto') || spec.includes('MaShan') ? '这首曲子戦場の请' : 'Merry 1982');

const canvas = document.getElementById('c');
const comp = makeComp(canvas);
const A = layerSet(), B = layerSet();
const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
const MX = mask.getContext('2d');

window.DUR = (await import('./story.js')).DUR;
window.render = t => {
  textsReset(); A.clear(); B.clear();
  MX.setTransform(1, 0, 0, 1, 0, 0); MX.clearRect(0, 0, W, H);
  const p0 = performance.now();
  const o = frame(t, A, B, MX) || {};
  if (o.trans && o.trans[3] > 1.5) o.mask = mask;
  const p1 = performance.now();
  comp(A, B, o);
  window.PERF = [p1 - p0, performance.now() - p1];
};
// 运动模糊：在一帧的快门时间里画 n 个子帧，逐个平均到叠加画布上（只在镜头动得快的地方用）
const acc = document.getElementById('acc'), AX = acc.getContext('2d');
window.renderMB = (t, n = 3, shutter = 1 / 120) => {
  if (n <= 1) { acc.style.display = 'none'; window.render(t); return; }
  AX.globalAlpha = 1; AX.clearRect(0, 0, W, H);
  for (let j = 0; j < n; j++) {
    window.render(t + (j / (n - 1) - .5) * shutter);
    AX.globalAlpha = 1 / (j + 1); AX.drawImage(canvas, 0, 0);
  }
  acc.style.display = 'block';
};
window.TEXTS = () => texts();
// 哪些时间段镜头动得快、需要运动模糊（渲染器据此决定每帧画几个子帧）
import { T as _T } from './story.js';
const FAST = () => [[_T.read - .5, _T.read + .5], [_T.cond - 2.3, _T.cond - .2], [_T.isle - 1.6, _T.isle + .6], [_T.isle + .4, _T.isle + 2.8],
  [_T.pan, _T.pan + 2.6], [_T.fly, _T.fly + 3.5], [_T.cell - .6, _T.cell + 1.2], [_T.cell + 1.2, _T.cell + 3.4], [_T.years - .4, _T.nhk + .4]];
window.MB = t => FAST().some(([a, b]) => t >= a && t <= b) ? 3 : 1;
window._A = A; window._comp = o => comp(A, B, o);
window.READY = true;
