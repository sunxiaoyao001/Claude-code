import { pointSegDist, rayCircle, rayOBB } from '../../core/math';
import { traverse } from '../nav/los';
import type { WeaponDef } from '../config';
import type { Agent, Soldier, Tank } from '../entities';
import type { HitKind } from '../events';
import { Cell, CELL_INFO, Mat } from '../map/GameMap';
import type { Simulation } from '../Simulation';
import { damageSoldier } from './damage';
import { damageCell } from './explosives';

interface Candidate {
  t: number;
  a: Agent;
}
const cands: Candidate[] = [];

function stanceRadius(s: Soldier, isTarget: boolean) {
  if (s.state === 'downed') return isTarget ? 0.24 : 0.12;
  if (s.stance === 'prone') return isTarget ? 0.22 : 0.14;
  if (s.stance === 'crouch') return 0.27;
  return 0.31;
}

/** Chance a structure cell stops a bullet, given where it sits between shooter and target. */
function blockChance(kind: Cell, fromShooter: number, toTarget: number, target: Agent | null): number {
  const lowStance = target && target.kind === 'soldier' && (target.stance !== 'stand' || target.state === 'downed');
  switch (kind) {
    case Cell.Wall:
    case Cell.Rock:
    case Cell.Wreck:
      return 1;
    case Cell.Window:
      if (fromShooter < 1.5) return 0.12;
      return toTarget < 1.9 ? (lowStance ? 0.85 : 0.6) : 0.45;
    case Cell.Low:
      if (fromShooter < 1.5) return 0.04;
      return toTarget < 1.9 ? (lowStance ? 0.9 : 0.72) : 0.28;
    case Cell.Tree:
      return 0.35;
    case Cell.Rubble:
      if (fromShooter < 1.5) return 0;
      return toTarget < 1.6 ? (lowStance ? 0.5 : 0.2) : 0.04;
    default:
      return 0;
  }
}

/**
 * Hitscan bullet with spread. Resolves, in order along the ray, structure cells
 * (probabilistic cover blocking) and agents (tanks always stop rounds).
 */
