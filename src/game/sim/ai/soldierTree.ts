import { hash2 } from '../../core/rng';
import { laneClear, launchProjectile, throwGrenade } from '../combat/explosives';
import { reviveSoldier } from '../combat/damage';
import { GRENADE, ROCKET, SOLDIER } from '../config';
import type { Grenade, Soldier, Tank } from '../entities';
import { protectionFrom } from '../map/cover';
import { blastClear } from '../nav/los';
import type { Simulation } from '../Simulation';
import {
  Action,
  BehaviorTree,
  Condition,
  Cooldown,
  FAILURE,
  MemSequence,
  Parallel,
  RUNNING,
  Selector,
  Sequence,
  SUCCESS,
  Succeeder,
  type ActionImpl,
  type BTNode,
  type Status,
  type TickCtx,
} from './bt/BehaviorTree';
import type { SpeedMode } from './locomotion';
import {
  cellCenter,
  currentProtection,
  exposedAt,
  findCover,
  flankPoint,
  grenadeEscape,
  grenadeOpportunity,
  nearestEnemyTank,
  pickTarget,
  shieldSlotPos,
  smokePoint,
  threats,
  visibleThreats,
} from './tactics';

type Ctx = TickCtx<Soldier, Simulation>;
type Node = BTNode<Soldier, Simulation>;

const cond = (name: string, fn: (ctx: Ctx) => boolean): Node => new Condition<Soldier, Simulation>(name, fn);
const act = (name: string, impl: ActionImpl<Soldier, Simulation>): Node => new Action<Soldier, Simulation>(name, impl);
const sel = (name: string, c: Node[]): Node => new Selector<Soldier, Simulation>(name, c);
const seq = (name: string, c: Node[]): Node => new Sequence<Soldier, Simulation>(name, c);
const mseq = (name: string, c: Node[]): Node => new MemSequence<Soldier, Simulation>(name, c);

function moveTo(ctx: Ctx, x: number, y: number, mode: SpeedMode, arrive = 0.4) {
  const s = ctx.agent;
  s.loco.moveTo(ctx.world.paths, 'inf', s.x, s.y, x, y, mode, arrive);
}

function stop(ctx: Ctx) {
  ctx.agent.loco.stop(ctx.world.paths);
}

function grenadeById(sim: Simulation, id: number): Grenade | undefined {
  if (id < 0) return undefined;
  return sim.grenades.find((g) => g.id === id);
}

/** Stable per-unit personality roll in [0,1). */
const trait = (s: Soldier, salt: number) => hash2(s.traitSeed, salt, 7);

function enemyDir(s: Soldier) {
  return s.team === 0 ? 0 : Math.PI;
}

// =============================================================================
// Downed
// =============================================================================

const downedBranch = seq('bt.downed', [
  cond('bt.isDowned', ({ agent }) => agent.state === 'downed'),
  sel('bt.downedChoice', [
    seq('bt.crawlBranch', [
      cond('bt.exposed', ({ agent: s, world: sim }) => !!exposedAt(sim, s.team, s.x, s.y, s.contacts.values())),
      act('bt.crawl', {
        start: (ctx) => {
          const { agent: s, world: sim } = ctx;
          const th = threats(sim, s, 15);
          const cell = th.length ? findCover(sim, s, { threats: th, mode: 'hide', radius: 4 }) : -1;
          s.bb.intent = 'crawl';
          if (cell >= 0) {
            const p = cellCenter(sim, cell);
            moveTo(ctx, p.x, p.y, 'crouch', 0.3);
          }
        },
        tick: ({ agent: s }) => (s.loco.moving ? RUNNING : SUCCESS),
        stop: (ctx) => stop(ctx),
      }),
    ]),
    act('bt.waitMedic', {
      start: ({ agent: s }) => {
        s.bb.intent = 'waitMedic';
      },
      tick: ({ agent: s, now }) => {
        if (now > s.calloutUntil + 3) s.say('medic', now, 2);
        return RUNNING;
      },
    }),
  ]),
]);

// =============================================================================
// Grenade reaction: throw it back or dive away
// =============================================================================

const grenadeDanger = cond('bt.grenadeDanger', ({ agent: s, world: sim, now }) => {
  let best: Grenade | null = null;
  for (const g of sim.grenades) {
    if (g.kind !== 'frag') continue;
    if (g.heldBy === s.id) {
      best = g;
      break;
    }
    if (g.heldBy >= 0) continue;
    const t = g.noticed.get(s.id);
    if (t === undefined || now < t) continue;
    const d = Math.hypot(g.x - s.x, g.y - s.y);
    if (d > GRENADE.radius + 0.6) continue;
    if (d > 1.5 && !blastClear(sim.map, g.x, g.y, s.x, s.y)) continue;
    if (!best || g.fuse < best.fuse) best = g;
  }
  s.bb.grenade = best ? best.id : -1;
  return !!best;
});

function throwBackTarget(sim: Simulation, s: Soldier, g: Grenade): { x: number; y: number } {
  const orig = s.contacts.get(g.owner);
  if (orig && Math.hypot(orig.x - s.x, orig.y - s.y) < GRENADE.maxThrow) return { x: orig.x, y: orig.y };
  const th = threats(sim, s, 6).filter((c) => !c.isTank && Math.hypot(c.x - s.x, c.y - s.y) < GRENADE.maxThrow);
  if (th.length) return { x: th[0].x, y: th[0].y };
  const a = enemyDir(s);
  return { x: s.x + Math.cos(a) * 14, y: s.y + Math.sin(a) * 14 };
}

const canThrowBack = cond('bt.canThrowBack', ({ agent: s, world: sim }) => {
  const g = grenadeById(sim, s.bb.grenade);
  if (!g) return false;
  if (g.heldBy === s.id || g.claimedBy === s.id) return true;
  if (g.claimedBy >= 0 || g.returnedBy >= 0) return false;
  const d = Math.hypot(g.x - s.x, g.y - s.y);
  if (d > 2.8 || (!g.landed && g.z > 0.7) || g.fuse < 1.45) return false;
  if (s.bb.tbGrenade !== g.id) {
    s.bb.tbGrenade = g.id;
    s.bb.tbDecision = sim.rng.chance(s.skillDef.throwBack);
  }
  return s.bb.tbDecision;
});

