import { Cell, CELL_INFO, type GameMap } from '../map/GameMap';

/** Infantry and tank traversal costs per cell (0 = impassable). */
export class NavGrid {
  readonly w: number;
  readonly h: number;
  readonly inf: Float32Array;
  readonly tank: Float32Array;

  constructor(readonly map: GameMap) {
    this.w = map.w;
    this.h = map.h;
    this.inf = new Float32Array(map.w * map.h);
    this.tank = new Float32Array(map.w * map.h);
    this.rebuildAll();
  }

  rebuildAll() {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.computeInf(x, y);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.computeTank(x, y);
  }

  /** Recompute costs after the structure at (x, y) changed. */
  updateAround(x: number, y: number) {
    this.computeInf(x, y);
    for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) this.computeTank(xx, yy);
  }

  private computeInf(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    const info = CELL_INFO[this.map.cells[i] as Cell];
    this.inf[i] = info.blocksMove ? 0 : info.moveCost;
  }

  private computeTank(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    if (x < 2 || y < 2 || x >= this.w - 2 || y >= this.h - 2) {
      this.tank[i] = 0;
      return;
    }
    let cost = 1;
    for (let yy = y - 2; yy <= y + 2; yy++)
      for (let xx = x - 2; xx <= x + 2; xx++) {
        const k = this.map.kind(xx, yy);
        const info = CELL_INFO[k];
        const near = Math.abs(xx - x) <= 1 && Math.abs(yy - y) <= 1;
        if (info.tank === 'block') {
          this.tank[i] = 0;
          return;
        }
        if (!near) continue;
        if (k === Cell.Wall) cost += 3.2;
        else if (k === Cell.Window) cost += 2.6;
        else if (k === Cell.Tree) cost += 1.2;
        else if (k === Cell.Low) cost += 0.8;
        else if (k === Cell.Rubble) cost += 0.15;
      }
    this.tank[i] = Math.min(250, cost);
  }

  passable(layer: 'inf' | 'tank', x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return (layer === 'inf' ? this.inf : this.tank)[y * this.w + x] > 0;
  }
}
