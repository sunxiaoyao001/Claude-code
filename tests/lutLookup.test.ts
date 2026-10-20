// CPU port of the composite shader's lut3d() against the shipped PNG, compared with the look function
// it was generated from: proves the tile layout, half-texel addressing and slice interpolation agree.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyLook, PLACEHOLDER_LOOKS } from '../pack-tools/lib/looks.mts';
import { decodePngRgb } from '../pack-tools/lib/png.mts';

const N = 33;
const TILES = 6;
const TEX = 198;

function sampler(rgb: Uint8Array) {
  const texel = (x: number, y: number, c: number) => {
    const cx = Math.min(Math.max(x, 0), TEX - 1);
    const cy = Math.min(Math.max(y, 0), TEX - 1);
    return (rgb[(cy * TEX + cx) * 3 + c] ?? 0) / 255;
  };
  // GL LINEAR filtering with CLAMP_TO_EDGE.
  return (u: number, v: number): [number, number, number] => {
    const fx = u * TEX - 0.5;
    const fy = v * TEX - 0.5;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const ax = fx - x0;
    const ay = fy - y0;
    return [0, 1, 2].map((c) => {
      const top = texel(x0, y0, c) * (1 - ax) + texel(x0 + 1, y0, c) * ax;
      const bottom = texel(x0, y0 + 1, c) * (1 - ax) + texel(x0 + 1, y0 + 1, c) * ax;
      return top * (1 - ay) + bottom * ay;
    }) as [number, number, number];
  };
}

function lut3d(sample: ReturnType<typeof sampler>, [r, g, b]: [number, number, number]): [number, number, number] {
  const origin = (slice: number) => {
    const row = Math.floor((slice + 0.5) / TILES);
    return [(slice - row * TILES) * N, row * N];
  };
  const bb = b * (N - 1);
  const s0 = Math.floor(bb);
  const s1 = Math.min(s0 + 1, N - 1);
  const rr = r * (N - 1) + 0.5;
  const gg = g * (N - 1) + 0.5;
  const [x0 = 0, y0 = 0] = origin(s0);
  const [x1 = 0, y1 = 0] = origin(s1);
  const a = sample((x0 + rr) / TEX, (y0 + gg) / TEX);
  const d = sample((x1 + rr) / TEX, (y1 + gg) / TEX);
  return a.map((v, i) => v + ((d[i] ?? 0) - v) * (bb - s0)) as [number, number, number];
}

function randomColors(count: number, seed = 1): Array<[number, number, number]> {
  let state = seed;
  const next = () => ((state = (state * 1103515245 + 12345) % 2147483648) / 2147483648);
  return Array.from({ length: count }, () => [next(), next(), next()]);
}

describe('LUT lookup (shader port) against the generating look', () => {
  it.each(['identity', 'ccd-casio', 'ccd-canon', 'vhs-c'])('%s stays within 3/255', (id) => {
    const png = decodePngRgb(readFileSync(join(__dirname, '..', 'miniprogram', 'assets', 'luts', `${id}.png`)));
    const sample = sampler(png.rgb);
    const look = PLACEHOLDER_LOOKS[id]!;
    let maxError = 0;
    for (const color of [...randomColors(4000), [0, 0, 0], [1, 1, 1]] as Array<[number, number, number]>) {
      const got = lut3d(sample, color);
      const want = applyLook(look, color);
      for (let c = 0; c < 3; c++) maxError = Math.max(maxError, Math.abs((got[c] ?? 0) - (want[c] ?? 0)));
    }
    expect(maxError * 255).toBeLessThan(3);
  });
});
