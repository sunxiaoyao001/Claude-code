// edl.js — the edit list, in beats. One source of truth for picture, score (edl.json) and subtitles (.srt).
'use strict';
const { BEAT } = require('./engine');

// Second-language switch: 'en' = English line under the Chinese title, 'zh' = Chinese description instead.
const SECOND = process.env.SECOND || 'en';

const CHAPTERS = [
  { n: 1, zh: '光学', en: 'OPTICS', range: '1917 — 1948', hue: 'KILN', fam: 'glass' },
  { n: 2, zh: '单反', en: 'SLR', range: '1959 — 1988', hue: 'LAKE', fam: 'mech' },
  { n: 3, zh: '数码', en: 'DIGITAL', range: '1999 — 2008', hue: 'SENSOR', fam: 'beep' },
  { n: 4, zh: '无反', en: 'MIRRORLESS', range: '2018 — 2025', hue: 'DUSK', fam: 'etick' },
  { n: 5, zh: '今天', en: 'TODAY', range: '14 — 800 mm', hue: 'LUMEN', fam: 'whoosh' },
];

// Timeline items (verified; see TREATMENT.md §2). build = assembly step added by this card.
const ITEMS = [
  { ch: 1, year: 1917, zh: '日本光学成立', en: 'Nippon Kogaku is founded', sub: '东京，从光学玻璃开始', tag: 'TOKYO · 07.25', act: 'polish', build: 1 },
  { ch: 1, year: 1932, zh: 'NIKKOR', en: 'The NIKKOR name is registered', sub: '镜头有了自己的名字', tag: 'TRADEMARK', act: 'raise', build: 2 },
  { ch: 1, year: 1948, zh: '第一台相机', en: 'Nikon I, the first Nikon camera', sub: 'Nikon I 问世', tag: 'NIKON I', act: 'shoot', build: 3 },
  { ch: 2, year: 1959, zh: '尼康 F', en: 'Nikon F and the F mount', sub: 'F 卡口由此开始', tag: 'F MOUNT · 46.5 mm', act: 'mount', build: 4 },
  { ch: 2, year: 1971, zh: '飞向月球', en: 'To the Moon with Apollo 15', sub: '随阿波罗 15 号升空', tag: 'APOLLO 15', act: 'float' },
  { ch: 2, year: 1980, zh: '步进光刻机', en: "Japan's first stepper", sub: '日本国产第一台', tag: 'NSR-1010G · 1.0 µm', act: 'litho' },
  { ch: 2, year: 1988, zh: '更名尼康', en: 'Becomes Nikon Corporation', sub: '尼康株式会社', tag: '04.01', act: 'flag' },
  { ch: 3, year: 1999, zh: '尼康 D1', en: 'D1, a digital SLR of its own', sub: '自主研发的数码单反', tag: '2.74 MP', act: 'digital', build: 5 },
  { ch: 3, year: 2007, zh: 'FX 全画幅', en: 'D3, the first FX format', sub: 'D3 登场', tag: '36 × 23.9 mm', act: 'kneel' },
  { ch: 3, year: 2008, zh: '单反拍视频', en: 'D90, an SLR that shoots movies', sub: 'D90 带来动画功能', tag: '720p · 24 fps', act: 'pan', build: 6 },
  { ch: 4, year: 2018, zh: 'Z 卡口', en: 'The Z mount', sub: '更大的口径，更短的距离', tag: 'Z MOUNT', act: 'leap', build: 7, spec: true },
  { ch: 4, year: 2021, zh: '告别机械快门', en: 'Z 9 drops the mechanical shutter', sub: '尼康 Z 9', tag: 'Z 9', act: 'sprint' },
  { ch: 4, year: 2024, zh: 'RED 加入', en: 'RED joins Nikon', sub: '电影机品牌成为一员', tag: 'CINEMA', act: 'rig' },
  { ch: 4, year: 2025, zh: '尼康 ZR', en: 'ZR, built with RED technology', sub: '首款融合 RED 技术的相机', tag: '6K · R3D NE', act: 'gimbal', build: 8 },
];
const BUILD_STEPS = ['GLASS', 'LENS', 'BODY', 'MOUNT', 'SENSOR', 'MOVIE', 'Z MOUNT', 'CINEMA'];

const FOCALS = [
  { mm: 14, zh: '星空', en: 'STARS', act: 'stars' },
  { mm: 24, zh: '山野', en: 'PEAKS', act: 'summit' },
  { mm: 35, zh: '街头', en: 'STREET', act: 'street' },
  { mm: 50, zh: '日常', en: 'EVERYDAY', act: 'cup' },
  { mm: 85, zh: '人像', en: 'PORTRAIT', act: 'portrait' },
  { mm: 105, zh: '微距', en: 'MACRO', act: 'macro' },
  { mm: 200, zh: '球场', en: 'COURT', act: 'hoops' },
  { mm: 400, zh: '赛道', en: 'TRACK', act: 'hurdle' },
  { mm: 600, zh: '飞鸟', en: 'BIRDS', act: 'bird' },
  { mm: 800, zh: '月亮', en: 'MOON', act: 'moon' },
];
const ROT = ['KILN', 'LAKE', 'SENSOR', 'DUSK', 'LUMEN'];

