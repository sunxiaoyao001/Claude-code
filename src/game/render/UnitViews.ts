import Phaser from 'phaser';
import { lerp, lerpAngle } from '../core/math';
import type { Soldier, Tank } from '../sim/entities';
import { Cell, type GameMap } from '../sim/map/GameMap';
import { depthOf, dirIndex, isoX, isoY } from './iso';
import { TEAM } from './palette';
import { SOLDIER_RES, soldierDirs, soldierFrameName, TANK_DIRS, TANK_RES, type UnitAtlases } from './textures/spriteFactory';
import type { SoldierPose } from './textures/soldierModel';

const TALL = new Set<Cell>([Cell.Wall, Cell.Window, Cell.Tree, Cell.Rock, Cell.Wreck]);

export interface Layers {
  decal: Phaser.GameObjects.Layer;
  world: Phaser.GameObjects.Layer;
  overlay: Phaser.GameObjects.Layer;
}

/** Where the soldier is drawn this frame (interpolated). Shared with overlays and FX. */
export interface RenderPos {
  x: number;
  y: number;
  sx: number;
  sy: number;
  facing: number;
  visible: boolean;
}

export class SoldierView {
  readonly shadow: Phaser.GameObjects.Image;
  readonly ring: Phaser.GameObjects.Image;
  readonly body: Phaser.GameObjects.Image;
  readonly ghost: Phaser.GameObjects.Image;
  readonly pos: RenderPos = { x: 0, y: 0, sx: 0, sy: 0, facing: 0, visible: true };
  private frameKey = '';
  private deathT = -1;

  constructor(
    scene: Phaser.Scene,
    readonly s: Soldier,
    private atlases: UnitAtlases,
    layers: Layers,
  ) {
    const team = TEAM[s.team];
    this.shadow = scene.add.image(0, 0, 'fx_shadow').setScale(0.42, 0.42).setAlpha(0.8);
    this.ring = scene.add.image(0, 0, 'fx_teamring').setScale(0.36).setTint(team.accentInt).setAlpha(0.75);
    this.body = scene.add.image(0, 0, '__DEFAULT').setScale(1 / SOLDIER_RES);
    this.ghost = scene.add.image(0, 0, '__DEFAULT').setScale(1 / SOLDIER_RES).setTintFill(team.accentInt).setAlpha(0.32).setVisible(false);
    layers.decal.add([this.shadow, this.ring]);
    layers.world.add(this.body);
    layers.overlay.add(this.ghost);
  }

  private pose(s: Soldier, now: number): SoldierPose {
    if (s.state === 'dead') return 'dead';
    if (s.state === 'downed') return 'downed';
    if (s.busyKind && s.busyUntil > now) {
      if (s.busyKind === 'throw') return 'throw';
      if (s.busyKind === 'rocket') return s.role === 'at' ? 'rocket' : 'crouch';
      return 'kneel';
    }
    if (s.anim === 'walk' || s.anim === 'run') {
      const f = Math.floor(s.phase / (Math.PI / 2)) % 4;
      return `walk${f}` as SoldierPose;
    }
    if (s.stance === 'prone') return 'prone';
    if (s.stance === 'crouch') return 'crouch';
    return s.anim === 'aim' ? 'aim' : 'idle';
  }

  update(alpha: number, now: number, map: GameMap, wantGhost: boolean) {
    const s = this.s;
    const x = lerp(s.px, s.x, alpha);
    const y = lerp(s.py, s.y, alpha);
    const facing = lerpAngle(s.pfacing, s.facing, alpha);
    const sx = isoX(x, y);
    const sy = isoY(x, y);
    this.pos.x = x;
    this.pos.y = y;
    this.pos.sx = sx;
    this.pos.sy = sy;
    this.pos.facing = facing;
    const pose = this.pose(s, now);
    const dir = dirIndex(facing, soldierDirs(pose));
    const key = soldierFrameName(s.team, s.role, pose, dir);
    if (key !== this.frameKey) {
      const f = this.atlases.soldiers.get(key);
      if (f) {
        this.body.setTexture(f.key, f.frame);
        this.ghost.setTexture(f.key, f.frame);
        this.frameKey = key;
      }
    }
    this.body.setPosition(sx, sy);
    const d = depthOf(x, y);
    this.body.setDepth(d + 0.05);
    this.shadow.setPosition(sx, sy + 1);
    this.ring.setPosition(sx, sy + 1);
    // dead bodies fade out slowly into the ground after a while
    if (s.state === 'dead') {
      if (this.deathT < 0) this.deathT = now;
      this.ring.setVisible(false);
      const age = now - s.diedAt;
      this.body.setAlpha(age > 90 ? Math.max(0.35, 1 - (age - 90) / 60) : 1);
      this.shadow.setVisible(false);
      this.ghost.setVisible(false);
      return;
    }
    this.ring.setVisible(true).setAlpha(s.state === 'downed' ? 0.35 : 0.75);
    this.shadow.setVisible(s.state !== 'downed');
    // x-ray silhouette when something tall stands between the unit and the camera
    let occluded = false;
    if (wantGhost) {
      const cx = Math.floor(x);
      const cy = Math.floor(y);
      for (let dy = 0; dy <= 2 && !occluded; dy++)
        for (let dx = 0; dx <= 2; dx++) {
          if (dx + dy === 0) continue;
          if (TALL.has(map.kind(cx + dx, cy + dy))) {
            occluded = true;
            break;
          }
        }
      if (!occluded && s.indoor >= 0) {
        const b = map.buildings[s.indoor];
        occluded = !!b && b.roof && b.occupants > 0;
      }
    }
    this.ghost.setVisible(occluded);
    if (occluded) this.ghost.setPosition(sx, sy);
  }

