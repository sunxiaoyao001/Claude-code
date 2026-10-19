// Browser-side checks for scripts/gl-check.mjs. Runs the real GLRenderer + Pipeline + shaders in a
// WebGL1 context and returns measurements; the Node side decides pass/fail.
import { GLRenderer } from '/core/gl/GLRenderer';
import { Pipeline } from '/core/gl/Pipeline';
import { computeViewTransform } from '/core/camera/viewTransform';
import { SUNNY_FUN } from '/core/pack/FilterParams';
import { applyLook, PLACEHOLDER_LOOKS } from '/pack-tools/lib/looks.mts';

const NEUTRAL = {
  lut: { id: 'identity', intensity: 1 },
  vignette: { strength: 0, softness: 0.4 },
  halation: { strength: 0, threshold: 0.85, radius: 1 },
  grain: { size: 1.6, intensity: 0, lumaWeight: 0, colored: false },
  lightLeak: { probability: 0, opacityMin: 0, opacityMax: 0 },
  frame: { aspectRatio: '3:4' },
  dateStamp: { enabled: false },
};
const NO_RANDOM = { seed: 0, grainSeed: 0, ditherSeed: 0, leak: null };

function makeRenderer(width, height) {
  const canvas = document.createElement('canvas');
  canvas.createImage = () => new Image();
  const renderer = GLRenderer.create(canvas, width, height);
  if (!renderer) throw new Error('WebGL unavailable');
  return { renderer, pipeline: new Pipeline(renderer) };
}

async function lutTexture(renderer, id) {
  const image = await renderer.loadImage(`/assets/luts/${id}.png`);
  const texture = renderer.createTexture();
  renderer.uploadImage(texture, image);
  return texture;
}

function makeSource(renderer, width, height, colorAt) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = colorAt(x, y);
      const o = (y * width + x) * 4;
      data[o] = Math.round(r * 255);
      data[o + 1] = Math.round(g * 255);
      data[o + 2] = Math.round(b * 255);
      data[o + 3] = 255;
    }
  }
  const texture = renderer.createTexture();
  renderer.uploadRGBA(texture, width, height, data.buffer);
  return { source: { texture, width, height }, data };
}

