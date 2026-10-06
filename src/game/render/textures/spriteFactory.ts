import type Phaser from 'phaser';
import { Mat } from '../../sim/map/GameMap';
import type { Biome, Role, TeamId } from '../../sim/types';
import { AtlasBuilder, nextFrame, type AtlasFrame } from './atlas';
import { alphaBounds, outline, renderModel, type Prim } from './boxRenderer';
import { FINE_POSES, POSES, soldierModel, type SoldierPose } from './soldierModel';
import {
  barrier,
  crate,
  drawBarrel,
  drawTree,
  logs,
  lowWall,
  rockModel,
  rubbleModel,
  sandbags,
  wallBlock,
  wreckModel,
} from './structureModels';
import { tankHullModel, tankTurretModel } from './tankModel';

export const SOLDIER_RES = 2;
export const TANK_RES = 1.3;
export const STRUCT_RES = 1.5;
export const TANK_DIRS = 32;

const ROLES: Role[] = ['rifleman', 'mg', 'medic', 'at', 'sniper'];

function scratch(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d', { willReadFrequently: true })! };
}

export const soldierFrameName = (team: TeamId, role: Role, pose: SoldierPose, dir: number) => `${team}|${role}|${pose}|${dir}`;
export const soldierDirs = (pose: SoldierPose) => (FINE_POSES.has(pose) ? 16 : 8);

export interface UnitAtlases {
  soldiers: Map<string, AtlasFrame>;
  tanks: Map<string, AtlasFrame>;
}

let unitCache: UnitAtlases | null = null;

/** Render every soldier pose/direction and every tank heading into atlases (once per session). */
export async function buildUnitAtlases(textures: Phaser.Textures.TextureManager, onProgress: (p: number) => void): Promise<UnitAtlases> {
  if (unitCache) return unitCache;
  const sold = new AtlasBuilder('atlas_soldier_');
  const W = 128;
  const H = 144;
  const OX = 64;
  const OY = 108;
  const { c, ctx } = scratch(W, H);
  const jobs: { team: TeamId; role: Role; pose: SoldierPose }[] = [];
  for (const team of [0, 1] as TeamId[])
    for (const role of ROLES)
      for (const pose of POSES) {
        if (pose === 'rocket' && role !== 'at') continue;
        jobs.push({ team, role, pose });
      }
  const tankJobs = 2 * 2 * 2;
  const total = jobs.length + tankJobs;
  let done = 0;
  let lastYield = performance.now();
  for (const job of jobs) {
    const prims = soldierModel(job);
    const n = soldierDirs(job.pose);
    for (let d = 0; d < n; d++) {
      ctx.clearRect(0, 0, W, H);
      renderModel(ctx, prims, { yaw: (d / n) * Math.PI * 2, scale: SOLDIER_RES, ox: OX, oy: OY, ambient: 0.52 });
      outline(c, 'rgba(12,14,16,0.8)', 1);
      sold.add(soldierFrameName(job.team, job.role, job.pose, d), c, alphaBounds(ctx, W, H), OX, OY);
    }
    done++;
    if (performance.now() - lastYield > 24) {
      onProgress(done / total);
      await nextFrame();
      lastYield = performance.now();
    }
  }
  sold.commit(textures);

  const tanks = new AtlasBuilder('atlas_tank_');
  const TW = 260;
  const TH = 220;
  const TOX = 130;
  const TOY = 130;
  const t = scratch(TW, TH);
  for (const team of [0, 1] as TeamId[])
    for (const wreck of [false, true]) {
      if (wreck && team === 1) continue;
      for (const part of ['hull', 'turret'] as const) {
        const prims = part === 'hull' ? tankHullModel(team, wreck) : tankTurretModel(team, wreck);
        for (let d = 0; d < TANK_DIRS; d++) {
          t.ctx.clearRect(0, 0, TW, TH);
          renderModel(t.ctx, prims, { yaw: (d / TANK_DIRS) * Math.PI * 2, scale: TANK_RES, ox: TOX, oy: TOY, ambient: 0.5 });
          outline(t.c, 'rgba(10,12,14,0.75)', 1);
          tanks.add(`${wreck ? 'w' : team}|${part}|${d}`, t.c, alphaBounds(t.ctx, TW, TH), TOX, TOY);
        }
        done += 1;
        onProgress(done / total);
        await nextFrame();
      }
    }
  tanks.commit(textures);
  unitCache = { soldiers: sold.lookup, tanks: tanks.lookup };
  onProgress(1);
  return unitCache;
}

