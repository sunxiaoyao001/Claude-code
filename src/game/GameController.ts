import { randomSeed } from './core/rng';
import { DT } from './sim/config';
import type { Soldier, Tank } from './sim/entities';
import { SCORE_LIMIT, Simulation } from './sim/Simulation';
import type { BattleConfig, Biome } from './sim/types';
import { useGame, type BattleResult, type UnitCard, type UnitInfo } from '@/store/gameStore';

export interface SceneHooks {
  load(sim: Simulation, cinematic: boolean): Promise<void>;
  focusWorld(x: number, y: number, follow: boolean, instant?: boolean): void;
  setFollow(id: number): void;
  /** Ground-plane world coordinates of the four screen corners (minimap viewport). */
  viewCorners(): { x: number; y: number }[];
  readonly fps: number;
}

const MAX_STEPS_PER_FRAME = 10;

/**
 * Owns the simulation and the fixed-timestep loop; bridges the Phaser scene and
 * the React UI (through the zustand store). Rendering interpolates between ticks.
 */
export class GameController {
  sim: Simulation | null = null;
  scene: SceneHooks | null = null;
  mode: 'attract' | 'battle' = 'attract';
  speed = 1;
  paused = false;
  selected = -1;
  following = false;
  private acc = 0;
  private lastHud = 0;
  private lastUnit = 0;
  private feedCursor = 0;
  private endedRealTime = 0;
  private attractQueued = false;
  private resultsShown = false;
  private loadingBattle = false;
  private biomeCycle: Biome[] = ['urban', 'desert', 'snow'];
  private attractIdx = 0;

  attach(scene: SceneHooks) {
    this.scene = scene;
  }

  // ---------------------------------------------------------------------------
  // lifecycle
  // ---------------------------------------------------------------------------

  async startAttract() {
    if (!this.scene || this.loadingBattle) return;
    const biome = this.biomeCycle[this.attractIdx++ % this.biomeCycle.length];
    const cfg: BattleConfig = { biome, scale: 10, tanks: 1, skill: ['veteran', 'veteran'], seed: randomSeed(), mode: 'domination', timeLimit: 0 };
    this.mode = 'attract';
    await this.load(cfg, true);
    this.setSpeed(1, false);
  }

  async startBattle(config: BattleConfig) {
    const st = useGame.getState();
    st.setPhase('loading');
    st.setLoading(0.2, 'loading.map');
    this.mode = 'battle';
    await this.load(config, false);
    st.setResult(null);
    st.setPhase('battle');
    this.setSpeed(1, false);
  }

  private async load(config: BattleConfig, cinematic: boolean) {
    if (!this.scene) return;
    this.loadingBattle = true;
    try {
      // let the loading overlay paint before the heavy synchronous work
      await new Promise((r) => setTimeout(r, 30));
      const sim = new Simulation(config);
      this.sim = sim;
      this.acc = 0;
      this.feedCursor = 0;
      this.endedRealTime = 0;
      this.attractQueued = false;
      this.resultsShown = false;
      this.select(-1);
      const st = useGame.getState();
      st.clearFeed();
      const roster: Record<number, { name: string; role: string; team: 0 | 1; kind: 'soldier' | 'tank' }> = {};
      for (const s of sim.soldiers) roster[s.id] = { name: s.name, role: s.role, team: s.team, kind: 'soldier' };
      for (const t of sim.tanks) roster[t.id] = { name: t.name, role: 'tank', team: t.team, kind: 'tank' };
      st.setRoster(roster);
      await this.scene.load(sim, cinematic);
      this.publishHud(true);
    } finally {
      this.loadingBattle = false;
    }
  }

  exitToMenu() {
    useGame.getState().setResult(null);
    useGame.getState().setPhase('menu');
    void this.startAttract();
  }

  // ---------------------------------------------------------------------------
  // loop
  // ---------------------------------------------------------------------------

