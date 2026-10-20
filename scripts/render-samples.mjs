// Renders pack previews through the real pipeline in headless Chromium (CLAUDE.md §7.3: samples come
// from one photo set rendered by pack-tools, so every card looks consistent and true to the look).
//   node scripts/render-samples.mjs thumbs [sample]          -> miniprogram/assets/thumbs/<id>.jpg (192px)
//   node scripts/render-samples.mjs sheet <out.jpg> [sample] [--leak] [--ids a,b] [--columns 5]
// Samples live in pack-tools/samples/ (default: astronaut).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { launchChromium, openPage, ORIGIN, root } from './lib/browser.mjs';

const THUMB_SIZE = 192;
const THUMB_QUALITY = 0.82;

const [mode, ...rest] = process.argv.slice(2);
const flags = new Map();
const positional = [];
for (let i = 0; i < rest.length; i++) {
  const arg = rest[i];
  if (arg === '--leak') flags.set('leak', true);
  else if (arg.startsWith('--')) flags.set(arg.slice(2), rest[++i]);
  else positional.push(arg);
}

if (mode !== 'thumbs' && mode !== 'sheet') {
  console.error('usage: render-samples.mjs thumbs [sample] | sheet <out.jpg> [sample] [--leak] [--ids a,b] [--columns n]');
  process.exit(2);
}

const routes = (pathname) => {
  if (pathname === '/') return { body: '<!doctype html><html><body></body></html>', type: 'text/html' };
  if (pathname === '/harness.mjs') return { body: readFileSync(join(root, 'scripts', 'render-samples', 'harness.mjs'), 'utf8'), type: 'text/javascript' };
  if (pathname.startsWith('/samples/')) return { body: readFileSync(join(root, 'pack-tools', pathname)), type: 'image/jpeg' };
  return null;
};

const launched = await launchChromium();
if (!launched.browser) {
  console.error(`render-samples: ${launched.skip}`);
  process.exit(1);
}
const { browser } = launched;
const decode = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');

try {
  const { page, errors } = await openPage(browser, routes);
  await page.goto(`${ORIGIN}/`);
  if (mode === 'thumbs') {
    const sample = `/samples/${positional[0] ?? 'astronaut'}.jpg`;
    const dir = join(root, 'miniprogram', 'assets', 'thumbs');
    mkdirSync(dir, { recursive: true });
    const ids = await page.evaluate(async () => (await import('/harness.mjs')).packIds());
    let total = 0;
    for (const id of ids) {
      const data = await page.evaluate(async (args) => (await import('/harness.mjs')).thumbnail(...args), [id, sample, THUMB_SIZE, THUMB_QUALITY]);
      const bytes = decode(data);
      writeFileSync(join(dir, `${id}.jpg`), bytes);
      total += bytes.length;
    }
    console.log(`render-samples: ${ids.length} thumbnails, ${(total / 1024).toFixed(1)} KB total -> ${dir}`);
  } else {
    const out = positional[0];
    if (!out) throw new Error('sheet needs an output path');
    const sample = `/samples/${positional[1] ?? 'astronaut'}.jpg`;
    const options = { leak: Boolean(flags.get('leak')), columns: Number(flags.get('columns') ?? 5) };
    if (flags.get('ids')) options.ids = String(flags.get('ids')).split(',');
    const data = await page.evaluate(async (args) => (await import('/harness.mjs')).sheet(...args), [sample, options]);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, decode(data));
    console.log(`render-samples: sheet -> ${out}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await browser.close();
}
