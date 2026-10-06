import { rayCircle, rayOBB } from '../../core/math';
import { blastClear, traverse } from '../nav/los';
import { GRENADE, ROCKET, SMOKE, TANK } from '../config';
import type { Agent, Grenade, Projectile, Soldier, Tank } from '../entities';
import { Cell, CELL_INFO, Mat } from '../map/GameMap';
import { PHYS } from '../PhysicsWorld';
import type { Simulation } from '../Simulation';
import { armourFactor, damageSoldier, damageTank } from './damage';

// -----------------------------------------------------------------------------
// Structures
// -----------------------------------------------------------------------------

export function damageCell(sim: Simulation, x: number, y: number, dmg: number, cause: 'blast' | 'crush' | 'shot') {
  const map = sim.map;
  if (!map.inBounds(x, y)) return;
  const i = map.idx(x, y);
  const k = map.cells[i] as Cell;
  if (k === Cell.Empty || k === Cell.Rubble || k === Cell.Rock || k === Cell.Wreck) return;
  map.hp[i] -= dmg;
  if (map.hp[i] <= 0) destroyCell(sim, x, y, cause);
}

export function destroyCell(sim: Simulation, x: number, y: number, cause: 'blast' | 'crush' | 'shot') {
  const map = sim.map;
  const i = map.idx(x, y);
  const k = map.cells[i] as Cell;
  const mat = map.mat[i] as Mat;
  const b = map.bld[i];
  let next = Cell.Rubble;
  if (k === Cell.Tree || mat === Mat.Crate || mat === Mat.Barrel) next = Cell.Empty;
  map.set(x, y, next, Mat.None);
  sim.structureChanged(x, y);
  sim.emit({ type: 'cellDestroyed', x, y, cell: k, mat, cause });
  sim.structuresDestroyed++;
  // debris chunks
  if (k === Cell.Wall || k === Cell.Window || k === Cell.Low) {
    const n = k === Cell.Low ? 1 : sim.rng.int(2, 3);
    for (let j = 0; j < n; j++) sim.spawnDebris(x + 0.5, y + 0.5, mat, cause === 'crush' ? 2 : 5);
  }
  if (mat === Mat.Barrel) explode(sim, x + 0.5, y + 0.5, { radius: 4, damage: 70, tankDamage: 60, wallDamage: 120, owner: null, team: -1, kind: 'barrel', weapon: 'barrel' });
  if (b >= 0 && (k === Cell.Wall || k === Cell.Window)) {
    const bd = map.buildings[b];
    if (bd) {
      bd.destroyedCells++;
      if (bd.roof && bd.wallCells > 0 && bd.destroyedCells / bd.wallCells > 0.3) collapseRoof(sim, b);
    }
  }
}

function collapseRoof(sim: Simulation, id: number) {
  const map = sim.map;
  const b = map.buildings[id];
  b.roof = false;
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  sim.emit({ type: 'collapse', building: id, x: cx, y: cy });
  sim.pushFeed('collapse', -1, 'feed.collapse', {}, cx, cy, -1);
  for (let y = b.y0 + 1; y < b.y1 - 1; y++)
    for (let x = b.x0 + 1; x < b.x1 - 1; x++) {
      if (map.kind(x, y) === Cell.Empty && sim.rng.chance(0.22)) {
        map.set(x, y, Cell.Rubble, Mat.None, id);
        sim.structureChanged(x, y);
      }
    }
  for (const s of sim.soldiers) {
    if (s.state === 'dead' || s.indoor !== id) continue;
    damageSoldier(sim, s, sim.rng.range(15, 55), null, 'collapse', 'collapse');
  }
}

// -----------------------------------------------------------------------------
// Explosions
// -----------------------------------------------------------------------------

export interface BlastSpec {
  radius: number;
  damage: number;
  tankDamage: number;
  wallDamage: number;
  owner: Agent | null;
  team: number;
  kind: 'grenade' | 'rocket' | 'shell' | 'tank' | 'barrel';
  weapon: string;
}

