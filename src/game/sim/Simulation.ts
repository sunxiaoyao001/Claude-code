import { angleDiff, clamp, turnToward } from '../core/math';
import { Rng } from '../core/rng';
import { SpatialHash } from '../core/SpatialHash';
import type { BehaviorTree } from './ai/bt/BehaviorTree';
import { runCommander, updateRescueAssignments } from './ai/commander';
import { perceive, updateGrenadeAwareness } from './ai/perception';
import { getSoldierTree } from './ai/soldierTree';
import { getTankTree } from './ai/tankTree';
import { killSoldier } from './combat/damage';
import { destroyCell, launchProjectile, updateGrenades, updateProjectiles, updateSmokes } from './combat/explosives';
import { fireBullet, soldierSpread, tankCoaxOrigin } from './combat/weapons';
import { BT_INTERVAL, DT, PERCEPTION_INTERVAL, SMOKE, SOLDIER, TANK, WEAPONS } from './config';
import {
  Soldier,
  Tank,
  type Agent,
  type Debris,
  type Fire,
  type Grenade,
  type Projectile,
  type SmokeCloud,
  type Squad,
} from './entities';
import type { FeedEntry, SimEvent, TacticKind } from './events';
import { CoverMap } from './map/cover';
import { Cell, CELL_INFO, Ground, type GameMap } from './map/GameMap';
import { generateMap } from './map/generate';
import { hasLOS } from './nav/los';
import { NavGrid } from './nav/NavGrid';
import { PathService } from './nav/PathService';
import { PhysicsWorld, PHYS } from './PhysicsWorld';
import type { BattleConfig, Role, Skill, TeamId } from './types';

export interface TeamStats {
  kills: number;
  deaths: number;
  downed: number;
  revives: number;
  shots: number;
  hits: number;
  grenades: number;
  throwBacks: number;
  dodges: number;
  smokes: number;
  rockets: number;
  tankKills: number;
  damage: number;
  captures: number;
  tankShield: number;
  flanks: number;
  scavenges: number;
}

export interface TeamState {
  id: TeamId;
  skill: Skill;
  score: number;
  stats: TeamStats;
  /** Cover cell -> soldier id. */
  coverRes: Map<number, number>;
  /** Downed soldier id -> assigned rescuer id. */
  rescues: Map<number, number>;
  lastCommand: number;
}

export interface PointState {
  id: number;
  label: string;
  x: number;
  y: number;
  r: number;
  owner: TeamId | -1;
  /** -1 (team 1 owns) .. 1 (team 0 owns). */
  capture: number;
  contested: boolean;
  n: [number, number];
}

export interface TimelineSample {
  t: number;
  alive: [number, number];
  score: [number, number];
}

const newTeamStats = (): TeamStats => ({
  kills: 0,
  deaths: 0,
  downed: 0,
  revives: 0,
  shots: 0,
  hits: 0,
  grenades: 0,
  throwBacks: 0,
  dodges: 0,
  smokes: 0,
  rockets: 0,
  tankKills: 0,
  damage: 0,
  captures: 0,
  tankShield: 0,
  flanks: 0,
  scavenges: 0,
});

const SURNAMES: [string[], string[]] = [
  ['Novak', 'Chen', 'Haddad', 'Okafor', 'Lindqvist', 'Moreau', 'Kowalski', 'Reyes', 'Tanaka', 'Brennan', 'Adeyemi', 'Varga', 'Holt', 'Sato', 'Dubois', 'Mbeki', 'Larsen', 'Ortiz', 'Quinn', 'Weber', 'Park', 'Rossi', 'Kaur', 'Fischer'],
  ['Volkov', 'Ito', 'Silva', 'Petrov', 'Ivanova', 'Kaya', 'Morozov', 'Zhou', 'Romero', 'Popescu', 'Nakamura', 'Grieg', 'Sokolov', 'Ferro', 'Demir', 'Lebedev', 'Castro', 'Hale', 'Abara', 'Kirov', 'Duval', 'Yilmaz', 'Strand', 'Varela'],
];

const SQUAD_NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'];

export const SCORE_LIMIT = 600;

export class Simulation {
  readonly rng: Rng;
  readonly map: GameMap;
  readonly nav: NavGrid;
  readonly cover: CoverMap;
  readonly paths: PathService;
  readonly physics: PhysicsWorld;
  readonly soldiers: Soldier[] = [];
  readonly tanks: Tank[] = [];
  readonly agents = new Map<number, Agent>();
  /** Alive agents, rebuilt every tick. */
  liveAgents: Agent[] = [];
  readonly squads: Squad[] = [];
  readonly grenades: Grenade[] = [];
  readonly projectiles: Projectile[] = [];
  readonly smokes: SmokeCloud[] = [];
  readonly debris: Debris[] = [];
  readonly fires: Fire[] = [];
  readonly points: PointState[];
  readonly teams: [TeamState, TeamState];
  readonly hash: SpatialHash<Agent>;
  readonly timeline: TimelineSample[] = [];
  events: SimEvent[] = [];
  readonly feed: FeedEntry[] = [];
  time = 0;
  tick = 0;
  winner: TeamId | -1 | null = null;
  endedAt = 0;
  structuresDestroyed = 0;
  private nextId = 1;
  private feedId = 1;
  readonly soldierTree: BehaviorTree<Soldier, Simulation>;
  readonly tankTree: BehaviorTree<Tank, Simulation>;
  /** Performance counters (ms) for the debug overlay. */
  readonly perf = { step: 0, physics: 0, ai: 0 };

