import { it } from 'vitest';
import { Simulation } from '../../src/game/sim/Simulation';
import { DEFAULT_CONFIG, type BattleConfig } from '../../src/game/sim/types';

const cfg: Partial<BattleConfig> = JSON.parse(process.env.CFG ?? '{}');

it('battle report', () => {
  const sim = new Simulation({ ...DEFAULT_CONFIG, ...cfg });
  const weaponDowns: Record<string, number> = {};
  let firstShot = -1;
  const intents: Record<string, number> = {};
  const lines: string[] = [];
  while (sim.winner === null && sim.time < 600) {
    sim.step();
    for (const e of sim.drainEvents()) {
      if (e.type === 'shot' && firstShot < 0) firstShot = sim.time;
      if (e.type === 'downed' || e.type === 'killed') {
        const by = sim.get(e.by);
        const v = sim.get(e.id)!;
        const w = e.type === 'killed' ? e.weapon : (by && by.kind === 'tank' ? 'tank' : by?.kind === 'soldier' ? by.weapon.id : '?');
        weaponDowns[w] = (weaponDowns[w] ?? 0) + 1;
        lines.push(`${sim.time.toFixed(1)} ${e.type} ${v.kind}#${v.id}(t${v.team}${v.kind==='soldier'?','+v.role:''}) by ${by ? by.kind + '#' + by.id + '(t' + by.team + ')' : '-'} ${e.type === 'killed' ? e.weapon : ''}`);
      }
      if (e.type === 'tactic') lines.push(`${sim.time.toFixed(1)} tactic ${e.kind} #${e.id} t${e.team}`);
      if (e.type === 'throw') lines.push(`${sim.time.toFixed(1)} throw ${e.kind} #${e.id} back=${e.back}`);
    }
    if (sim.tick % 30 === 0) for (const s of sim.soldiers) if (s.active) intents[s.bb.intent] = (intents[s.bb.intent] ?? 0) + 1;
  }
  console.log(lines.join('\n'));
  console.log('firstShot', firstShot.toFixed(1), 'end', sim.time.toFixed(1), 'winner', sim.winner);
  console.log('downs/kills by weapon', JSON.stringify(weaponDowns));
  console.log('intent samples', JSON.stringify(intents));
});
