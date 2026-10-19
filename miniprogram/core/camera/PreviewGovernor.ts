// Preview degrade switch (CLAUDE.md §4): turns preview halation off when frames cost too much to
// render, judged from render time rather than the camera's own frame rate. Hysteresis avoids
// flapping; after repeated overloads it stays off for the session. Capture always keeps halation.
import type { FrameStatsSnapshot } from './FrameStats';

export interface GovernorConfig {
  budgetMs: number;
  /** Turn off after this many consecutive windows above budget * offRatio. */
  offRatio: number;
  offAfter: number;
  /** Turn back on after this many consecutive windows below budget * onRatio. */
  onRatio: number;
  onAfter: number;
  /** Stop retrying after this many automatic turn-offs. */
  maxDisables: number;
}

export const DEFAULT_GOVERNOR: GovernorConfig = {
  budgetMs: 20,
  offRatio: 0.8,
  offAfter: 2,
  onRatio: 0.4,
  onAfter: 4,
  maxDisables: 2,
};

export class PreviewGovernor {
  private overWindows = 0;
  private underWindows = 0;
  private disables = 0;

  constructor(
    private on: boolean,
    private readonly config: GovernorConfig = DEFAULT_GOVERNOR,
  ) {}

  get halation(): boolean {
    return this.on;
  }

  get lockedOff(): boolean {
    return this.disables >= this.config.maxDisables;
  }

  /** Feed one stats window (about a second); returns true when the decision changed. */
  update(stats: Pick<FrameStatsSnapshot, 'avgRenderMs' | 'renderedFps'>): boolean {
    if (stats.renderedFps === 0) return false;
    const { budgetMs, offRatio, offAfter, onRatio, onAfter } = this.config;

    if (this.on) {
      this.overWindows = stats.avgRenderMs > budgetMs * offRatio ? this.overWindows + 1 : 0;
      if (this.overWindows >= offAfter) {
        this.on = false;
        this.overWindows = 0;
        this.disables += 1;
        return true;
      }
      return false;
    }

    if (this.lockedOff) return false;
    this.underWindows = stats.avgRenderMs < budgetMs * onRatio ? this.underWindows + 1 : 0;
    if (this.underWindows >= onAfter) {
      this.on = true;
      this.underWindows = 0;
      return true;
    }
    return false;
  }
}
