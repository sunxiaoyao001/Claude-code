import { it } from 'vitest';
import { Simulation } from '../../src/game/sim/Simulation';
import { DEFAULT_CONFIG, type BattleConfig } from '../../src/game/sim/types';

const cfg: Partial<BattleConfig> = JSON.parse(process.env.CFG ?? '{}');

it('node histogram', () => {
  const agg = new Map<string, [number, number, number]>();
  for (const seed of [1, 2, 3]) {
    const sim = new Simulation({ ...DEFAULT_CONFIG, seed, ...cfg });
    const shape = sim.soldierTree.shape;
    while (sim.winner === null && sim.time < 300) {
      sim.step(); sim.drainEvents();
      if (sim.tick % 3) continue;
      for (const s of sim.soldiers) {
        if (!s.active) continue;
        const snap = s.bt.snapshot();
        for (const n of shape) {
          const st = snap[n.id];
          if (!st) continue;
          const key = `${'  '.repeat(n.depth)}${n.name}`;
          const r = agg.get(key) ?? [0, 0, 0];
          r[st - 1]++;
          agg.set(key, r);
        }
      }
    }
  }
  // print in tree order
  const sim = new Simulation({ ...DEFAULT_CONFIG, seed: 1, ...cfg });
  for (const n of sim.soldierTree.shape) {
    const key = `${'  '.repeat(n.depth)}${n.name}`;
    const r = agg.get(key) ?? [0, 0, 0];
    console.log(`${key.padEnd(48)} S=${String(r[0]).padStart(6)} F=${String(r[1]).padStart(6)} R=${String(r[2]).padStart(6)}`);
  }
});
