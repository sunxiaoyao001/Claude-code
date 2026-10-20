import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCube, formatCube, parseCube } from '../pack-tools/lib/cube.mts';
import { applyLook, PLACEHOLDER_LOOKS } from '../pack-tools/lib/looks.mts';
import { packTiles, unpackTiles } from '../pack-tools/lib/lutTiles.mts';
import { decodePngRgb, encodePngRgb } from '../pack-tools/lib/png.mts';

const identity = (size: number) => buildCube('identity', size, (r, g, b) => [r, g, b]);

describe('.cube parsing', () => {
  it('round-trips through formatCube', () => {
    const cube = buildCube('warm', 5, (r, g, b) => [Math.min(1, r * 1.1), g, b * 0.9]);
    const parsed = parseCube(formatCube(cube));
    expect(parsed.size).toBe(5);
    expect(parsed.title).toBe('warm');
    parsed.data.forEach((value, i) => expect(value).toBeCloseTo(cube.data[i] ?? 0, 5));
  });

  it('reads a known 2^3 cube in red-fastest order', () => {
    const text = [
      '# comment', 'TITLE "tiny"', 'LUT_3D_SIZE 2',
      '0 0 0', '1 0 0', '0 1 0', '1 1 0', '0 0 1', '1 0 1', '0 1 1', '1 1 1',
    ].join('\n');
    const cube = parseCube(text);
    // index = r + g*2 + b*4 -> entry 5 is (r=1, g=0, b=1)
    expect([...cube.data.slice(15, 18)]).toEqual([1, 0, 1]);
  });

  it('rejects wrong entry counts, 1D LUTs and custom domains', () => {
    expect(() => parseCube('LUT_3D_SIZE 2\n0 0 0')).toThrow(/expected 8/);
    expect(() => parseCube('LUT_1D_SIZE 4')).toThrow(/1D/);
    expect(() => parseCube('LUT_3D_SIZE 2\nDOMAIN_MAX 2 2 2\n' + '0 0 0\n'.repeat(8))).toThrow(/DOMAIN/);
  });
});

describe('tile packing (33^3 -> 6x6 tiles, 198x198)', () => {
  it('lays blue slices out as tiles and inverts exactly', () => {
    const cube = identity(33);
    const tiles = packTiles(cube);
    expect(tiles.width).toBe(198);
    // lattice (r=32, g=0, b=7): tile column 1, row 1 -> pixel (33 + 32, 33 + 0)
    const offset = ((33 + 0) * 198 + 33 + 32) * 3;
    expect([...tiles.rgb.slice(offset, offset + 3)]).toEqual([255, 0, Math.round((7 / 32) * 255)]);
    const back = unpackTiles(tiles, 33);
    back.forEach((value, i) => expect(value).toBe(Math.round((cube.data[i] ?? 0) * 255)));
  });
});

describe('PNG encoder', () => {
  it('round-trips arbitrary RGB data', () => {
    const rgb = new Uint8Array(37 * 11 * 3).map((_, i) => (i * 97) % 256);
    const decoded = decodePngRgb(encodePngRgb(37, 11, rgb));
    expect(decoded.width).toBe(37);
    expect(decoded.height).toBe(11);
    expect([...decoded.rgb]).toEqual([...rgb]);
  });

  it('writes no colour-management chunks', () => {
    const png = encodePngRgb(2, 2, new Uint8Array(12));
    const text = png.toString('latin1');
    for (const chunk of ['gAMA', 'iCCP', 'sRGB', 'cHRM']) expect(text).not.toContain(chunk);
  });
});

describe('placeholder looks', () => {
  it('identity look is the identity', () => {
    for (const rgb of [[0, 0, 0], [0.2, 0.5, 0.9], [1, 1, 1]] as Array<[number, number, number]>) {
      applyLook(PLACEHOLDER_LOOKS.identity!, rgb).forEach((v, i) => expect(v).toBeCloseTo(rgb[i] ?? 0, 6));
    }
  });

  it('ccd-canon warms and ccd-sony cools a neutral grey, staying in range', () => {
    const [wr, , wb] = applyLook(PLACEHOLDER_LOOKS['ccd-canon']!, [0.5, 0.5, 0.5]);
    const [cr, , cb] = applyLook(PLACEHOLDER_LOOKS['ccd-sony']!, [0.5, 0.5, 0.5]);
    expect(wr).toBeGreaterThan(wb + 0.03);
    expect(cb).toBeGreaterThan(cr + 0.03);
    for (const v of [wr, wb, cr, cb]) expect(v).toBeGreaterThanOrEqual(0);
  });

  it('clip saturates highlights to white', () => {
    const [r, g, b] = applyLook(PLACEHOLDER_LOOKS['ccd-sony']!, [0.95, 0.95, 0.95]);
    expect(Math.min(r, g, b)).toBeGreaterThan(0.97);
  });
});

describe('shipped LUT assets', () => {
  const dir = join(__dirname, '..', 'miniprogram', 'assets', 'luts');

  it.each(Object.keys(PLACEHOLDER_LOOKS))('%s.png matches the generator', (id) => {
    const decoded = decodePngRgb(readFileSync(join(dir, `${id}.png`)));
    expect(decoded.width).toBe(198);
    const look = PLACEHOLDER_LOOKS[id]!;
    const expected = packTiles(buildCube(id, 33, (r, g, b) => applyLook(look, [r, g, b])));
    expect(Buffer.from(decoded.rgb).equals(Buffer.from(expected.rgb))).toBe(true);
  });

  // Datasheet LUTs from pack-tools/spectral (not reproducible in CI, so only their shape is checked).
  it.each(['m3-hp5', 'street-gr', 'night-3200', 'silver-50', 'ql17-street', 'silk-xp2'])('%s.png is monochrome', (id) => {
    const { rgb, width } = decodePngRgb(readFileSync(join(dir, `${id}.png`)));
    expect(width).toBe(198);
    let maxSpread = 0;
    for (let i = 0; i < rgb.length; i += 3) {
      const r = rgb[i] ?? 0;
      const g = rgb[i + 1] ?? 0;
      const b = rgb[i + 2] ?? 0;
      maxSpread = Math.max(maxSpread, Math.abs(r - g), Math.abs(g - b));
    }
    expect(maxSpread).toBeLessThanOrEqual(2);
  });
});