const throwBack = act('bt.throwBack', {
  start: ({ agent: s, world: sim, now }) => {
    const g = grenadeById(sim, s.bb.grenade);
    if (g) g.claimedBy = s.id;
    s.bb.intent = 'throwBack';
    s.say('throwBack', now);
  },
  tick: (ctx) => {
    const { agent: s, world: sim, now } = ctx;
    const g = grenadeById(sim, s.bb.grenade);
    if (!g) return FAILURE;
    if (g.heldBy === s.id) {
      if (s.busy(now)) return RUNNING;
      const t = throwBackTarget(sim, s, g);
      s.busyUntil = now + 0.25;
      s.busyKind = 'throw';
      s.busyFacing = Math.atan2(t.y - s.y, t.x - s.x);
      throwGrenade(sim, s, 'frag', t.x, t.y, g);
      s.stats.throwBacks++;
      sim.teams[s.team].stats.throwBacks++;
      sim.tactic('throwBack', s);
      return SUCCESS;
    }
    const d = Math.hypot(g.x - s.x, g.y - s.y);
    if (d > 0.75) {
      moveTo(ctx, g.x, g.y, 'sprint', 0.5);
      return RUNNING;
    }
    stop(ctx);
    g.heldBy = s.id;
    if (g.body) {
      sim.physics.remove(g.body);
      g.body = null;
    }
    s.busyUntil = now + GRENADE.pickupTime;
    s.busyKind = 'pickup';
    s.busyFacing = s.facing;
    return RUNNING;
  },
  stop: ({ agent: s, world: sim }, interrupted) => {
    const g = grenadeById(sim, s.bb.grenade);
    if (g && g.claimedBy === s.id && g.heldBy !== s.id) g.claimedBy = -1;
    if (interrupted) s.loco.stop(sim.paths);
  },
});

const evade = act('bt.evade', {
  start: (ctx) => {
    const { agent: s, world: sim, now } = ctx;
    const g = grenadeById(sim, s.bb.grenade);
    s.bb.escape = g ? grenadeEscape(sim, s, g) : null;
    if (s.bb.escape) moveTo(ctx, s.bb.escape.x, s.bb.escape.y, 'sprint', 0.4);
    s.say('grenade', now);
    s.bb.intent = 'evade';
    s.bb.dodging = s.bb.grenade;
  },
  tick: (ctx) => {
    const { agent: s, world: sim } = ctx;
    const g = grenadeById(sim, s.bb.grenade);
    if (!g) return SUCCESS;
    if (!s.bb.escape || s.loco.status === 'arrived' || s.loco.status === 'failed' || s.loco.status === 'idle') {
      s.wantStance = 'prone';
      stop(ctx);
    }
    return RUNNING;
  },
  stop: ({ agent: s }) => {
    s.bb.escape = null;
  },
});

const grenadeBranch = seq('bt.grenadeReaction', [
  grenadeDanger,
  sel('bt.grenadeChoice', [seq('bt.throwBackBranch', [canThrowBack, throwBack]), evade]),
]);

// =============================================================================
// Anti-armour
// =============================================================================

const tankThreat = cond('bt.tankThreat', ({ agent: s, world: sim }) => {
  // hysteresis: once dealing with a tank, keep tracking it a little further out
  const r = nearestEnemyTank(sim, s, s.bb.tank >= 0 ? 60 : 46);
  s.bb.tank = r ? r.tank.id : -1;
  return !!r;
});

const rocketAttack = act('bt.rocketAttack', {
  start: ({ agent: s }) => {
    s.bb.intent = 'antiTank';
    s.bb.rocketAiming = false;
    s.bb.rocketMoveAt = 0;
  },
  tick: (ctx) => {
    const { agent: s, world: sim, now } = ctx;
    const t = sim.get(s.bb.tank) as Tank | undefined;
    if (!t || !t.alive) return SUCCESS;
    const c = s.contacts.get(t.id);
    if (!c) return FAILURE;
    const d = Math.hypot(t.x - s.x, t.y - s.y);
    if (!c.visible || d > 46) {
      if (now > s.bb.rocketMoveAt) {
        s.bb.rocketMoveAt = now + 3;
        const cell = findCover(sim, s, { threats: [c], mode: 'fight', radius: 14, avoid: { x: t.x, y: t.y, r: 16 } });
        if (cell >= 0) {
          sim.reserveCover(s, cell);
          const p = cellCenter(sim, cell);
          moveTo(ctx, p.x, p.y, 'run', 0.3);
        } else if (d > 34) {
          // creep closer along a flank
          const a = Math.atan2(c.y - s.y, c.x - s.x) + (s.id % 2 ? 0.5 : -0.5);
          moveTo(ctx, s.x + Math.cos(a) * 8, s.y + Math.sin(a) * 8, 'crouch', 1.2);
        }
      }
      if (!s.loco.moving) s.wantStance = 'crouch';
      return RUNNING;
    }
    if (d < 9) return FAILURE; // too close for a safe shot: let evasion take over
    if (!laneClear(sim, s.x, s.y, t.x, t.y, 1.4, d)) {
      // something solid in the way (a window frame, a wall corner): shift position
      if (now > s.bb.rocketMoveAt) {
        s.bb.rocketMoveAt = now + 2;
        const side = Math.atan2(t.y - s.y, t.x - s.x) + (s.id % 2 ? Math.PI / 2 : -Math.PI / 2);
        moveTo(ctx, s.x + Math.cos(side) * 2.5, s.y + Math.sin(side) * 2.5, 'run', 0.5);
      }
      return RUNNING;
    }
    stop(ctx);
    s.wantStance = 'crouch';
    if (s.busy(now) || s.rocketCd > 0) return RUNNING;
    const ang = Math.atan2(t.y - s.y, t.x - s.x);
    if (!s.bb.rocketAiming) {
      s.bb.rocketAiming = true;
      s.busyUntil = now + 0.5 + s.skillDef.aimTime;
      s.busyKind = 'rocket';
      s.busyFacing = ang;
      return RUNNING;
    }
    s.bb.rocketAiming = false;
    // lead the target a little
    const lead = d / ROCKET.speed;
    launchProjectile(sim, s, 'rocket', s.x + Math.cos(ang) * 0.5, s.y + Math.sin(ang) * 0.5, 1.4, t.x + t.vx * lead, t.y + t.vy * lead, 1.1, 0.02 * s.skillDef.spreadMul, t.id);
    s.rockets--;
    s.rocketCd = ROCKET.reload;
    s.busyUntil = now + 0.35;
    s.busyKind = 'rocket';
    s.stats.rockets++;
    sim.teams[s.team].stats.rockets++;
    if (now - s.bb.lastRocketTactic > 20) {
      s.bb.lastRocketTactic = now;
      sim.tactic('antiTank', s);
    }
    return s.rockets > 0 ? RUNNING : SUCCESS;
  },
  stop: ({ agent: s }) => {
    s.bb.rocketAiming = false;
  },
});

