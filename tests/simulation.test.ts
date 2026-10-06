import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/game/sim/Simulation';
import { DEFAULT_CONFIG, type BattleConfig } from '../src/game/sim/types';
import { Cell } from '../src/game/sim/map/GameMap';

function runBattle(cfg: Partial<BattleConfig>, maxSeconds = 600) {
  const sim = new Simulation({ ...DEFAULT_CONFIG, ...cfg });
  const t0 = performance.now();
  let steps = 0;
  while (sim.winner === null && sim.time < maxSeconds) {
    sim.step();
    sim.drainEvents();
    steps++;
  }
  const ms = performance.now() - t0;
  return { sim, steps, msPerStep: ms / steps };
}

function summary(sim: Simulation) {
  const t = sim.teams.map((tm) => tm.stats);
  return {
    winner: sim.winner,
    time: Math.round(sim.time),
    alive: [sim.activeCount(0), sim.activeCount(1)],
    score: sim.teams.map((tm) => Math.round(tm.score)),
    kills: t.map((s) => s.kills),
    downed: t.map((s) => s.downed),
    revives: t.map((s) => s.revives),
    grenades: t.map((s) => s.grenades),
    throwBacks: t.map((s) => s.throwBacks),
    dodges: t.map((s) => s.dodges),
    smokes: t.map((s) => s.smokes),
    rockets: t.map((s) => s.rockets),
    tankKills: t.map((s) => s.tankKills),
    tankShield: t.map((s) => Math.round(s.tankShield)),
    flanks: t.map((s) => s.flanks),
    scavenges: t.map((s) => s.scavenges),
    accuracy: t.map((s) => (s.shots ? Math.round((s.hits / s.shots) * 100) : 0)),
    structures: sim.structuresDestroyed,
  };
}

describe('simulation', () => {
  for (const biome of ['urban', 'desert', 'snow'] as const) {
    it(`runs a full ${biome} 10v10 battle to a result`, () => {
      const { sim, msPerStep } = runBattle({ biome, scale: 10, tanks: 1, seed: 42 });
      console.log(biome, JSON.stringify(summary(sim)), `${msPerStep.toFixed(3)} ms/step`);
      expect(sim.winner).not.toBeNull();
      expect(sim.teams[0].stats.shots + sim.teams[1].stats.shots).toBeGreaterThan(100);
    });
  }

  it('generates mirror-symmetric maps', () => {
    const sim = new Simulation({ ...DEFAULT_CONFIG, biome: 'urban', scale: 15, seed: 7 });
    const m = sim.map;
    let mismatch = 0;
    for (let y = 0; y < m.h; y++)
      for (let x = 0; x < m.w; x++) {
        if (m.kind(x, y) !== m.kind(m.w - 1 - x, m.h - 1 - y)) mismatch++;
      }
    expect(mismatch).toBe(0);
    expect(m.kind(Math.floor(m.points[1].x), Math.floor(m.points[1].y))).toBe(Cell.Empty);
  });

  it('is deterministic for a given seed', () => {
    const a = runBattle({ seed: 99, scale: 10 }, 40).sim;
    const b = runBattle({ seed: 99, scale: 10 }, 40).sim;
    expect(a.soldiers.map((s) => [s.x.toFixed(4), s.y.toFixed(4), s.hp])).toEqual(b.soldiers.map((s) => [s.x.toFixed(4), s.y.toFixed(4), s.hp]));
  });
});
