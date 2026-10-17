// 渲静帧：node tools/still.mjs <t> [<t> ...] [--range a:b:step] [--out dir] [--prefix p]
import fs from 'fs'; import path from 'path';
import { openPage, closeServer, ROOT } from './page.mjs';
const args = process.argv.slice(2);
const take = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const out = take('--out') || path.join(ROOT, 'check'), prefix = take('--prefix') || 't_', rg = take('--range'), q = take('--q') || '';
const times = [...args];
if (rg) { const [a, b, st] = rg.split(':').map(Number); for (let x = a; x <= b + 1e-9; x += st) times.push(x.toFixed(2)); }
fs.mkdirSync(out, { recursive: true });
const { browser, page } = await openPage(q);
for (const ts of times) {
  const t0 = Date.now();
  await page.evaluate(t => window.render(t), parseFloat(ts));
  const f = path.join(out, `${prefix}${ts}.jpg`);
  await page.screenshot({ path: f, type: 'jpeg', quality: 92 });
  console.log(f, Date.now() - t0 + 'ms');
}
await browser.close(); await closeServer();