const tankTooClose = cond('bt.tankClose', ({ agent: s, world: sim }) => {
  const t = sim.get(s.bb.tank) as Tank | undefined;
  if (!t || !t.alive) return false;
  const d = Math.hypot(t.x - s.x, t.y - s.y);
  if (d > 16) return false;
  const toMe = Math.atan2(s.y - t.y, s.x - t.x);
  const turretOnMe = Math.abs(Math.atan2(Math.sin(toMe - t.turret), Math.cos(toMe - t.turret))) < 0.5;
  const drivingAtMe = Math.abs(t.speed) > 1 && Math.abs(Math.atan2(Math.sin(toMe - t.angle), Math.cos(toMe - t.angle))) < 0.45;
  return d < 8 || turretOnMe || drivingAtMe;
});

const evadeTank = act('bt.evadeTank', {
  start: (ctx) => {
    const { agent: s, world: sim } = ctx;
    const t = sim.get(s.bb.tank) as Tank | undefined;
    s.bb.intent = 'evadeTank';
    if (!t) return;
    const c = s.contacts.get(t.id);
    const th = c ? [c, ...threats(sim, s, 6, false).slice(0, 2)] : threats(sim, s, 6);
    const cell = findCover(sim, s, { threats: th, mode: 'hide', radius: 12, avoid: { x: t.x, y: t.y, r: 7 } });
    if (cell >= 0) {
      sim.reserveCover(s, cell);
      const p = cellCenter(sim, cell);
      moveTo(ctx, p.x, p.y, 'sprint', 0.3);
    } else {
      const a = Math.atan2(s.y - t.y, s.x - t.x) + (s.id % 2 ? 0.9 : -0.9);
      moveTo(ctx, s.x + Math.cos(a) * 8, s.y + Math.sin(a) * 8, 'sprint', 1);
    }
  },
  tick: ({ agent: s }) => {
    if (s.loco.status === 'arrived') {
      s.wantStance = 'crouch';
      return SUCCESS;
    }
    return s.loco.status === 'failed' || s.loco.status === 'idle' ? FAILURE : RUNNING;
  },
  stop: (ctx, interrupted) => {
    if (interrupted) stop(ctx);
  },
});

const antiArmourBranch = seq('bt.antiArmour', [
  tankThreat,
  sel('bt.antiArmourChoice', [
    seq('bt.rocketBranch', [cond('bt.hasRockets', ({ agent: s }) => s.rockets > 0), rocketAttack]),
    seq('bt.evadeTankBranch', [tankTooClose, evadeTank]),
  ]),
]);

// =============================================================================
// Rescue downed friends (with a smoke screen when they're exposed)
// =============================================================================

const rescueTask = cond('bt.rescueTask', ({ agent: s, world: sim }) => {
  for (const [downed, rescuer] of sim.teams[s.team].rescues) {
    if (rescuer !== s.id) continue;
    const d = sim.soldier(downed);
    if (d && d.state === 'downed') {
      s.bb.rescue = downed;
      return true;
    }
  }
  s.bb.rescue = -1;
  return false;
});

const hasSmoke = () => cond('bt.hasSmoke', ({ agent: s, now }) => s.smokes > 0 && now - s.bb.lastSmoke > 8);

const allyExposed = cond('bt.allyExposed', ({ agent: s, world: sim }) => {
  const ally = sim.soldier(s.bb.rescue);
  if (!ally) return false;
  const c = exposedAt(sim, s.team, ally.x, ally.y, s.contacts.values());
  if (!c) return false;
  s.bb.smokeTarget = smokePoint(ally, c, 4.5);
  return true;
});

function throwSmokeAction(kind: 'smokeRescue' | 'smokeCover'): ActionImpl<Soldier, Simulation> {
  return {
    start: ({ agent: s, world: sim, now }) => {
      s.loco.stop(sim.paths);
      const t = s.bb.smokeTarget;
      s.busyUntil = now + GRENADE.windup;
      s.busyKind = 'throw';
      s.busyFacing = t ? Math.atan2(t.y - s.y, t.x - s.x) : s.facing;
      s.say('smoke', now);
      s.bb.intent = kind;
    },
    tick: ({ agent: s, world: sim, now }) => {
      const t = s.bb.smokeTarget;
      if (!t) return FAILURE;
      if (s.busy(now)) return RUNNING;
      throwGrenade(sim, s, 'smoke', t.x, t.y);
      s.smokes--;
      s.bb.lastSmoke = now;
      s.stats.smokes++;
      sim.teams[s.team].stats.smokes++;
      sim.tactic(kind, s, t.x, t.y);
      return SUCCESS;
    },
    stop: ({ agent: s }, interrupted) => {
      if (interrupted) {
        s.busyUntil = 0;
        s.busyKind = '';
      }
    },
  };
}

const moveToAlly = act('bt.moveToAlly', {
  start: ({ agent: s, world: sim }) => {
    s.bb.intent = 'rescue';
    sim.releaseCover(s);
  },
  tick: (ctx) => {
    const { agent: s, world: sim } = ctx;
    const ally = sim.soldier(s.bb.rescue);
    if (!ally || ally.state !== 'downed') return FAILURE;
    const d = Math.hypot(ally.x - s.x, ally.y - s.y);
    if (d < 1.05) {
      stop(ctx);
      return SUCCESS;
    }
    moveTo(ctx, ally.x, ally.y, 'sprint', 0.85);
    return s.loco.status === 'failed' ? FAILURE : RUNNING;
  },
  stop: (ctx, interrupted) => {
    if (interrupted) stop(ctx);
  },
});

