// 逐帧渲染 → ffmpeg 合成 MP4（含临时音轨）
// 用法：
//   node render/render.mjs                       # 1080×1920 完整预演片 → out/zeigarnik_preview.mp4
//   node render/render.mjs --scale 0.5           # 540×960 快速版
//   node render/render.mjs --overlay             # 透明动效+字幕层 → out/overlay_4444.mov（ProRes 4444，带 Alpha）
//   node render/render.mjs --stills 3.4,15.1,48  # 导出指定秒数的静帧 PNG 到 out/stills/
//   node render/render.mjs --from 40 --to 50     # 只渲染一段
// AI 素材：放进 assets/ 并写 assets/manifest.json，例如 {"SH01":"SH01.mp4","SH06":"SH06.png"}
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const SCALE = +arg('scale', 1), OVERLAY = !!arg('overlay', false), STILLS = arg('stills', null);
const FPS = 30, DURATION = 62, FROM = +arg('from', 0), TO = +arg('to', DURATION);
const OUT = path.join(ROOT, 'out'); fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
page.on('pageerror', (e) => console.error('[page error]', e.message));
await page.goto(`${base}/render/capture.html`);
const info = await page.evaluate(([s, o]) => window.CAPTURE.init(s, o), [SCALE, OVERLAY]);
console.log(`canvas ${info.w}×${info.h}  plates: ${info.plates.length ? info.plates.join(', ') : '（无，使用占位）'}`);

if (STILLS) {
  const dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
  for (const ts of String(STILLS).split(',').map(Number)) {
    const [b64] = await page.evaluate(([f, fps]) => window.CAPTURE.frames(f, 1, fps, 'png'), [Math.round(ts * FPS), FPS]);
    const file = path.join(dir, `t${ts.toFixed(2).padStart(5, '0')}.png`); fs.writeFileSync(file, Buffer.from(b64, 'base64')); console.log('still', file);
  }
} else {
  const wavPath = path.join(OUT, 'soundtrack.wav');
  if (!OVERLAY) { fs.writeFileSync(wavPath, Buffer.from(await page.evaluate(() => window.CAPTURE.audio()), 'base64')); console.log('audio', wavPath); }
  const outFile = path.join(OUT, OVERLAY ? 'overlay_4444.mov' : SCALE < 1 ? 'zeigarnik_preview_small.mp4' : 'zeigarnik_preview.mp4');
  const ff = OVERLAY
    ? ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', outFile]
    : ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-ss', String(FROM), '-t', String(TO - FROM), '-i', wavPath,
      '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', outFile];
  const proc = spawn('ffmpeg', ff, { stdio: ['pipe', 'ignore', 'inherit'] });
  const first = Math.round(FROM * FPS), last = Math.round(TO * FPS), BATCH = 6, t0 = Date.now();
  for (let f = first; f < last; f += BATCH) {
    const n = Math.min(BATCH, last - f);
    const frames = await page.evaluate(([a, b, fps, fmt]) => window.CAPTURE.frames(a, b, fps, fmt), [f, n, FPS, OVERLAY ? 'png' : 'jpeg']);
    for (const b64 of frames) if (!proc.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => proc.stdin.once('drain', r));
    if ((f - first) % 150 < BATCH) process.stdout.write(`\r${(f / FPS).toFixed(1)}s / ${TO}s  (${((Date.now() - t0) / 1000).toFixed(0)}s elapsed)   `);
  }
  proc.stdin.end(); await new Promise((r) => proc.on('close', r));
  console.log('\n→', outFile);
}
await browser.close(); server.close();
