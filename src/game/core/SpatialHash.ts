/**
 * Uniform-grid spatial hash rebuilt every tick. Cheap for the few hundred
 * dynamic entities we have and allocation-free during queries.
 */
export interface Positioned {
  x: number;
  y: number;
}

export class SpatialHash<T extends Positioned> {
  private readonly cols: number;
  private readonly rows: number;
  private readonly buckets: T[][];

  constructor(
    worldW: number,
    worldH: number,
    private readonly cell: number,
  ) {
    this.cols = Math.max(1, Math.ceil(worldW / cell));
    this.rows = Math.max(1, Math.ceil(worldH / cell));
    this.buckets = Array.from({ length: this.cols * this.rows }, () => []);
  }

  clear() {
    for (const b of this.buckets) b.length = 0;
  }

  insert(item: T) {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor(item.x / this.cell)));
    const cy = Math.min(this.rows - 1, Math.max(0, Math.floor(item.y / this.cell)));
    this.buckets[cy * this.cols + cx].push(item);
  }

  /** Push every item within radius r of (x, y) into `out` (out is not cleared). */
  query(x: number, y: number, r: number, out: T[], filter?: (item: T) => boolean): T[] {
    const minX = Math.max(0, Math.floor((x - r) / this.cell));
    const maxX = Math.min(this.cols - 1, Math.floor((x + r) / this.cell));
    const minY = Math.max(0, Math.floor((y - r) / this.cell));
    const maxY = Math.min(this.rows - 1, Math.floor((y + r) / this.cell));
    const r2 = r * r;
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const bucket = this.buckets[cy * this.cols + cx];
        for (let i = 0; i < bucket.length; i++) {
          const it = bucket[i];
          const dx = it.x - x;
          const dy = it.y - y;
          if (dx * dx + dy * dy <= r2 && (!filter || filter(it))) out.push(it);
        }
      }
    }
    return out;
  }
}
