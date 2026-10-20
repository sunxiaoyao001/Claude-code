// View model of the film strip (CLAUDE.md §7.2): one card per pack in catalogue order, a series break
// before the first card of each series, and a lock badge for packs outside the free tier.
import type { ResolvedPack } from '../pack/CameraPack';

export interface StripItem {
  id: string;
  name: string;
  thumb: string;
  locked: boolean;
  /** First card of a series: gets a wider gap before it. */
  seriesStart: boolean;
  /** Download progress 0..1, or -1 when nothing is downloading. */
  progress: number;
}

export function buildStripItems(packs: readonly ResolvedPack[], thumbOf: (pack: ResolvedPack) => string, isLocked: (pack: ResolvedPack) => boolean): StripItem[] {
  return packs.map((pack, index) => ({
    id: pack.id,
    name: pack.name,
    thumb: thumbOf(pack),
    locked: isLocked(pack),
    seriesStart: index === 0 || packs[index - 1]?.series.id !== pack.series.id,
    progress: -1,
  }));
}
