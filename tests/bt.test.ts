import { describe, expect, it } from 'vitest';
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
  type Status,
} from '../src/game/sim/ai/bt/BehaviorTree';

interface Agent {
  flag: boolean;
  log: string[];
  ticks: number;
}
type W = null;

const ctx = (agent: Agent, now = 0) => ({ agent, world: null as W, now, dt: 0.1 });

function action(name: string, results: Status[]) {
  let i = 0;
  return new Action<Agent, W>(name, {
    start: ({ agent }) => agent.log.push(`start:${name}`),
    tick: ({ agent }) => {
      agent.log.push(`tick:${name}`);
      return results[Math.min(i++, results.length - 1)];
    },
    stop: ({ agent }, interrupted) => agent.log.push(`${interrupted ? 'abort' : 'stop'}:${name}`),
  });
}

describe('behaviour tree runtime', () => {
  it('reactive selector preempts a running lower-priority action and aborts it', () => {
    const tree = new BehaviorTree<Agent, W>(
      't',
      new Selector('root', [
        new Sequence('urgent', [new Condition('flag?', ({ agent }) => agent.flag), action('react', [RUNNING])]),
        action('patrol', [RUNNING]),
      ]),
    );
    const a: Agent = { flag: false, log: [], ticks: 0 };
    const inst = tree.createInstance();
    tree.tick(inst, ctx(a));
    expect(a.log).toEqual(['start:patrol', 'tick:patrol']);
    a.flag = true;
    a.log = [];
    tree.tick(inst, ctx(a));
    expect(a.log).toEqual(['start:react', 'tick:react', 'abort:patrol']);
  });

  it('memory sequence resumes at the running child instead of re-running finished ones', () => {
    const a: Agent = { flag: true, log: [], ticks: 0 };
    const tree = new BehaviorTree<Agent, W>('t', new MemSequence('steps', [action('one', [SUCCESS]), action('two', [RUNNING, RUNNING, SUCCESS])]));
    const inst = tree.createInstance();
    tree.tick(inst, ctx(a));
    tree.tick(inst, ctx(a));
    tree.tick(inst, ctx(a));
    expect(a.log.filter((l) => l === 'tick:one')).toHaveLength(1);
    expect(a.log.filter((l) => l === 'tick:two')).toHaveLength(3);
  });

  it('records per-tick status for the inspector and blocks during cooldown', () => {
    const a: Agent = { flag: true, log: [], ticks: 0 };
    const cd = new Cooldown<Agent, W>('cd', 5, action('fire', [SUCCESS]));
    const tree = new BehaviorTree<Agent, W>('t', new Parallel('root', [cd]));
    const inst = tree.createInstance();
    tree.tick(inst, ctx(a, 0));
    const snap1 = inst.snapshot();
    expect(snap1[cd.id]).toBe(SUCCESS);
    tree.tick(inst, ctx(a, 1));
    expect(inst.snapshot()[cd.id]).toBe(FAILURE);
    tree.tick(inst, ctx(a, 6));
    expect(inst.snapshot()[cd.id]).toBe(SUCCESS);
    expect(tree.shape.map((n) => n.name)).toEqual(['root', 'cd', 'fire']);
  });
});
