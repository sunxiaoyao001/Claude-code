import { it } from 'vitest';
import { Simulation } from '../../src/game/sim/Simulation';
import { DEFAULT_CONFIG, type BattleConfig } from '../../src/game/sim/types';
import { RUNNING, SUCCESS } from '../../src/game/sim/ai/bt/BehaviorTree';

const cfg: Partial<BattleConfig> = JSON.parse(process.env.CFG ?? '{}');
const ids: number[] = JSON.parse(process.env.IDS ?? '[3,6,15]');

it('trace', () => {
  const sim = new Simulation({ ...DEFAULT_CONFIG, ...cfg });
  const shape = sim.soldierTree.shape;
  const tshape = sim.tankTree.shape;
  while (sim.winner === null && sim.time < (Number(process.env.T) || 90)) {
    sim.step();
    for (const e of sim.drainEvents()) {
      if (e.type === 'launch') console.log(`${sim.time.toFixed(1)} LAUNCH ${e.kind} by #${e.owner}`);
    }
    if (sim.tick % 15 === 0) {
      for (const id of ids) {
        const a = sim.get(id);
        if (!a) continue;
        const sh = a.kind === 'tank' ? tshape : shape;
        const snap = a.bt.snapshot();
        const path = sh.filter((n) => snap[n.id] === RUNNING && n.kind !== 'parallel').map((n) => n.name.replace('bt.', '')).join('>');
        const succ = sh.filter((n) => snap[n.id] === SUCCESS && (n.kind === 'action')).map((n) => n.name.replace('bt.', '')).join(',');
        const info = a.kind === 'soldier' ? `${a.role} hp${Math.round(a.hp)} ${a.state} sup${a.suppression.toFixed(2)} prot${a.bb.prot.toFixed(2)} mag${a.mag}/${a.reserve} vis${[...a.contacts.values()].filter(c=>c.visible).length} known${a.contacts.size} stance:${a.stance} loco:${a.loco.status}` : `tank hp${Math.round(a.hp)} tgt${a.bb.target} cannonOK${a.bb.cannonOK} spd${a.speed.toFixed(1)}`;
        console.log(`${sim.time.toFixed(1)} #${id} (${a.x.toFixed(1)},${a.y.toFixed(1)}) ${info} | ${path} | ok:${succ}`);
      }
    }
  }
});