const revive = act('bt.revive', {
  start: ({ agent: s, world: sim, now }) => {
    const ally = sim.soldier(s.bb.rescue);
    s.busyUntil = now + SOLDIER.reviveTime * (s.role === 'medic' ? 1 : 1.6);
    s.busyKind = 'revive';
    s.busyFacing = ally ? Math.atan2(ally.y - s.y, ally.x - s.x) : s.facing;
    s.wantStance = 'crouch';
    s.bb.intent = 'revive';
    if (ally && sim.rng.chance(0.5)) sim.tactic('rescue', s);
  },
  tick: ({ agent: s, world: sim, now }) => {
    const ally = sim.soldier(s.bb.rescue);
    if (!ally || ally.state !== 'downed') return FAILURE;
    if (Math.hypot(ally.x - s.x, ally.y - s.y) > 1.8) return FAILURE;
    if (s.busy(now)) return RUNNING;
    reviveSoldier(sim, ally, s);
    return SUCCESS;
  },
  stop: ({ agent: s }, interrupted) => {
    if (interrupted) {
      s.busyUntil = 0;
      s.busyKind = '';
    }
  },
});

const rescueBranch = seq('bt.rescue', [
  rescueTask,
  mseq('bt.rescueSteps', [
    new Succeeder<Soldier, Simulation>('bt.optionalSmoke', seq('bt.smokeScreen', [allyExposed, hasSmoke(), act('bt.throwSmoke', throwSmokeAction('smokeRescue'))])),
    moveToAlly,
    revive,
  ]),
]);

// =============================================================================
// Combat
// =============================================================================

const hasThreats = cond('bt.hasThreats', ({ agent: s, world: sim }) => threats(sim, s, 12).length > 0);

const shouldTakeCover = cond('bt.shouldTakeCover', ({ agent: s, world: sim, now }) => {
  if (now - s.bb.lastCoverSearch < 1.2) return false;
  const th = threats(sim, s, 6);
  if (!th.length) return false;
  const prot = currentProtection(sim, s, th);
  s.bb.prot = prot;
  if (prot >= 0.5) return false;
  let vis = 0;
  let closeVis = false;
  for (const c of th) {
    if (!c.visible) continue;
    vis++;
    if (Math.hypot(c.x - s.x, c.y - s.y) < 36) closeVis = true;
  }
  return s.suppression > 0.3 || s.state === 'wounded' || s.mag < s.weapon.mag * 0.25 || vis >= 2 || closeVis || now - s.lastHitAt < 2;
});

const takeCover = act('bt.takeCover', {
  start: (ctx) => {
    const { agent: s, world: sim, now } = ctx;
    s.bb.lastCoverSearch = now;
    const th = threats(sim, s, 8);
    const mode = s.suppression > 0.6 || s.state === 'wounded' || s.mag === 0 ? 'hide' : 'fight';
    let cell = findCover(sim, s, { threats: th, mode, radius: 11 });
    if (cell < 0 && mode === 'fight') cell = findCover(sim, s, { threats: th, mode: 'hide', radius: 11 });
    if (cell < 0) {
      sim.releaseCover(s);
      return;
    }
    sim.reserveCover(s, cell);
    s.bb.coverReason = mode;
    const p = cellCenter(sim, cell);
    const far = Math.hypot(p.x - s.x, p.y - s.y) > 4;
    moveTo(ctx, p.x, p.y, s.suppression > 0.5 || far ? 'sprint' : 'run', 0.25);
    s.bb.intent = mode === 'hide' ? 'coverHide' : 'coverFight';
  },
  tick: ({ agent: s, world: sim }) => {
    if (s.bb.cover < 0) return FAILURE;
    if (s.loco.status === 'arrived') {
      s.wantStance = 'crouch';
      return SUCCESS;
    }
    if (s.loco.status === 'failed' || s.loco.status === 'idle') {
      sim.releaseCover(s);
      return FAILURE;
    }
    return RUNNING;
  },
  stop: (ctx, interrupted) => {
    if (interrupted) stop(ctx);
  },
});

const needsReload = cond('bt.needsReload', ({ agent: s, world: sim }) => {
  if (s.reserve <= 0 || s.reloadT > 0 && s.mag > 0) return s.reloadT > 0;
  if (s.mag === 0) return true;
  if (s.mag > s.weapon.mag * 0.3) return false;
  return visibleThreats(sim, s).every((c) => Math.hypot(c.x - s.x, c.y - s.y) > 14);
});

const reload = act('bt.reload', {
  start: ({ agent: s, world: sim }) => {
    sim.startReload(s);
    s.wantStance = 'crouch';
    s.bb.intent = 'reload';
  },
  tick: ({ agent: s }) => (s.reloadT > 0 ? RUNNING : SUCCESS),
});

const pinned = cond('bt.pinned', ({ agent: s, world: sim }) => {
  if (s.suppression < 0.72 || s.hp > 65) return false;
  const th = visibleThreats(sim, s);
  if (!th.length) return false;
  if (currentProtection(sim, s, th) > 0.4) return false;
  s.bb.smokeTarget = smokePoint(s, th[0], 3.5);
  return true;
});

const fallBack = act('bt.fallBack', {
  start: (ctx) => {
    const { agent: s } = ctx;
    const a = enemyDir(s) + Math.PI + (s.id % 2 ? 0.35 : -0.35);
    moveTo(ctx, s.x + Math.cos(a) * 9, s.y + Math.sin(a) * 9, 'sprint', 1.2);
    s.bb.intent = 'fallBack';
  },
  tick: ({ agent: s }) => (s.loco.status === 'arrived' ? SUCCESS : s.loco.status === 'failed' || s.loco.status === 'idle' ? FAILURE : RUNNING),
  stop: (ctx, interrupted) => {
    if (interrupted) stop(ctx);
  },
});

