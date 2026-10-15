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
const SCALE = +arg('scale', 1), OVERLAY = !!arg('overlay', false), STILLS = arg('stills', null), FINAL = !!arg('final', false), COVER = !!arg('cover', false);
const FPS = 30;
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
const info = await page.evaluate(([s, o, f]) => window.CAPTURE.init(s, o, f), [SCALE, OVERLAY, FINAL]);
const DURATION = info.duration, FROM = +arg('from', 0), TO = +arg('to', DURATION);
console.log(`canvas ${info.w}×${info.h}  duration ${DURATION}s  plates: ${info.plates.length ? info.plates.join(', ') : '（无，使用占位）'}  vo: ${info.vo || '无'}`);
const REL = path.join(ROOT, 'release');

if (COVER) {
  fs.mkdirSync(REL, { recursive: true });
  const b64 = await page.evaluate(() => window.CAPTURE.cover());
  const file = path.join(REL, '封面_1080x1920.png'); fs.writeFileSync(file, Buffer.from(b64, 'base64')); console.log('cover', file);
} else if (STILLS) {
  const dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
  for (const ts of String(STILLS).split(',').map(Number)) {
    const [b64] = await page.evaluate(([f, fps]) => window.CAPTURE.frames(f, 1, fps, 'png'), [Math.round(ts * FPS), FPS]);
    const file = path.join(dir, `t${ts.toFixed(2).padStart(5, '0')}.png`); fs.writeFileSync(file, Buffer.from(b64, 'base64')); console.log('still', file);
  }
} else {
  // 音频：配乐、音效分轨导出；有配音时把配乐压在人声下面（闪避），再统一响度
  const stem = async (only, name) => { const f = path.join(OUT, name); fs.writeFileSync(f, Buffer.from(await page.evaluate((o) => window.CAPTURE.audio(o), only), 'base64')); return f; };
  const voPath = info.vo ? path.join(ROOT, info.vo) : null;
  let audioArgs = [], mixFull = null, mixDry = null;
  if (!OVERLAY) {
    const music = await stem('music', 'music.wav'), sfx = await stem('sfx', 'sfx.wav');
    const vo = voPath && fs.existsSync(voPath) ? voPath : null;
    mixFull = path.join(OUT, 'mix_full.wav'); mixDry = path.join(OUT, 'mix_no_music.wav');
    const norm = 'loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000,alimiter=limit=0.8:attack=2:release=60:level=false';
    const run = (args) => new Promise((res, rej) => { const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'inherit'] }); p.on('close', (c) => (c ? rej(new Error('ffmpeg mix ' + c)) : res())); });
    if (vo) {
      await run(['-i', music, '-i', sfx, '-i', vo, '-filter_complex',
        `[2:a]aformat=channel_layouts=stereo,asplit=2[v1][v2];[0:a][v1]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[md];[md][1:a][v2]amix=inputs=3:duration=first:normalize=0,${norm}[a]`, '-map', '[a]', mixFull]);
      await run(['-i', sfx, '-i', vo, '-filter_complex', `[1:a]aformat=channel_layouts=stereo[v];[0:a][v]amix=inputs=2:duration=first:normalize=0,${norm}[a]`, '-map', '[a]', mixDry]);
    } else {
      await run(['-i', music, '-i', sfx, '-filter_complex', `[0:a][1:a]amix=inputs=2:duration=first:normalize=0,${norm}[a]`, '-map', '[a]', mixFull]);
    }
    console.log('audio mixed', vo ? '(with voiceover)' : '(no voiceover)');
    audioArgs = ['-ss', String(FROM), '-t', String(TO - FROM), '-i', mixFull];
  }
  if (FINAL) fs.mkdirSync(REL, { recursive: true });
  const outFile = OVERLAY ? path.join(OUT, 'overlay_4444.mov') : FINAL ? path.join(OUT, 'final_master.mp4') : path.join(OUT, SCALE < 1 ? 'zeigarnik_preview_small.mp4' : 'zeigarnik_preview.mp4');
  const ff = OVERLAY
    ? ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', outFile]
    : ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', ...audioArgs,
      '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', FINAL ? '14' : '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', '-shortest', outFile];
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
  if (FINAL) {
    // 发布版：两遍编码，1080×1920 / 30fps / H.264 High / 约 6 Mbps，体积控制在 GitHub 单文件限制内
    const enc = (audio, out) => new Promise((res, rej) => {
      const common = ['-i', outFile, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-b:v', '6000k', '-maxrate', '9000k', '-bufsize', '12000k', '-pix_fmt', 'yuv420p', '-r', '30', '-g', '60'];
      const p1 = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...common, '-pass', '1', '-passlogfile', path.join(OUT, 'x264'), '-an', '-f', 'mp4', '/dev/null']);
      p1.on('close', (c) => {
        if (c) return rej(new Error('pass1 ' + c));
        const p2 = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...common, '-pass', '2', '-passlogfile', path.join(OUT, 'x264'), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest', out]);
        p2.on('close', (c2) => (c2 ? rej(new Error('pass2 ' + c2)) : res()));
      });
    });
    const a = path.join(REL, '没写完的结局_抖音成片.mp4'); await enc(mixFull, a); console.log('→', a);
    if (mixDry && fs.existsSync(mixDry)) { const b = path.join(REL, '没写完的结局_无配乐版.mp4'); await enc(mixDry, b); console.log('→', b); }
  }
}
await browser.close(); server.close();
