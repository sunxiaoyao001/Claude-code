// Rolling one-second statistics for the preview loop. Delivered frames (from the camera) and rendered
// frames are tracked separately because the degrade rule must look at render cost and drops, not at
// the camera's own frame rate, which the system decides (CLAUDE.md §4).

export interface FrameStatsSnapshot {
  deliveredFps: number;
  renderedFps: number;
  droppedFps: number;
  avgRenderMs: number;
  maxRenderMs: number;
  frameWidth: number;
  frameHeight: number;
  totalDelivered: number;
  totalRendered: number;
}

interface RenderSample {
  at: number;
  costMs: number;
}

const WINDOW_MS = 1000;

export class FrameStats {
  private delivered: number[] = [];
  private rendered: RenderSample[] = [];
  private frameWidth = 0;
  private frameHeight = 0;
  private totalDelivered = 0;
  private totalRendered = 0;

  constructor(private readonly now: () => number) {}

  recordDelivered(width: number, height: number): void {
    this.frameWidth = width;
    this.frameHeight = height;
    this.totalDelivered += 1;
    this.delivered.push(this.now());
  }

  recordRendered(costMs: number): void {
    this.totalRendered += 1;
    this.rendered.push({ at: this.now(), costMs });
  }

  reset(): void {
    this.delivered = [];
    this.rendered = [];
    this.totalDelivered = 0;
    this.totalRendered = 0;
  }

  snapshot(): FrameStatsSnapshot {
    const cutoff = this.now() - WINDOW_MS;
    this.delivered = this.delivered.filter((at) => at > cutoff);
    this.rendered = this.rendered.filter((sample) => sample.at > cutoff);

    const costs = this.rendered.map((sample) => sample.costMs);
    const avgRenderMs = costs.length ? costs.reduce((sum, cost) => sum + cost, 0) / costs.length : 0;

    return {
      deliveredFps: this.delivered.length,
      renderedFps: this.rendered.length,
      droppedFps: Math.max(0, this.delivered.length - this.rendered.length),
      avgRenderMs,
      maxRenderMs: costs.length ? Math.max(...costs) : 0,
      frameWidth: this.frameWidth,
      frameHeight: this.frameHeight,
      totalDelivered: this.totalDelivered,
      totalRendered: this.totalRendered,
    };
  }
}