const grenadeAttack = mseq('bt.grenadeAttack', [
  cond('bt.hasFrag', ({ agent: s }) => s.frags > 0),
  cond('bt.grenadeOpportunity', ({ agent: s, world: sim, now }) => {
    if (now - s.bb.lastGrenade < 7) return false;
    const o = grenadeOpportunity(sim, s);
    s.bb.throwTarget = o;
    if (!o) return false;
    if (!sim.rng.chance(0.25 + 0.45 * s.skillDef.tactics)) {
      s.bb.lastGrenade = now - 4;
      return false;
    }
    return true;
  }),
  act('bt.throwFrag', {
    start: ({ agent: s, world: sim, now }) => {
      s.loco.stop(sim.paths);
      const t = s.bb.throwTarget;
      s.busyUntil = now + GRENADE.windup;
      s.busyKind = 'throw';
      s.busyFacing = t ? Math.atan2(t.y - s.y, t.x - s.x) : s.facing;
      s.say('fragOut', now);
      s.bb.intent = 'throwFrag';
    },
    tick: ({ agent: s, world: sim, now }) => {
      const t = s.bb.throwTarget;
      if (!t) return FAILURE;
      if (s.busy(now)) return RUNNING;
      throwGrenade(sim, s, 'frag', t.x, t.y);
      s.frags--;
      s.bb.lastGrenade = now;
      s.stats.grenades++;
      sim.teams[s.team].stats.grenades++;
      if (t.value >= 2.5 || sim.rng.chance(0.3)) sim.tactic('grenadeAttack', s, t.x, t.y);
      return SUCCESS;
    },
    stop: ({ agent: s }, interrupted) => {
      if (interrupted) {
        s.busyUntil = 0;
        s.busyKind = '';
      }
    },
  }),
]);

/** Rockets are also good at opening up enemies dug into buildings. */
const rocketBunker = new Cooldown<Soldier, Simulation>(
  'bt.rocketBunkerCd',
  14,
  seq('bt.rocketBunker', [
    cond('bt.spareRockets', ({ agent: s, world: sim }) => s.rockets >= 2 && !sim.tanks.some((t) => t.team !== s.team && t.alive)),
    cond('bt.dugInEnemy', ({ agent: s, world: sim }) => {
      for (const c of s.contacts.values()) {
        if (!c.visible || c.isTank) continue;
        const d = Math.hypot(c.x - s.x, c.y - s.y);
        if (d < 12 || d > 42) continue;
        const prot = protectionFrom(sim.map, c.x, c.y, s.x, s.y);
        if ((prot > 0.6 || sim.map.isIndoor(c.x, c.y) >= 0) && laneClear(sim, s.x, s.y, c.x, c.y, 1.4, 8)) {
          s.bb.throwTarget = { x: c.x, y: c.y, value: prot };
          return true;
        }
      }
      return false;
    }),
    act('bt.rocketFire', {
      start: ({ agent: s, now }) => {
        const t = s.bb.throwTarget!;
        s.busyUntil = now + 0.6 + s.skillDef.aimTime;
        s.busyKind = 'rocket';
        s.busyFacing = Math.atan2(t.y - s.y, t.x - s.x);
        s.bb.intent = 'rocketBunker';
      },
      tick: ({ agent: s, world: sim, now }) => {
        const t = s.bb.throwTarget;
        if (!t) return FAILURE;
        if (s.busy(now)) return RUNNING;
        const a = Math.atan2(t.y - s.y, t.x - s.x);
        launchProjectile(sim, s, 'rocket', s.x + Math.cos(a) * 0.5, s.y + Math.sin(a) * 0.5, 1.4, t.x, t.y, 0.9, 0.02 * s.skillDef.spreadMul, -1);
        s.rockets--;
        s.stats.rockets++;
        sim.teams[s.team].stats.rockets++;
        s.busyUntil = now + 0.35;
        return SUCCESS;
      },
    }),
  ]),
);

const shieldAvailable = cond('bt.tankShieldAvail', ({ agent: s, world: sim, now }) => {
  if (s.bb.shieldTank >= 0) {
    const t = sim.get(s.bb.shieldTank) as Tank | undefined;
    if (t && t.alive && t.escorts[s.bb.shieldSlot] === s.id) return true;
    sim.releaseShield(s);
    return false;
  }
  if (s.role === 'sniper' || trait(s, 3) > s.skillDef.tactics * 0.8 || now - s.bb.lastShield < 10) return false;
  const th = threats(sim, s, 8);
  if (!th.length) return false;
  if (currentProtection(sim, s, th) >= 0.5) return false;
  for (const t of sim.tanks) {
    if (t.team !== s.team || !t.alive) continue;
    if (t.squad !== s.squad && Math.hypot(t.x - s.x, t.y - s.y) > 9) continue;
    const d = Math.hypot(t.x - s.x, t.y - s.y);
    if (d > 16) continue;
    if (!t.loco.moving) continue;
    // threat should be roughly in front of the tank
    const ta = Math.atan2(th[0].y - t.y, th[0].x - t.x);
    if (Math.abs(Math.atan2(Math.sin(ta - t.angle), Math.cos(ta - t.angle))) > 1.6) continue;
    const slot = t.escorts.indexOf(-1);
    if (slot < 0) continue;
    t.escorts[slot] = s.id;
    s.bb.shieldTank = t.id;
    s.bb.shieldSlot = slot;
    s.bb.lastShield = now;
    sim.releaseCover(s);
    sim.tactic('tankShield', s);
    return true;
  }
  return false;
});

const followTank = act('bt.followTank', {
  start: ({ agent: s }) => {
    s.bb.intent = 'tankShield';
  },
  tick: (ctx) => {
    const { agent: s, world: sim, dt, now } = ctx;
    const t = sim.get(s.bb.shieldTank) as Tank | undefined;
    if (!t || !t.alive) {
      sim.releaseShield(s);
      return FAILURE;
    }
    const th = threats(sim, s, 10);
    if (!th.length || Math.hypot(t.x - s.x, t.y - s.y) > 24 || (!t.loco.moving && now - t.bb.lastReposition > 5)) {
      sim.releaseShield(s);
      s.bb.lastShield = now;
      return th.length ? FAILURE : SUCCESS;
    }
    const p = shieldSlotPos(t, th[0], s.bb.shieldSlot);
    const d = Math.hypot(p.x - s.x, p.y - s.y);
    if (d > 0.8) moveTo(ctx, p.x, p.y, d > 4 ? 'run' : 'walk', 0.5);
    else {
      stop(ctx);
      s.wantStance = 'crouch';
    }
    if (d < 2.5) sim.teams[s.team].stats.tankShield += dt;
    return RUNNING;
  },
  stop: ({ agent: s, world: sim }, interrupted) => {
    if (interrupted) {
      sim.releaseShield(s);
      s.loco.stop(sim.paths);
    }
  },
});

const hasVisibleEnemy = cond('bt.hasVisibleEnemy', ({ agent: s, world: sim }) => s.bb.target >= 0 || visibleThreats(sim, s).length > 0);

