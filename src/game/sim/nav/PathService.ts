import type { Vec2 } from '../../core/math';
import { Pathfinder, type PathResult } from './Pathfinder';
import type { NavGrid } from './NavGrid';

interface Request {
  id: number;
  layer: 'inf' | 'tank';
  sx: number;
  sy: number;
  gx: number;
  gy: number;
  cb: (res: PathResult | null) => void;
}

/**
 * Time-sliced path planning: requests are queued and served under a per-tick
 * node-expansion budget so a burst of re-plans never causes a frame spike.
 */
export class PathService {
  readonly finder: Pathfinder;
  private queue: Request[] = [];
  private nextId = 1;
  private cancelled = new Set<number>();
  /** Stats for the debug overlay. */
  served = 0;

  constructor(nav: NavGrid) {
    this.finder = new Pathfinder(nav);
  }

  /**
   * Returns a direct path immediately when the straight line is clear, otherwise
   * queues an A* search and returns the request id (the callback fires later).
   */
  request(layer: 'inf' | 'tank', sx: number, sy: number, gx: number, gy: number, cb: (res: PathResult | null) => void): number {
    const clearance = layer === 'inf' ? 0.38 : 1.2;
    if (
      Math.hypot(gx - sx, gy - sy) < 30 &&
      this.finder.nav.passable(layer, Math.floor(gx), Math.floor(gy)) &&
      this.finder.clearSegment(layer, sx, sy, gx, gy, clearance)
    ) {
      cb({ points: [{ x: gx, y: gy }], complete: true, expanded: 0 });
      return 0;
    }
    const id = this.nextId++;
    this.queue.push({ id, layer, sx, sy, gx, gy, cb });
    return id;
  }

  cancel(id: number) {
    if (id > 0) this.cancelled.add(id);
  }

  get pending() {
    return this.queue.length;
  }

  process(budget: number) {
    let spent = 0;
    while (this.queue.length > 0 && spent < budget) {
      const req = this.queue.shift()!;
      if (this.cancelled.has(req.id)) {
        this.cancelled.delete(req.id);
        continue;
      }
      const res = this.finder.find(req.layer, req.sx, req.sy, req.gx, req.gy, req.layer === 'tank' ? 9000 : 7000);
      spent += (res?.expanded ?? 0) + 40;
      this.served++;
      req.cb(res);
    }
    if (this.cancelled.size > 256) this.cancelled.clear();
  }
}

export type { Vec2 };
