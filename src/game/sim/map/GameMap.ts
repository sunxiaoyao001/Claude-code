import type { Biome } from '../types';

/** What occupies a 1m x 1m cell. */
export enum Cell {
  Empty = 0,
  Wall = 1,
  Window = 2,
  Low = 3,
  Tree = 4,
  Rock = 5,
  Rubble = 6,
  Wreck = 7,
}

/** Visual/material id of the occupant (drives HP, colours and debris). */
export enum Mat {
  None = 0,
  Concrete,
  Brick,
  Adobe,
  Wood,
  Stone,
  Sandbag,
  Crate,
  Barrier,
  Logs,
  Barrel,
  Pine,
  Palm,
  DeadTree,
  Rock,
  Car,
  Truck,
  TankWreck,
  Shrub,
}

/** Ground layer type (render only, plus minor speed modifiers). */
export enum Ground {
  Sand = 0,
  SandDark,
  Dirt,
  Gravel,
  Asphalt,
  Sidewalk,
  Snow,
  SnowPacked,
  Ice,
  Concrete,
  Tile,
  Plank,
  Grass,
  Crosswalk,
}

export interface CellInfo {
  /** Blocks infantry movement. */
  blocksMove: boolean;
  /** Sight opacity contributed by crossing the cell (>=1 blocks). */
  opacity: number;
  /** Chance a bullet aimed at a unit right behind this cell is stopped. */
  cover: number;
  /** Height in metres (render + projectile arcs). */
  height: number;
  /** How tanks treat it. */
  tank: 'pass' | 'crush' | 'block';
  /** Extra A* cost for infantry when passable. */
  moveCost: number;
}

export const CELL_INFO: Record<Cell, CellInfo> = {
  [Cell.Empty]: { blocksMove: false, opacity: 0, cover: 0, height: 0, tank: 'pass', moveCost: 1 },
  [Cell.Wall]: { blocksMove: true, opacity: 1, cover: 1, height: 2.7, tank: 'crush', moveCost: 0 },
  [Cell.Window]: { blocksMove: true, opacity: 0.12, cover: 0.62, height: 2.7, tank: 'crush', moveCost: 0 },
  [Cell.Low]: { blocksMove: true, opacity: 0, cover: 0.78, height: 0.95, tank: 'crush', moveCost: 0 },
  [Cell.Tree]: { blocksMove: true, opacity: 0.45, cover: 0.35, height: 5, tank: 'crush', moveCost: 0 },
  [Cell.Rock]: { blocksMove: true, opacity: 1, cover: 0.95, height: 1.7, tank: 'block', moveCost: 0 },
  [Cell.Rubble]: { blocksMove: false, opacity: 0, cover: 0.3, height: 0.45, tank: 'pass', moveCost: 1.7 },
  [Cell.Wreck]: { blocksMove: true, opacity: 0.85, cover: 0.9, height: 1.8, tank: 'block', moveCost: 0 },
};

export const MAT_HP: Partial<Record<Mat, number>> = {
  [Mat.Concrete]: 320,
  [Mat.Brick]: 260,
  [Mat.Adobe]: 200,
  [Mat.Wood]: 150,
  [Mat.Stone]: 340,
  [Mat.Sandbag]: 170,
  [Mat.Crate]: 70,
  [Mat.Barrier]: 260,
  [Mat.Logs]: 150,
  [Mat.Barrel]: 50,
  [Mat.Pine]: 120,
  [Mat.Palm]: 90,
  [Mat.DeadTree]: 60,
  [Mat.Shrub]: 40,
};

export interface Building {
  id: number;
  /** Footprint [x0, x1) x [y0, y1) in cells, walls included. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  mat: Mat;
  floor: Ground;
  roof: boolean;
  wallCells: number;
  destroyedCells: number;
  /** Units currently inside (updated by the simulation each tick). */
  occupants: number;
  ruined: boolean;
}

export interface ControlPointDef {
  id: number;
  label: string;
  x: number;
  y: number;
  r: number;
}

export interface SpawnZone {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Direction the team faces at spawn (toward the enemy). */
  facing: number;
}

export class GameMap {
  readonly w: number;
  readonly h: number;
  readonly cells: Uint8Array;
  readonly mat: Uint8Array;
  readonly hp: Float32Array;
  readonly ground: Uint8Array;
  /** Building id for walls/floors, -1 otherwise. */
  readonly bld: Int16Array;
  /** Small per-cell random byte for render variation. */
  readonly vari: Uint8Array;
  buildings: Building[] = [];
  points: ControlPointDef[] = [];
  spawns: SpawnZone[] = [];
  /** Bumped whenever the structure grid changes. */
  version = 0;
  /** Cells changed since the renderer last drained this list. */
  readonly changed: number[] = [];

  constructor(
    readonly size: number,
    readonly biome: Biome,
    readonly seed: number,
  ) {
    this.w = size;
    this.h = size;
    const n = size * size;
    this.cells = new Uint8Array(n);
    this.mat = new Uint8Array(n);
    this.hp = new Float32Array(n);
    this.ground = new Uint8Array(n);
    this.bld = new Int16Array(n).fill(-1);
    this.vari = new Uint8Array(n);
  }

  idx(x: number, y: number) {
    return y * this.w + x;
  }

  inBounds(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  kind(x: number, y: number): Cell {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return Cell.Rock;
    return this.cells[y * this.w + x] as Cell;
  }

  kindAtPos(px: number, py: number): Cell {
    return this.kind(Math.floor(px), Math.floor(py));
  }

  blocksMove(x: number, y: number) {
    return CELL_INFO[this.kind(x, y)].blocksMove;
  }

  walkablePos(px: number, py: number) {
    return !this.blocksMove(Math.floor(px), Math.floor(py));
  }

  /** Set a cell's occupant and reset its HP from the material table. */
  set(x: number, y: number, kind: Cell, mat: Mat = Mat.None, bld = -2) {
    if (!this.inBounds(x, y)) return;
    const i = this.idx(x, y);
    this.cells[i] = kind;
    this.mat[i] = mat;
    this.hp[i] = MAT_HP[mat] ?? (kind === Cell.Empty || kind === Cell.Rubble ? 0 : 99999);
    if (bld !== -2) this.bld[i] = bld;
  }

  setGround(x: number, y: number, g: Ground) {
    if (this.inBounds(x, y)) this.ground[this.idx(x, y)] = g;
  }

  isIndoor(px: number, py: number): number {
    const x = Math.floor(px);
    const y = Math.floor(py);
    if (!this.inBounds(x, y)) return -1;
    const i = this.idx(x, y);
    const b = this.bld[i];
    if (b < 0) return -1;
    const k = this.cells[i];
    return k === Cell.Empty || k === Cell.Rubble ? b : -1;
  }

  markChanged(x: number, y: number) {
    this.changed.push(this.idx(x, y));
    this.version++;
  }
}
