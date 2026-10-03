// Frame-accurate renderer: seeks the page to each frame time, screenshots it, pipes into ffmpeg.
// Usage:
//   node render.js stills 1.5,10,20        -> out/still_<t>.png
//   node render.js cues                    -> out/cues.json (sound-effect cue list for music.py)
//   node render.js video [workers]         -> out/video_noaudio.mp4
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.woff': 'font/woff' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    });
    srv.listen(0, () => res(srv));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror:', e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  // warm every glyph subset: visit the whole timeline once, then wait for fonts
  await page.evaluate(async () => {
    for (let t = 0; t < window.DUR; t += 0.1) window.seek(t);
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 300));
    await document.fonts.ready;
  });
  return page;
}

async function main() {
  const [mode = 'video', arg] = process.argv.slice(2);
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch();
  try {
    if (mode === 'stills') {
      const page = await openPage(browser, port);
      for (const t of arg.split(',').map(Number)) {
        await page.evaluate(t => window.seek(t), t);
        await page.screenshot({ path: path.join(OUT, `still_${t}.png`) });
      }
    } else if (mode === 'cues') {
      const page = await openPage(browser, port);
      const data = await page.evaluate(() => ({ dur: window.DUR, cues: window.CUES, subs: window.SUBS }));
      fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify(data, null, 1));
      console.log(`${data.cues.length} cues, ${data.subs.length} subtitles`);
    } else {
      const workers = +(arg || 4);
      const meta = await (await openPage(browser, port)).evaluate(() => ({ dur: window.DUR, fps: window.FPS }));
      const total = Math.round(meta.dur * meta.fps);
      const per = Math.ceil(total / workers);
      const t0 = Date.now();
      let done = 0;
      const segs = await Promise.all([...Array(workers)].map(async (_, w) => {
        const a = w * per, b = Math.min(total, a + per);
        const file = path.join(OUT, `seg_${w}.mp4`);
        const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(meta.fps), '-c:v', 'mjpeg', '-i', '-',
          '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(meta.fps), file], { stdio: ['pipe', 'inherit', 'inherit'] });
        const page = await openPage(browser, port);
        for (let f = a; f < b; f++) {
          await page.evaluate(t => window.seek(t), f / meta.fps);
          const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
          if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
          if (++done % 150 === 0) console.log(`${done}/${total} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
        }
        ff.stdin.end();
        await new Promise(r => ff.on('close', r));
        return file;
      }));
      fs.writeFileSync(path.join(OUT, 'segs.txt'), segs.map(f => `file '${f}'`).join('\n'));
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'segs.txt'), '-c', 'copy', path.join(OUT, 'video_noaudio.mp4')]);
      segs.forEach(f => fs.unlinkSync(f));
      console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  } finally {
    await browser.close();
    srv.close();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