export function explode(sim: Simulation, x: number, y: number, spec: BlastSpec) {
  sim.emit({ type: 'explosion', x, y, r: spec.radius, kind: spec.kind });
  const map = sim.map;
  // soldiers
  for (const s of sim.soldiers) {
    if (s.state === 'dead') continue;
    const d = Math.hypot(s.x - x, s.y - y);
    if (d > spec.radius) continue;
    if (!blastClear(map, x, y, s.x, s.y)) {
      s.suppression = Math.min(1, s.suppression + 0.25);
      continue;
    }
    const f = 1 - d / spec.radius;
    let dmg = spec.damage * Math.pow(f, 1.25);
    if (s.stance === 'prone' || s.state === 'downed') dmg *= 0.55;
    else if (s.stance === 'crouch') dmg *= 0.85;
    if (d < GRENADE.lethal * (spec.radius / GRENADE.radius)) dmg = Math.max(dmg, spec.damage * 0.8);
    damageSoldier(sim, s, dmg, spec.owner, spec.weapon, 'blast');
    s.suppression = Math.min(1, s.suppression + 0.35 + 0.5 * f);
    if (s.body) {
      const len = d || 0.01;
      sim.physics.kick(s.body, ((s.x - x) / len) * 4 * f, ((s.y - y) / len) * 4 * f);
    }
  }
  // nearby but outside radius: suppression only
  for (const s of sim.soldiers) {
    if (!s.active) continue;
    const d = Math.hypot(s.x - x, s.y - y);
    if (d > spec.radius && d < spec.radius * 2.4) s.suppression = Math.min(1, s.suppression + 0.25 * (1 - d / (spec.radius * 2.4)));
  }
  // tanks (splash only; direct hits are applied by the projectile)
  for (const t of sim.tanks) {
    if (t.state === 'dead') continue;
    const d = Math.max(0, Math.hypot(t.x - x, t.y - y) - 2);
    if (d > spec.radius) continue;
    damageTank(sim, t, spec.tankDamage * (1 - d / spec.radius) * 0.35, spec.owner, spec.weapon);
  }
  // structures
  const wr = Math.max(1.2, spec.radius * 0.55);
  for (let cy = Math.floor(y - wr); cy <= Math.floor(y + wr); cy++)
    for (let cx = Math.floor(x - wr); cx <= Math.floor(x + wr); cx++) {
      const d = Math.hypot(cx + 0.5 - x, cy + 0.5 - y);
      if (d > wr) continue;
      damageCell(sim, cx, cy, spec.wallDamage * (1 - (d / wr) * 0.7), 'blast');
    }
  // shockwave on loose bodies
  for (const deb of sim.debris) {
    if (!deb.body) continue;
    const d = Math.hypot(deb.x - x, deb.y - y);
    if (d > spec.radius * 1.6 || d < 0.01) continue;
    const f = 1 - d / (spec.radius * 1.6);
    sim.physics.kick(deb.body, ((deb.x - x) / d) * 9 * f, ((deb.y - y) / d) * 9 * f);
    deb.vz = Math.max(deb.vz, 4 * f);
  }
  for (const g of sim.grenades) {
    if (!g.body || g.heldBy >= 0) continue;
    const d = Math.hypot(g.x - x, g.y - y);
    if (d > spec.radius * 1.4 || d < 0.01) continue;
    const f = 1 - d / (spec.radius * 1.4);
    sim.physics.kick(g.body, ((g.x - x) / d) * 6 * f, ((g.y - y) / d) * 6 * f);
  }
  // chunks of dirt
  if (spec.kind !== 'grenade' || sim.rng.chance(0.5)) {
    for (let j = 0; j < (spec.kind === 'shell' || spec.kind === 'tank' ? 3 : 1); j++) sim.spawnDebris(x, y, Mat.Rock, 7, true);
  }
}

// -----------------------------------------------------------------------------
// Grenades
// -----------------------------------------------------------------------------