const inFightingPosition = cond('bt.inPosition', ({ agent: s, world: sim }) => {
  const t = sim.get(s.bb.target) ?? (() => {
    const v = visibleThreats(sim, s)[0];
    return v ? sim.get(v.id) : undefined;
  })();
  if (!t) return false;
  return protectionFrom(sim.map, s.x, s.y, t.x, t.y) >= 0.45;
});

const holdAndFire = act('bt.holdFire', {
  start: (ctx) => {
    const { agent: s, now, world: sim } = ctx;
    stop(ctx);
    s.wantStance = s.suppression > 0.75 ? 'prone' : 'crouch';
    s.bb.holdUntil = now + sim.rng.range(3, 6);
    s.bb.intent = 'holdFire';
  },
  tick: ({ agent: s, now }) => {
    s.wantStance = s.suppression > 0.8 ? 'prone' : 'crouch';
    return now > s.bb.holdUntil ? SUCCESS : RUNNING;
  },
});

const moveToFiringPos = act('bt.moveToFiringPos', {
  start: (ctx) => {
    const { agent: s, world: sim, now } = ctx;
    s.bb.lastCoverSearch = now;
    const th = threats(sim, s, 4);
    const cell = findCover(sim, s, { threats: th, mode: 'fight', radius: 9 });
    if (cell < 0) {
      sim.releaseCover(s);
      return;
    }
    sim.reserveCover(s, cell);
    s.bb.coverReason = 'fight';
    const p = cellCenter(sim, cell);
    moveTo(ctx, p.x, p.y, 'run', 0.25);
    s.bb.intent = 'moveToFiringPos';
  },
  tick: ({ agent: s, world: sim }) => {
    if (s.bb.cover < 0) return FAILURE;
    if (s.loco.status === 'arrived') {
      s.wantStance = 'crouch';
      return SUCCESS;
    }
    if (s.loco.status === 'failed' || s.loco.status === 'idle') {
      sim.releaseCover(s);
      return FAILURE;
    }
    return RUNNING;
  },
  stop: (ctx, interrupted) => {
    if (interrupted) stop(ctx);
  },
});

const fireInPlace = act('bt.fireInPlace', {
  start: (ctx) => {
    const { agent: s, now, world: sim } = ctx;
    stop(ctx);
    s.wantStance = s.suppression > 0.55 ? 'prone' : 'crouch';
    s.bb.holdUntil = now + sim.rng.range(1.8, 3.2);
    s.bb.intent = 'fireInPlace';
  },
  tick: ({ agent: s, now }) => (now > s.bb.holdUntil ? SUCCESS : RUNNING),
});

const engage = seq('bt.engage', [
  hasVisibleEnemy,
  sel('bt.engageChoice', [
    seq('bt.holdBranch', [inFightingPosition, holdAndFire]),
    mseq('bt.repositionBranch', [
      cond('bt.coverWorthIt', ({ agent: s, world: sim, now }) => now - s.bb.lastCoverSearch > 2.2 && sim.rng.chance(s.skillDef.coverUse)),
      moveToFiringPos,
    ]),
    fireInPlace,
  ]),
]);

const flankOpportunity = cond('bt.flankOpportunity', ({ agent: s, world: sim, now }) => {
  if (s.leader || s.role === 'mg' || s.role === 'sniper' || now - s.bb.lastFlank < 25) return false;
  const th = threats(sim, s, 8, false);
  if (!th.length) return false;
  if (trait(s, Math.floor(now / 10)) > 0.35 * s.skillDef.tactics) {
    s.bb.lastFlank = now - 15;
    return false;
  }
  const sq = sim.squads[s.squad];
  let engaged = 0;
  for (const id of sq.members) {
    const m = sim.soldier(id);
    if (m && m.active && m.id !== s.id && m.bb.target >= 0) engaged++;
  }
  if (engaged < 1) return false;
  const p = flankPoint(sim, s, th[0], s.id % 2 ? 1 : -1);
  s.bb.flankTarget = p;
  return !!p;
});

const flank = act('bt.flank', {
  start: (ctx) => {
    const { agent: s, world: sim, now } = ctx;
    const p = s.bb.flankTarget;
    s.bb.lastFlank = now;
    sim.releaseCover(s);
    if (p) moveTo(ctx, p.x, p.y, 'run', 1.2);
    s.bb.intent = 'flank';
    sim.teams[s.team].stats.flanks++;
    if (sim.rng.chance(0.5)) sim.tactic('flank', s);
  },
  tick: ({ agent: s }) => (s.loco.status === 'arrived' ? SUCCESS : s.loco.status === 'failed' || s.loco.status === 'idle' ? FAILURE : RUNNING),
  stop: (ctx, interrupted) => {
    if (interrupted) stop(ctx);
  },
});

const inCoverVsKnown = cond('bt.inCoverVsKnown', ({ agent: s, world: sim }) => {
  const th = threats(sim, s, 12);
  if (!th.length) return false;
  s.bb.prot = currentProtection(sim, s, th);
  return s.bb.prot >= 0.5;
});

const overwatch = act('bt.overwatch', {
  start: (ctx) => {
    const { agent: s, world: sim, now } = ctx;
    stop(ctx);
    s.wantStance = 'crouch';
    const sq = sim.squads[s.squad];
    const pushing = sq?.order && sq.order.kind !== 'defend';
    s.bb.holdUntil = now + (pushing ? sim.rng.range(2.5, 5) : sim.rng.range(6, 10));
    const th = threats(sim, s, 12)[0];
    if (th) s.watch = Math.atan2(th.y - s.y, th.x - s.x);
    s.bb.intent = 'overwatch';
  },
  tick: ({ agent: s, now }) => (now > s.bb.holdUntil ? SUCCESS : RUNNING),
  stop: ({ agent: s, now }) => {
    s.bb.overwatchAt = now + 4;
  },
});