export interface StructureAtlas {
  frames: Map<string, AtlasFrame>;
  biome: Biome;
}

const structCache = new Map<Biome, StructureAtlas>();

const WALL_MATS: Mat[] = [Mat.Concrete, Mat.Brick, Mat.Adobe, Mat.Wood, Mat.Stone];

export const wallFrame = (mat: Mat, variant: number, window: boolean, damaged: boolean) => `wall|${mat}|${variant}|${window ? 1 : 0}|${damaged ? 1 : 0}`;

/** Walls, props, trees, rocks, wrecks and rubble for one biome. */
export async function buildStructureAtlas(textures: Phaser.Textures.TextureManager, biome: Biome): Promise<StructureAtlas> {
  const cached = structCache.get(biome);
  if (cached) return cached;
  const b = new AtlasBuilder(`atlas_struct_${biome}_`);
  const W = 120;
  const H = 200;
  const OX = 60;
  const OY = 170;
  const { c, ctx } = scratch(W, H);
  const put = (name: string, prims: Prim[], edge = true) => {
    ctx.clearRect(0, 0, W, H);
    renderModel(ctx, prims, { yaw: 0, scale: STRUCT_RES, ox: OX, oy: OY, ambient: 0.55, edge: edge ? 1 : 0 });
    b.add(name, c, alphaBounds(ctx, W, H), OX, OY);
  };
  const paint = (name: string, fn: (ctx: CanvasRenderingContext2D) => void) => {
    ctx.clearRect(0, 0, W, H);
    fn(ctx);
    outline(c, 'rgba(12,14,14,0.55)', 1);
    b.add(name, c, alphaBounds(ctx, W, H), OX, OY);
  };
  for (const mat of WALL_MATS) {
    for (let v = 0; v < 3; v++) {
      for (const win of [false, true])
        for (const dmg of [false, true]) put(wallFrame(mat, v, win, dmg), wallBlock(mat, biome, { window: win, damage: dmg ? 1 : 0, seed: v * 7 + (win ? 3 : 0) + (dmg ? 11 : 0) + mat * 101 }));
    }
    put(`low|${mat}`, lowWall(mat, biome, mat));
  }
  await nextFrame();
  for (let v = 0; v < 3; v++) put(`sandbag|${v}`, sandbags(biome, v + 5));
  for (let v = 0; v < 3; v++) put(`crate|${v}`, crate(v + 9));
  put('barrier|x', barrier(true));
  put('barrier|y', barrier(false));
  put('logs|0', logs());
  for (let v = 0; v < 4; v++) put(`rock|${v}`, rockModel(biome, v * 13 + 3));
  for (const kind of ['car', 'truck'] as const)
    for (const along of [true, false]) for (let v = 0; v < 3; v++) put(`${kind}|${along ? 'x' : 'y'}|${v}`, wreckModel(kind, along, v * 17 + 5));
  for (const mat of [Mat.None, ...WALL_MATS, Mat.Sandbag, Mat.Logs, Mat.Barrier])
    for (let v = 0; v < 3; v++) put(`rubble|${mat}|${v}`, rubbleModel(mat, biome, v * 29 + mat));
  await nextFrame();
  for (const mat of [Mat.Pine, Mat.Palm, Mat.DeadTree])
    for (let v = 0; v < 3; v++) paint(`tree|${mat}|${v}`, (cx) => drawTree(cx, mat, biome, v * 41 + mat, STRUCT_RES * 0.9, OX, OY));
  for (let v = 0; v < 3; v++) paint(`barrel|${v}`, (cx) => drawBarrel(cx, STRUCT_RES * 0.85, OX, OY - 2, v + 3));
  b.commit(textures);
  const atlas = { frames: b.lookup, biome };
  structCache.set(biome, atlas);
  return atlas;
}