export function fireBullet(
  sim: Simulation,
  shooter: Agent,
  ox: number,
  oy: number,
  oz: number,
  target: Agent,
  weapon: WeaponDef,
  sigma: number,
): void {
  const map = sim.map;
  const rng = sim.rng;
  const tz = target.kind === 'tank' ? 1.2 : target.kind === 'soldier' && target.stance !== 'stand' ? 0.6 : 1.25;
  const base = Math.atan2(target.y - oy, target.x - ox);
  const ang = base + rng.gauss() * sigma;
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const maxT = weapon.range * 1.15;
  const distToTarget = Math.hypot(target.x - ox, target.y - oy);

  cands.length = 0;
  for (const a of sim.liveAgents) {
    if (a === shooter) continue;
    let t = -1;
    if (a.kind === 'soldier') {
      if (a.team === shooter.team || a.state === 'dead') continue;
      t = rayCircle(ox, oy, dx, dy, maxT, a.x, a.y, stanceRadius(a, a === target));
    } else {
      if (a.state === 'dead') continue;
      t = rayOBB(ox, oy, dx, dy, maxT, a.x, a.y, a.length / 2, a.width / 2, a.angle);
      // friendly tanks: only block when actually in the way (not when firing from beside it)
      if (a.team === shooter.team && t < 0.6) t = -1;
    }
    if (t >= 0) cands.push({ t, a });
  }
  cands.sort((p, q) => p.t - q.t);

  let endT = maxT;
  let hit = 'ground' as HitKind;
  let hitAgent: Agent | null = null;
  let ci = 0;
  const sx = Math.floor(ox);
  const sy = Math.floor(oy);
  let hitCellX = -1;
  let hitCellY = -1;
  let stopped = false;
  traverse(ox, oy, ox + dx * maxT, oy + dy * maxT, (cx, cy, tIn) => {
    if (ci < cands.length && cands[ci].t <= tIn) {
      endT = cands[ci].t;
      hitAgent = cands[ci].a;
      stopped = true;
      return true;
    }
    if (cx === sx && cy === sy) return false;
    if (cx < 0 || cy < 0 || cx >= map.w || cy >= map.h) {
      endT = tIn;
      stopped = true;
      return true;
    }
    const k = map.cells[cy * map.w + cx] as Cell;
    if (k === Cell.Empty) return false;
    const toTarget = Math.hypot(cx + 0.5 - target.x, cy + 0.5 - target.y);
    // bullets aimed past the target's distance only interact with tall things
    if (tIn > distToTarget + 1 && CELL_INFO[k].height < 1.2) return false;
    if (rng.next() < blockChance(k, tIn, toTarget, target)) {
      endT = tIn;
      hit = k === Cell.Tree ? 'tree' : k === Cell.Low || k === Cell.Rubble || k === Cell.Window ? 'cover' : 'wall';
      hitCellX = cx;
      hitCellY = cy;
      stopped = true;
      return true;
    }
    return false;
  });
  if (!stopped && ci < cands.length && cands[ci].t <= maxT) {
    endT = cands[ci].t;
    hitAgent = cands[ci].a;
  }

  const ex = ox + dx * endT;
  const ey = oy + dy * endT;
  const now = sim.time;
  shooter.stats.shots++;
  sim.teams[shooter.team].stats.shots++;
  let ez = tz;
  const victim = hitAgent as Agent | null;
  if (victim) {
    if (victim.kind === 'soldier') {
      hit = 'unit';
      const falloff = 1 - (1 - weapon.falloff) * Math.min(1, endT / weapon.range);
      let dmg = weapon.damage * falloff * rng.range(0.85, 1.15);
      if (rng.chance(weapon.headshot)) dmg *= 2.2;
      shooter.stats.hits++;
      sim.teams[shooter.team].stats.hits++;
      ez = victim.stance === 'stand' ? 1.2 : 0.5;
      sim.emit({ type: 'impact', x: ex, y: ey, z: ez, kind: 'blood', dir: ang });
      damageSoldier(sim, victim, dmg, shooter, weapon.id, 'bullet');
    } else {
      hit = 'tank';
      ez = 1.2;
      sim.emit({ type: 'impact', x: ex, y: ey, z: ez, kind: 'spark', dir: ang });
      sim.reveal(victim, shooter, false);
    }
  } else if (hit === 'wall' || hit === 'cover' || hit === 'tree') {
    const mat = map.mat[hitCellY * map.w + hitCellX] as Mat;
    const kind =
      mat === Mat.Wood || mat === Mat.Crate || mat === Mat.Logs || mat === Mat.Pine || mat === Mat.Palm || mat === Mat.DeadTree
        ? 'wood'
        : mat === Mat.Car || mat === Mat.Truck || mat === Mat.TankWreck || mat === Mat.Barrel || mat === Mat.Barrier
          ? 'spark'
          : map.biome === 'snow' && mat === Mat.Rock
            ? 'snow'
            : 'stone';
    ez = Math.min(CELL_INFO[map.kind(hitCellX, hitCellY)].height, 1.3) * rng.range(0.4, 1);
    sim.emit({ type: 'impact', x: ex, y: ey, z: ez, kind, dir: ang });
    damageCell(sim, hitCellX, hitCellY, weapon.damage * 0.18, 'shot');
  } else {
    ez = 0;
    if (endT < maxT - 0.5) sim.emit({ type: 'impact', x: ex, y: ey, z: 0, kind: map.biome === 'snow' ? 'snow' : 'dust', dir: ang });
  }
  sim.emit({ type: 'shot', shooter: shooter.id, team: shooter.team, weapon: weapon.id, x0: ox, y0: oy, z0: oz, x1: ex, y1: ey, z1: ez, hit });

  // near-miss suppression on enemies along the path
  for (const s of sim.soldiers) {
    if (s.team === shooter.team || !s.active || s === victim) continue;
    const d = pointSegDist(s.x, s.y, ox, oy, ex, ey);
    if (d < 1.7) {
      const add = weapon.suppression * (1 - d / 1.7) * (s.stance === 'prone' ? 0.6 : 1);
      s.suppression = Math.min(1, s.suppression + add);
      sim.reveal(s, shooter, false);
    }
  }
  // the report is heard around the shooter
  if (now - (shooter.kind === 'soldier' ? shooter.lastShotAt : -10) > 0.6) {
    sim.broadcastGunfire(shooter, weapon.sound);
    if (shooter.kind === 'soldier') shooter.lastShotAt = now;
  }
}

/** Effective spread for a soldier taking a shot this tick. */
export function soldierSpread(s: Soldier, moving: boolean, target: Agent): number {
  let sigma = s.weapon.spread * s.skillDef.spreadMul;
  if (moving) sigma *= s.weapon.id === 'sniper' ? 3 : 1.7;
  sigma *= 1 + s.suppression * 1.8;
  if (s.stance === 'crouch') sigma *= 0.86;
  else if (s.stance === 'prone') sigma *= 0.74;
  if (s.state === 'wounded') sigma *= 1.2;
  if (s.aimT < s.skillDef.aimTime * 2) sigma *= 1.35;
  if (target.kind === 'soldier' && Math.hypot(target.vx, target.vy) > 2.5) sigma *= 1.3;
  return sigma;
}

export function tankCoaxOrigin(t: Tank) {
  return { x: t.x + Math.cos(t.turret) * 1.6, y: t.y + Math.sin(t.turret) * 1.6, z: 1.9 };
}
