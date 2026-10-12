// Per-scene render cost: N consecutive frames, single tab. Usage: node scripts/profile.mjs S01-eye:40 S04-stat:60 ...
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';

const browserExecutable = process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const chromiumOptions = {gl: 'swangle'};
const n = Number(process.env.FRAMES ?? 8);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {browserExecutable, chromiumOptions});
for (const arg of process.argv.slice(2)) {
  const [id, start] = arg.split(':');
  const composition = await selectComposition({serveUrl, id, puppeteerInstance: browser, browserExecutable, chromiumOptions});
  const s = Number(start);
  const t0 = Date.now();
  let first = 0;
  await renderMedia({
    composition, serveUrl, codec: 'h264', outputLocation: `out/prof-${id}.mp4`, frameRange: [s, s + n - 1], concurrency: 1,
    puppeteerInstance: browser, chromiumOptions, browserExecutable, muted: true,
    onProgress: ({renderedFrames}) => { if (renderedFrames === 1 && !first) first = Date.now(); },
  });
  const t1 = Date.now();
  console.log(`${id.padEnd(16)} first ${(first - t0)}ms  then ${((t1 - first) / (n - 1)).toFixed(0)} ms/frame`);
}
await browser.close({silent: true});
