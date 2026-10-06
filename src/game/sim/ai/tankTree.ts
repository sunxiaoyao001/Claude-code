import { TANK } from '../config';
import type { Agent, Tank } from '../entities';
import { protectionFrom } from '../map/cover';
import type { Simulation } from '../Simulation';
import {
  Action,
  BehaviorTree,
  Condition,
  FAILURE,
  Parallel,
  RUNNING,
  Selector,
  Sequence,
  SUCCESS,
  type ActionImpl,
  type BTNode,
  type TickCtx,
} from './bt/BehaviorTree';
import { threats } from './tactics';

type Ctx = TickCtx<Tank, Simulation>;
type Node = BTNode<Tank, Simulation>;

const cond = (name: string, fn: (ctx: Ctx) => boolean): Node => new Condition<Tank, Simulation>(name, fn);
const act = (name: string, impl: ActionImpl<Tank, Simulation>): Node => new Action<Tank, Simulation>(name, impl);
const sel = (name: string, c: Node[]): Node => new Selector<Tank, Simulation>(name, c);
const seq = (name: string, c: Node[]): Node => new Sequence<Tank, Simulation>(name, c);

function drive(ctx: Ctx, x: number, y: number, arrive = 2, reverse = false) {
  const t = ctx.agent;
  t.bb.reverse = reverse;
  t.loco.moveTo(ctx.world.paths, 'tank', t.x, t.y, x, y, 'run', arrive);
}

function halt(ctx: Ctx) {
  ctx.agent.loco.stop(ctx.world.paths);
  ctx.agent.bb.reverse = false;
}

const ownSide = (t: Tank) => (t.team === 0 ? Math.PI : 0);

