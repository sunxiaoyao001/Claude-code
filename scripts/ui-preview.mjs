// Screenshots of the real camera page for review without a phone (CLAUDE.md §14: the cloud has no WeChat
// client). The page's own WXML/WXSS (and its components) are rendered to HTML by scripts/ui-preview/
// wxml.mjs, the viewfinder canvas is painted by the real preview pipeline, and simulated phone chrome
// (status bar, capsule button, safe area) is drawn around it. Fonts fall back to what Chromium has.
//   node scripts/ui-preview.mjs <out-dir> [scenario …]
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { launchChromium, openPage, ORIGIN, root } from './lib/browser.mjs';
import { loadTs } from './ui-preview/loadTs.mjs';
import { adaptCss, loadWxss, parseWxml, WxmlRenderer } from './ui-preview/wxml.mjs';

const src = (...parts) => join(root, 'miniprogram', ...parts);
const { PackStore } = loadTs(src('core', 'pack', 'PackStore.ts'));
const { buildStripItems } = loadTs(src('core', 'ui', 'stripModel.ts'));
const { fitFrame } = loadTs(src('core', 'camera', 'frameLayout.ts'));
const { parseAspect } = loadTs(src('core', 'pack', 'FilterParams.ts'));
const { formatCounter } = loadTs(src('core', 'storage', 'RollCounter.ts'));

const DEVICES = {
  iphone14: { width: 390, height: 844, statusBar: 47, menu: { top: 51, height: 32, left: 296, width: 87 }, safeBottom: 34 },
  iphoneSE: { width: 375, height: 667, statusBar: 20, menu: { top: 24, height: 32, left: 281, width: 87 }, safeBottom: 0 },
  android: { width: 412, height: 915, statusBar: 32, menu: { top: 36, height: 32, left: 318, width: 87 }, safeBottom: 0 },
};

// Gap between frame and status row / controls (FRAME_GAP_PX) and before the capsule (CAPSULE_GAP_PX).
const FRAME_GAP = 8;
const CAPSULE_GAP = 8;

const SCENARIOS = {
  '01-sunny-fun': { device: 'iphone14', pack: 'sunny-fun', remaining: 23, lastShot: 'pocket-gold' },
  '02-knight-t2': { device: 'iphone14', pack: 'knight-t2', remaining: 31, lastShot: 'knight-t2' },
  '03-sakura': { device: 'iphone14', pack: 'sakura-premium', remaining: 12, lastShot: 'sakura-premium' },
  '04-m3-hp5': { device: 'iphone14', pack: 'm3-hp5', remaining: 8, lastShot: 'm3-hp5' },
  '05-street-gr': { device: 'iphone14', pack: 'street-gr', remaining: 36 },
  '06-ccd-sony': { device: 'iphone14', pack: 'ccd-sony', remaining: 17, lastShot: 'ccd-sony' },
  '07-vhs-c': { device: 'iphone14', pack: 'vhs-c', remaining: 5, lastShot: 'vhs-c' },
  '08-swap-black': { device: 'iphone14', pack: 'red-box', remaining: 36, swap: { title: 'RED', black: true } },
  '09-swap-fade-in': { device: 'iphone14', pack: 'red-box', remaining: 36, swap: { title: 'RED B', black: false, linesHidden: false } },
  '10-iphone-se': { device: 'iphoneSE', pack: 'moonlight', remaining: 20, lastShot: 'moonlight' },
  '11-android-solid': { device: 'android', pack: 'pastel-160', remaining: 30, stripSolid: true, lastShot: 'pastel-160' },
  '12-raw-compare': { device: 'iphone14', pack: 'sunny-fun', remaining: 23, raw: true },
  '13-privacy': { device: 'iphone14', pack: 'sunny-fun', stage: 'starting', privacy: true },
  '14-camera-denied': { device: 'iphone14', pack: 'sunny-fun', stage: 'camera-denied' },
};

