import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fitFrame, formatGlyph, toCanvasViewport } from '../miniprogram/core/camera/frameLayout';
import { BUILTIN_PACKS } from '../miniprogram/core/pack/builtinPacks';
import { deepMerge, findTrademarks, resolvePack, type PackDefinition } from '../miniprogram/core/pack/CameraPack';
import { buildCatalog, PackStore, parseManifest } from '../miniprogram/core/pack/PackStore';
import { SERIES, SERIES_ORDER } from '../miniprogram/core/pack/SeriesProfile';
import { validateFilterParams } from '../miniprogram/core/pack/FilterParams';
import { advanceRoll, EXPOSURES, formatCounter, rollOf, type RollTable } from '../miniprogram/core/storage/RollCounter';
import { typewrite } from '../miniprogram/core/ui/typewriter';

const assets = join(__dirname, '..', 'miniprogram', 'assets');

const base: PackDefinition = {
  id: 'test-pack', name: '测试', latinName: 'Test', tagline: '测试 · 用', series: 'jp-color', inspiredBy: 'Some camera + some film', free: false,
};

describe('series profiles', () => {
  it.each(SERIES_ORDER)('%s is complete and valid on its own', (id) => {
    const filter = { ...SERIES[id].filter, lut: { ...SERIES[id].filter.lut, id: 'identity' } };
    expect(validateFilterParams(filter)).toEqual([]);
  });
});

describe('deepMerge', () => {
  it('merges objects key by key and replaces primitives and arrays', () => {
    const merged = deepMerge({ a: { x: 1, y: 2 }, b: [1, 2], c: 'k' }, { a: { y: 3 }, b: [9] });
    expect(merged).toEqual({ a: { x: 1, y: 3 }, b: [9], c: 'k' });
  });

  it('does not mutate the base', () => {
    const baseObject = { a: { x: 1 } };
    deepMerge(baseObject, { a: { x: 2 } });
    expect(baseObject.a.x).toBe(1);
  });
});

describe('resolvePack', () => {
  it('inherits everything it does not override', () => {
    const { pack } = resolvePack({ ...base, filter: { halation: { strength: 0.4 } } });
    expect(pack?.filter.halation).toEqual({ ...SERIES['jp-color'].filter.halation, strength: 0.4 });
    expect(pack?.filter.grain).toEqual(SERIES['jp-color'].filter.grain);
    expect(pack?.filter.lut.id).toBe('test-pack');
    expect(pack?.ui).toEqual(SERIES['jp-color'].ui);
  });

  it('never leaks one pack into its series profile', () => {
    resolvePack({ ...base, id: 'no-delta' });
    expect(SERIES['jp-color'].filter.lut.id).toBe('');
    expect(resolvePack({ ...base, id: 'other' }).pack?.filter.lut.id).toBe('other');
  });

  it('rejects out-of-range deltas, trademarks, unknown series and bad colours', () => {
    expect(resolvePack({ ...base, filter: { grain: { intensity: 3 } } }).pack).toBeNull();
    expect(resolvePack({ ...base, name: 'Portra 小清新' }).problems.join()).toContain('portra');
    expect(resolvePack({ ...base, series: 'nope' as never }).pack).toBeNull();
    expect(resolvePack({ ...base, ui: { themeColor: 'red' } }).pack).toBeNull();
    expect(resolvePack({ ...base, inspiredBy: ' ' }).pack).toBeNull();
  });

  it('spots trademarks as words only', () => {
    expect(findTrademarks('Kodak Gold 200')).toEqual(['kodak']);
    expect(findTrademarks('Tri-X 400 push')).toContain('tri-x');
    expect(findTrademarks('Leicester square')).toEqual([]);
  });
});

describe('built-in packs (series A–C)', () => {
  const catalog = buildCatalog(BUILTIN_PACKS);

  it('all 20 resolve without problems, ids unique', () => {
    expect(catalog.problems).toEqual([]);
    expect(catalog.packs).toHaveLength(20);
  });

  it('has 8 / 6 / 6 cameras in series A / B / C', () => {
    const count = (id: string) => catalog.packs.filter((pack) => pack.series.id === id).length;
    expect([count('jp-color'), count('street-bw'), count('ccd')]).toEqual([8, 6, 6]);
  });

  it('the permanent free tier is exactly sunny-fun, moonlight and m3-hp5', () => {
    expect(catalog.packs.filter((pack) => pack.free).map((pack) => pack.id).sort()).toEqual(['m3-hp5', 'moonlight', 'sunny-fun']);
  });

  it.each(BUILTIN_PACKS.map((def) => [def.id, def]))('%s ships its LUT and thumbnail', (id) => {
    expect(existsSync(join(assets, 'luts', `${id}.png`))).toBe(true);
    expect(existsSync(join(assets, 'thumbs', `${id}.jpg`))).toBe(true);
  });

  it('every camera names its real prototype', () => {
    for (const pack of catalog.packs) expect(pack.inspiredBy.length).toBeGreaterThan(4);
  });

  it('overrides land on the right packs', () => {
    const vhs = catalog.packs.find((pack) => pack.id === 'vhs-c');
    expect(vhs?.filter.fx).toEqual({ chromaticAberration: 0.004, scanlines: 0.35 });
    expect(vhs?.filter.frame.aspectRatio).toBe('4:3');
    expect(vhs?.filter.grain.colored).toBe(true);
    const silk = catalog.packs.find((pack) => pack.id === 'silk-xp2');
    expect(silk?.filter.grain.intensity).toBe(0);
    expect(silk?.filter.grain.size).toBe(SERIES['street-bw'].filter.grain.size);
  });
});

