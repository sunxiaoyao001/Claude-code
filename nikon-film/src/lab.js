// lab.js — pose sheets: every act at several beats, for tuning. node src/lab.js [hue] [acts...]
'use strict';
const E = require('./engine');
const { drawAct, disc, ACTS } = require('./stage');
const fs = require('fs'), path = require('path');
const hue = process.argv[2] || 'LAKE';
const names = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(ACTS);
const beats = [0, 1, 2, 3, 3.6];
const cw = 300, ch = 300;
const cv = E.createCanvas(cw * beats.length + 160, ch * names.length), ctx = cv.getContext('2d');
const th = E.HUES[hue];
ctx.fillStyle = E.css(th.t[2]); ctx.fillRect(0, 0, cv.width, cv.height);
names.forEach((n, j) => {
  ctx.fillStyle = E.css(th.type); ctx.font = E.FONTS.mono(20); ctx.fillText(n, 10, j * ch + 30);
  beats.forEach((b, i) => {
    const cx = 160 + i * cw + cw / 2, cy = j * ch + ch / 2;
    const st = (ACTS[n](b, th).stage) || {};
    disc(ctx, th, st.disc, cx, cy, 130);
    drawAct(ctx, n, n === 'leap' ? b * 2 : b, th, cx, cy, 200);
    ctx.fillStyle = E.css(th.type); ctx.font = E.FONTS.mono(16); ctx.fillText('b' + (n === 'leap' ? b * 2 : b), cx - cw / 2 + 8, cy + ch / 2 - 10);
  });
});
const out = path.join(__dirname, '..', 'out'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, `poses-${hue}.png`), cv.toBuffer('image/png'));
console.log('wrote', path.join(out, `poses-${hue}.png`));