  constructor(readonly config: BattleConfig) {
    this.rng = new Rng(config.seed);
    this.map = generateMap(config);
    this.nav = new NavGrid(this.map);
    this.cover = new CoverMap(this.map);
    this.paths = new PathService(this.nav);
    this.physics = new PhysicsWorld(this.map);
    this.hash = new SpatialHash<Agent>(this.map.w, this.map.h, 8);
    this.points = this.map.points.map((p) => ({ ...p, owner: -1 as const, capture: 0, contested: false, n: [0, 0] as [number, number] }));
    this.teams = [0, 1].map((id) => ({
      id: id as TeamId,
      skill: config.skill[id],
      score: 0,
      stats: newTeamStats(),
      coverRes: new Map(),
      rescues: new Map(),
      lastCommand: -10 + id * 1.2,
    })) as [TeamState, TeamState];
    this.soldierTree = getSoldierTree();
    this.tankTree = getTankTree();
    this.spawnTeam(0);
    this.spawnTeam(1);
    this.liveAgents = [...this.agents.values()];
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  newId() {
    return this.nextId++;
  }

  private squadRoles(index: number, size: number): Role[] {
    const base: Role[] = ['rifleman', index % 2 === 1 ? 'sniper' : 'rifleman', 'mg', 'medic', 'at'];
    while (base.length < size) base.push('rifleman');
    return base.slice(0, size);
  }

  private spawnTeam(team: TeamId) {
    const cfg = this.config;
    const zone = this.map.spawns[team];
    const rng = this.rng;
    const names = rng.shuffle([...SURNAMES[team]]);
    const squadCount = Math.round(cfg.scale / 5);
    const facing = zone.facing;
    const cx = (zone.x0 + zone.x1) / 2;
    const cy = (zone.y0 + zone.y1) / 2;
    // tanks first (they need the clearest spots)
    const tankYs = cfg.tanks === 1 ? [0] : cfg.tanks === 2 ? [-5.5, 5.5] : cfg.tanks >= 3 ? [-7, 0, 7] : [];
    tankYs.slice(0, cfg.tanks).forEach((oy, k) => {
      const t = new Tank(this.newId(), team, `${team === 0 ? 'Bulwark' : 'Anvil'}-${k + 1}`, cfg.skill[team], cx, cy + oy * (team === 0 ? 1 : -1), facing);
      t.body = this.physics.addTank(t.x, t.y, t.length, t.width, t.angle);
      t.bt = this.tankTree.createInstance();
      this.tanks.push(t);
      this.agents.set(t.id, t);
    });
    let nameIdx = 0;
    let remaining = cfg.scale;
    for (let q = 0; q < squadCount; q++) {
      const size = q === squadCount - 1 ? remaining : 5;
      remaining -= size;
      const squad: Squad = { id: this.squads.length, team, name: SQUAD_NAMES[q % SQUAD_NAMES.length], members: [], order: null, tank: -1, orderedAt: -10 };
      this.squads.push(squad);
      const roles = this.squadRoles(q, size);
      // squads line up across the spawn zone, staggered depth
      const laneY = zone.y0 + ((q + 0.5) / squadCount) * (zone.y1 - zone.y0);
      roles.forEach((role, k) => {
        let x = 0;
        let y = 0;
        for (let tries = 0; tries < 40; tries++) {
          x = (team === 0 ? zone.x0 + 1.2 : zone.x1 - 1.2) + (team === 0 ? 1 : -1) * (k % 3) * 1.4 + rng.range(-0.3, 0.3);
          y = laneY + (Math.floor(k / 3) - 0.5) * 1.6 + (k % 2) * 0.7 + rng.range(-0.3, 0.3);
          if (this.map.walkablePos(x, y) && !this.tanks.some((t) => Math.hypot(t.x - x, t.y - y) < 3.6)) break;
        }
        const s = new Soldier(this.newId(), team, role, names[nameIdx++ % names.length], cfg.skill[team], x, y, facing);
        s.squad = squad.id;
        s.leader = k === 0;
        s.traitSeed = rng.int(0, 1 << 30);
        s.body = this.physics.addSoldier(x, y, s.radius);
        s.bt = this.soldierTree.createInstance();
        squad.members.push(s.id);
        this.soldiers.push(s);
        this.agents.set(s.id, s);
      });
    }
    // attach tanks to squads round-robin
    const teamTanks = this.tanks.filter((t) => t.team === team);
    const teamSquads = this.squads.filter((s) => s.team === team);
    teamTanks.forEach((t, i) => {
      const sq = teamSquads[i % teamSquads.length];
      if (sq) {
        sq.tank = t.id;
        t.squad = sq.id;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers used by AI and combat
  // ---------------------------------------------------------------------------

  get(id: number): Agent | undefined {
    return this.agents.get(id);
  }

  soldier(id: number): Soldier | undefined {
    const a = this.agents.get(id);
    return a && a.kind === 'soldier' ? a : undefined;
  }

  emit(e: SimEvent) {
    this.events.push(e);
  }

  /** Drain pending render/UI events. */
  drainEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  pushFeed(kind: FeedEntry['kind'], team: TeamId | -1, key: string, params: Record<string, string | number>, x: number, y: number, focus: number) {
    this.feed.push({ id: this.feedId++, t: this.time, kind, team, text: '', key, params, x, y, focus });
    if (this.feed.length > 200) this.feed.splice(0, this.feed.length - 200);
  }

  private tacticSeen = new Map<string, number>();

  /** Record a notable tactical action (throttled per unit & kind for the feed). */
  tactic(kind: TacticKind, a: Agent, x = a.x, y = a.y) {
    const key = `${a.id}:${kind}`;
    const last = this.tacticSeen.get(key) ?? -1e9;
    if (this.time - last < 20) return;
    this.tacticSeen.set(key, this.time);
    this.emit({ type: 'tactic', kind, id: a.id, team: a.team, x, y });
    this.pushFeed('tactic', a.team, `tactic.${kind}`, { unit: a.id }, x, y, a.id);
  }

  /** Observer learns about target's position (seen or only heard). */
  reveal(observer: Agent, target: Agent, visible: boolean) {
    if (observer.team === target.team || !target.alive) return;
    const c = observer.contacts.get(target.id);
    const jitter = visible ? 0 : 1.6;
    if (c) {
      if (c.visible && !visible) {
        c.t = this.time;
        return;
      }
      c.x = target.x + (jitter ? this.rng.range(-jitter, jitter) : 0);
      c.y = target.y + (jitter ? this.rng.range(-jitter, jitter) : 0);
      c.t = this.time;
      c.visible = c.visible || visible;
      c.confirmed = c.confirmed || visible;
    } else {
      observer.contacts.set(target.id, {
        id: target.id,
        x: target.x + (jitter ? this.rng.range(-jitter, jitter) : 0),
        y: target.y + (jitter ? this.rng.range(-jitter, jitter) : 0),
        t: this.time,
        visible,
        confirmed: visible,
        isTank: target.kind === 'tank',
      });
      if (observer.kind === 'soldier' && observer.bb.threatSince < this.time - 3) observer.bb.threatSince = this.time;
    }
  }

  broadcastGunfire(shooter: Agent, radius: number) {
    const r2 = radius * radius;
    for (const a of this.liveAgents) {
      if (a.team === shooter.team) continue;
      const dx = a.x - shooter.x;
      const dy = a.y - shooter.y;
      if (dx * dx + dy * dy <= r2) this.reveal(a, shooter, false);
    }
  }

  los(ax: number, ay: number, bx: number, by: number) {
    return hasLOS(this.map, this.smokes, ax, ay, bx, by);
  }

  resetBrain(a: Agent) {
    if (a.kind === 'soldier') {
      this.soldierTree.reset(a.bt, { agent: a, world: this, now: this.time, dt: DT });
      a.loco.stop(this.paths);
      this.releaseCover(a);
      this.releaseShield(a);
      a.bb.target = -1;
      a.bb.rescue = -1;
      a.bb.grenade = -1;
      for (const g of this.grenades) if (g.heldBy === a.id) g.heldBy = -1;
    } else {
      this.tankTree.reset(a.bt, { agent: a, world: this, now: this.time, dt: DT });
      a.loco.stop(this.paths);
    }
  }

  /** Bookkeeping when an agent dies. */
  loseUnit(a: Agent) {
    const team = this.teams[a.team];
    for (const [k, v] of team.rescues) if (v === a.id || k === a.id) team.rescues.delete(k);
    if (a.kind === 'soldier') {
      const sq = this.squads[a.squad];
      if (sq && a.leader) {
        a.leader = false;
        const next = sq.members.map((id) => this.soldier(id)).find((s) => s && s.active);
        if (next) next.leader = true;
      }
    } else {
      for (const id of a.escorts) {
        const s = this.soldier(id);
        if (s) {
          s.bb.shieldTank = -1;
          s.bb.shieldSlot = -1;
        }
      }
      a.escorts.fill(-1);
    }
  }

  reserveCover(s: Soldier, cell: number) {
    this.releaseCover(s);
    this.teams[s.team].coverRes.set(cell, s.id);
    s.bb.cover = cell;
  }

  releaseCover(s: Soldier) {
    if (s.bb.cover >= 0) {
      const res = this.teams[s.team].coverRes;
      if (res.get(s.bb.cover) === s.id) res.delete(s.bb.cover);
    }
    s.bb.cover = -1;
    s.bb.coverReason = '';
  }

  coverTakenBy(team: TeamId, cell: number) {
    return this.teams[team].coverRes.get(cell) ?? -1;
  }

  releaseShield(s: Soldier) {
    if (s.bb.shieldTank >= 0) {
      const t = this.get(s.bb.shieldTank);
      if (t && t.kind === 'tank' && t.escorts[s.bb.shieldSlot] === s.id) t.escorts[s.bb.shieldSlot] = -1;
    }
    s.bb.shieldTank = -1;
    s.bb.shieldSlot = -1;
  }

  structureChanged(x: number, y: number) {
    this.map.markChanged(x, y);
    this.nav.updateAround(x, y);
    this.cover.updateAround(x, y);
    this.physics.syncCell(x, y);
    // any reserved cover that stopped being cover is released lazily by the AI
  }

  spawnDebris(x: number, y: number, mat: number, speed: number, dirt = false) {
    if (this.debris.length > 140) {
      const old = this.debris.shift()!;
      if (old.body) this.physics.remove(old.body);
    }
    const a = this.rng.range(0, Math.PI * 2);
    const size = dirt ? this.rng.range(0.15, 0.3) : this.rng.range(0.25, 0.5);
    const d: Debris = {
      id: this.newId(),
      body: this.physics.addDebris(x + Math.cos(a) * 0.3, y + Math.sin(a) * 0.3, size, a),
      x,
      y,
      angle: a,
      size,
      mat,
      z: dirt ? 0.3 : this.rng.range(0.5, 2),
      vz: this.rng.range(2, 5),
      life: this.rng.range(14, 24),
    };
    const v = speed * this.rng.range(0.4, 1);
    if (d.body) this.physics.setVelocity(d.body, Math.cos(a) * v, Math.sin(a) * v);
    this.debris.push(d);
  }

  addSmoke(x: number, y: number, team: TeamId) {
    const c: SmokeCloud = { id: this.newId(), x, y, r: 1.2, rMax: SMOKE.radius, density: SMOKE.density, age: 0, life: SMOKE.life, team };
    this.smokes.push(c);
    this.emit({ type: 'smokeCloud', id: c.id, x, y });
  }

  addFire(x: number, y: number, life: number, intensity: number) {
    this.fires.push({ id: this.newId(), x, y, life, intensity });
  }

  isActiveTeamUnit(a: Agent) {
    return a.kind === 'soldier' ? a.active : a.alive;
  }

  // ---------------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------------

  step() {
    const t0 = performance.now();
    const dt = DT;
    this.time += dt;
    this.tick++;
    const now = this.time;

    for (const s of this.soldiers) {
      s.px = s.x;
      s.py = s.y;
      s.pfacing = s.facing;
    }
    for (const t of this.tanks) {
      t.px = t.x;
      t.py = t.y;
      t.pangle = t.angle;
      t.pturret = t.turret;
    }

    this.liveAgents = this.liveAgents.filter((a) => a.alive);
    this.hash.clear();
    for (const a of this.liveAgents) this.hash.insert(a);

    if (this.winner === null) {
      const ta = performance.now();
      // perception
      for (const a of this.liveAgents) {
        if ((a.id + this.tick) % PERCEPTION_INTERVAL === 0 && (a.kind === 'tank' || a.active)) perceive(this, a);
      }
      updateGrenadeAwareness(this);
      // command layer
      for (const team of this.teams) {
        if (now - team.lastCommand >= 2.5) {
          team.lastCommand = now;
          runCommander(this, team.id);
        }
      }
      if (this.tick % 15 === 0) {
        updateRescueAssignments(this, 0);
        updateRescueAssignments(this, 1);
      }
      // decisions
      for (const s of this.soldiers) {
        if (s.state === 'dead') continue;
        const interval = s.state === 'downed' ? BT_INTERVAL * 3 : BT_INTERVAL;
        if ((s.id + this.tick) % interval === 0) this.soldierTree.tick(s.bt, { agent: s, world: this, now, dt: dt * interval });
      }
      for (const t of this.tanks) {
        if (!t.alive) continue;
        if ((t.id + this.tick) % BT_INTERVAL === 0) this.tankTree.tick(t.bt, { agent: t, world: this, now, dt: dt * BT_INTERVAL });
      }
      this.paths.process(9000);
      this.perf.ai = this.perf.ai * 0.9 + (performance.now() - ta) * 0.1;
    }

    // action layer (motors & weapons)
    for (const s of this.soldiers) this.updateSoldier(s, dt);
    for (const t of this.tanks) this.updateTank(t, dt);

    // physics
    const tp = performance.now();
    this.physics.step(2);
    this.perf.physics = this.perf.physics * 0.9 + (performance.now() - tp) * 0.1;
    for (const s of this.soldiers) {
      if (!s.body) continue;
      s.x = s.body.position.x / PHYS;
      s.y = s.body.position.y / PHYS;
    }
    for (const t of this.tanks) {
      if (!t.body) continue;
      t.x = t.body.position.x / PHYS;
      t.y = t.body.position.y / PHYS;
      if (t.alive) this.crush(t);
    }

    // projectiles & environment
    updateGrenades(this, dt);
    updateProjectiles(this, dt);
    updateSmokes(this, dt);
    this.updateDebris(dt);
    for (let i = this.fires.length - 1; i >= 0; i--) {
      this.fires[i].life -= dt;
      if (this.fires[i].life <= 0) this.fires.splice(i, 1);
    }

    // occupancy (roof fading + collapse victims)
    for (const b of this.map.buildings) b.occupants = 0;
    for (const s of this.soldiers) {
      if (s.state === 'dead') {
        s.indoor = -1;
        continue;
      }
      s.indoor = this.map.isIndoor(s.x, s.y);
      if (s.indoor >= 0) this.map.buildings[s.indoor].occupants++;
    }

    if (this.winner === null) {
      this.updatePoints(dt);
      this.checkVictory();
      if (this.tick % 60 === 0) this.sampleTimeline();
    }
    this.perf.step = this.perf.step * 0.9 + (performance.now() - t0) * 0.1;
  }

  // ---------------------------------------------------------------------------
  // Soldiers
  // ---------------------------------------------------------------------------

  private modeSpeed(mode: string) {
    return mode === 'sprint' ? SOLDIER.sprint : mode === 'walk' ? SOLDIER.walk : mode === 'crouch' ? SOLDIER.crouch : SOLDIER.run;
  }

  private neighbourBuf: Agent[] = [];

  private updateSoldier(s: Soldier, dt: number) {
    const now = this.time;
    if (s.state === 'dead') return;
    if (s.state === 'downed') {
      s.bleed -= dt;
      // crawl toward cover if the behaviour tree asked for it
      const wp = this.winner === null ? s.loco.follow(this.paths, s.x, s.y, dt, 0.3) : null;
      if (wp) {
        const dx = wp.x - s.x;
        const dy = wp.y - s.y;
        const d = Math.hypot(dx, dy) || 1;
        s.vx = (dx / d) * 0.45;
        s.vy = (dy / d) * 0.45;
        s.facing = turnToward(s.facing, Math.atan2(dy, dx), 3 * dt);
      } else s.vx = s.vy = 0;
      if (s.body) this.physics.setVelocity(s.body, s.vx, s.vy);
      if (s.bleed <= 0) killSoldier(this, s, null, 'bleed');
      return;
    }
    if (this.winner !== null) {
      s.vx *= 0.8;
      s.vy *= 0.8;
      if (s.body) this.physics.setVelocity(s.body, s.vx, s.vy);
      s.anim = 'idle';
      s.loco.stop(this.paths);
      return;
    }
    const quiet = now - s.lastHitAt > 1.5;
    s.suppression = Math.max(0, s.suppression - dt * (quiet ? 0.2 : 0.07));
    if (s.state === 'wounded' && s.hp >= s.maxHp * 0.6) s.state = 'healthy';

    const busy = s.busy(now);
    let dvx = 0;
    let dvy = 0;
    let moving = false;
    const wp = !busy ? s.loco.follow(this.paths, s.x, s.y, dt) : null;
    if (wp) {
      const dx = wp.x - s.x;
      const dy = wp.y - s.y;
      const d = Math.hypot(dx, dy);
      let speed = this.modeSpeed(s.loco.mode) * s.speedMul;
      if (s.state === 'wounded') speed *= 0.8;
      if (s.loco.mode !== 'sprint') speed *= 1 - 0.25 * s.suppression;
      const g = this.map.ground[this.map.idx(clamp(Math.floor(s.x), 0, this.map.w - 1), clamp(Math.floor(s.y), 0, this.map.h - 1))];
      if (g === Ground.Snow) speed *= 0.92;
      if (this.map.kindAtPos(s.x, s.y) === Cell.Rubble) speed *= 0.8;
      if (s.loco.idx === s.loco.path.length - 1) speed *= clamp(d / 0.9, 0.35, 1);
      if (d > 1e-3) {
        dvx = (dx / d) * speed;
        dvy = (dy / d) * speed;
        moving = true;
      }
    }
    // separation from friends
    const nb = this.neighbourBuf;
    nb.length = 0;
    this.hash.query(s.x, s.y, 0.9, nb);
    for (const o of nb) {
      if (o === s || o.kind !== 'soldier' || o.state === 'downed') continue;
      const dx = s.x - o.x;
      const dy = s.y - o.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const push = (0.9 - d) * (moving ? 1.6 : 2.2);
      dvx += (dx / d) * push;
      dvy += (dy / d) * push;
    }
    const k = Math.min(1, dt * 11);
    s.vx += (dvx - s.vx) * k;
    s.vy += (dvy - s.vy) * k;
    if (Math.abs(s.vx) < 0.02 && Math.abs(s.vy) < 0.02) s.vx = s.vy = 0;
    if (s.body) this.physics.setVelocity(s.body, s.vx, s.vy);

    // stance
    if (moving) s.stance = s.loco.mode === 'crouch' ? 'crouch' : 'stand';
    else s.stance = s.wantStance;

    // facing
    const speed = Math.hypot(s.vx, s.vy);
    const sprinting = moving && s.loco.mode === 'sprint';
    const tgt = s.bb.target >= 0 ? this.get(s.bb.target) : undefined;
    let desired = s.facing;
    if (busy && s.busyKind !== '') desired = s.busyFacing;
    else if (tgt && tgt.alive && !sprinting && s.contacts.get(tgt.id)?.visible) desired = Math.atan2(tgt.y - s.y, tgt.x - s.x);
    else if (moving && speed > 0.3) desired = Math.atan2(s.vy, s.vx);
    else desired = s.watch;
    s.facing = turnToward(s.facing, desired, (moving ? 7 : 10) * dt);
    s.aim = s.facing;
    s.phase += speed * dt * 1.9;

    this.updateSoldierWeapon(s, dt, moving && speed > 0.6);

    if (busy) s.anim = s.busyKind === 'revive' || s.busyKind === 'heal' ? 'revive' : s.busyKind === 'pickup' ? 'revive' : 'throw';
    else if (s.reloadT > 0) s.anim = 'reload';
    else if (speed > 3.2) s.anim = 'run';
    else if (speed > 0.35) s.anim = 'walk';
    else s.anim = s.aimTarget >= 0 && tgt && tgt.alive ? 'aim' : 'idle';
  }

  startReload(s: Soldier) {
    if (s.reloadT > 0 || s.reserve <= 0 || s.mag >= s.weapon.mag) return;
    s.reloadT = s.weapon.reload;
    if (this.rng.chance(0.35)) s.say('reloading', this.time);
  }

  private updateSoldierWeapon(s: Soldier, dt: number, moving: boolean) {
    const now = this.time;
    s.fireCd = Math.max(s.fireCd - dt, -dt);
    s.rocketCd -= dt;
    if (s.reloadT > 0) {
      s.reloadT -= dt;
      if (s.reloadT <= 0) {
        const take = Math.min(s.weapon.mag - s.mag, s.reserve);
        s.mag += take;
        s.reserve -= take;
        s.reloadT = 0;
      }
      return;
    }
    if (s.busy(now)) return;
    if (moving && s.loco.mode === 'sprint') return;
    const tgt = s.bb.target >= 0 ? this.get(s.bb.target) : undefined;
    if (!tgt || !tgt.alive || tgt.kind === 'tank' || tgt.state === 'downed') {
      s.aimTarget = -1;
      s.aimT = 0;
      return;
    }
    const c = s.contacts.get(tgt.id);
    if (!c || !c.visible) {
      s.aimT = 0;
      return;
    }
    const d = Math.hypot(tgt.x - s.x, tgt.y - s.y);
    if (d > s.weapon.range) return;
    if (s.aimTarget !== tgt.id) {
      s.aimTarget = tgt.id;
      s.aimT = 0;
    }
    s.aimT += dt;
    const err = Math.abs(angleDiff(s.facing, Math.atan2(tgt.y - s.y, tgt.x - s.x)));
    if (err > 0.22 || s.aimT < s.skillDef.aimTime) return;
    if (s.mag <= 0) {
      this.startReload(s);
      return;
    }
    let shots = 0;
    while (s.fireCd <= 0 && s.mag > 0 && shots < 3) {
      if (s.burstLeft <= 0) s.burstLeft = this.rng.int(s.weapon.burst[0], s.weapon.burst[1]);
      const sigma = soldierSpread(s, moving, tgt);
      const mz = s.stance === 'stand' ? 1.35 : s.stance === 'crouch' ? 0.85 : 0.3;
      fireBullet(this, s, s.x + Math.cos(s.facing) * 0.45, s.y + Math.sin(s.facing) * 0.45, mz, tgt, s.weapon, sigma);
      s.mag--;
      s.burstLeft--;
      s.flashAt = now;
      shots++;
      s.fireCd += 60 / s.weapon.rpm;
      if (s.burstLeft <= 0) s.fireCd += this.rng.range(s.weapon.pause[0], s.weapon.pause[1]);
    }
    if (s.mag <= 0) this.startReload(s);
  }

  // ---------------------------------------------------------------------------
  // Tanks
  // ---------------------------------------------------------------------------

  private updateTank(t: Tank, dt: number) {
    if (t.state === 'dead') {
      if (t.body) this.physics.setVelocity(t.body, 0, 0);
      return;
    }
    const now = this.time;
    t.crushSlow = Math.max(0, t.crushSlow - dt);
    let targetSpeed = 0;
    if (this.winner === null) {
      const wp = t.loco.follow(this.paths, t.x, t.y, dt, 1.6);
      if (wp) {
        const reverse = t.bb.reverse;
        let desired = Math.atan2(wp.y - t.y, wp.x - t.x);
        if (reverse) desired += Math.PI;
        const diff = angleDiff(t.angle, desired);
        t.angle = turnToward(t.angle, desired, TANK.turnRate * dt);
        const escorted = t.escorts.some((id) => id >= 0);
        let max = reverse ? TANK.reverse : escorted ? TANK.escortSpeed : TANK.speed;
        if (t.state === 'wounded') max *= 0.75;
        if (t.crushSlow > 0) max *= 0.45;
        const d = Math.hypot(wp.x - t.x, wp.y - t.y);
        if (t.loco.idx === t.loco.path.length - 1) max *= clamp(d / 3, 0.25, 1);
        targetSpeed = Math.abs(diff) > 0.55 ? 0.35 : max * Math.max(0.3, Math.cos(diff));
        if (reverse) targetSpeed = -targetSpeed;
        // don't run over friends standing in front
        const fx = Math.cos(t.angle) * (reverse ? -1 : 1);
        const fy = Math.sin(t.angle) * (reverse ? -1 : 1);
        for (const s of this.soldiers) {
          if (s.team !== t.team || !s.alive) continue;
          const rx = s.x - t.x;
          const ry = s.y - t.y;
          const ahead = rx * fx + ry * fy;
          const side = Math.abs(-rx * fy + ry * fx);
          if (ahead > 2 && ahead < 5.5 && side < 2.2) targetSpeed *= 0.25;
        }
      }
    }
    const accel = targetSpeed > t.speed ? 1.8 : 3.2;
    t.speed += clamp(targetSpeed - t.speed, -accel * dt, accel * dt);
    t.vx = Math.cos(t.angle) * t.speed;
    t.vy = Math.sin(t.angle) * t.speed;
    if (t.body) {
      this.physics.setVelocity(t.body, t.vx, t.vy);
      this.physics.setAngle(t.body, t.angle);
    }
    if (Math.abs(t.speed) > 0.3) t.smokeTrail += dt;

    // turret & guns
    const tgt = t.bb.target >= 0 ? this.get(t.bb.target) : undefined;
    let desiredTurret = t.angle;
    if (tgt && tgt.alive) desiredTurret = Math.atan2(tgt.y - t.y, tgt.x - t.x);
    else if (t.bb.watch !== null) desiredTurret = t.bb.watch;
    t.turret = turnToward(t.turret, desiredTurret, TANK.turretRate * dt);
    t.cannonCd -= dt;
    t.coaxCd = Math.max(t.coaxCd - dt, -dt);
    if (this.winner !== null || !tgt || !tgt.alive) return;
    const c = t.contacts.get(tgt.id);
    if (!c || !c.visible) return;
    const err = Math.abs(angleDiff(t.turret, desiredTurret));
    const d = Math.hypot(tgt.x - t.x, tgt.y - t.y);
    if (t.cannonCd <= 0 && t.shells > 0 && err < 0.05 && d < TANK.cannonRange && (tgt.kind === 'tank' || t.bb.cannonOK)) {
      const mx = t.x + Math.cos(t.turret) * 3.6;
      const my = t.y + Math.sin(t.turret) * 3.6;
      const tz = tgt.kind === 'tank' ? 1.1 : 0.6;
      launchProjectile(this, t, 'shell', mx, my, 2.0, tgt.x, tgt.y, tz, 0.012 * t.skillDef.spreadMul, tgt.id);
      t.cannonCd = tgt.kind === 'tank' ? TANK.cannonReload : TANK.cannonReload * 1.4;
      t.shells--;
      t.recoilAt = now;
      t.flashAt = now;
      // recoil kick
      if (t.body) this.physics.kick(t.body, -Math.cos(t.turret) * 0.6, -Math.sin(t.turret) * 0.6);
    }
    if (tgt.kind === 'soldier' && tgt.state !== 'downed' && err < 0.12 && d < WEAPONS.coax.range) {
      const w = WEAPONS.coax;
      let shots = 0;
      while (t.coaxCd <= 0 && shots < 2) {
        if (t.coaxBurst <= 0) t.coaxBurst = this.rng.int(w.burst[0], w.burst[1]);
        const o = tankCoaxOrigin(t);
        fireBullet(this, t, o.x, o.y, o.z, tgt, w, w.spread * t.skillDef.spreadMul * (Math.abs(t.speed) > 0.5 ? 1.5 : 1));
        t.coaxBurst--;
        t.coaxFlashAt = now;
        shots++;
        t.coaxCd += 60 / w.rpm;
        if (t.coaxBurst <= 0) t.coaxCd += this.rng.range(w.pause[0], w.pause[1]);
      }
    }
  }

  /** Tanks flatten soft structures their hull overlaps. */
  private crush(t: Tank) {
    if (Math.abs(t.speed) < 0.4) return;
    const c = Math.cos(t.angle);
    const s = Math.sin(t.angle);
    const hl = t.length / 2 + 0.15;
    const hw = t.width / 2 + 0.1;
    const r = Math.ceil(hl + 1);
    let crushed = false;
    for (let y = Math.floor(t.y - r); y <= Math.floor(t.y + r); y++)
      for (let x = Math.floor(t.x - r); x <= Math.floor(t.x + r); x++) {
        const k = this.map.kind(x, y);
        if (CELL_INFO[k].tank !== 'crush') continue;
        // test the cell's closest point to the hull centre
        const qx = clamp(t.x, x, x + 1);
        const qy = clamp(t.y, y, y + 1);
        const lx = (qx - t.x) * c + (qy - t.y) * s;
        const ly = -(qx - t.x) * s + (qy - t.y) * c;
        if (Math.abs(lx) <= hl && Math.abs(ly) <= hw) {
          destroyCell(this, x, y, 'crush');
          crushed = true;
        }
      }
    if (crushed) {
      if (t.crushSlow <= 0 && this.rng.chance(0.15)) this.tactic('crush', t);
      t.crushSlow = 0.5;
    }
  }

  // ---------------------------------------------------------------------------
  // World
  // ---------------------------------------------------------------------------

  private updateDebris(dt: number) {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      if (d.body) {
        d.x = d.body.position.x / PHYS;
        d.y = d.body.position.y / PHYS;
        d.angle = d.body.angle;
        if (d.z > 0 || d.vz > 0) {
          d.vz -= 9.8 * dt;
          d.z += d.vz * dt;
          if (d.z <= 0) {
            d.z = 0;
            d.vz = d.vz < -2 ? -d.vz * 0.3 : 0;
          }
        }
        // settle: drop the physics body once it stops
        if (d.z === 0 && d.vz === 0 && d.body.speed < 0.02 && d.life < 18) {
          this.physics.remove(d.body);
          d.body = null;
        }
      }
      if (d.life <= 0) {
        if (d.body) this.physics.remove(d.body);
        this.debris.splice(i, 1);
      }
    }
  }

  private updatePoints(dt: number) {
    for (const p of this.points) {
      p.n[0] = 0;
      p.n[1] = 0;
      for (const a of this.liveAgents) {
        if (!this.isActiveTeamUnit(a)) continue;
        if (Math.hypot(a.x - p.x, a.y - p.y) <= p.r) p.n[a.team] += a.kind === 'tank' ? 2 : 1;
      }
      p.contested = p.n[0] > 0 && p.n[1] > 0;
      const prevOwner = p.owner;
      if (!p.contested && (p.n[0] > 0 || p.n[1] > 0)) {
        const team = p.n[0] > 0 ? 0 : 1;
        const rate = 0.045 * Math.min(3, p.n[team]);
        p.capture = clamp(p.capture + (team === 0 ? rate : -rate) * dt, -1, 1);
      }
      if (p.capture >= 1) p.owner = 0;
      else if (p.capture <= -1) p.owner = 1;
      else if ((p.owner === 0 && p.capture <= 0) || (p.owner === 1 && p.capture >= 0)) p.owner = -1;
      if (p.owner !== prevOwner) {
        this.emit({ type: 'capture', point: p.id, team: p.owner });
        if (p.owner !== -1) {
          this.teams[p.owner].stats.captures++;
          this.pushFeed('capture', p.owner, 'feed.capture', { point: p.label }, p.x, p.y, -1);
        } else {
          this.pushFeed('capture', prevOwner, 'feed.neutral', { point: p.label }, p.x, p.y, -1);
        }
      }
      if (this.config.mode === 'domination' && p.owner !== -1) this.teams[p.owner].score += dt;
    }
  }

  activeCount(team: TeamId) {
    let n = 0;
    for (const s of this.soldiers) if (s.team === team && s.active) n++;
    for (const t of this.tanks) if (t.team === team && t.alive) n++;
    return n;
  }

  private checkVictory() {
    const a0 = this.activeCount(0);
    const a1 = this.activeCount(1);
    let w: TeamId | -1 | null = null;
    if (a0 === 0 && a1 === 0) w = -1;
    else if (a0 === 0) w = 1;
    else if (a1 === 0) w = 0;
    else if (this.config.mode === 'domination') {
      if (this.teams[0].score >= SCORE_LIMIT) w = 0;
      else if (this.teams[1].score >= SCORE_LIMIT) w = 1;
    }
    if (w === null && this.config.timeLimit > 0 && this.time >= this.config.timeLimit) {
      const s0 = this.teams[0].score + a0 * 25 + this.teams[0].stats.kills * 5;
      const s1 = this.teams[1].score + a1 * 25 + this.teams[1].stats.kills * 5;
      w = s0 > s1 ? 0 : s1 > s0 ? 1 : -1;
    }
    if (w !== null) {
      this.winner = w;
      this.endedAt = this.time;
      this.sampleTimeline();
      for (const t of this.tanks) t.bb.target = -1;
      for (const s of this.soldiers) s.bb.target = -1;
      this.emit({ type: 'end', winner: w });
    }
  }

  private sampleTimeline() {
    this.timeline.push({
      t: this.time,
      alive: [this.activeCount(0), this.activeCount(1)],
      score: [this.teams[0].score, this.teams[1].score],
    });
  }

  /** Rough "battle intensity" location for the cinematic camera. */
  hotspot(): { x: number; y: number } | null {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const s of this.soldiers) {
      if (!s.active) continue;
      if (this.time - s.lastShotAt < 2 || this.time - s.lastHitAt < 2) {
        sx += s.x;
        sy += s.y;
        n++;
      }
    }
    return n ? { x: sx / n, y: sy / n } : null;
  }
}

export type { Agent };