/** Reads the canvas top-down as an RGBA Uint8Array. */
function readTopDown(renderer, width, height) {
  const raw = new Uint8Array(width * height * 4);
  renderer.readPixels(0, 0, width, height, raw);
  const out = new Uint8Array(raw.length);
  for (let y = 0; y < height; y++) out.set(raw.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
  return out;
}

const transform = (sw, sh, ow, oh) => computeViewTransform({ frameWidth: sw, frameHeight: sh, viewWidth: ow, viewHeight: oh, rotation: 0, mirror: false }).matrix;
const gradient = (n) => (x, y) => [x / (n - 1), y / (n - 1), (x + y) / (2 * (n - 1))];

function stats(values) {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

// TypeScript-side reference of the composite grain (same algorithm in double precision).
function hash12(px, py) {
  const fract = (v) => v - Math.floor(v);
  let x = fract(px * 0.1031);
  let y = fract(py * 0.1031);
  let z = fract(px * 0.1031);
  const d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
  x += d; y += d; z += d;
  return fract((x + y) * z);
}
function valueNoise(qx, qy) {
  const ix = Math.floor(qx); const iy = Math.floor(qy);
  let fx = qx - ix; let fy = qy - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash12(ix, iy); const b = hash12(ix + 1, iy); const c = hash12(ix, iy + 1); const d = hash12(ix + 1, iy + 1);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

export async function run() {
  const results = {};
  const N = 192;

  // 1. Identity LUT through the full composite returns the input.
  {
    const { renderer, pipeline } = makeRenderer(N, N);
    pipeline.setLook(NEUTRAL, await lutTexture(renderer, 'identity'));
    const { source, data } = makeSource(renderer, N, N, gradient(N));
    pipeline.renderCapture(source, transform(N, N, N, N), N, N, NO_RANDOM);
    const out = readTopDown(renderer, N, N);
    let maxError = 0;
    for (let i = 0; i < out.length; i++) if (i % 4 !== 3) maxError = Math.max(maxError, Math.abs(out[i] - data[i]));
    results.identityMaxError = maxError;
  }

  // 2. sunny-fun LUT on the GPU vs the look function it was generated from.
  {
    const { renderer, pipeline } = makeRenderer(N, N);
    pipeline.setLook({ ...NEUTRAL, lut: { id: 'sunny-fun', intensity: 1 } }, await lutTexture(renderer, 'sunny-fun'));
    const { source, data } = makeSource(renderer, N, N, gradient(N));
    pipeline.renderCapture(source, transform(N, N, N, N), N, N, NO_RANDOM);
    const out = readTopDown(renderer, N, N);
    let maxError = 0;
    for (let i = 0; i < out.length; i += 4) {
      const want = applyLook(PLACEHOLDER_LOOKS['sunny-fun'], [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255]);
      for (let c = 0; c < 3; c++) maxError = Math.max(maxError, Math.abs(out[i + c] - want[c] * 255));
    }
    results.sunnyLutMaxError = maxError;
  }

  // 3. Grain: GPU statistics vs the TypeScript reference on flat mid grey.
  {
    const W = 384; const H = 512;
    const grain = { size: 1.6, intensity: 0.07, lumaWeight: 0.6, colored: false };
    const { renderer, pipeline } = makeRenderer(W, H);
    pipeline.setLook({ ...NEUTRAL, grain }, await lutTexture(renderer, 'identity'));
    const { source } = makeSource(renderer, 4, 4, () => [0.5, 0.5, 0.5]);
    const seed = 12.34;
    pipeline.renderCapture(source, transform(4, 4, W, H), W, H, { ...NO_RANDOM, grainSeed: seed });
    const out = readTopDown(renderer, W, H);
    const gpu = [];
    const ref = [];
    const weight = 1 - grain.lumaWeight + grain.lumaWeight * Math.sin(Math.PI * 0.5);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        gpu.push(out[(y * W + x) * 4] / 255);
        const fx = (x + 0.5) / W; const fy = (y + 0.5) / H;
        const qx = fx * (W / H) * (1080 / grain.size) + seed * 13.1;
        const qy = fy * (1080 / grain.size) + seed * 7.7;
        ref.push(128 / 255 + (valueNoise(qx, qy) - 0.5) * grain.intensity * weight);
      }
    }
    results.grain = { gpu: stats(gpu), ref: stats(ref) };

    // Same seed twice -> identical; different seed -> different.
    pipeline.renderCapture(source, transform(4, 4, W, H), W, H, { ...NO_RANDOM, grainSeed: seed });
    const again = readTopDown(renderer, W, H);
    pipeline.renderCapture(source, transform(4, 4, W, H), W, H, { ...NO_RANDOM, grainSeed: seed + 1 });
    const other = readTopDown(renderer, W, H);
    let same = 0; let differ = 0;
    for (let i = 0; i < out.length; i += 4) { if (again[i] === out[i]) same++; if (other[i] !== out[i]) differ++; }
    results.grainReproducible = same / (out.length / 4);
    results.grainSeedChanges = differ / (out.length / 4);
  }

  // 4. Halation at the 1080px reference scale: a bright disk on black glows red-first; nothing when off.
  {
    const S = 1080;
    const disk = (x, y) => (Math.hypot(x - S / 2, y - S / 2) < 30 ? [1, 1, 1] : [0, 0, 0]);
    const measure = async (strength) => {
      const { renderer, pipeline } = makeRenderer(S, S);
      pipeline.setLook({ ...NEUTRAL, halation: { strength, threshold: 0.85, radius: 1 } }, await lutTexture(renderer, 'identity'));
      const { source } = makeSource(renderer, S, S, disk);
      pipeline.renderCapture(source, transform(S, S, S, S), S, S, NO_RANDOM);
      const out = readTopDown(renderer, S, S);
      const sample = (dx) => { const o = ((S / 2) * S + S / 2 + dx) * 4; return [out[o], out[o + 1], out[o + 2]]; };
      return { edge: sample(34), near: sample(42), far: sample(200) };
    };
    results.halation = { on: await measure(1), off: await measure(0) };
  }

  // 5. Preview vs capture: same look (vignette + LUT, no grain/halation) at two sizes.
  {
    const look = { ...SUNNY_FUN, halation: { ...SUNNY_FUN.halation, strength: 0 }, grain: { ...SUNNY_FUN.grain, intensity: 0 } };
    const PW = 300; const PH = 400;
    const preview = makeRenderer(PW, PH);
    preview.pipeline.setLook(look, await lutTexture(preview.renderer, 'sunny-fun'));
    const pSource = makeSource(preview.renderer, 480, 640, gradient(480)).source;
    preview.pipeline.renderPreview(pSource, { frameRect: { x: 0, y: 0, width: PW, height: PH }, uvMatrix: transform(480, 640, PW, PH), halation: false, grainSeed: 0, raw: false, grayscale: false });
    const p = readTopDown(preview.renderer, PW, PH);

    const capture = makeRenderer(PW * 2, PH * 2);
    capture.pipeline.setLook(look, await lutTexture(capture.renderer, 'sunny-fun'));
    const cSource = makeSource(capture.renderer, 480, 640, gradient(480)).source;
    capture.pipeline.renderCapture(cSource, transform(480, 640, PW * 2, PH * 2), PW * 2, PH * 2, NO_RANDOM);
    const c = readTopDown(capture.renderer, PW * 2, PH * 2);
    let total = 0; let count = 0;
    for (let y = 0; y < PH; y++) {
      for (let x = 0; x < PW; x++) {
        for (let ch = 0; ch < 3; ch++) {
          let avg = 0;
          for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) avg += c[((y * 2 + dy) * PW * 2 + x * 2 + dx) * 4 + ch];
          total += Math.abs(avg / 4 - p[(y * PW + x) * 4 + ch]);
          count++;
        }
      }
    }
    results.previewVsCaptureMeanError = total / count;
  }

  // 6. Light leak: a forced leak from the left warms the left edge only.
  {
    const S = 300;
    const { renderer, pipeline } = makeRenderer(S, S);
    pipeline.setLook(NEUTRAL, await lutTexture(renderer, 'identity'));
    const { source } = makeSource(renderer, 4, 4, () => [0.3, 0.3, 0.3]);
    const leak = { x: -0.1, y: 0.5, radius: 0.5, opacity: 0.5, color: [1, 0.62, 0.22] };
    pipeline.renderCapture(source, transform(4, 4, S, S), S, S, { ...NO_RANDOM, leak });
    const out = readTopDown(renderer, S, S);
    const at = (x) => { const o = ((S / 2) * S + x) * 4; return [out[o], out[o + 1], out[o + 2]]; };
    results.leak = { left: at(4), right: at(S - 5) };
  }

  return results;
}
