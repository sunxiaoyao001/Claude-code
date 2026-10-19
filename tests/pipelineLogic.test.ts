import { describe, expect, it } from 'vitest';
import { PreviewGovernor } from '../miniprogram/core/camera/PreviewGovernor';
import { resolveOrientation } from '../miniprogram/core/camera/orientation';
import { captureLongEdgeLimit, tierFromBenchmark } from '../miniprogram/core/device/DeviceTier';
import { captureSize } from '../miniprogram/core/gl/Pipeline';
import { createRng, rollShot } from '../miniprogram/core/gl/shotRandom';
import { parseAspect, SUNNY_FUN, validateFilterParams } from '../miniprogram/core/pack/FilterParams';

describe('FilterParams', () => {
  it('ships a valid sunny-fun look', () => {
    expect(validateFilterParams(SUNNY_FUN)).toEqual([]);
  });

  it('reports out-of-range values, bad ids and bad aspects', () => {
    const broken = {
      ...SUNNY_FUN,
      grain: { ...SUNNY_FUN.grain, intensity: 2 },
      lut: { id: 'Bad Id', intensity: 1 },
      frame: { aspectRatio: '3x4' },
    };
    const problems = validateFilterParams(broken);
    expect(problems.some((p) => p.startsWith('grain.intensity'))).toBe(true);
    expect(problems.some((p) => p.includes('lut.id'))).toBe(true);
    expect(problems.some((p) => p.includes('aspectRatio'))).toBe(true);
  });

  it('parses aspect ratios', () => {
    expect(parseAspect('3:4')).toBeCloseTo(0.75);
    expect(parseAspect('65:24')).toBeCloseTo(65 / 24);
    expect(parseAspect('nope')).toBeNaN();
  });
});

describe('captureSize', () => {
  it('keeps the full 4:3 sensor for a 3:4 look', () => {
    expect(captureSize(3024, 4032, '3:4')).toEqual({ width: 3024, height: 4032 });
  });

  it('crops to square and to panorama', () => {
    expect(captureSize(3024, 4032, '1:1')).toEqual({ width: 3024, height: 3024 });
    expect(captureSize(4032, 3024, '65:24')).toEqual({ width: 4032, height: Math.round(4032 / (65 / 24)) });
  });
});

