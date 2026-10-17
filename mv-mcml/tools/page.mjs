// 打开 MV 页面（本地静态服务 + 无头 Chromium），等 window.READY。改编自 lemo-opuscar core/render/page.mjs、serve.mjs（MIT）
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const W = 1080, H = 1920;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };
let srv = null;
function serve() {
  if (srv) return srv;
  srv = new Promise(res => {
    const s = http.createServer((q, r) => {
      let u; try { u = decodeURIComponent(q.url.split('?')[0]); } catch { r.writeHead(400); return r.end(); }
      const p = path.resolve(ROOT, '.' + path.sep + u.replace(/^\/+/, ''));
      if (!p.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
      fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
    });
    s.listen(0, '127.0.0.1', () => res({ s, port: s.address().port }));
  });
  return srv;
}
export async function openPage(q = '') {
  const { port } = await serve();
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--force-color-profile=srgb', '--enable-unsafe-swiftshader', ...(process.env.ACCEL2D ? [] : ['--disable-accelerated-2d-canvas'])] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text().slice(0, 400)); });
  page.on('pageerror', e => { console.error('[pageerror]', e.message); process.exit(1); });
  page.on('response', r => { if (r.status() >= 400 && !/favicon|cues\.json/.test(r.url())) console.error('[page]', r.status(), r.url()); });
  await page.goto(`http://127.0.0.1:${port}/index.html${q ? '?' + q : ''}`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  return { browser, page };
}
export async function closeServer() { if (srv) (await srv).s.close(); }
