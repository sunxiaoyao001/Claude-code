// Render the full trailer to MP4: N parallel headless-Chromium workers each
// encode a contiguous frame range to an H.264 segment; segments are concatenated
// (stream copy) and muxed with the soundtrack.
// usage: node tools/render.js <audio.wav> <out.mp4> [workers=4] [crf=18] [from=0] [to=DUR]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const { openTrailer } = require('./still.js');

const FPS = 24;
async function worker(id, f0, f1, segPath, crf) {
  const browser = await chromium.launch();
  const page = await openTrailer(browser, path.resolve(__dirname, '../src'));
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-tune', 'animation', '-r', String(FPS), segPath],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const url = await page.evaluate(t => window.TRAILER.frameDataURL(t, 'image/jpeg', 0.95), f / FPS);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 48 === 0) console.log(`[w${id}] ${f - f0}/${f1 - f0} frames, ${((Date.now() - t0) / (f - f0 + 1)).toFixed(0)} ms/frame`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log(`[w${id}] done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

(async () => {
  const [audio, out, nw = '4', crf = '18', from, to] = process.argv.slice(2);
  const W = +nw;
  const total = Math.round(119.2 * FPS);
  const F0 = from ? Math.round(+from * FPS) : 0, F1 = to ? Math.round(+to * FPS) : total;
  const tmp = path.join(path.dirname(out), 'segs');
  fs.mkdirSync(tmp, { recursive: true });
  const per = Math.ceil((F1 - F0) / W);
  const jobs = [], segs = [];
  for (let i = 0; i < W; i++) {
    const a = F0 + i * per, b = Math.min(F1, a + per);
    if (a >= b) break;
    const sp = path.join(tmp, `seg_${i}.mp4`); segs.push(sp);
    jobs.push(worker(i, a, b, sp, crf));
  }
  await Promise.all(jobs);
  // join via MPEG-TS: the MP4 concat demuxer drops frames at joins (B-frame edit lists)
  const ts = segs.map(sp => { const t = sp.replace(/\.mp4$/, '.ts'); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', sp, '-c', 'copy', '-bsf:v', 'h264_mp4toannexb', t]); return t; });
  const args = ['-y', '-loglevel', 'error', '-i', 'concat:' + ts.join('|')];
  if (audio && audio !== '-') args.push('-ss', String(F0 / FPS), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-shortest');
  args.push('-c:v', 'copy', '-movflags', '+faststart', out);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  console.log('wrote', out);
})().catch(e => { console.error(e); process.exit(1); });
