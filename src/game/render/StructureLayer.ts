import Phaser from 'phaser';
import { Rng } from '../core/rng';
import { Cell, Mat, type Building, type GameMap } from '../sim/map/GameMap';
import { depthOf, isoX, isoY } from './iso';
import { matColor, shade, toInt } from './palette';
import { renderModel, type Prim } from './textures/boxRenderer';
import { STRUCT_RES, wallFrame, type StructureAtlas } from './textures/spriteFactory';
import { WALL_H } from './textures/structureModels';

const WALL_MATS = new Set<number>([Mat.Concrete, Mat.Brick, Mat.Adobe, Mat.Wood, Mat.Stone]);

interface RoofView {
  b: Building;
  img: Phaser.GameObjects.Image;
  key: string;
  alpha: number;
}

/**
 * One sprite per occupied cell (walls, props, trees, rocks, wreck pairs, rubble),
 * plus per-building roofs that fade when someone is inside.
 */
export class StructureLayer {
  private sprites: (Phaser.GameObjects.Image | null)[];
  private roofs: RoofView[] = [];
  /** Building tint variation so blocks of the same material don't look cloned. */
  private bTint = new Map<number, number>();
  /** Cells currently drawn translucent (occluding the selected unit). */
  private faded = new Set<number>();

  constructor(
    private scene: Phaser.Scene,
    private map: GameMap,
    private atlas: StructureAtlas,
    private world: Phaser.GameObjects.Layer,
  ) {
    this.sprites = new Array(map.w * map.h).fill(null);
    const rng = new Rng(map.seed ^ 77);
    for (const b of map.buildings) {
      const k = rng.range(0.9, 1.06);
      const warm = rng.range(-0.04, 0.04);
      this.bTint.set(b.id, toInt([Math.min(255, 255 * k * (1 + warm)), Math.min(255, 255 * k), Math.min(255, 255 * k * (1 - warm))]));
    }
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) this.refreshCell(x, y);
    for (const b of map.buildings) if (b.roof) this.makeRoof(b);
  }

  private frameFor(x: number, y: number): { frame: string; ox: number; oy: number; depthBias: number } | null {
    const map = this.map;
    const i = map.idx(x, y);
    const k = map.cells[i] as Cell;
    const mat = map.mat[i] as Mat;
    const v = map.vari[i];
    const f = this.atlas.frames;
    const pick = (name: string) => (f.has(name) ? name : null);
    switch (k) {
      case Cell.Wall:
      case Cell.Window: {
        const m = WALL_MATS.has(mat) ? mat : Mat.Concrete;
        const maxHp = { [Mat.Concrete]: 320, [Mat.Brick]: 260, [Mat.Adobe]: 200, [Mat.Wood]: 150, [Mat.Stone]: 340 }[m as 1] ?? 300;
        const dmg = map.hp[i] < maxHp * 0.55;
        const name = pick(wallFrame(m, v % 3, k === Cell.Window, dmg));
        return name ? { frame: name, ox: 0.5, oy: 0.5, depthBias: 0 } : null;
      }
      case Cell.Low: {
        let name: string | null = null;
        if (mat === Mat.Sandbag) name = pick(`sandbag|${v % 3}`);
        else if (mat === Mat.Crate) name = pick(`crate|${v % 3}`);
        else if (mat === Mat.Barrel) name = pick(`barrel|${v % 3}`);
        else if (mat === Mat.Logs) name = pick('logs|0');
        else if (mat === Mat.Barrier) {
          const alongX = map.kind(x - 1, y) === Cell.Low || map.kind(x + 1, y) === Cell.Low;
          name = pick(`barrier|${alongX ? 'x' : 'y'}`);
        } else name = pick(`low|${WALL_MATS.has(mat) ? mat : Mat.Concrete}`);
        return name ? { frame: name, ox: 0.5, oy: 0.5, depthBias: 0 } : null;
      }
      case Cell.Tree: {
        const tm = mat === Mat.Pine || mat === Mat.Palm ? mat : Mat.DeadTree;
        const name = pick(`tree|${tm}|${v % 3}`);
        return name ? { frame: name, ox: 0.5, oy: 0.5, depthBias: 0 } : null;
      }
      case Cell.Rock: {
        const name = pick(`rock|${v % 4}`);
        return name ? { frame: name, ox: 0.5, oy: 0.5, depthBias: 0 } : null;
      }
      case Cell.Wreck: {
        if (mat === Mat.TankWreck) return null; // the tank view keeps drawing the hulk
        // vari: 1/2 = first/second half of a horizontal pair, 3/4 vertical
        if (v === 2 || v === 4) return null;
        const along = v === 1;
        const kind = mat === Mat.Truck ? 'truck' : 'car';
        const name = pick(`${kind}|${along ? 'x' : 'y'}|${(x + y) % 3}`);
        return name ? { frame: name, ox: along ? 1 : 0.5, oy: along ? 0.5 : 1, depthBias: 0.5 } : null;
      }
      case Cell.Rubble: {
        const name = pick(`rubble|${mat}|${v % 3}`) ?? pick(`rubble|0|${v % 3}`);
        return name ? { frame: name, ox: 0.5, oy: 0.5, depthBias: -0.3 } : null;
      }
      default:
        return null;
    }
  }

  refreshCell(x: number, y: number) {
    const map = this.map;
    const i = map.idx(x, y);
    const old = this.sprites[i];
    if (old) {
      old.destroy();
      this.sprites[i] = null;
    }
    const f = this.frameFor(x, y);
    if (!f) return;
    const fr = this.atlas.frames.get(f.frame);
    if (!fr) return;
    const wx = x + f.ox;
    const wy = y + f.oy;
    const img = this.scene.add.image(isoX(wx, wy), isoY(wx, wy), fr.key, fr.frame);
    img.setScale(1 / STRUCT_RES);
    img.setDepth(depthOf(wx, wy) + f.depthBias);
    const b = map.bld[i];
    if (b >= 0 && (map.cells[i] === Cell.Wall || map.cells[i] === Cell.Window)) img.setTint(this.bTint.get(b) ?? 0xffffff);
    this.world.add(img);
    this.sprites[i] = img;
  }

  /** Apply cell changes reported by the simulation. */
  sync(changed: number[]) {
    const map = this.map;
    const touched = new Set<number>();
    for (const i of changed) {
      const x = i % map.w;
      const y = Math.floor(i / map.w);
      // neighbours too: barrier orientation & wreck pairs depend on them
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (map.inBounds(nx, ny)) touched.add(map.idx(nx, ny));
        }
    }
    for (const i of touched) this.refreshCell(i % map.w, Math.floor(i / map.w));
    for (const r of this.roofs) {
      if (!r.b.roof && r.img.visible) {
        this.scene.tweens.add({ targets: r.img, alpha: 0, y: r.img.y + 12, duration: 600, onComplete: () => r.img.setVisible(false) });
        r.img.setData('gone', true);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // roofs
  // ---------------------------------------------------------------------------

  private makeRoof(b: Building) {
    const map = this.map;
    const w = b.x1 - b.x0;
    const h = b.y1 - b.y0;
    const rng = new Rng(b.id * 997 + map.seed);
    const base = matColor(b.mat, map.biome);
    const roofCol = b.mat === Mat.Brick ? shade(base, 0.55) : b.mat === Mat.Wood ? [96, 70, 52] as [number, number, number] : shade(base, 0.82);
    const snow = map.biome === 'snow';
    const P: Prim[] = [];
    const cx = w / 2;
    const cy = h / 2;
    const z0 = WALL_H;
    if (b.mat === Mat.Wood) {
      // gable roof along the long axis
      const alongX = w >= h;
      const span = (alongX ? h : w) / 2 + 0.25;
      const len = (alongX ? w : h) / 2 + 0.25;
      const ang = 0.55;
      const slab = Math.hypot(span, 0) / Math.cos(ang) / 2;
      for (const side of [1, -1]) {
        P.push({
          kind: 'box',
          c: alongX ? [cx, cy + side * span * 0.5, z0 + Math.tan(ang) * span * 0.5] : [cx + side * span * 0.5, cy, z0 + Math.tan(ang) * span * 0.5],
          h: alongX ? [len, slab, 0.08] : [slab, len, 0.08],
          roll: alongX ? -side * ang : 0,
          pitch: alongX ? 0 : side * ang,
          color: snow ? [236, 241, 245] : roofCol,
          detail: (ctx, f) => {
            if (snow) return;
            ctx.strokeStyle = 'rgba(30,20,12,0.35)';
            ctx.lineWidth = 1;
            for (let k = 1; k < 8; k++) {
              const a = alongX ? f.map(0, k / 8) : f.map(k / 8, 0);
              const bb = alongX ? f.map(1, k / 8) : f.map(k / 8, 1);
              ctx.beginPath();
              ctx.moveTo(a[0], a[1]);
              ctx.lineTo(bb[0], bb[1]);
              ctx.stroke();
            }
          },
        });
      }
      P.push({ kind: 'box', c: [cx + 0.6, cy - 0.4, z0 + Math.tan(ang) * span * 0.7], h: [0.22, 0.22, 0.6], color: [80, 70, 64] });
    } else {
      P.push({
        kind: 'box',
        c: [cx, cy, z0 + 0.07],
        h: [w / 2, h / 2, 0.07],
        color: snow ? [232, 238, 243] : roofCol,
        detail: (ctx, f) => {
          if (f.index !== 4) return;
          ctx.fillStyle = 'rgba(0,0,0,0.06)';
          for (let k = 0; k < 6; k++) {
            const u = rng.range(0, 0.8);
            const v = rng.range(0, 0.8);
            const a = f.map(u, v);
            const c2 = f.map(u + 0.2, v + 0.15);
            ctx.beginPath();
            ctx.ellipse((a[0] + c2[0]) / 2, (a[1] + c2[1]) / 2, Math.abs(c2[0] - a[0]) / 2 + 2, Math.abs(c2[1] - a[1]) / 2 + 1, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        },
      });
      // parapet
      const pc = snow ? ([220, 226, 232] as [number, number, number]) : shade(base, 0.95);
      P.push({ kind: 'box', c: [cx, 0.08, z0 + 0.22], h: [w / 2, 0.08, 0.15], color: pc });
      P.push({ kind: 'box', c: [cx, h - 0.08, z0 + 0.22], h: [w / 2, 0.08, 0.15], color: pc });
      P.push({ kind: 'box', c: [0.08, cy, z0 + 0.22], h: [0.08, h / 2, 0.15], color: pc });
      P.push({ kind: 'box', c: [w - 0.08, cy, z0 + 0.22], h: [0.08, h / 2, 0.15], color: pc });
      // rooftop clutter
      const n = rng.int(1, 3);
      for (let k = 0; k < n; k++) {
        const px = rng.range(1.2, w - 1.2);
        const py = rng.range(1.2, h - 1.2);
        if (map.biome === 'urban' && rng.chance(0.5)) P.push({ kind: 'box', c: [px, py, z0 + 0.45], h: [0.45, 0.35, 0.3], color: [150, 150, 146] });
        else if (map.biome === 'desert' && rng.chance(0.5)) P.push({ kind: 'ell', c: [px, py, z0 + 0.55], h: [0.45, 0.45, 0.4], color: [70, 74, 80] });
        else P.push({ kind: 'box', c: [px, py, z0 + 0.35], h: [0.25, 0.25, 0.25], color: shade(roofCol, 0.8) });
      }
    }
    // render into a canvas sized to the footprint
    const res = STRUCT_RES;
    const W = Math.ceil((w + h) * 16 * res) + 16;
    const H = Math.ceil(((w + h) * 8 + 5 * 18) * res) + 16;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    // model origin = footprint corner (x0, y0); its screen x is h*16*res from the left edge
    const ox = h * 16 * res + 8;
    const oy = (5 * 18) * res + 8;
    renderModel(ctx, P, { yaw: 0, scale: res, ox, oy, ambient: 0.6 });
    const key = `roof_${b.id}_${map.seed}`;
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    this.scene.textures.addCanvas(key, canvas);
    const img = this.scene.add.image(isoX(b.x0, b.y0), isoY(b.x0, b.y0), key);
    img.setOrigin(ox / W, oy / H);
    img.setScale(1 / res);
    img.setDepth(depthOf(b.x1, b.y1) - 1.02);
    this.world.add(img);
    this.roofs.push({ b, img, key, alpha: 1 });
  }

  /** Fade roofs over occupied buildings or the one under the cursor / selected unit. */
  updateRoofs(dt: number, focusBuilding: number, showRoofs: boolean) {
    for (const r of this.roofs) {
      if (r.img.getData('gone')) continue;
      const target = !showRoofs || r.b.occupants > 0 || r.b.id === focusBuilding ? 0.12 : 1;
      r.alpha += (target - r.alpha) * Math.min(1, dt * 6);
      r.img.setAlpha(r.alpha);
    }
  }

  /** Make tall cells in front of a point translucent (keeps the selected unit visible). */
  fadeOccluders(x: number, y: number, on: boolean) {
    for (const i of this.faded) {
      const s = this.sprites[i];
      if (s) s.setAlpha(1);
    }
    this.faded.clear();
    if (!on) return;
    const map = this.map;
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    for (let dy = 0; dy <= 3; dy++)
      for (let dx = 0; dx <= 3; dx++) {
        if (dx + dy === 0 || dx + dy > 4) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (!map.inBounds(nx, ny)) continue;
        const k = map.kind(nx, ny);
        if (k !== Cell.Wall && k !== Cell.Window && k !== Cell.Tree && k !== Cell.Rock) continue;
        const i = map.idx(nx, ny);
        const s = this.sprites[i];
        if (s) {
          s.setAlpha(0.35);
          this.faded.add(i);
        }
      }
  }

  destroy() {
    for (const s of this.sprites) s?.destroy();
    for (const r of this.roofs) {
      r.img.destroy();
      if (this.scene.textures.exists(r.key)) this.scene.textures.remove(r.key);
    }
  }
}
