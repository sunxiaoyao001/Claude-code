// GPU check of the film pipeline (CLAUDE.md §10 "shader 逻辑对齐测试"): runs the real shaders in a
// headless Chromium WebGL1 context (SwiftShader) and compares them with TypeScript references.
// Needs Playwright with a Chromium build; when unavailable it prints SKIPPED and exits 0, so the
// pipeline still passes on machines without a browser. TypeScript is transpiled on the fly.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');

async function loadPlaywright() {
  const candidates = ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/node-tools/node_modules/playwright/index.mjs'].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const specifier = candidate.startsWith('/') ? pathToFileURL(candidate).href : candidate;
      return await import(specifier);
    } catch {
      // try the next location
    }
  }
  return null;
}

function transpile(file) {
  const output = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, verbatimModuleSyntax: false },
    fileName: file,
  });
  return output.outputText;
}

/** Maps a request path to a file and content type; extensionless imports resolve to .ts sources. */
function resolveRequest(pathname) {
  if (pathname === '/') return { body: '<!doctype html><html><body></body></html>', type: 'text/html' };
  if (pathname === '/harness.mjs') return { body: readFileSync(join(root, 'scripts', 'gl-check', 'harness.mjs'), 'utf8'), type: 'text/javascript' };
  if (pathname.startsWith('/pack-tools/') && pathname.endsWith('.mts')) return { body: transpile(join(root, pathname)), type: 'text/javascript' };
  if (pathname.startsWith('/assets/')) return { body: readFileSync(join(root, 'miniprogram', pathname)), type: 'image/png' };
  if (pathname.startsWith('/core/')) return { body: transpile(join(root, 'miniprogram', `${pathname}.ts`)), type: 'text/javascript' };
  return null;
}

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
}

const playwright = await loadPlaywright();
if (!playwright?.chromium) {
  console.log('gl-check: SKIPPED, Playwright/Chromium not available (set PLAYWRIGHT_MODULE to its index.mjs)');
  process.exit(0);
}

let browser;
try {
  browser = await playwright.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
} catch (error) {
  console.log(`gl-check: SKIPPED, Chromium failed to launch (${String(error.message ?? error).split('\n')[0]})`);
  process.exit(0);
}

try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('http://gl.test/**', (route) => {
    const resolved = resolveRequest(new URL(route.request().url()).pathname);
    if (!resolved) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({ status: 200, contentType: resolved.type, body: resolved.body });
  });
  await page.goto('http://gl.test/');
  const r = await page.evaluate(async () => (await import('/harness.mjs')).run());
  if (pageErrors.length) throw new Error(pageErrors.join('\n'));

  check('identity LUT round trip ≤ 3/255', r.identityMaxError <= 3, `${r.identityMaxError}/255`);
  check('sunny-fun LUT on GPU vs look function ≤ 4/255', r.sunnyLutMaxError <= 4, `${r.sunnyLutMaxError.toFixed(2)}/255`);
  const meanDiff = Math.abs(r.grain.gpu.mean - r.grain.ref.mean) * 255;
  const stdRatio = r.grain.gpu.std / r.grain.ref.std;
  check('grain mean matches reference (≤ 0.75/255)', meanDiff <= 0.75, `Δmean ${meanDiff.toFixed(2)}/255`);
  check('grain std matches reference (±15%)', stdRatio > 0.85 && stdRatio < 1.15, `gpu ${(r.grain.gpu.std * 255).toFixed(2)} vs ref ${(r.grain.ref.std * 255).toFixed(2)} (/255)`);
  check('grain reproducible for the same seed', r.grainReproducible === 1, `${(r.grainReproducible * 100).toFixed(1)}% identical`);
  check('grain changes with the seed', r.grainSeedChanges > 0.5, `${(r.grainSeedChanges * 100).toFixed(1)}% changed`);
  const [hr, hg, hb] = r.halation.on.near;
  const [er, eg, eb] = r.halation.on.edge;
  // 1080px frame, 30px-radius highlight, strength 1: sampled 4px and 12px outside the highlight.
  check('halation glows red-first near highlights', er >= 20 && er > eg && eg > eb && hr >= 4 && hr > hg, `edge rgb(${er},${eg},${eb}) near rgb(${hr},${hg},${hb})`);
  check('halation fades with distance', r.halation.on.far[0] < hr / 4, `far r=${r.halation.on.far[0]}`);
  check('no halation when strength is 0', Math.max(...r.halation.off.near) <= 1, `off near rgb(${r.halation.off.near.join(',')})`);
  check('preview matches capture (vignette + LUT) ≤ 2/255 mean', r.previewVsCaptureMeanError <= 2, `${r.previewVsCaptureMeanError.toFixed(2)}/255`);
  const [lr, lg, lb] = r.leak.left;
  check('light leak warms the entering edge only', lr > r.leak.right[0] + 20 && lr > lb, `left rgb(${lr},${lg},${lb}) right rgb(${r.leak.right.join(',')})`);
} catch (error) {
  check('harness ran', false, String(error.message ?? error));
} finally {
  await browser.close();
}

for (const { name, ok, detail } of checks) console.log(`gl-check: ${ok ? 'ok  ' : 'FAIL'} ${name} — ${detail}`);
const failed = checks.filter((c) => !c.ok).length;
if (failed) {
  console.error(`gl-check: ${failed} check(s) failed`);
  process.exit(1);
}
console.log(`gl-check: all ${checks.length} checks passed`);
