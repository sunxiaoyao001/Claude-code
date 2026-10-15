#!/usr/bin/env node
/* =============================================================================
 * 逐帧导出 MP4：无头 Chromium 渲染每一帧 → 管道送入 ffmpeg 编码 → 合成音轨
 * -----------------------------------------------------------------------------
 * 用法：
 *   node render.mjs                         # 1080×1920 60fps 完整导出 → out/sleep-6h.mp4
 *   node render.mjs --fps 30                # 30fps（更快）
 *   node render.mjs --scale 0.5 --fps 30    # 540×960 快速预览版
 *   node render.mjs --from 28 --to 38       # 只导出一个片段
 *   node render.mjs --stills 0,6.3,31,40    # 导出指定时间点的 PNG 截图（用于检查画面）
 *   node render.mjs --vo vo.wav             # 混入配音，并自动对配乐做侧链压缩（人声出现时音乐自动让路）
 *   node render.mjs --gpu                   # 使用本机 GPU（默认用 SwiftShader 软件渲染，任何机器都能跑）
 *   node render.mjs --jobs 3                # 并行分段渲染（GPU 机器上有效；纯 CPU 软件渲染时已占满核心，保持默认 1）
 * 依赖：Node 18+、ffmpeg（加入 PATH）、playwright（npm i 或全局安装均可）
 * ========================================================================== */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/* ---------- 参数 ---------- */
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  if (i < 0) return def;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const FPS = Number(opt('fps', 60));
const SCALE = Number(opt('scale', 1));
const FROM = Number(opt('from', 0));
const TO = Number(opt('to', 80));
const OUT = path.resolve(ROOT, opt('out', SCALE < 1 ? 'out/sleep-6h-preview.mp4' : 'out/sleep-6h.mp4'));
const STILLS = opt('stills', null);
const VO = opt('vo', null);
const GPU = !!opt('gpu', false);
const CRF = Number(opt('crf', SCALE < 1 ? 22 : 17));
const JPEG_Q = Number(opt('quality', 0.94));
const JOBS = Math.max(1, Number(opt('jobs', 1)));

/* ---------- 加载 playwright（本地依赖优先，其次全局安装） ---------- */
async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const root = execSync('npm root -g').toString().trim();
    return createRequire(path.join(root, 'noop.js'))('playwright');
  }
}