function enemyTankInSight(sim: Simulation, t: Tank): Tank | null {
  let best: Tank | null = null;
  let bestD = Infinity;
  for (const c of t.contacts.values()) {
    if (!c.isTank || !c.visible) continue;
    const e = sim.get(c.id);
    if (!e || e.kind !== 'tank' || !e.alive) continue;
    const d = Math.hypot(e.x - t.x, e.y - t.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

const retreat = seq('bt.tankRetreat', [
  cond('bt.tankCritical', ({ agent: t, world: sim }) => {
    if (t.hp > t.maxHp * 0.3) return false;
    for (const c of t.contacts.values()) {
      if (sim.time - c.t > 6) continue;
      const e = sim.get(c.id);
      if (!e || !e.alive) continue;
      const d = Math.hypot(c.x - t.x, c.y - t.y);
      if (c.isTank && d < 45) return true;
      if (e.kind === 'soldier' && e.rockets > 0 && d < 30) return true;
    }
    return false;
  }),
  act('bt.tankReverse', {
    start: (ctx) => {
      const { agent: t } = ctx;
      const a = ownSide(t);
      drive(ctx, t.x + Math.cos(a) * 14, t.y + Math.sin(a) * 14, 2.5, true);
      t.bb.intent = 'tankRetreat';
      t.say('tankRetreat', ctx.now);
    },
    tick: ({ agent: t }) => (t.loco.status === 'arrived' ? SUCCESS : t.loco.status === 'failed' || t.loco.status === 'idle' ? FAILURE : RUNNING),
    stop: (ctx) => halt(ctx),
  }),
]);

const duel = seq('bt.tankDuel', [
  cond('bt.enemyTankVisible', ({ agent: t, world: sim }) => {
    const e = enemyTankInSight(sim, t);
    t.bb.target = e ? e.id : t.bb.target;
    return !!e;
  }),
  act('bt.faceArmour', {
    start: (ctx) => {
      halt(ctx);
      ctx.agent.bb.intent = 'tankDuel';
    },
    tick: (ctx) => {
      const { agent: t, world: sim } = ctx;
      const e = enemyTankInSight(sim, t);
      if (!e) return SUCCESS;
      // keep the thick front plate toward the enemy: pivot in place
      const a = Math.atan2(e.y - t.y, e.x - t.x);
      const diff = Math.atan2(Math.sin(a - t.angle), Math.cos(a - t.angle));
      if (Math.abs(diff) > 0.25) {
        drive(ctx, t.x + Math.cos(a) * 2.2, t.y + Math.sin(a) * 2.2, 1.2);
      } else halt(ctx);
      return RUNNING;
    },
    stop: (ctx) => halt(ctx),
  }),
]);

const avoidAT = seq('bt.tankAvoidAT', [
  cond('bt.atThreat', ({ agent: t, world: sim, now }) => {
    if (now - t.bb.lastBackOff < 8) return false;
    for (const c of t.contacts.values()) {
      if (sim.time - c.t > 4 || c.isTank) continue;
      const e = sim.get(c.id);
      if (e && e.kind === 'soldier' && e.active && e.rockets > 0 && Math.hypot(c.x - t.x, c.y - t.y) < 13) return true;
    }
    return false;
  }),
  act('bt.tankBackOff', {
    start: (ctx) => {
      const { agent: t } = ctx;
      t.bb.lastBackOff = ctx.now;
      const a = ownSide(t) + (t.id % 2 ? 0.5 : -0.5);
      drive(ctx, t.x + Math.cos(a) * 10, t.y + Math.sin(a) * 10, 2.5, true);
      t.bb.intent = 'tankBackOff';
    },
    tick: ({ agent: t }) => (t.loco.status === 'arrived' ? SUCCESS : t.loco.status === 'failed' || t.loco.status === 'idle' ? FAILURE : RUNNING),
    stop: (ctx) => halt(ctx),
  }),
]);

const advance = seq('bt.tankAdvance', [
  cond('bt.tankHasObjective', ({ agent: t, world: sim }) => {
    const sq = sim.squads[t.squad];
    const o = sq?.order;
    if (!o) return false;
    t.bb.goal = { x: o.x, y: o.y };
    return true;
  }),
  act('bt.tankMove', {
    start: ({ agent: t }) => {
      t.bb.intent = 'tankAdvance';
    },
    tick: (ctx) => {
      const { agent: t, world: sim, now } = ctx;
      const g = t.bb.goal;
      if (!g) return FAILURE;
      const sq = sim.squads[t.squad];
      // wait for the infantry if they lag far behind
      let sum = 0;
      let n = 0;
      for (const id of sq.members) {
        const m = sim.soldier(id);
        if (!m || !m.active) continue;
        sum += Math.hypot(m.x - t.x, m.y - t.y);
        n++;
      }
      const d = Math.hypot(g.x - t.x, g.y - t.y);
      const stopAt = 8;
      // squad centroid lagging well behind (farther from the goal than we are)
      let behind = false;
      if (n > 0) {
        let cx = 0;
        let cy = 0;
        for (const id of sq.members) {
          const m = sim.soldier(id);
          if (!m || !m.active) continue;
          cx += m.x / n;
          cy += m.y / n;
        }
        behind = sum / n > 18 && Math.hypot(g.x - cx, g.y - cy) > d + 12;
      }
      if (behind && threats(sim, t, 8).length > 0 && !t.escorts.some((e) => e >= 0)) {
        halt(ctx);
        t.bb.intent = 'tankWait';
        return RUNNING;
      }
      if (d < stopAt) {
        halt(ctx);
        t.bb.intent = 'tankOverwatch';
        return RUNNING;
      }
      t.bb.intent = 'tankAdvance';
      if (!t.loco.moving || Math.hypot(t.loco.gx - g.x, t.loco.gy - g.y) > 2) drive(ctx, g.x, g.y, stopAt - 1);
      if (Math.abs(t.speed) > 0.5) t.bb.lastReposition = now;
      if (t.loco.status === 'failed') {
        halt(ctx);
        return FAILURE;
      }
      return RUNNING;
    },
    stop: (ctx, interrupted) => {
      if (interrupted) halt(ctx);
    },
  }),
]);

const hold = act('bt.tankHold', {
  start: (ctx) => {
    halt(ctx);
    ctx.agent.bb.intent = 'tankHold';
  },
  tick: () => RUNNING,
});

function targetScore(sim: Simulation, t: Tank, e: Agent): { score: number; cannon: boolean } {
  const d = Math.hypot(e.x - t.x, e.y - t.y);
  if (e.kind === 'tank') return { score: 200 - d, cannon: true };
  let score = 40 - d;
  if (e.rockets > 0) score += 25;
  let cluster = 0;
  for (const c of t.contacts.values()) {
    if (c.isTank || sim.time - c.t > 3) continue;
    if (Math.hypot(c.x - e.x, c.y - e.y) < 4) cluster++;
  }
  score += cluster * 6;
  const covered = protectionFrom(sim.map, e.x, e.y, t.x, t.y) > 0.5 || sim.map.isIndoor(e.x, e.y) >= 0;
  let friendNear = false;
  for (const f of sim.soldiers) {
    if (f.team === t.team && f.alive && Math.hypot(f.x - e.x, f.y - e.y) < 5.5) {
      friendNear = true;
      break;
    }
  }
  const cannon = !friendNear && d > 12 && (cluster >= 3 || covered || e.rockets > 0);
  return { score, cannon };
}

const gunnery = seq('bt.gunnery', [
  act('bt.tankSelectTarget', {
    tick: ({ agent: t, world: sim }) => {
      let best: Agent | null = null;
      let bestScore = -Infinity;
      let cannon = false;
      for (const c of t.contacts.values()) {
        if (!c.visible) continue;
        const e = sim.get(c.id);
        if (!e || !e.alive) continue;
        if (e.kind === 'soldier' && e.state !== 'healthy' && e.state !== 'wounded') continue;
        if (Math.hypot(e.x - t.x, e.y - t.y) > TANK.cannonRange) continue;
        const r = targetScore(sim, t, e);
        const sc = r.score + (e.id === t.bb.target ? 8 : 0);
        if (sc > bestScore) {
          bestScore = sc;
          best = e;
          cannon = r.cannon;
        }
      }
      t.bb.target = best ? best.id : -1;
      t.bb.cannonOK = cannon;
      if (!best) {
        // rest the turret toward the most recent threat or the enemy side
        const th = threats(sim, t, 10);
        t.bb.watch = th.length ? Math.atan2(th[0].y - t.y, th[0].x - t.x) : null;
      }
      return best ? SUCCESS : FAILURE;
    },
  }),
]);

let tree: BehaviorTree<Tank, Simulation> | null = null;

export function getTankTree(): BehaviorTree<Tank, Simulation> {
  if (tree) return tree;
  tree = new BehaviorTree<Tank, Simulation>(
    'tank',
    new Parallel<Tank, Simulation>('bt.tank', [sel('bt.tankDrive', [retreat, duel, avoidAT, advance, hold]), gunnery]),
  );
  return tree;
}