const advance = act('bt.advance', {
  start: (ctx) => {
    const { agent: s, world: sim, now } = ctx;
    const c = threats(sim, s, 12)[0];
    s.bb.intent = 'advance';
    s.bb.advanceRetryAt = now + 3;
    if (!c) return;
    const cell = findCover(sim, s, { threats: [c], mode: 'fight', radius: 14, toward: { x: c.x, y: c.y, w: 0.55 }, minGain: 3 });
    if (cell >= 0) {
      sim.reserveCover(s, cell);
      const p = cellCenter(sim, cell);
      moveTo(ctx, p.x, p.y, 'run', 0.3);
    } else {
      // no cover ahead: short, crouched bound toward the contact
      const d = Math.hypot(c.x - s.x, c.y - s.y);
      const step = Math.min(7, Math.max(0, d - 12));
      if (step < 2) return;
      moveTo(ctx, s.x + ((c.x - s.x) / d) * step, s.y + ((c.y - s.y) / d) * step, 'crouch', 1.0);
    }
  },
  tick: ({ agent: s }) => {
    if (!s.loco.hasGoal) return FAILURE;
    if (s.loco.status === 'arrived') {
      s.wantStance = 'crouch';
      return SUCCESS;
    }
    return s.loco.status === 'failed' || s.loco.status === 'idle' ? FAILURE : RUNNING;
  },
  stop: (ctx, interrupted) => {
    if (interrupted) stop(ctx);
  },
});

/** Squad leader blinds the enemy before the squad crosses open ground. */
const smokeCover = new Cooldown<Soldier, Simulation>(
  'bt.smokeCoverCd',
  20,
  mseq('bt.smokeCover', [
    cond('bt.isLeader', ({ agent: s }) => s.leader),
    hasSmoke(),
    cond('bt.squadExposed', ({ agent: s, world: sim }) => {
      const sq = sim.squads[s.squad];
      if (!sq.order || Math.hypot(sq.order.x - s.x, sq.order.y - s.y) < 12) return false;
      const th = visibleThreats(sim, s);
      if (th.length < 2) return false;
      if (currentProtection(sim, s, th) > 0.45) return false;
      if (trait(s, 11) > s.skillDef.tactics) return false;
      s.bb.smokeTarget = smokePoint(s, th[0], 7);
      return true;
    }),
    act('bt.throwSmokeCover', throwSmokeAction('smokeCover')),
  ]),
);

const combatBranch = seq('bt.combat', [
  hasThreats,
  sel('bt.combatChoice', [
    mseq('bt.seekCover', [shouldTakeCover, takeCover]),
    seq('bt.reloadBranch', [needsReload, reload]),
    mseq('bt.smokeRetreat', [pinned, hasSmoke(), act('bt.throwSmokeRetreat', throwSmokeAction('smokeCover')), fallBack]),
    grenadeAttack,
    rocketBunker,
    smokeCover,
    seq('bt.tankShield', [shieldAvailable, followTank]),
    engage,
    sel('bt.manoeuvre', [
      mseq('bt.flankBranch', [flankOpportunity, flank]),
      seq('bt.overwatchBranch', [cond('bt.overwatchDue', ({ agent: s, now }) => now > s.bb.overwatchAt), inCoverVsKnown, overwatch]),
      mseq('bt.advanceBranch', [
        cond('bt.mayAdvance', ({ agent: s, world: sim, now }) => {
          if (now < s.bb.advanceRetryAt) return false;
          const o = sim.squads[s.squad]?.order;
          return !o || o.kind !== 'defend' || Math.hypot(o.x - s.x, o.y - s.y) > 14;
        }),
        advance,
      ]),
    ]),
  ]),
]);

// =============================================================================
// Support: heal, scavenge ammo
// =============================================================================

const woundedAlly = cond('bt.woundedAlly', ({ agent: s, world: sim }) => {
  if (s.role !== 'medic') return false;
  if (s.bb.heal >= 0) {
    const a = sim.soldier(s.bb.heal);
    if (a && a.active && a.hp < a.maxHp * 0.95) return true;
  }
  let best = -1;
  let bestD = 26;
  for (const a of sim.soldiers) {
    if (a.team !== s.team || !a.active || a === s || a.hp >= a.maxHp * 0.72) continue;
    const d = Math.hypot(a.x - s.x, a.y - s.y);
    if (d < bestD) {
      bestD = d;
      best = a.id;
    }
  }
  s.bb.heal = best;
  return best >= 0;
});

const heal = act('bt.heal', {
  start: ({ agent: s, world: sim }) => {
    s.bb.healPhase = 0;
    s.bb.intent = 'heal';
    sim.releaseCover(s);
  },
  tick: (ctx) => {
    const { agent: s, world: sim, now } = ctx;
    const a = sim.soldier(s.bb.heal);
    if (!a || !a.active) return FAILURE;
    const d = Math.hypot(a.x - s.x, a.y - s.y);
    if (s.bb.healPhase === 0) {
      if (d > 1.2) {
        moveTo(ctx, a.x, a.y, 'run', 1.0);
        return s.loco.status === 'failed' ? FAILURE : RUNNING;
      }
      stop(ctx);
      s.bb.healPhase = 1;
      s.busyUntil = now + 2.4;
      s.busyKind = 'heal';
      s.busyFacing = Math.atan2(a.y - s.y, a.x - s.x);
      s.wantStance = 'crouch';
      return RUNNING;
    }
    if (d > 2) return FAILURE;
    if (s.busy(now)) return RUNNING;
    a.hp = Math.min(a.maxHp, a.hp + 45);
    if (a.hp >= a.maxHp * 0.6) a.state = 'healthy';
    s.bb.heal = -1;
    if (sim.rng.chance(0.25)) sim.tactic('heal', s);
    return SUCCESS;
  },
  stop: ({ agent: s }, interrupted) => {
    if (interrupted) {
      s.busyUntil = 0;
      s.busyKind = '';
    }
  },
});

const lowAmmo = cond('bt.lowAmmo', ({ agent: s }) => s.reserve + s.mag < s.weapon.mag * 1.5);

const ammoNearby = cond('bt.ammoNearby', ({ agent: s, world: sim }) => {
  let best = -1;
  let bestD = 22;
  for (const b of sim.soldiers) {
    if (b.state !== 'dead' || b.reserve + b.mag + b.frags * 20 < 15) continue;
    const d = Math.hypot(b.x - s.x, b.y - s.y);
    if (d < bestD) {
      bestD = d;
      best = b.id;
    }
  }
  s.bb.scavenge = best;
  return best >= 0;
});