  destroy() {
    this.shadow.destroy();
    this.ring.destroy();
    this.body.destroy();
    this.ghost.destroy();
  }
}

export class TankView {
  readonly shadow: Phaser.GameObjects.Image;
  readonly hull: Phaser.GameObjects.Image;
  readonly turret: Phaser.GameObjects.Image;
  readonly ring: Phaser.GameObjects.Image;
  readonly pos: RenderPos = { x: 0, y: 0, sx: 0, sy: 0, facing: 0, visible: true };
  turretAngle = 0;
  private hullKey = '';
  private turretKey = '';

  constructor(
    scene: Phaser.Scene,
    readonly t: Tank,
    private atlases: UnitAtlases,
    layers: Layers,
  ) {
    this.shadow = scene.add.image(0, 0, 'fx_shadow').setScale(2.6, 2.4).setAlpha(0.9);
    this.ring = scene.add.image(0, 0, 'fx_teamring').setScale(1.9).setTint(TEAM[t.team].accentInt).setAlpha(0.6);
    this.hull = scene.add.image(0, 0, '__DEFAULT').setScale(1 / TANK_RES);
    this.turret = scene.add.image(0, 0, '__DEFAULT').setScale(1 / TANK_RES);
    layers.decal.add([this.shadow, this.ring]);
    layers.world.add([this.hull, this.turret]);
  }

  update(alpha: number, now: number) {
    const t = this.t;
    const x = lerp(t.px, t.x, alpha);
    const y = lerp(t.py, t.y, alpha);
    const ang = lerpAngle(t.pangle, t.angle, alpha);
    const tur = lerpAngle(t.pturret, t.turret, alpha);
    this.turretAngle = tur;
    const sx = isoX(x, y);
    const sy = isoY(x, y);
    this.pos.x = x;
    this.pos.y = y;
    this.pos.sx = sx;
    this.pos.sy = sy;
    this.pos.facing = ang;
    const wreck = t.state === 'dead';
    const team = wreck ? 'w' : t.team;
    const hk = `${team}|hull|${dirIndex(ang, TANK_DIRS)}`;
    const tk = `${team}|turret|${dirIndex(tur, TANK_DIRS)}`;
    if (hk !== this.hullKey) {
      const f = this.atlases.tanks.get(hk);
      if (f) this.hull.setTexture(f.key, f.frame);
      this.hullKey = hk;
    }
    if (tk !== this.turretKey) {
      const f = this.atlases.tanks.get(tk);
      if (f) this.turret.setTexture(f.key, f.frame);
      this.turretKey = tk;
    }
    // recoil: turret slides back briefly after firing
    const rec = Math.max(0, 1 - (now - t.recoilAt) / 0.35);
    const rx = -Math.cos(tur) * rec * 0.35;
    const ry = -Math.sin(tur) * rec * 0.35;
    const d = depthOf(x, y);
    this.hull.setPosition(sx, sy).setDepth(d);
    this.turret.setPosition(isoX(x + rx, y + ry), isoY(x + rx, y + ry)).setDepth(d + 0.02);
    this.shadow.setPosition(isoX(x + 0.35, y - 0.6), isoY(x + 0.35, y - 0.6));
    this.ring.setPosition(sx, sy).setVisible(!wreck);
    if (wreck) {
      this.hull.setTint(0x8a8580);
      this.turret.setTint(0x8a8580);
    }
  }

  destroy() {
    this.shadow.destroy();
    this.hull.destroy();
    this.turret.destroy();
    this.ring.destroy();
  }
}