  /** Advance the simulation by real `deltaMs`; returns the interpolation alpha. */
  tick(deltaMs: number): number {
    const sim = this.sim;
    if (!sim || this.loadingBattle) return 1;
    if (!this.paused) {
      this.acc += Math.min(deltaMs, 250) / 1000 * this.speed;
      let steps = 0;
      while (this.acc >= DT && steps < MAX_STEPS_PER_FRAME) {
        sim.step();
        this.acc -= DT;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) this.acc = Math.min(this.acc, DT);
    }
    this.afterTick();
    return this.paused ? 1 : Math.min(1, this.acc / DT);
  }

  private afterTick() {
    const sim = this.sim!;
    const now = performance.now();
    if (sim.winner !== null && !this.endedRealTime) this.endedRealTime = now;
    if (this.endedRealTime && now - this.endedRealTime > (this.mode === 'attract' ? 3500 : 2600)) {
      if (this.mode === 'battle') {
        const st = useGame.getState();
        if (st.phase === 'battle' && !this.resultsShown) {
          this.resultsShown = true;
          st.setResult(this.buildResult());
          st.setPhase('results');
        }
      } else if (!this.attractQueued) {
        this.attractQueued = true;
        void this.startAttract();
      }
    }
    if (now - this.lastHud > 200) {
      this.lastHud = now;
      this.publishHud(false);
    }
    if (now - this.lastUnit > 120) {
      this.lastUnit = now;
      this.publishUnit();
    }
  }

  // ---------------------------------------------------------------------------
  // controls
  // ---------------------------------------------------------------------------

  setSpeed(speed: number, paused = this.paused) {
    this.speed = speed;
    this.paused = paused;
    useGame.getState().setSpeed(speed, paused);
  }

  togglePause() {
    this.setSpeed(this.speed, !this.paused);
  }

  /** Advance exactly one tick while paused (for frame-by-frame inspection). */
  stepOnce() {
    if (!this.sim) return;
    this.sim.step();
    this.publishHud(true);
    this.publishUnit();
  }

  select(id: number) {
    this.selected = id;
    if (id < 0) this.following = false;
    useGame.getState().setSelected(id);
    this.publishUnit();
  }

  focusUnit(id: number, follow = true) {
    const a = this.sim?.get(id);
    if (!a || !this.scene) return;
    this.select(id);
    this.following = follow;
    this.scene.focusWorld(a.x, a.y, follow);
    if (follow) this.scene.setFollow(id);
  }

  setFollowing(on: boolean) {
    this.following = on;
    if (this.scene) this.scene.setFollow(on ? this.selected : -1);
    this.publishUnit();
  }

  focusPoint(x: number, y: number, instant = true) {
    this.following = false;
    this.scene?.setFollow(-1);
    this.scene?.focusWorld(x, y, false, instant);
  }

  // ---------------------------------------------------------------------------
  // publishing to React
  // ---------------------------------------------------------------------------

  publishHud(force: boolean) {
    const sim = this.sim;
    if (!sim) return;
    const st = useGame.getState();
    void force;
    const total: [number, number] = [0, 0];
    const tanks: [number, number] = [0, 0];
    for (const s of sim.soldiers) total[s.team]++;
    for (const t of sim.tanks) {
      total[t.team]++;
      if (t.alive) tanks[t.team]++;
    }
    st.setHud({
      time: sim.time,
      timeLimit: sim.config.timeLimit,
      mode: sim.config.mode,
      scoreLimit: SCORE_LIMIT,
      alive: [sim.activeCount(0), sim.activeCount(1)],
      total,
      tanks,
      score: [sim.teams[0].score, sim.teams[1].score],
      points: sim.points.map((p) => ({ id: p.id, label: p.label, owner: p.owner, capture: p.capture, contested: p.contested, n: [p.n[0], p.n[1]] })),
      stats: [{ ...sim.teams[0].stats }, { ...sim.teams[1].stats }],
      structures: sim.structuresDestroyed,
      timeline: sim.timeline.slice(-150),
      fps: this.scene?.fps ?? 0,
      stepMs: sim.perf.step,
      ended: sim.winner !== null,
    });
    if (sim.feed.length > 0) {
      const last = sim.feed[sim.feed.length - 1].id;
      if (last > this.feedCursor) {
        const fresh = sim.feed.filter((f) => f.id > this.feedCursor);
        this.feedCursor = last;
        st.pushFeed(fresh);
      }
    }
  }