describe('shot randomness', () => {
  it('is reproducible from the seed', () => {
    expect(rollShot(123456, SUNNY_FUN)).toEqual(rollShot(123456, SUNNY_FUN));
    expect(rollShot(1, SUNNY_FUN)).not.toEqual(rollShot(2, SUNNY_FUN));
  });

  it('produces leaks at about the configured probability, outside the frame, within opacity bounds', () => {
    let leaks = 0;
    for (let seed = 0; seed < 4000; seed++) {
      const { leak } = rollShot(seed * 2654435761, SUNNY_FUN);
      if (!leak) continue;
      leaks += 1;
      const outside = leak.x < 0 || leak.x > 1 || leak.y < 0 || leak.y > 1;
      expect(outside).toBe(true);
      expect(leak.opacity).toBeGreaterThanOrEqual(SUNNY_FUN.lightLeak.opacityMin);
      expect(leak.opacity).toBeLessThanOrEqual(SUNNY_FUN.lightLeak.opacityMax);
    }
    expect(leaks / 4000).toBeGreaterThan(SUNNY_FUN.lightLeak.probability - 0.04);
    expect(leaks / 4000).toBeLessThan(SUNNY_FUN.lightLeak.probability + 0.04);
  });

  it('never leaks when probability is zero', () => {
    const noLeak = { ...SUNNY_FUN, lightLeak: { ...SUNNY_FUN.lightLeak, probability: 0 } };
    for (let seed = 0; seed < 200; seed++) expect(rollShot(seed, noLeak).leak).toBeNull();
  });

  it('rng stays in [0, 1)', () => {
    const rng = createRng(42);
    for (let i = 0; i < 10000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('PreviewGovernor', () => {
  const window = (avgRenderMs: number) => ({ avgRenderMs, renderedFps: 30 });

  it('turns halation off after two slow windows and back on after four fast ones', () => {
    const governor = new PreviewGovernor(true);
    expect(governor.update(window(18))).toBe(false);
    expect(governor.update(window(18))).toBe(true);
    expect(governor.halation).toBe(false);
    for (let i = 0; i < 3; i++) expect(governor.update(window(5))).toBe(false);
    expect(governor.update(window(5))).toBe(true);
    expect(governor.halation).toBe(true);
  });

  it('a single fast window resets the slow streak', () => {
    const governor = new PreviewGovernor(true);
    governor.update(window(18));
    governor.update(window(5));
    governor.update(window(18));
    expect(governor.halation).toBe(true);
  });

  it('locks off after repeated overloads', () => {
    const governor = new PreviewGovernor(true);
    for (let round = 0; round < 2; round++) {
      governor.update(window(19));
      governor.update(window(19));
      for (let i = 0; i < 4; i++) governor.update(window(4));
    }
    expect(governor.lockedOff).toBe(true);
    expect(governor.halation).toBe(false);
    for (let i = 0; i < 10; i++) governor.update(window(1));
    expect(governor.halation).toBe(false);
  });

  it('ignores windows without frames', () => {
    const governor = new PreviewGovernor(true);
    for (let i = 0; i < 5; i++) expect(governor.update({ avgRenderMs: 100, renderedFps: 0 })).toBe(false);
    expect(governor.halation).toBe(true);
  });
});

describe('device tier', () => {
  it('prefers modelLevel, then benchmarkLevel', () => {
    expect(tierFromBenchmark({ modelLevel: 1, benchmarkLevel: 5 })).toBe('high');
    expect(tierFromBenchmark({ modelLevel: 3 })).toBe('low');
    expect(tierFromBenchmark({ modelLevel: 0, benchmarkLevel: 35 })).toBe('high');
    expect(tierFromBenchmark({ modelLevel: 0, benchmarkLevel: 20 })).toBe('mid');
    expect(tierFromBenchmark({ benchmarkLevel: 8 })).toBe('low');
    expect(tierFromBenchmark({ benchmarkLevel: -1 })).toBe('mid');
    expect(tierFromBenchmark(null)).toBe('mid');
  });

  it('caps the capture size by GL limits', () => {
    const caps = { maxTextureSize: 4096, maxRenderbufferSize: 3840, maxViewport: [4096, 4096] as [number, number], fragmentHighp: true, vendor: '', renderer: '', version: '', extensions: [] };
    expect(captureLongEdgeLimit('high', caps)).toBe(3840);
    expect(captureLongEdgeLimit('low', caps)).toBe(2048);
  });
});

describe('photo orientation', () => {
  it('rotates a landscape JPEG tagged "right" when the decoder did not', () => {
    expect(resolveOrientation('right', 4032, 3024, 4032, 3024)).toEqual({ rotation: 90, mirror: false, width: 3024, height: 4032 });
  });

  it('trusts the decoder when it already applied the rotation', () => {
    expect(resolveOrientation('right', 4032, 3024, 3024, 4032)).toEqual({ rotation: 0, mirror: false, width: 3024, height: 4032 });
  });

  it('leaves upright images alone', () => {
    expect(resolveOrientation('up', 3024, 4032, 3024, 4032)).toEqual({ rotation: 0, mirror: false, width: 3024, height: 4032 });
  });

  it('maps mirrored quarter turns', () => {
    expect(resolveOrientation('left-mirrored', 4032, 3024, 4032, 3024)).toMatchObject({ rotation: 90, mirror: true });
    expect(resolveOrientation('right-mirrored', 4032, 3024, 4032, 3024)).toMatchObject({ rotation: 270, mirror: true });
  });
});
