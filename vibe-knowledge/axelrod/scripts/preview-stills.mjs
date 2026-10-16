/**
 * 批量导出关键帧截图（只打包一次）：
 *   node scripts/preview-stills.mjs 0 60 120 ...
 * 输出到 out/stills/frame-XXXX.jpg
 * 可用 REMOTION_BROWSER 指定 Chrome Headless Shell 路径
 */
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const frames = process.argv.slice(2).map(Number);
const outDir = path.resolve('out/stills');
fs.mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_BROWSER || null;
const browser = await openBrowser('chrome', {
  browserExecutable,
  chromiumOptions: {gl: 'swangle'},
});
const inputProps = {withAudio: false};
const composition = await selectComposition({serveUrl, id: 'Axelrod', inputProps, puppeteerInstance: browser});

for (const frame of frames) {
  const t = Date.now();
  const output = path.join(outDir, `frame-${String(frame).padStart(4, '0')}.jpg`);
  await renderStill({composition, serveUrl, frame, output, inputProps, imageFormat: 'jpeg', jpegQuality: 85, puppeteerInstance: browser});
  console.log(`frame ${frame} → ${output} (${Date.now() - t}ms)`);
}
await browser.close({silent: true});
