// Render individual frames of the trailer to PNG for review.
// usage: node tools/still.js <outDir> <t1> [t2 ...]   (times in seconds)
//        node tools/still.js <outDir> --range a b step
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

async function openTrailer(browser, root, file = 'index.html') {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning' || /\[log\]/.test(m.text())) console.log('[page]', m.text()); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.route('http://trailer.local/**', async route => {
    const u = new URL(route.request().url());
    const p = path.join(root, decodeURIComponent(u.pathname));
    try { await route.fulfill({ body: fs.readFileSync(p), contentType: MIME[path.extname(p)] || 'application/octet-stream' }); }
    catch (e) { await route.fulfill({ status: 404, body: 'not found' }); }
  });
  await page.goto(`http://trailer.local/${file}?mode=render`);
  await page.waitForFunction(() => window.TRAILER && window.TRAILER.isReady, null, { timeout: 120000 });
  return page;
}

async function main() {
  const [outDir, ...rest] = process.argv.slice(2);
  let times = [];
  if (rest[0] === '--range') {
    const [a, b, st] = rest.slice(1).map(Number);
    for (let t = a; t <= b + 1e-9; t += st) times.push(+t.toFixed(4));
  } else times = rest.map(Number);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--disable-gpu-sandbox'] });
  const page = await openTrailer(browser, path.resolve(__dirname, '../src'));
  for (const t of times) {
    const t0 = Date.now();
    const url = await page.evaluate(t => window.TRAILER.frameDataURL(t, 'image/png'), t);
    const name = path.join(outDir, `f_${t.toFixed(2).padStart(7, '0')}.png`);
    fs.writeFileSync(name, Buffer.from(url.split(',')[1], 'base64'));
    console.log(name, (Date.now() - t0) + 'ms');
  }
  await browser.close();
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { openTrailer };
