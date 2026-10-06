import { it } from 'vitest';
import { Simulation } from '../../src/game/sim/Simulation';
import { DEFAULT_CONFIG, type BattleConfig } from '../../src/game/sim/types';

const cfg: Partial<BattleConfig> = JSON.parse(process.env.CFG ?? '{}');
const seeds = Number(process.env.N ?? 6);

it('batch', () => {
  const rows: string[] = [];
  let tot = 0;
  const agg: Record<string, number> = {};
  for (let seed = 1; seed <= seeds; seed++) {
    for (const biome of ['urban', 'desert', 'snow'] as const) {
      const sim = new Simulation({ ...DEFAULT_CONFIG, biome, seed, ...cfg });
      const t0 = performance.now();
      while (sim.winner === null && sim.time < 600) { sim.step(); sim.drainEvents(); }
      const ms = (performance.now() - t0) / sim.tick;
      tot += sim.time;
      const st = sim.teams.map((t) => t.stats);
      for (const k of ['grenades','throwBacks','dodges','smokes','rockets','revives','tankKills','flanks','scavenges','downed','kills'] as const) agg[k] = (agg[k] ?? 0) + st[0][k] + st[1][k];
      agg.tankShield = (agg.tankShield ?? 0) + st[0].tankShield + st[1].tankShield;
      agg.structures = (agg.structures ?? 0) + sim.structuresDestroyed;
      rows.push(`${biome.padEnd(6)} seed${seed} t=${sim.time.toFixed(0).padStart(3)}s win=${sim.winner} alive=${sim.activeCount(0)}/${sim.activeCount(1)} score=${sim.teams.map(t=>Math.round(t.score)).join('/')} acc=${st.map(s=>s.shots?Math.round(100*s.hits/s.shots):0).join('/')} ${ms.toFixed(2)}ms`);
    }
  }
  console.log(rows.join('\n'));
  console.log('avg duration', (tot / (seeds * 3)).toFixed(0), 's; per-battle avg:', Object.entries(agg).map(([k, v]) => `${k}=${(v / (seeds * 3)).toFixed(1)}`).join(' '));
});