/* ---------- 静态文件服务（ES 资源 / 图片 / 字体需要 http 源） ---------- */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };
function serve() {
  return new Promise((res) => {
    const srv = createServer(async (req, rsp) => {
      try {
        const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        const f = path.join(ROOT, p === '/' ? 'index.html' : p);
        if (!f.startsWith(ROOT)) throw new Error('forbidden');
        const data = await readFile(f);
        rsp.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
        rsp.end(data);
      } catch {
        rsp.writeHead(404);
        rsp.end();
      }
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

async function main() {
  const srv = await serve();
  const port = srv.address().port;
  const { chromium } = await loadPlaywright();
  const launchArgs = GPU ? ['--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  const browser = await chromium.launch({ args: [...launchArgs, '--autoplay-policy=no-user-gesture-required'] });
  const W = Math.round(1080 * SCALE), H = Math.round(1920 * SCALE);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html?render=1&scale=${SCALE}`);
  const info = await page.evaluate(() => window.__FX_READY.then((r) => ({ webgl: r.webgl, report: r.report })));
  console.log(`WebGL2 后期：${info.webgl ? '开启' : '不可用（已回退）'}`);
  console.log(info.report.photos.join('\n'));
  await mkdir(path.dirname(OUT), { recursive: true });

  /* ---------- 截图模式 ---------- */
  if (STILLS) {
    const dir = path.resolve(ROOT, 'out/stills');
    await mkdir(dir, { recursive: true });
    for (const s of String(STILLS).split(',').map(Number)) {
      const b64 = await page.evaluate(([t]) => window.__renderFrame(t, 'image/png'), [s]);
      const f = path.join(dir, `t${s.toFixed(2).padStart(5, '0')}.png`);
      await writeFile(f, Buffer.from(b64, 'base64'));
      console.log('  →', path.relative(ROOT, f));
    }
    await browser.close();
    srv.close();
    return;
  }

  /* ---------- 音频 ---------- */
  const wavPath = path.resolve(ROOT, 'out/audio.wav');
  const wav = await page.evaluate(() => window.__getAudioWav());
  await writeFile(wavPath, Buffer.from(wav, 'base64'));
  console.log('音频 →', path.relative(ROOT, wavPath));

  /* ---------- 并行分段渲染：每个分段一个页面（独立渲染进程）+ 一个 ffmpeg 编码器 ---------- */
  const n = Math.round((TO - FROM) * FPS);
  const jobs = Math.min(JOBS, Math.max(1, Math.floor(n / FPS)));
  const pages = [page];
  const extra = [];
  for (let k = 1; k < jobs; k++) {
    // 每路单独一个浏览器实例：页面共用一个 GPU 进程会串行，独立实例才能真正并行
    const br = await chromium.launch({ args: [...launchArgs, '--autoplay-policy=no-user-gesture-required'] });
    extra.push(br);
    const pg = await br.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    pg.on('pageerror', (e) => console.error('[page error]', e.message));
    await pg.goto(`http://127.0.0.1:${port}/index.html?render=1&scale=${SCALE}`);
    await pg.evaluate(() => window.__FX_READY.then(() => true));
    pages.push(pg);
  }
  const segDir = path.resolve(ROOT, 'out/segments');
  await mkdir(segDir, { recursive: true });
  const vArgs = ['-c:v', 'libx264', '-preset', SCALE < 1 ? 'veryfast' : 'slow', '-crf', String(CRF),
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-r', String(FPS),
    '-g', String(FPS * 2), '-bf', '2', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709'];
  let done = 0;
  const t0 = Date.now();
  const progress = () => {
    const el = (Date.now() - t0) / 1000, eta = (el / Math.max(1, done)) * (n - done);
    process.stdout.write(`\r渲染 ${done}/${n} 帧${jobs > 1 ? `（${jobs} 路并行）` : ''}  ${(done / n * 100).toFixed(1)}%  已用 ${fmt(el)}  剩余 ${fmt(eta)}   `);
  };
  const segs = pages.map((pg, k) => ({ pg, i0: Math.floor((n * k) / jobs), i1: Math.floor((n * (k + 1)) / jobs), file: path.join(segDir, `seg${k}.mp4`) }));
  await Promise.all(segs.map(async (sg) => {
    const enc = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS),
      '-c:v', 'mjpeg', '-i', '-', ...vArgs, '-an', sg.file], { stdio: ['pipe', 'inherit', 'inherit'] });
    const encDone = new Promise((res, rej) => enc.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
    for (let i = sg.i0; i < sg.i1; i++) {
      const t = FROM + i / FPS;
      const b64 = await sg.pg.evaluate(([tt, q]) => window.__renderFrame(tt, 'image/jpeg', q), [t, JPEG_Q]);
      if (!enc.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => enc.stdin.once('drain', r));
      if (++done % 30 === 0 || done === n) progress();
    }
    enc.stdin.end();
    await encDone;
  }));

  /* ---------- 拼接视频（无损）+ 合成音轨 ---------- */
  const list = path.join(segDir, 'list.txt');
  await writeFile(list, segs.map((sg) => `file '${sg.file.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  const ff = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
    '-ss', String(FROM), '-t', String(TO - FROM), '-i', wavPath];
  if (VO) ff.push('-ss', String(FROM), '-t', String(TO - FROM), '-i', path.resolve(VO));
  ff.push('-c:v', 'copy');
  if (VO) {
    // 配音作为侧链信号压低配乐，再与配音混合
    ff.push('-filter_complex',
      '[2:a]aresample=48000,asplit=2[vo1][vo2];[1:a][vo1]sidechaincompress=threshold=0.04:ratio=6:attack=15:release=350[duck];[duck][vo2]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aout]',
      '-map', '0:v', '-map', '[aout]');
  } else {
    ff.push('-map', '0:v', '-map', '1:a');
  }
  ff.push('-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', '-shortest', OUT);
  await new Promise((res, rej) => spawn('ffmpeg', ff, { stdio: 'inherit' }).on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg mux exit ' + c)))));
  await rm(segDir, { recursive: true, force: true });
  await Promise.all(extra.map((br) => br.close()));
  console.log(`\n完成 → ${path.relative(ROOT, OUT)}`);
  await browser.close();
  srv.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
