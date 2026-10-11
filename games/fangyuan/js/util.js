'use strict';
// 通用工具：数学、颜色、存储

const TILE = 32;
const STEP = 1 / 120; // 固定物理步长

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, target, amt) => (v < target ? Math.min(v + amt, target) : Math.max(v - amt, target));
const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

function fmtTime(t) {
  if (t == null || !isFinite(t)) return '--:--';
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// —— 颜色 ——
const _rgbCache = new Map();
function hexToRgb(hex) {
  let c = _rgbCache.get(hex);
  if (c) return c;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  c = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  _rgbCache.set(hex, c);
  return c;
}
const _mixCache = new Map();
function mixColor(a, b, t) {
  const key = a + b + t;
  let out = _mixCache.get(key);
  if (out) return out;
  const ca = hexToRgb(a), cb = hexToRgb(b);
  const r = Math.round(lerp(ca[0], cb[0], t)), g = Math.round(lerp(ca[1], cb[1], t)), bl = Math.round(lerp(ca[2], cb[2], t));
  out = '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  _mixCache.set(key, out);
  return out;
}
const shade = (hex, amt) => (amt < 0 ? mixColor(hex, '#000000', -amt) : mixColor(hex, '#ffffff', amt));
function rgba(hex, a) {
  const c = hexToRgb(hex);
  return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
}

// —— 本地存储（隐私模式下可能不可用，退回内存） ——
const Store = {
  mem: {},
  get(key) {
    try {
      const v = localStorage.getItem(key);
      if (v != null) return v;
    } catch (e) { /* 忽略 */ }
    return key in this.mem ? this.mem[key] : null;
  },
  set(key, val) {
    this.mem[key] = val;
    try { localStorage.setItem(key, val); } catch (e) { /* 忽略 */ }
  },
  remove(key) {
    delete this.mem[key];
    try { localStorage.removeItem(key); } catch (e) { /* 忽略 */ }
  },
};

if (typeof module !== 'undefined') {
  module.exports = { TILE, STEP, clamp, lerp, approach, damp, rand, randInt, pick, overlaps, fmtTime, mulberry32, mixColor, shade, rgba };
}