describe('catalog and store', () => {
  it('drops duplicates and invalid packs and orders by series', () => {
    const catalog = buildCatalog([
      { ...base, id: 'b-one', series: 'street-bw' },
      { ...base, id: 'a-one' },
      { ...base, id: 'a-one', name: '重复' },
      { ...base, id: 'broken', filter: { vignette: { strength: 9 } } },
    ]);
    expect(catalog.packs.map((pack) => pack.id)).toEqual(['a-one', 'b-one']);
    expect(catalog.problems.some((p) => p.includes('duplicate'))).toBe(true);
    expect(catalog.problems.some((p) => p.startsWith('broken'))).toBe(true);
  });

  it('serves bundled LUTs and thumbnails from the code package', async () => {
    const store = new PackStore(null);
    const pack = store.get('knight-t2');
    expect(pack).toBeDefined();
    if (!pack) return;
    await expect(store.lutSource(pack)).resolves.toBe('/assets/luts/knight-t2.png');
    expect(store.thumbSource(pack)).toBe('/assets/thumbs/knight-t2.jpg');
    expect(store.isReady(pack)).toBe(true);
  });

  it('adds remote packs from a manifest without replacing built-ins', () => {
    const store = new PackStore(null);
    const asset = { url: 'https://cdn.example.com/luts/x.png', sha256: 'ab'.repeat(32), bytes: 1000 };
    const manifest = parseManifest({
      version: 3,
      packs: [
        { ...base, id: 'remote-one', assets: { lut: asset } },
        { ...base, id: 'sunny-fun', name: '冒名', assets: { lut: asset } },
        { ...base, id: 'no-lut' },
      ],
    });
    expect(manifest).not.toBeNull();
    if (!manifest) return;
    const problems = store.addRemote(manifest);
    expect(problems).toEqual(['no-lut: remote pack without assets.lut']);
    expect(store.list()).toHaveLength(21);
    expect(store.get('sunny-fun')?.name).toBe('阳光罐头');
    const remote = store.get('remote-one');
    expect(remote && store.isBundled(remote.id)).toBe(false);
    expect(remote && store.thumbSource(remote)).toBe('');
  });

  it('rejects malformed manifests', () => {
    expect(parseManifest(null)).toBeNull();
    expect(parseManifest({ version: '1', packs: [] })).toBeNull();
    expect(parseManifest({ version: 1, packs: {} })).toBeNull();
  });
});

describe('roll counter', () => {
  it('counts down from 36 and loads a new roll after the last frame', () => {
    let table: RollTable = {};
    expect(formatCounter(rollOf(table, 'x'))).toBe('36/36');
    const first = advanceRoll(table, 'x');
    expect([first.roll, first.frame, first.finished]).toEqual([1, 1, false]);
    table = first.table;
    expect(formatCounter(rollOf(table, 'x'))).toBe('35/36');
    for (let i = 2; i < EXPOSURES; i++) table = advanceRoll(table, 'x').table;
    expect(formatCounter(rollOf(table, 'x'))).toBe('01/36');
    const last = advanceRoll(table, 'x');
    expect([last.roll, last.frame, last.finished]).toEqual([1, 36, true]);
    expect(rollOf(last.table, 'x')).toEqual({ roll: 2, remaining: 36 });
  });

  it('keeps one roll per camera', () => {
    const table = advanceRoll(advanceRoll({}, 'a').table, 'a').table;
    expect(rollOf(table, 'a').remaining).toBe(34);
    expect(rollOf(table, 'b').remaining).toBe(36);
  });
});

describe('frame layout', () => {
  const area = { left: 0, top: 90, width: 390, height: 528 };

  it('fills the width with a 3:4 frame and centres it vertically', () => {
    expect(fitFrame(area, 3 / 4)).toEqual({ left: 0, top: 94, width: 390, height: 520 });
  });

  it('shrinks a tall 2:3 frame to the available height', () => {
    const frame = fitFrame(area, 2 / 3);
    expect(frame.height).toBe(528);
    expect(frame.width).toBeCloseTo(352);
    expect(frame.left).toBeCloseTo(19);
  });

  it('letterboxes a 4:3 frame in the middle', () => {
    const frame = fitFrame(area, 4 / 3);
    expect(frame.width).toBe(390);
    expect(frame.height).toBeCloseTo(292.5);
    expect(frame.top).toBeCloseTo(90 + (528 - 292.5) / 2);
  });

  it('converts to a GL viewport with the origin at the bottom', () => {
    expect(toCanvasViewport({ left: 0, top: 94, width: 390, height: 520 }, 2, 1688)).toEqual({ x: 0, y: 1688 - 188 - 1040, width: 780, height: 1040 });
  });

  it('draws the format glyph in the frame proportions', () => {
    expect(formatGlyph(3 / 4, 12)).toEqual({ width: 9, height: 12 });
    expect(formatGlyph(65 / 24, 12)).toEqual({ width: 12, height: 4 });
  });
});

describe('typewriter', () => {
  it('reveals one character per step and can be cancelled', () => {
    vi.useFakeTimers();
    const seen: string[] = [];
    typewrite('Knight', 35, (text) => seen.push(text));
    vi.advanceTimersByTime(35 * 3);
    expect(seen).toEqual(['', 'K', 'Kn', 'Kni']);
    vi.advanceTimersByTime(1000);
    expect(seen.at(-1)).toBe('Knight');
    const partial: string[] = [];
    const cancel = typewrite('Sunny', 35, (text) => partial.push(text));
    vi.advanceTimersByTime(35);
    cancel();
    vi.advanceTimersByTime(1000);
    expect(partial).toEqual(['', 'S']);
    vi.useRealTimers();
  });
});
