import { describe, expect, it } from 'vitest';
import { drawDateStamp, type StampContext } from '../miniprogram/core/stamp/DateStamp';
import { DIGIT_ASPECT, digitPolygons, formatStamp, layoutStamp, segmentsFor } from '../miniprogram/core/stamp/sevenSegment';

describe('seven-segment glyphs', () => {
  it('lights the classic segments per digit', () => {
    expect(segmentsFor('8')).toHaveLength(7);
    expect(segmentsFor('1')).toBe('bc');
    expect(segmentsFor('7')).toBe('abc');
    expect(segmentsFor('x')).toBe('');
    expect(digitPolygons('0', 0, 0, 100)).toHaveLength(6);
  });

  it('keeps digit polygons inside their (skewed) box', () => {
    for (const polygon of digitPolygons('8', 0, 0, 100)) {
      for (const [x, y] of polygon) {
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(100);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100 * DIGIT_ASPECT + 10);
      }
    }
  });

  it('lays out a date: digits plus slashes, wider than its height', () => {
    const { polygons, width } = layoutStamp('2026/10/19', 40);
    const digitSegments = '20261019'.split('').reduce((sum, d) => sum + segmentsFor(d).length, 0);
    expect(polygons).toHaveLength(digitSegments + 2);
    expect(width).toBeGreaterThan(40 * 5);
  });

  it('formats date and time with zero padding', () => {
    const date = new Date(2026, 0, 5, 7, 3);
    expect(formatStamp(date)).toBe('2026/01/05');
    expect(formatStamp(date, 'time')).toBe('07:03');
  });
});

describe('drawDateStamp', () => {
  it('draws in the bottom-right corner in stamp orange, with a glow pass', () => {
    const points: Array<[number, number]> = [];
    const fills: Array<{ blur: number; style: unknown }> = [];
    const ctx: StampContext = {
      fillStyle: '', shadowColor: '', shadowBlur: 0, globalAlpha: 1,
      save: () => undefined,
      restore: () => undefined,
      beginPath: () => undefined,
      closePath: () => undefined,
      moveTo: (x, y) => points.push([x, y]),
      lineTo: (x, y) => points.push([x, y]),
      fill() { fills.push({ blur: this.shadowBlur, style: this.fillStyle }); },
    };
    drawDateStamp(ctx, '2026/10/19', 3000, 4000);
    expect(fills).toHaveLength(2);
    expect(fills[0]?.blur).toBeGreaterThan(0);
    expect(fills[1]?.blur).toBe(0);
    expect(fills.every((f) => f.style === '#FF9E2C')).toBe(true);
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    expect(Math.min(...xs)).toBeGreaterThan(3000 * 0.5);
    expect(Math.max(...xs)).toBeLessThan(3000);
    expect(Math.min(...ys)).toBeGreaterThan(4000 * 0.85);
    expect(Math.max(...ys)).toBeLessThan(4000);
  });
});
