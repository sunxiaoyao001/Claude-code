import { describe, expect, it } from 'vitest';
import { FrameStats } from '../miniprogram/core/camera/FrameStats';

function setup() {
  let clock = 0;
  const stats = new FrameStats(() => clock);
  return { stats, advance: (ms: number) => { clock += ms; } };
}

describe('FrameStats', () => {
  it('reports delivered, rendered and dropped frames over the last second', () => {
    const { stats, advance } = setup();
    for (let i = 0; i < 30; i++) {
      stats.recordDelivered(480, 640);
      if (i % 3 !== 0) stats.recordRendered(4);
      advance(33);
    }
    const snap = stats.snapshot();
    expect(snap.deliveredFps).toBe(30);
    expect(snap.renderedFps).toBe(20);
    expect(snap.droppedFps).toBe(10);
    expect(snap.avgRenderMs).toBe(4);
    expect(snap.frameWidth).toBe(480);
    expect(snap.frameHeight).toBe(640);
  });

  it('forgets samples older than one second but keeps totals', () => {
    const { stats, advance } = setup();
    stats.recordDelivered(480, 640);
    stats.recordRendered(10);
    advance(1500);
    stats.recordDelivered(480, 640);
    stats.recordRendered(2);
    const snap = stats.snapshot();
    expect(snap.deliveredFps).toBe(1);
    expect(snap.maxRenderMs).toBe(2);
    expect(snap.totalDelivered).toBe(2);
    expect(snap.totalRendered).toBe(2);
  });

  it('reset clears the window and totals', () => {
    const { stats } = setup();
    stats.recordDelivered(1, 1);
    stats.recordRendered(1);
    stats.reset();
    expect(stats.snapshot()).toMatchObject({ deliveredFps: 0, renderedFps: 0, totalDelivered: 0, avgRenderMs: 0 });
  });
});