/** Ballistic lob from the soldier toward (tx, ty). */
export function throwGrenade(sim: Simulation, s: Soldier, kind: 'frag' | 'smoke', tx: number, ty: number, existing?: Grenade): Grenade {
  const rng = sim.rng;
  let dx = tx - s.x;
  let dy = ty - s.y;
  let dist = Math.hypot(dx, dy);
  const scatter = s.skillDef.grenadeScatter * Math.min(1.4, dist / 18 + 0.3);
  tx += rng.gauss() * scatter;
  ty += rng.gauss() * scatter;
  dx = tx - s.x;
  dy = ty - s.y;
  dist = Math.max(2, Math.min(GRENADE.maxThrow, Math.hypot(dx, dy)));
  const ang = Math.atan2(dy, dx);
  // aim a little short: the grenade rolls after landing
  const flight = dist * (kind === 'frag' ? 0.86 : 0.92);
  const T = 0.5 + flight / 15;
  const vh = flight / T;
  const z0 = 1.6;
  const vz = (0.5 * GRENADE.gravity * T * T - z0) / T;
  const sx = s.x + Math.cos(ang) * 0.35;
  const sy = s.y + Math.sin(ang) * 0.35;
  let g: Grenade;
  if (existing) {
    g = existing;
    g.heldBy = -1;
    g.claimedBy = -1;
    g.landed = false;
    g.x = g.px = sx;
    g.y = g.py = sy;
    g.z = g.pz = z0;
    g.vz = vz;
    g.team = s.team;
    g.returnedBy = s.id;
    g.noticed.clear();
    if (!g.body) g.body = sim.physics.addGrenade(sx, sy);
    else sim.physics.setPosition(g.body, sx, sy);
  } else {
    g = {
      id: sim.newId(),
      kind,
      team: s.team,
      owner: s.id,
      x: sx,
      y: sy,
      z: z0,
      px: sx,
      py: sy,
      pz: z0,
      vz,
      body: sim.physics.addGrenade(sx, sy),
      fuse: kind === 'frag' ? GRENADE.fuse : GRENADE.smokeFuse + T,
      landed: false,
      heldBy: -1,
      claimedBy: -1,
      returnedBy: -1,
      noticed: new Map(),
      spin: rng.range(-12, 12),
    };
    sim.grenades.push(g);
  }
  if (g.body) sim.physics.setVelocity(g.body, Math.cos(ang) * vh, Math.sin(ang) * vh);
  sim.emit({ type: 'throw', id: s.id, kind, x: s.x, y: s.y, tx, ty, back: !!existing });
  return g;
}