const scavenge = act('bt.scavenge', {
  start: ({ agent: s, world: sim }) => {
    s.bb.healPhase = 0;
    s.bb.intent = 'scavenge';
    sim.releaseCover(s);
  },
  tick: (ctx) => {
    const { agent: s, world: sim, now } = ctx;
    const b = sim.soldier(s.bb.scavenge);
    if (!b || b.state !== 'dead') return FAILURE;
    const d = Math.hypot(b.x - s.x, b.y - s.y);
    if (s.bb.healPhase === 0) {
      if (d > 0.9) {
        moveTo(ctx, b.x, b.y, 'run', 0.7);
        return s.loco.status === 'failed' ? FAILURE : RUNNING;
      }
      stop(ctx);
      s.bb.healPhase = 1;
      s.busyUntil = now + 1.3;
      s.busyKind = 'pickup';
      s.busyFacing = s.facing;
      return RUNNING;
    }
    if (s.busy(now)) return RUNNING;
    const rounds = b.reserve + b.mag;
    const take = Math.min(rounds, s.weapon.reserve - s.reserve);
    s.reserve += take;
    b.reserve = 0;
    b.mag = 0;
    if (b.frags > 0 && s.frags < 2) {
      s.frags++;
      b.frags--;
    }
    sim.teams[s.team].stats.scavenges++;
    if (sim.rng.chance(0.5)) sim.tactic('scavenge', s);
    return SUCCESS;
  },
  stop: ({ agent: s }, interrupted) => {
    if (interrupted) {
      s.busyUntil = 0;
      s.busyKind = '';
    }
  },
});

const supportBranch = sel('bt.support', [
  seq('bt.treatBranch', [woundedAlly, heal]),
  seq('bt.resupplyBranch', [lowAmmo, ammoNearby, scavenge]),
]);

// =============================================================================
// Squad orders & idle
// =============================================================================

const SLOT_OFFSETS = [
  [0, 0],
  [-2.2, 2],
  [-2.2, -2],
  [-4.4, 3.5],
  [-4.4, -3.5],
  [-6, 0],
  [-6.5, 4.5],
];

const followOrder = act('bt.followOrder', {
  start: ({ agent: s }) => {
    s.bb.intent = 'followOrder';
    s.bb.holdUntil = 0;
  },
  tick: (ctx) => {
    const { agent: s, world: sim, now } = ctx;
    const sq = sim.squads[s.squad];
    const o = sq?.order;
    if (!o) return FAILURE;
    const point = o.point >= 0 ? sim.points[o.point] : null;
    const dToOrder = Math.hypot(o.x - s.x, o.y - s.y);
    const radius = point ? point.r : 6;
    if (dToOrder < radius + 1.5) {
      // on the objective: take a defensive spot facing the enemy side
      if (now > s.bb.holdUntil) {
        s.bb.holdUntil = now + 6;
        const ed = enemyDir(s);
        const pseudo = { id: -1, x: o.x + Math.cos(ed) * 30, y: o.y + Math.sin(ed) * 30, t: now, visible: false, confirmed: false, isTank: false };
        const cell = findCover(sim, s, { threats: [pseudo], mode: 'fight', radius: radius - 1, center: { x: o.x, y: o.y } });
        if (cell >= 0) {
          sim.reserveCover(s, cell);
          const p = cellCenter(sim, cell);
          moveTo(ctx, p.x, p.y, 'walk', 0.3);
        }
        s.watch = ed + sim.rng.range(-0.6, 0.6);
      }
      if (!s.loco.moving) s.wantStance = 'crouch';
      s.bb.intent = 'holdPoint';
      return RUNNING;
    }
    // formation slot relative to the march direction
    const idx = Math.max(0, sq.members.indexOf(s.id));
    const leader = sq.members.map((id) => sim.soldier(id)).find((m) => m && m.active && m.leader);
    const off = SLOT_OFFSETS[idx % SLOT_OFFSETS.length];
    let gx = o.x;
    let gy = o.y;
    if (leader && leader !== s && Math.hypot(leader.x - s.x, leader.y - s.y) < 25) {
      const a = Math.atan2(o.y - leader.y, o.x - leader.x);
      const lead = Math.min(6, Math.hypot(o.x - leader.x, o.y - leader.y));
      const bx = leader.x + Math.cos(a) * lead;
      const by = leader.y + Math.sin(a) * lead;
      gx = bx + Math.cos(a) * off[0] - Math.sin(a) * off[1];
      gy = by + Math.sin(a) * off[0] + Math.cos(a) * off[1];
      if (!sim.map.walkablePos(gx, gy)) {
        gx = bx;
        gy = by;
      }
    } else {
      gx = o.x + off[1] * 0.6;
      gy = o.y - off[0] * 0.6;
    }
    s.bb.slot = { x: gx, y: gy };
    s.wantStance = 'stand';
    moveTo(ctx, gx, gy, dToOrder > 25 ? 'run' : 'walk', 1.2);
    s.bb.intent = 'followOrder';
    return RUNNING;
  },
  stop: (ctx, interrupted) => {
    if (interrupted) stop(ctx);
  },
});

const idle = act('bt.idle', {
  start: (ctx) => {
    const { agent: s } = ctx;
    stop(ctx);
    s.wantStance = 'crouch';
    s.watch = enemyDir(s);
    s.bb.intent = 'idle';
  },
  tick: () => RUNNING,
});

// =============================================================================
// Fire control (runs in parallel with the main selector)
// =============================================================================

const fireControl = seq('bt.fireControl', [
  cond('bt.canShoot', ({ agent: s }) => s.active && s.mag + s.reserve > 0),
  act('bt.selectTarget', {
    tick: ({ agent: s, world: sim }): Status => {
      s.bb.target = pickTarget(sim, s);
      return s.bb.target >= 0 ? SUCCESS : FAILURE;
    },
  }),
]);

let tree: BehaviorTree<Soldier, Simulation> | null = null;

export function getSoldierTree(): BehaviorTree<Soldier, Simulation> {
  if (tree) return tree;
  tree = new BehaviorTree<Soldier, Simulation>(
    'soldier',
    new Parallel<Soldier, Simulation>('bt.soldier', [
      sel('bt.main', [
        downedBranch,
        grenadeBranch,
        antiArmourBranch,
        rescueBranch,
        combatBranch,
        supportBranch,
        seq('bt.orders', [cond('bt.hasOrder', ({ agent: s, world: sim }) => !!sim.squads[s.squad]?.order), followOrder]),
        idle,
      ]),
      fireControl,
    ]),
  );
  return tree;
}