  publishUnit() {
    const sim = this.sim;
    const st = useGame.getState();
    if (!sim || this.selected < 0) {
      if (st.unit) st.setUnit(null);
      return;
    }
    const a = sim.get(this.selected);
    if (!a) {
      st.setUnit(null);
      return;
    }
    st.setUnit(this.unitInfo(a));
  }

  private unitInfo(a: Soldier | Tank): UnitInfo {
    const sim = this.sim!;
    let visible = 0;
    for (const c of a.contacts.values()) if (c.visible) visible++;
    const tgt = a.bb.target >= 0 ? sim.get(a.bb.target) : undefined;
    const snap = Array.from(a.bt.snapshot());
    const squad = sim.squads[a.squad];
    if (a.kind === 'soldier') {
      return {
        id: a.id,
        kind: 'soldier',
        team: a.team,
        name: a.name,
        role: a.role,
        squad: squad?.name ?? '',
        leader: a.leader,
        state: a.state,
        stance: a.stance,
        hp: Math.max(0, a.hp),
        maxHp: a.maxHp,
        mag: a.mag,
        magSize: a.weapon.mag,
        reserve: a.reserve,
        frags: a.frags,
        smokes: a.smokes,
        rockets: a.rockets,
        shells: 0,
        suppression: a.suppression,
        protection: a.bb.prot,
        intent: a.state === 'dead' ? 'dead' : a.bb.intent,
        target: tgt ? (tgt.kind === 'soldier' ? tgt.name : tgt.name) : '',
        visible,
        known: a.contacts.size,
        weapon: a.weapon.id,
        stats: { ...a.stats },
        bt: snap,
        btKey: 'soldier',
        following: this.following,
      };
    }
    return {
      id: a.id,
      kind: 'tank',
      team: a.team,
      name: a.name,
      role: 'tank',
      squad: squad?.name ?? '',
      leader: false,
      state: a.state,
      stance: '',
      hp: Math.max(0, a.hp),
      maxHp: a.maxHp,
      mag: 0,
      magSize: 0,
      reserve: 0,
      frags: 0,
      smokes: 0,
      rockets: 0,
      shells: a.shells,
      suppression: 0,
      protection: 0,
      intent: a.state === 'dead' ? 'dead' : a.bb.intent,
      target: tgt ? tgt.name : '',
      visible,
      known: a.contacts.size,
      weapon: 'cannon',
      stats: { ...a.stats },
      bt: snap,
      btKey: 'tank',
      following: this.following,
    };
  }

  private buildResult(): BattleResult {
    const sim = this.sim!;
    const cards: UnitCard[] = [];
    const score = (u: { stats: { kills: number; downs: number; revives: number; damage: number; throwBacks: number } }) =>
      u.stats.kills * 3 + u.stats.downs * 2 + u.stats.revives * 2.5 + u.stats.damage / 120 + u.stats.throwBacks * 3;
    const all = [...sim.soldiers, ...sim.tanks].sort((p, q) => score(q) - score(p));
    for (const u of all.slice(0, 5)) {
      cards.push({ id: u.id, team: u.team, name: u.name, role: u.kind === 'tank' ? 'tank' : u.role, kind: u.kind, stats: { ...u.stats }, state: u.state });
    }
    const total: [number, number] = [0, 0];
    for (const s of sim.soldiers) total[s.team]++;
    for (const t of sim.tanks) total[t.team]++;
    return {
      winner: sim.winner ?? -1,
      duration: sim.endedAt || sim.time,
      config: sim.config,
      stats: [{ ...sim.teams[0].stats }, { ...sim.teams[1].stats }],
      alive: [sim.activeCount(0), sim.activeCount(1)],
      total,
      score: [sim.teams[0].score, sim.teams[1].score],
      structures: sim.structuresDestroyed,
      mvp: cards,
      timeline: [...sim.timeline],
    };
  }
}

export const game = new GameController();