const store = new PackStore(null);
const renderer = new WxmlRenderer({
  'privacy-sheet': src('components', 'privacy-sheet', 'privacy-sheet'),
  'viewfinder-skin': src('components', 'viewfinder-skin', 'viewfinder-skin'),
  'film-roll-strip': src('components', 'film-roll-strip', 'film-roll-strip'),
  'dev-panel': src('components', 'dev-panel', 'dev-panel'),
});
const template = parseWxml(readFileSync(src('pages', 'camera', 'camera.wxml'), 'utf8'));
const css = [loadWxss(src('app.wxss')), ...renderer.styles.map(adaptCss), loadWxss(src('pages', 'camera', 'camera.wxss'))].join('\n');

function pageData(scenario, device, frame) {
  const pack = store.get(scenario.pack);
  const swap = scenario.swap ?? null;
  return {
    stage: scenario.stage ?? 'live',
    cameraMounted: true,
    devicePosition: 'back',
    flash: 'off',
    glFailed: false,
    errorMessage: '',
    statusTop: device.menu.top,
    statusHeight: device.menu.height,
    statusRight: device.width - device.menu.left + CAPSULE_GAP,
    accent: pack.ui.themeColor,
    packId: pack.id,
    stripItems: buildStripItems(store.list(), (p) => store.thumbSource(p), (p) => !p.free),
    stripSolid: Boolean(scenario.stripSolid),
    frame,
    counter: formatCounter({ roll: 1, remaining: scenario.remaining ?? 36 }),
    title: swap ? swap.title : pack.latinName,
    format: pack.filter.frame.aspectRatio,
    swapBlack: Boolean(swap?.black),
    linesHidden: swap ? swap.linesHidden ?? true : false,
    capturing: false,
    mirrorFlash: false,
    lastShotPath: scenario.lastShot ? `/assets/thumbs/${scenario.lastShot}.jpg` : '',
    viewerVisible: false,
    privacySheetVisible: Boolean(scenario.privacy),
    privacyContractName: '《隐私保护指引》',
    devVisible: false,
    dev: { lines: [], settings: {}, results: [] },
  };
}

function chrome(device) {
  const { menu } = device;
  return `
<div class="sim-status" style="height:${device.statusBar}px"><span>9:41</span><span class="sim-battery"><i></i></span></div>
<div class="sim-capsule" style="left:${menu.left}px;top:${menu.top}px;width:${menu.width}px;height:${menu.height}px">
  <span class="sim-dots"><i></i><i></i><i></i></span><span class="sim-sep"></span><span class="sim-ring"></span>
</div>${device.safeBottom ? '<div class="sim-home"></div>' : ''}`;
}

const SIM_CSS = `
html, body { margin: 0; padding: 0; background: #0D0D0F; overflow: hidden; }
img { display: inline-block; }
canvas { display: block; }
[data-wx="scroll-view"]::-webkit-scrollbar { display: none; }
/* WeChat's built-in <button> defaults that the page styles rely on. */
[data-wx="button"] { display: block; text-align: center; box-sizing: border-box; overflow: hidden; }
.wx-root { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
.sim-status { position: absolute; left: 0; right: 0; top: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 30px; box-sizing: border-box; font: 600 15px -apple-system, "Helvetica Neue", Arial, sans-serif; color: #F5F4F0; pointer-events: none; }
.sim-battery { width: 24px; height: 11px; border: 1px solid rgba(245,244,240,.5); border-radius: 3px; padding: 1px; box-sizing: border-box; }
.sim-battery i { display: block; width: 70%; height: 100%; background: #F5F4F0; border-radius: 1px; }
.sim-capsule { position: absolute; z-index: 100; box-sizing: border-box; border: .5px solid rgba(245,244,240,.25); border-radius: 16px; background: rgba(0,0,0,.25); display: flex; align-items: center; justify-content: space-around; }
.sim-dots { display: flex; gap: 3px; } .sim-dots i { width: 4px; height: 4px; border-radius: 50%; background: #F5F4F0; }
.sim-dots i:nth-child(2) { width: 6px; height: 6px; margin-top: -1px; }
.sim-sep { width: .5px; height: 18px; background: rgba(245,244,240,.3); }
.sim-ring { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #F5F4F0; box-sizing: border-box; box-shadow: inset 0 0 0 2px rgba(0,0,0,.25), inset 0 0 0 4px #F5F4F0; }
.sim-home { position: absolute; z-index: 100; left: 50%; bottom: 8px; width: 134px; height: 5px; margin-left: -67px; border-radius: 3px; background: #F5F4F0; opacity: .85; }
`;