export function updateGrenades(sim: Simulation, dt: number) {
  const list = sim.grenades;
  for (let i = list.length - 1; i >= 0; i--) {
    const g = list[i];
    g.px = g.x;
    g.py = g.y;
    g.pz = g.z;
    g.fuse -= dt;
    if (g.heldBy >= 0) {
      const h = sim.get(g.heldBy) as Soldier | undefined;
      if (!h || !h.active) {
        g.heldBy = -1;
        g.landed = true;
        if (h) {
          g.x = h.x;
          g.y = h.y;
        }
        g.z = 0;
        if (!g.body) g.body = sim.physics.addGrenade(g.x, g.y);
      } else {
        g.x = h.x + Math.cos(h.facing) * 0.3;
        g.y = h.y + Math.sin(h.facing) * 0.3;
        g.z = 1.1;
      }
    } else if (g.body) {
      if (!g.landed) {
        g.vz -= GRENADE.gravity * dt;
        g.z += g.vz * dt;
        if (g.z <= 0) {
          g.z = 0;
          if (g.vz < -2.2) {
            g.vz = -g.vz * 0.3;
            const v = sim.physics.getVelocity(g.body);
            sim.physics.setVelocity(g.body, v.x * 0.62, v.y * 0.62);
          } else {
            g.vz = 0;
            g.landed = true;
          }
        }
        sim.physics.setGrenadeLow(g.body, g.z < 1.0);
      } else {
        const v = sim.physics.getVelocity(g.body);
        const k = Math.max(0, 1 - 3.2 * dt);
        sim.physics.setVelocity(g.body, v.x * k, v.y * k);
      }
      g.x = g.body.position.x / PHYS;
      g.y = g.body.position.y / PHYS;
    }
    if (g.fuse <= 0) {
      if (g.body) sim.physics.remove(g.body);
      g.body = null;
      list.splice(i, 1);
      if (g.kind === 'frag') {
        const owner = sim.get(g.returnedBy >= 0 ? g.returnedBy : g.owner) ?? null;
        const dodgers = sim.soldiers.filter((s) => s.bb.dodging === g.id);
        explode(sim, g.x, g.y, {
          radius: GRENADE.radius,
          damage: GRENADE.damage,
          tankDamage: 60,
          wallDamage: 160,
          owner,
          team: g.team,
          kind: 'grenade',
          weapon: g.returnedBy >= 0 ? 'grenade_back' : 'grenade',
        });
        for (const s of dodgers) {
          s.bb.dodging = -1;
          if (!s.active) continue;
          s.stats.dodges++;
          sim.teams[s.team].stats.dodges++;
          if (sim.rng.chance(0.4)) sim.tactic('dodge', s);
        }
      } else {
        sim.addSmoke(g.x, g.y, g.team);
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Rockets & tank shells
// -----------------------------------------------------------------------------

export function launchProjectile(
  sim: Simulation,
  owner: Agent,
  kind: 'rocket' | 'shell',
  ox: number,
  oy: number,
  oz: number,
  tx: number,
  ty: number,
  tz: number,
  sigma: number,
  targetId: number,
): Projectile {
  const ang = Math.atan2(ty - oy, tx - ox) + sim.rng.gauss() * sigma;
  const dist = Math.max(1, Math.hypot(tx - ox, ty - oy));
  const p: Projectile = {
    id: sim.newId(),
    kind,
    team: owner.team,
    owner: owner.id,
    x: ox,
    y: oy,
    z: oz,
    px: ox,
    py: oy,
    pz: oz,
    dx: Math.cos(ang),
    dy: Math.sin(ang),
    speed: kind === 'rocket' ? ROCKET.speed : TANK.shellSpeed,
    travelled: 0,
    maxRange: kind === 'rocket' ? ROCKET.range : TANK.cannonRange * 1.2,
    slope: (tz - oz) / dist + sim.rng.gauss() * sigma * 0.3,
    targetId,
  };
  sim.projectiles.push(p);
  sim.emit({ type: 'launch', kind, owner: owner.id, x: ox, y: oy, angle: ang });
  return p;
}

/** Does a structure cell stop a rocket/shell flying at height z? (windows are open between sill and lintel) */
export function blocksProjectile(k: Cell, z: number): boolean {
  if (k === Cell.Empty) return false;
  if (k === Cell.Window) return z < 0.9 || z > 2.1;
  if (k === Cell.Rubble) return z < 0.35;
  return z < CELL_INFO[k].height;
}

/** True if nothing solid sits along the first `dist` metres of the firing line. */
export function laneClear(sim: Simulation, x0: number, y0: number, x1: number, y1: number, z: number, dist: number): boolean {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 0.01) return true;
  const ex = x0 + ((x1 - x0) / len) * Math.min(dist, len);
  const ey = y0 + ((y1 - y0) / len) * Math.min(dist, len);
  const sx = Math.floor(x0);
  const sy = Math.floor(y0);
  let clear = true;
  traverse(x0, y0, ex, ey, (cx, cy) => {
    if (cx === sx && cy === sy) return false;
    if (blocksProjectile(sim.map.kind(cx, cy), z)) {
      clear = false;
      return true;
    }
    return false;
  });
  return clear;
}

function detonate(sim: Simulation, p: Projectile, x: number, y: number, direct: Agent | null) {
  const owner = sim.get(p.owner) ?? null;
  const rocket = p.kind === 'rocket';
  if (direct && direct.kind === 'tank') {
    const base = rocket ? ROCKET.vsTank : TANK.shellVsTank;
    damageTank(sim, direct as Tank, base * armourFactor(direct as Tank, x - p.dx * 3, y - p.dy * 3), owner, p.kind);
  }
  explode(sim, x, y, {
    radius: rocket ? ROCKET.radius : TANK.shellRadius,
    damage: rocket ? ROCKET.damage : TANK.shellDamage,
    tankDamage: rocket ? 120 : 140,
    wallDamage: rocket ? ROCKET.vsWall : TANK.shellVsWall,
    owner,
    team: p.team,
    kind: p.kind,
    weapon: p.kind,
  });
}

export function updateProjectiles(sim: Simulation, dt: number) {
  const map = sim.map;
  const list = sim.projectiles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.px = p.x;
    p.py = p.y;
    p.pz = p.z;
    const step = p.speed * dt;
    const ex = p.x + p.dx * step;
    const ey = p.y + p.dy * step;
    // first agent along the segment
    let bestT = Infinity;
    let bestA: Agent | null = null;
    for (const a of sim.liveAgents) {
      if (a.id === p.owner) continue;
      let t = -1;
      if (a.kind === 'tank') {
        if (p.z > 2.6) continue;
        t = rayOBB(p.x, p.y, p.dx, p.dy, step, a.x, a.y, a.length / 2, a.width / 2, a.angle);
        if (a.team === p.team && p.travelled < 3) t = -1;
      } else {
        if (a.team === p.team || p.z > 2.0 || a.state === 'dead') continue;
        t = rayCircle(p.x, p.y, p.dx, p.dy, step, a.x, a.y, a.state === 'downed' ? 0.2 : 0.38);
      }
      if (t >= 0 && t < bestT) {
        bestT = t;
        bestA = a;
      }
    }
    // structures along the segment
    let wallT = Infinity;
    const sx = Math.floor(p.x);
    const sy = Math.floor(p.y);
    traverse(p.x, p.y, ex, ey, (cx, cy, tIn) => {
      if (cx === sx && cy === sy && p.travelled > 0.5) return false;
      if (p.travelled < 1.2 && Math.hypot(cx + 0.5 - p.x, cy + 0.5 - p.y) < 1.2) return false;
      const k = map.kind(cx, cy);
      if (k === Cell.Empty) return false;
      const zHere = p.z + p.slope * tIn;
      if (blocksProjectile(k, zHere) && (k !== Cell.Tree || sim.rng.chance(0.5))) {
        wallT = tIn;
        return true;
      }
      return false;
    });
    const hitT = Math.min(bestT, wallT);
    const groundT = p.slope < 0 ? -p.z / p.slope : Infinity;
    if (hitT <= step || groundT <= step) {
      const t = Math.min(hitT, groundT);
      const hx = p.x + p.dx * t;
      const hy = p.y + p.dy * t;
      list.splice(i, 1);
      detonate(sim, p, hx, hy, bestT <= wallT && bestT <= groundT ? bestA : null);
      continue;
    }
    p.x = ex;
    p.y = ey;
    p.z += p.slope * step;
    p.travelled += step;
    if (p.travelled > p.maxRange || !map.inBounds(Math.floor(p.x), Math.floor(p.y))) {
      list.splice(i, 1);
      detonate(sim, p, p.x, p.y, null);
    }
  }
}

// -----------------------------------------------------------------------------
// Smoke
// -----------------------------------------------------------------------------

export function updateSmokes(sim: Simulation, dt: number) {
  const list = sim.smokes;
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    s.age += dt;
    s.r = Math.min(s.rMax, s.r + (s.rMax / SMOKE.grow) * dt);
    const fadeStart = s.life - 5;
    s.density = s.age < fadeStart ? SMOKE.density : SMOKE.density * Math.max(0, 1 - (s.age - fadeStart) / 5);
    if (s.age >= s.life) list.splice(i, 1);
  }
}

