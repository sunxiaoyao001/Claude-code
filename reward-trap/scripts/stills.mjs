// Fast visual QA: bundle once, render many stills.
// Usage: node scripts/stills.mjs Comp:0,30,60 Other:12   (SCALE=0.5 by default)
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import path from 'node:path';

execFileSync('node', ['scripts/gen-charset.mjs'], {stdio: 'inherit'});

const scale = Number(process.env.SCALE ?? 0.5);
const outDir = process.env.OUT ?? 'out/stills';
mkdirSync(outDir, {recursive: true});
const browserExecutable =
  process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const chromiumOptions = {gl: 'swangle'};

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {browserExecutable, chromiumOptions});
const t0 = Date.now();
for (const arg of process.argv.slice(2)) {
  const [id, framesStr] = arg.split(':');
  const composition = await selectComposition({serveUrl, id, puppeteerInstance: browser, browserExecutable, chromiumOptions});
  for (const f of framesStr.split(',').map(Number)) {
    const output = `${outDir}/${id}-${String(f).padStart(4, '0')}.png`;
    const s = Date.now();
    await renderStill({composition, serveUrl, frame: f, output, scale, puppeteerInstance: browser, chromiumOptions, browserExecutable});
    console.log(`${output}  ${Date.now() - s}ms`);
  }
}
await browser.close({silent: true});
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
