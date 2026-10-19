import { describe, expect, it } from 'vitest';
import { computeViewTransform, mapScreenToTexture, nextRotation, type FrameRotation } from '../miniprogram/core/camera/viewTransform';

const base = { frameWidth: 480, frameHeight: 640, viewWidth: 1080, viewHeight: 1440, rotation: 0 as FrameRotation, mirror: false };

function corners(transform: ReturnType<typeof computeViewTransform>) {
  return [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x = 0, y = 0]) => mapScreenToTexture(transform, x, y));
}

describe('computeViewTransform', () => {
  it('is the identity when frame and view share an aspect ratio', () => {
    const t = computeViewTransform(base);
    expect([...t.matrix]).toEqual([1, 0, 0, 1]);
    expect(t.visibleX).toBe(1);
    expect(t.visibleY).toBe(1);
  });

  it('crops the sides of a frame that is wider than the view (cover)', () => {
    // 3:4 frame on a 9:19.5 phone screen: full height, only part of the width.
    const t = computeViewTransform({ ...base, viewWidth: 1170, viewHeight: 2532 });
    expect(t.visibleY).toBe(1);
    expect(t.visibleX).toBeCloseTo((1170 / 2532) / (480 / 640), 6);
    const [topLeft] = corners(t);
    expect(topLeft?.[1]).toBeCloseTo(-0.5, 6);
    expect(Math.abs(topLeft?.[0] ?? 1)).toBeLessThan(0.5);
  });

  it('crops top and bottom of a frame that is taller than the view', () => {
    const t = computeViewTransform({ ...base, viewWidth: 1440, viewHeight: 1440 });
    expect(t.visibleX).toBe(1);
    expect(t.visibleY).toBeCloseTo(0.75, 6);
  });

  it('mirrors horizontally only', () => {
    const t = computeViewTransform({ ...base, mirror: true });
    expect(mapScreenToTexture(t, 0.5, 0.25)).toEqual([-0.5, 0.25]);
  });

  it('rotates 90° clockwise: texture top lands on the screen right, texture left on the screen top', () => {
    // Landscape sensor frame shown upright on a portrait view.
    const t = computeViewTransform({ ...base, frameWidth: 640, frameHeight: 480, rotation: 90 });
    const [x, y] = mapScreenToTexture(t, 0.5, 0);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(-0.5, 6);
    const [tx, ty] = mapScreenToTexture(t, 0, -0.5);
    expect(tx).toBeCloseTo(-0.5, 6);
    expect(ty).toBeCloseTo(0, 6);
  });

  it.each([0, 90, 180, 270] as FrameRotation[])('keeps every corner inside the texture at %i°', (rotation) => {
    const t = computeViewTransform({ ...base, frameWidth: 720, frameHeight: 1280, rotation, mirror: true });
    for (const [x, y] of corners(t)) {
      expect(Math.abs(x)).toBeLessThanOrEqual(0.5 + 1e-9);
      expect(Math.abs(y)).toBeLessThanOrEqual(0.5 + 1e-9);
    }
  });

  it('cycles rotations', () => {
    expect([0, 90, 180, 270].map((r) => nextRotation(r as FrameRotation))).toEqual([90, 180, 270, 0]);
  });
});
