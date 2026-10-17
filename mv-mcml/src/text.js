// 字幕：融进画面的旁白。逐字从基线下方的遮罩里升起（不淡入整句、不飞、不弹），离场时向上收进遮罩。
// 亮纸上写进 dry（墨）层，入场瞬间同时写一点进 wet 层，让字像刚落墨一样微微晕开；暗纸上写进 col（光）层。
// 每段可见文字都登记到 TEXTS，给阅读时长检查用。
import { clamp, lerp } from './lib.js';
import { SNAP, GLIDE, css } from './util.js';

export const FONT = {
  zh: (w = 500) => `${w} {S}px NotoSC`,
  jp: () => `700 {S}px NotoJP`,
  en: () => `italic 500 {S}px CormorantI`,
  enR: (w = 500) => `${w} {S}px Cormorant`,
  brush: () => `400 {S}px MaShan`,
};
const f = (spec, size) => spec.replace('{S}', size.toFixed(2));

let REG = [];
export const textsReset = () => { REG = []; };
export const texts = () => REG;

// 字符级布局：返回每个字的 [x, 宽]
export function layout(ctx, text, font, size, ls) {
  ctx.font = f(font, size); ctx.letterSpacing = '0px';
  const out = []; let x = 0;
  for (const ch of [...text]) { const w = ctx.measureText(ch).width; out.push([x, w, ch]); x += w + ls; }
  return { chars: out, width: x - ls };
}

// 逐字入场/离场的进度
function charK(t, t0, t1, i, n, o) {
  const st = o.stagger ?? .04, din = o.din ?? .4, dout = o.dout ?? .32, stOut = o.staggerOut ?? .02;
  const a = SNAP(clamp((t - t0 - i * st) / din));
  const b = 1 - GLIDE(clamp((t - (t1 - dout - (n - 1 - i) * stOut * 0 - i * stOut)) / dout));
  return { in: a, out: b, wet: clamp(1 - (t - t0 - i * st) / .55) * (a > 0 ? 1 : 0) };
}

// 横排一行字。o: { id, text, x, y（基线）, size, font, ls, align, t, t0, t1, tone: 'ink'|'light', color, alpha, layer }
export function line(L, o) {
  const { t, t0, t1 } = o; if (t < t0 || t > t1) return;
  const size = o.size ?? 52, font = o.font ?? FONT.zh(), ls = o.ls ?? size * .12;
  const ctx = L.cd, lay = layout(ctx, o.text, font, size, ls);
  const x0 = o.align === 'center' ? o.x - lay.width / 2 : o.align === 'right' ? o.x - lay.width : o.x;
  const asc = size * .92, desc = size * .26, n = lay.chars.length;
  const light = o.tone === 'light';
  const rgbInk = o.color || (light ? [236, 230, 216] : [0, 0, 0]);
  const A = o.alpha ?? 1;
  const targets = light ? [[L.cc, 1]] : [[L.cd, .94], [L.cw, 0]];
  for (const [c, base] of targets) {
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.beginPath(); c.rect(x0 - size, o.y - asc, lay.width + size * 2, asc + desc); c.clip();
    c.font = f(font, size); c.letterSpacing = '0px'; c.textBaseline = 'alphabetic';
    lay.chars.forEach(([cx, cw, ch], i) => {
      const k = charK(t, t0, t1, i, n, o);
      if (k.in <= 0 || k.out <= 0) return;
      const dy = (1 - k.in) * size * 1.05 - (1 - k.out) * size * 1.05;
      const a = c === L.cw ? .55 * k.wet : base;
      if (a <= .004) return;
      c.globalAlpha = clamp(a * A * Math.min(1, k.in * 1.6) * Math.min(1, k.out * 1.6));
      c.fillStyle = css(rgbInk);
      c.fillText(ch, x0 + cx, o.y + dy);
    });
    c.restore();
  }
  REG.push({ id: o.id, text: o.text, x0, y0: o.y - asc, x1: x0 + lay.width, y1: o.y + desc });
}

// 竖排（从上到下，列从右到左）
export function column(L, o) {
  const { t, t0, t1 } = o; if (t < t0 || t > t1) return;
  const size = o.size ?? 52, font = o.font ?? FONT.zh(), gap = o.gap ?? size * 1.18;
  const chars = [...o.text], n = chars.length, light = o.tone === 'light';
  const rgbInk = o.color || (light ? [236, 230, 216] : [0, 0, 0]);
  const targets = light ? [[L.cc, 1]] : [[L.cd, .94], [L.cw, 0]];
  for (const [c, base] of targets) {
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.font = f(font, size); c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '0px';
    chars.forEach((ch, i) => {
      const k = charK(t, t0, t1, i, n, o);
      if (k.in <= 0 || k.out <= 0) return;
      const cy = o.y + i * gap + size / 2;
      c.save(); c.beginPath(); c.rect(o.x - size, cy - size * .62, size * 2, size * 1.24); c.clip();
      const dy = (1 - k.in) * size * .9 - (1 - k.out) * size * .9;
      const a = c === L.cw ? .55 * k.wet : base;
      c.globalAlpha = clamp(a * (o.alpha ?? 1) * Math.min(1, k.in * 1.6) * Math.min(1, k.out * 1.6));
      c.fillStyle = css(rgbInk); c.fillText(ch, o.x, cy + dy);
      c.restore();
    });
    c.restore();
  }
  REG.push({ id: o.id, text: o.text, x0: o.x - size / 2, y0: o.y, x1: o.x + size / 2, y1: o.y + n * gap });
}

// 字落在谱线上：每个字有自己的位置（像音符），按各自的时间点升起
// o: { id, text, pos: [[x, y]...], times: [t...], t1, size, tone }
export function notes(L, o) {
  const { t } = o; if (t < o.times[0] - .01 || t > o.t1) return;
  const size = o.size ?? 60, font = o.font ?? FONT.zh(), chars = [...o.text], light = o.tone === 'light';
  const rgbInk = o.color || (light ? [236, 230, 216] : [0, 0, 0]);
  const c = light ? L.cc : L.cd;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.font = f(font, size); c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '0px';
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  chars.forEach((ch, i) => {
    const [x, y] = o.pos[i], ti = o.times[i];
    x0 = Math.min(x0, x - size / 2); x1 = Math.max(x1, x + size / 2); y0 = Math.min(y0, y - size / 2); y1 = Math.max(y1, y + size / 2);
    const kin = SNAP(clamp((t - ti) / .38)), kout = 1 - GLIDE(clamp((t - (o.t1 - .4 - (chars.length - 1 - i) * .025)) / .4));
    if (kin <= 0 || kout <= 0) return;
    c.save(); c.beginPath(); c.rect(x - size, y - size * .62, size * 2, size * 1.24); c.clip();
    c.globalAlpha = clamp(Math.min(1, kin * 1.6) * Math.min(1, kout * 1.6) * (o.alpha ?? 1));
    c.fillStyle = css(rgbInk);
    c.fillText(ch, x, y + (1 - kin) * size * .9 - (1 - kout) * size * .9);
    c.restore();
  });
  c.restore();
  REG.push({ id: o.id, text: o.text, x0, y0, x1, y1 });
}