function html(scenario, device, frame) {
  const body = renderer.render(template, pageData(scenario, device, frame));
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}\n${SIM_CSS}
.wx-root { --sim-safe-bottom: ${device.safeBottom}px; }</style></head>
<body><div class="wx-root">${body}${chrome(device)}</div></body></html>`;
}

const [outDir, ...wanted] = process.argv.slice(2);
if (!outDir) {
  console.error(`usage: ui-preview.mjs <out-dir> [${Object.keys(SCENARIOS).join(' ')}]`);
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const names = wanted.length ? wanted : Object.keys(SCENARIOS);

let current = '';
const routes = (pathname) => {
  if (pathname === '/screen') return { body: current, type: 'text/html' };
  if (pathname === '/ui-gl.mjs') return { body: readFileSync(join(root, 'scripts', 'ui-preview', 'gl.mjs'), 'utf8'), type: 'text/javascript' };
  if (pathname.startsWith('/samples/')) return { body: readFileSync(join(root, 'pack-tools', pathname)), type: 'image/jpeg' };
  return null;
};

const launched = await launchChromium();
if (!launched.browser) {
  console.error(`ui-preview: ${launched.skip}`);
  process.exit(1);
}
const { browser } = launched;
try {
  for (const name of names) {
    const scenario = SCENARIOS[name];
    if (!scenario) throw new Error(`unknown scenario ${name}`);
    const device = DEVICES[scenario.device];
    const { page, errors } = await openPage(browser, routes, { viewport: { width: device.width, height: device.height }, deviceScaleFactor: 2 });
    // Pass 1 measures where the controls start; pass 2 renders with the fitted frame, like the page.
    current = html(scenario, device, { left: 0, top: 0, width: 0, height: 0 });
    await page.goto(`${ORIGIN}/screen`);
    const controlsTop = await page.evaluate(async () => (await import('/ui-gl.mjs')).controlsTop());
    const top = device.menu.top + device.menu.height + FRAME_GAP;
    const pack = store.get(scenario.pack);
    const frame = fitFrame({ left: 0, top, width: device.width, height: controlsTop - FRAME_GAP - top }, parseAspect(pack.filter.frame.aspectRatio));
    current = html(scenario, device, frame);
    await page.goto(`${ORIGIN}/screen`);
    await page.evaluate(async (args) => {
      const gl = await import('/ui-gl.mjs');
      await gl.paint(args);
      gl.centreStrip();
      await gl.settle();
    }, { packId: pack.id, sample: '/samples/astronaut.jpg', frame, pixelRatio: 2, raw: Boolean(scenario.raw) });
    if (errors.length) throw new Error(`${name}: ${errors.join('\n')}`);
    const path = join(outDir, `${name}.jpg`);
    await page.screenshot({ path, type: 'jpeg', quality: 90 });
    if (name === '01-sunny-fun') {
      await page.screenshot({ path: join(outDir, '01b-strip-closeup.jpg'), type: 'jpeg', quality: 92, clip: { x: 0, y: controlsTop - 70, width: device.width, height: device.height - controlsTop + 70 } });
    }
    await page.close();
    console.log(`ui-preview: ${path}`);
  }
} finally {
  await browser.close();
}
