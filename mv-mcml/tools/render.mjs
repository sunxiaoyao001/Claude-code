// 渲视频：node tools/render.mjs [--from 0] [--to DUR] [--fps 60] [--workers 3] [--mb 3] [--out out/video.mp4]
// 每个 worker 一个浏览器，JPEG 截图经管道交给 ffmpeg 编成分段，最后无损拼接。改编自 lemo-opuscar core/render/video.mjs（MIT）
// --mb n：每帧画 n 个子帧取平均（真实运动模糊）；只在 window.MB(t) 说"这里动得快"的帧上用，其余帧画一次
import fs from 'fs'; import path from 'path'; import { spawn, execFileSync } from 'child_process';
import { openPage, closeServer, ROOT } from './page.mjs';
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const FPS = +opt('--fps', 60), WK = +opt('--workers', 3), MB = +opt('--mb', 3);
const out = path.resolve(opt('--out', path.join(ROOT, 'out', 'video.mp4')));
fs.mkdirSync(path.dirname(out), { recursive: true });
const segDir = fs.mkdtempSync(path.join(path.dirname(out), '.segs-'));
const probe = await openPage(); const DUR = await probe.page.evaluate(() => window.DUR); await probe.browser.close();
const T0 = +opt('--from', 0), T1 = +opt('--to', DUR);
const F0 = Math.round(T0 * FPS), F1 = Math.round(T1 * FPS), TOTAL = F1 - F0, per = Math.ceil(TOTAL / WK), t0 = Date.now();
await Promise.all([...Array(WK)].map(async (_, w) => {
  const a = F0 + w * per, b = Math.min(F1, a + per); if (a >= b) return;
  const { browser, page } = await openPage();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', `seg_${w}.mp4`], { cwd: segDir, stdio: ['pipe', 'inherit', 'inherit'] });
  let done; const closed = new Promise(r => { done = r; }); ff.on('close', c => done(c));
  for (let f = a; f < b; f++) {
    const t = f / FPS;
    await page.evaluate(([t, mb]) => { const n = window.MB ? window.MB(t) : 1; window.renderMB(t, n > 1 ? mb : 1); }, [t, MB]);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - a) % 60 === 0) console.log(`w${w} ${f - a}/${b - a}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); const code = await closed; await browser.close();
  if (code !== 0) { console.error('ffmpeg failed', w); process.exit(1); }
}));
fs.writeFileSync(path.join(segDir, 'segs.txt'), [...Array(WK)].map((_, w) => `file 'seg_${w}.mp4'`).filter((_, w) => F0 + w * per < F1).join('\n'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'segs.txt', '-c', 'copy', '-movflags', '+faststart', 'merged.mp4'], { cwd: segDir, stdio: 'inherit' });
fs.renameSync(path.join(segDir, 'merged.mp4'), out);
fs.rmSync(segDir, { recursive: true, force: true });
console.log('done', out, TOTAL, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's');
await closeServer();
