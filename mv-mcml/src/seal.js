// 朱红白文印：略不规则的方形印面，印文挖白，带印泥不匀的小白点。思路来自 lemo-opuscar 的 seal.js（MIT），
// 这里改成可以刻任意文字（单字、两字竖排、年份两行），先画到离屏画布再贴进 col 层（不挖穿下面的画）。
import { vnoise, clamp } from './lib.js';
import { FONT } from './text.js';
export const VERM = [181, 50, 42];
const cache = new Map();
const f = (spec, size) => spec.replace('{S}', size.toFixed(2));

// spec: { lines: ['请'] | ['千', '秋'] | ['19', '82'], font: 'brush'|'serif', seed }
function bake(spec, S) {
  const key = JSON.stringify(spec) + S;
  if (cache.has(key)) return cache.get(key);
  const pad = Math.ceil(S * .12), cv = document.createElement('canvas');
  cv.width = cv.height = Math.ceil(S + pad * 2);
  const c = cv.getContext('2d'), seed = spec.seed ?? 3, jit = S * .02;
  c.translate(pad, pad);
  c.beginPath();
  const N = 36;
  for (let i = 0; i < N; i++) {
    const t = i / N * 4, side = Math.floor(t), u = t - side;
    let px, py; if (side === 0) { px = u * S; py = 0; } else if (side === 1) { px = S; py = u * S; } else if (side === 2) { px = S - u * S; py = S; } else { px = 0; py = S - u * S; }
    px += (vnoise(seed + i * 1.3) - .5) * jit * 2; py += (vnoise(seed + 40 + i * 1.3) - .5) * jit * 2;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath(); c.fillStyle = `rgb(${VERM.join(',')})`; c.fill();
  // 印文挖白
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
  const lines = spec.lines, n = lines.length;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (spec.font === 'serif') {
    const sz = S * (n === 1 ? .5 : .42);
    c.font = f(FONT.enR(600), sz);
    lines.forEach((ln, i) => c.fillText(ln, S / 2, S * (n === 1 ? .52 : .3 + i * .42)));
  } else if (spec.font === 'serifzh') {
    const sz = S * (n === 1 ? .62 : .4);
    c.font = f(FONT.zh(700), sz);
    lines.forEach((ln, i) => c.fillText(ln, S / 2, S * (n === 1 ? .52 : .29 + i * .43)));
  } else {
    const sz = S * (n === 1 ? .78 : .46);
    c.font = f(FONT.brush(), sz);
    lines.forEach((ln, i) => c.fillText(ln, S / 2, S * (n === 1 ? .52 : .28 + i * .46)));
  }
  // 内框（白文印常见的细边）
  c.lineWidth = S * .028; c.strokeStyle = '#000';
  c.strokeRect(S * .07, S * .07, S * .86, S * .86);
  // 印泥不匀：细小白点 + 边缘缺口
  for (let i = 0; i < 90; i++) {
    const a = vnoise(seed + i * 3.7), b = vnoise(seed + 91 + i * 2.9);
    c.globalAlpha = .35 + .65 * vnoise(i * 1.1);
    c.beginPath(); c.arc(a * S, b * S, S * (.003 + .011 * vnoise(i * 5.3 + seed)), 0, 7); c.fill();
  }
  for (let i = 0; i < 6; i++) {
    const side = i % 4, u = vnoise(seed * 2 + i * 7.7);
    const x = side === 0 ? u * S : side === 1 ? S : side === 2 ? u * S : 0, y = side === 0 ? 0 : side === 1 ? u * S : side === 2 ? S : u * S;
    c.globalAlpha = 1; c.beginPath(); c.arc(x, y, S * (.012 + .02 * vnoise(i * 3.1 + seed)), 0, 7); c.fill();
  }
  const out = { cv, pad };
  cache.set(key, out);
  return out;
}

// 盖印：k = 0..1 落印进度（放大 1.06→1、透明度 0→1，纸面压痕由调用者处理）
// x, y = 印面左上角（屏幕坐标，忽略当前变换）；rot 小角度
export function seal(c, spec, x, y, S, k = 1, rot = 0, alpha = 1) {
  if (k <= 0 || alpha <= 0) return;
  const { cv, pad } = bake(spec, S);
  const sc = 1.06 - .06 * clamp(k);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.translate(x + S / 2, y + S / 2); c.rotate(rot); c.scale(sc, sc);
  c.globalAlpha = clamp(k * 1.4) * alpha * .96;
  c.drawImage(cv, -S / 2 - pad, -S / 2 - pad);
  c.restore();
}
