// GPU check of the film pipeline (CLAUDE.md §10 "shader 逻辑对齐测试"): runs the real shaders in a
// headless Chromium WebGL1 context (SwiftShader) and compares them with TypeScript references.
// Needs Playwright with a Chromium build; when unavailable it prints SKIPPED and exits 0, so the
// pipeline still passes on machines without a browser. TypeScript is transpiled on the fly.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { launchChromium, openPage, ORIGIN, root } from './lib/browser.mjs';

const harness = (pathname) => {
  if (pathname === '/') return { body: '<!doctype html><html><body></body></html>', type: 'text/html' };
  if (pathname === '/harness.mjs') return { body: readFileSync(join(root, 'scripts', 'gl-check', 'harness.mjs'), 'utf8'), type: 'text/javascript' };
  return null;
};

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
}

const launched = await launchChromium();
if (!launched.browser) {
  console.log(`gl-check: SKIPPED, ${launched.skip}`);
  process.exit(0);
}
const { browser } = launched;

try {
  const { page, errors: pageErrors } = await openPage(browser, harness);
  await page.goto(`${ORIGIN}/`);
  const r = await page.evaluate(async () => (await import('/harness.mjs')).run());
  if (pageErrors.length) throw new Error(pageErrors.join('\n'));

  check('identity LUT round trip ≤ 3/255', r.identityMaxError <= 3, `${r.identityMaxError}/255`);
  check('generated LUT on GPU vs look function ≤ 4/255', r.generatedLutMaxError <= 4, `${r.generatedLutMaxError.toFixed(2)}/255`);
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
  const [cr, cg, cb] = r.chroma.edge;
  // Line at 0.8 of a 1000px frame, aberration 0.01: red ≈ 3px inwards, blue ≈ 3px outwards.
  check('chromatic aberration splits red in, blue out', cg - cr > 2 && cb - cg > 2, `centroids r ${cr.toFixed(1)} g ${cg.toFixed(1)} b ${cb.toFixed(1)}`);
  const centreSpread = Math.max(...r.chroma.centre) - Math.min(...r.chroma.centre);
  const offSpread = Math.max(...r.chroma.off) - Math.min(...r.chroma.off);
  check('no aberration at the centre or when off', Math.min(...r.chroma.centre, ...r.chroma.off) > 0 && centreSpread < 0.5 && offSpread < 0.5, `centre spread ${centreSpread.toFixed(2)}px, off spread ${offSpread.toFixed(2)}px`);
  const s = r.scanlines;
  check('scanlines: ~320 per frame height, ~50% deep', Math.abs(s.minima - 320) <= 32 && s.max - s.min > 50, `${s.minima} minima, rows ${s.min}..${s.max}`);
  check('no scanlines when strength is 0', s.offSpread <= 1, `spread ${s.offSpread}`);
  const g = r.grainCorrelation;
  check('coloured grain decorrelates channels', g.colored < 0.3 && g.mono > 0.95, `r/b correlation coloured ${g.colored.toFixed(2)}, mono ${g.mono.toFixed(2)}`);
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