// ---------- build the shot list ----------
const shots = [];
let b = 0;
const add = (o) => { o.b0 = b; o.t0 = b * BEAT; b += o.len; o.t1 = b * BEAT; o.idx = shots.length; shots.push(o); return o; };
const TR = ['rows', 'cols', 'push', 'quarter', 'flip'];
let tri = 0;
const nextTr = () => TR[tri++ % TR.length];

add({ type: 'grid', len: 4, hue: 'INK', fam: 'drone', tr: 'cut' });
add({ type: 'cell', len: 4, hue: 'LUMEN', fam: 'glass', tr: 'cut' });
add({ type: 'title', len: 4, hue: 'LUMEN', fam: 'glass', tr: 'cut', seed: 3 });
let itemNo = 0;
for (const ch of CHAPTERS.slice(0, 4)) {
  add({ type: 'chapter', len: 4, hue: ch.hue, ch, fam: ch.fam, tr: ch.n === 1 ? 'cols' : 'iris', crash: true, seed: 10 + ch.n });
  for (const it of ITEMS.filter(i => i.ch === ch.n)) {
    itemNo++;
    add({ type: it.spec ? 'spec' : 'item', len: it.spec ? 8 : 4, hue: ch.hue, ch, it, no: itemNo, fam: ch.fam, tr: nextTr(), seed: 100 + itemNo });
  }
}
const c5 = CHAPTERS[4];
add({ type: 'chapter', len: 4, hue: 'LUMEN', ch: c5, fam: c5.fam, tr: 'push', crash: true, seed: 15 });
FOCALS.forEach((f, i) => add({ type: 'focal', len: 2, hue: ROT[i % ROT.length], ch: c5, fo: f, no: i + 1, fam: 'whoosh', tr: i === 0 ? 'quarter' : 'whip', seed: 200 + i }));
add({ type: 'wall', len: 8, hue: 'LUMEN', fam: 'hit', tr: 'push' });
add({ type: 'end', len: 16, hue: 'INK', fam: 'hit', tr: 'iris', crash: true, seed: 7 });
add({ type: 'out', len: 8, hue: 'INK', fam: 'pluck', tr: 'cut' });

const TOTAL_BEATS = b, DURATION = b * BEAT;

// Build step reached at a given shot index (for the corner assembly).
function buildAt(idx) {
  let s = 0;
  for (const sh of shots) { if (sh.idx > idx) break; if (sh.it && sh.it.build) s = sh.it.build; }
  return s;
}

// ---------- exports for the score and subtitles ----------
function toJSON() {
  return {
    bpm: 96, beat: BEAT, totalBeats: TOTAL_BEATS, duration: DURATION,
    shots: shots.map(s => ({ idx: s.idx, type: s.type, b0: s.b0, len: s.len, t0: +s.t0.toFixed(4), fam: s.fam, crash: !!s.crash, ch: s.ch ? s.ch.n : 0 })),
    events: [
      { kind: 'strip', b0: 68, b1: 72 },     // one bar stripped to ticking under the 0→55 count
      { kind: 'slam', b: 72 },
      { kind: 'slam', b: 76 },
      { kind: 'gap', b0: 119.5, b1: 120 },   // half a beat of silence before the end card
      { kind: 'riser', b0: 60, b1: 64 },
      { kind: 'riser', b0: 116, b1: 119.5 },
    ],
  };
}
function srtTime(t) {
  const ms = Math.round(t * 1000), h = (ms / 3600000) | 0, m = ((ms / 60000) | 0) % 60, s = ((ms / 1000) | 0) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}
function toSRT() {
  const lines = []; let n = 0;
  for (const s of shots) {
    let text = null;
    if (s.type === 'title') text = '百年，为看见\nA CENTURY OF SEEING';
    if (s.type === 'chapter') text = `${String(s.ch.n).padStart(2, '0')} ${s.ch.zh} ${s.ch.en}\n${s.ch.range}`;
    if (s.type === 'item' || s.type === 'spec') text = `${s.it.year}  ${s.it.zh}\n${SECOND === 'en' ? s.it.en : s.it.sub}`;
    if (s.type === 'spec') text += '\n内径 55 mm · 法兰距 16 mm';
    if (s.type === 'focal') text = `${s.fo.mm}mm  ${s.fo.zh}\n${s.fo.en}`;
    if (s.type === 'end') text = '尼康 NIKON\n百年，为看见 · 1917 — 2025';
    if (!text) continue;
    lines.push(`${++n}\n${srtTime(s.t0)} --> ${srtTime(s.t1)}\n${text}\n`);
  }
  return lines.join('\n');
}

module.exports = { SECOND, CHAPTERS, ITEMS, FOCALS, BUILD_STEPS, shots, TOTAL_BEATS, DURATION, buildAt, toJSON, toSRT };

if (require.main === module) {
  for (const s of shots) console.log(String(s.idx).padStart(2), String(s.b0).padStart(4), String(s.len).padStart(3), s.t0.toFixed(3).padStart(7), s.type.padEnd(8), s.tr.padEnd(8), s.hue.padEnd(7), s.it ? s.it.year : s.fo ? s.fo.mm + 'mm' : s.ch ? s.ch.zh : '');
  console.log('total beats', TOTAL_BEATS, 'duration', DURATION);
}
