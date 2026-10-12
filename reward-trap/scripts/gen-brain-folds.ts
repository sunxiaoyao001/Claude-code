// Grows cortical folds with Gray–Scott reaction–diffusion on each hemisphere mesh.
// Run: node --experimental-strip-types scripts/gen-brain-folds.ts
import {writeFileSync} from 'node:fs';
import {ICO_FREQ, fissure, makeIcosphere, reactionDiffusion, shapeHemisphere} from '../src/brain/geometry.ts';

const t0 = Date.now();
const {pos: unit, idx} = makeIcosphere(ICO_FREQ);
const n = unit.length / 3;
const base = shapeHemisphere(unit);
let edge = 0;
for (let t = 0; t < idx.length; t += 3) {
  const a = idx[t], b = idx[t + 1];
  edge += Math.hypot(base[a * 3] - base[b * 3], base[a * 3 + 1] - base[b * 3 + 1], base[a * 3 + 2] - base[b * 3 + 2]);
}
edge /= idx.length / 3;
console.log(`verts ${n}, tris ${idx.length / 3}, mean edge ${edge.toFixed(5)}, shape ${(Date.now() - t0)}ms`);

const cell = Number(process.env.CELL ?? edge * 1.0);
const iterations = Number(process.env.ITERS ?? 9000);
const pin = (i: number) => {
  const {syl, cen} = fissure(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
  const m = Math.max(syl, cen);
  return m > 0.5 ? 1 : 0;
};
const out = new Uint8Array(n * 2);
for (const [k, seed] of [[0, 11], [1, 23]] as const) {
  const s = Date.now();
  const v = reactionDiffusion(base, idx, {iterations, cell, seed, pin});
  for (let i = 0; i < n; i++) out[k * n + i] = Math.round(v[i] * 255);
  const hist = new Array(10).fill(0);
  for (let i = 0; i < n; i++) hist[Math.min(9, Math.floor(v[i] * 10))]++;
  console.log(`hemi ${k}: ${(Date.now() - s) / 1000}s  hist ${hist.map((h) => (h / n * 100).toFixed(0)).join(' ')}`);
}
writeFileSync('public/brain/folds.bin', out);
console.log(`wrote public/brain/folds.bin (${out.length} bytes) in ${(Date.now() - t0) / 1000}s`);
