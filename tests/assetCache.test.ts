import { createHash, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AssetCache, CACHE_MAX, CACHE_MIN, cacheBudget, planEviction, type CacheIndex, type CachePlatform } from '../miniprogram/core/pack/AssetCache';
import { sha256Hex } from '../miniprogram/core/util/sha256';

const MB = 1024 * 1024;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

describe('sha256', () => {
  it.each([0, 1, 55, 56, 63, 64, 65, 1000, 100_000])('matches node crypto for %i bytes', (length) => {
    const data = randomBytes(length);
    expect(sha256Hex(toArrayBuffer(data))).toBe(createHash('sha256').update(data).digest('hex'));
  });

  it('matches the FIPS "abc" vector', () => {
    expect(sha256Hex(toArrayBuffer(new TextEncoder().encode('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('cache budget and eviction', () => {
  it('is 50MB with an empty album and never drops below 20MB', () => {
    expect(cacheBudget(0)).toBe(CACHE_MAX);
    expect(cacheBudget(140 * MB)).toBe(40 * MB);
    expect(cacheBudget(190 * MB)).toBe(CACHE_MIN);
  });

  it('evicts least recently used first and spares kept entries', () => {
    const index: CacheIndex = {
      old: { path: 'a', bytes: 10, lastUsed: 1 },
      kept: { path: 'b', bytes: 10, lastUsed: 2 },
      mid: { path: 'c', bytes: 10, lastUsed: 3 },
      fresh: { path: 'd', bytes: 10, lastUsed: 4 },
    };
    expect(planEviction(index, 20, new Set(['kept']))).toEqual(['old', 'mid']);
    expect(planEviction(index, 40, new Set())).toEqual([]);
  });
});

interface FakeFiles {
  files: Map<string, Uint8Array>;
  downloads: number;
  platform: CachePlatform;
}

function fakePlatform(remote: Record<string, Uint8Array | (() => Uint8Array)>): FakeFiles {
  const files = new Map<string, Uint8Array>();
  let index: CacheIndex = {};
  let clock = 0;
  let temp = 0;
  const state: FakeFiles = {
    files,
    downloads: 0,
    platform: {
      dir: '/usr/assets',
      download: (url, onProgress) => {
        state.downloads += 1;
        const body = remote[url];
        if (!body) return Promise.reject(new Error('404'));
        onProgress(0.5);
        const path = `/tmp/${temp++}`;
        files.set(path, typeof body === 'function' ? body() : body);
        return Promise.resolve(path);
      },
      readFile: (path) => {
        const file = files.get(path);
        if (!file) throw new Error(`no file ${path}`);
        return toArrayBuffer(file);
      },
      keepFile: (tempPath, path) => {
        const file = files.get(tempPath);
        if (!file) throw new Error('missing temp');
        files.delete(tempPath);
        files.set(path, file);
      },
      removeFile: (path) => {
        files.delete(path);
      },
      exists: (path) => files.has(path),
      loadIndex: () => index,
      storeIndex: (next) => {
        index = JSON.parse(JSON.stringify(next)) as CacheIndex;
      },
      wait: () => Promise.resolve(),
      now: () => ++clock,
    },
  };
  return state;
}

function asset(name: string, bytes: Uint8Array) {
  return { url: `https://cdn.example.com/${name}.png`, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
}

describe('AssetCache', () => {
  it('downloads, verifies, stores by hash and serves later calls from disk', async () => {
    const body = randomBytes(2000);
    const a = asset('lut-a', body);
    const fake = fakePlatform({ [a.url]: body });
    const cache = new AssetCache(fake.platform, () => CACHE_MAX);
    const progress: number[] = [];
    const path = await cache.ensure(a, (p) => progress.push(p));
    expect(path).toBe(`/usr/assets/${a.sha256}.png`);
    expect(progress).toEqual([0.5, 1]);
    expect(cache.peek(a)).toBe(path);
    await cache.ensure(a);
    expect(fake.downloads).toBe(1);
    expect(cache.usage()).toBe(2000);
  });

  it('retries a corrupted download and gives up after three attempts', async () => {
    const good = randomBytes(500);
    const a = asset('lut-b', good);
    let calls = 0;
    const flaky = fakePlatform({ [a.url]: () => (++calls < 3 ? randomBytes(500) : good) });
    await expect(new AssetCache(flaky.platform, () => CACHE_MAX).ensure(a)).resolves.toContain(a.sha256);
    expect(flaky.downloads).toBe(3);

    const broken = fakePlatform({ [a.url]: () => randomBytes(500) });
    await expect(new AssetCache(broken.platform, () => CACHE_MAX).ensure(a)).rejects.toThrow('checksum mismatch');
    expect(broken.downloads).toBe(3);
    expect([...broken.files.keys()]).toEqual([]);
  });

  it('shares one download between concurrent requests', async () => {
    const body = randomBytes(100);
    const a = asset('lut-c', body);
    const fake = fakePlatform({ [a.url]: body });
    const cache = new AssetCache(fake.platform, () => CACHE_MAX);
    const [p1, p2] = await Promise.all([cache.ensure(a), cache.ensure(a)]);
    expect(p1).toBe(p2);
    expect(fake.downloads).toBe(1);
  });

  it('evicts the least recently used file to stay in budget, keeping pinned ones', async () => {
    const bodies = [randomBytes(400), randomBytes(400), randomBytes(400)];
    const assets = bodies.map((body, i) => asset(`lut-${i}`, body));
    const fake = fakePlatform(Object.fromEntries(assets.map((a, i) => [a.url, bodies[i] ?? new Uint8Array()])));
    const cache = new AssetCache(fake.platform, () => 900);
    const [a0, a1, a2] = assets;
    if (!a0 || !a1 || !a2) throw new Error('fixtures');
    await cache.ensure(a0);
    await cache.ensure(a1);
    await cache.ensure(a0); // a0 is now the most recently used
    await cache.ensure(a2);
    expect(cache.peek(a1)).toBeNull();
    expect(cache.peek(a0)).not.toBeNull();
    expect(cache.peek(a2)).not.toBeNull();
    expect(cache.usage()).toBeLessThanOrEqual(900);
  });

  it('forgets entries whose file disappeared', async () => {
    const body = randomBytes(50);
    const a = asset('lut-d', body);
    const fake = fakePlatform({ [a.url]: body });
    const cache = new AssetCache(fake.platform, () => CACHE_MAX);
    const path = await cache.ensure(a);
    fake.files.delete(path);
    expect(cache.peek(a)).toBeNull();
    await cache.ensure(a);
    expect(fake.downloads).toBe(2);
  });
});
