// stills.js — render single frames for review: node src/stills.js t1 t2 ... (seconds) → out/still-<t>.png, plus a contact sheet.
'use strict';
const E = require('./engine');
const S = require('./scenes');
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'out'); fs.mkdirSync(out, { recursive: true });
const cv = E.createCanvas(E.W, E.H), ctx = cv.getContext('2d');
let ts = process.argv.slice(2).map(Number);
if (!ts.length) ts = S.shots.map(s => s.t0 + Math.min(s.t1 - s.t0, 2.5) * 0.78);
const sheetCols = 5, tw = 384, th = 216, rows = Math.ceil(ts.length / sheetCols);
const sheet = E.createCanvas(tw * sheetCols, th * rows), sx = sheet.getContext('2d');
const t0 = Date.now();
ts.forEach((t, i) => {
  S.renderFrame(ctx, t);
  if (process.argv.length > 2) fs.writeFileSync(path.join(out, `still-${t.toFixed(2)}.png`), cv.toBuffer('image/png'));
  sx.drawImage(cv, (i % sheetCols) * tw, Math.floor(i / sheetCols) * th, tw, th);
  sx.fillStyle = '#fff'; sx.font = E.FONTS.mono(14); sx.fillText(t.toFixed(2), (i % sheetCols) * tw + 6, Math.floor(i / sheetCols) * th + 18);
});
fs.writeFileSync(path.join(out, 'contact-sheet.png'), sheet.toBuffer('image/png'));
console.log('frames', ts.length, 'ms/frame', ((Date.now() - t0) / ts.length).toFixed(1));
