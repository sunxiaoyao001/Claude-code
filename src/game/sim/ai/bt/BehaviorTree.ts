/**
 * Minimal behaviour-tree runtime.
 *
 * Trees are immutable, shared definitions; each agent owns a BTInstance with
 * per-node status/memory arrays. Every execution records the node status and
 * the tick "epoch", which lets the UI draw the live decision path.
 */

export const SUCCESS = 1;
export const FAILURE = 2;
export const RUNNING = 3;
export type Status = typeof SUCCESS | typeof FAILURE | typeof RUNNING;

export type NodeKind =
  | 'parallel'
  | 'selector'
  | 'sequence'
  | 'memsequence'
  | 'inverter'
  | 'succeeder'
  | 'cooldown'
  | 'timeout'
  | 'condition'
  | 'action';

export interface TickCtx<A, W> {
  agent: A;
  world: W;
  now: number;
  dt: number;
}

export class BTInstance {
  readonly status: Uint8Array;
  readonly visit: Uint32Array;
  readonly running: Uint8Array;
  readonly mem: number[];
  epoch = 0;

  constructor(readonly size: number) {
    this.status = new Uint8Array(size);
    this.visit = new Uint32Array(size);
    this.running = new Uint8Array(size);
    this.mem = new Array(size).fill(0);
  }

  /** Status of each node in the latest tick (0 = not visited). */
  snapshot(out?: Uint8Array): Uint8Array {
    const s = out ?? new Uint8Array(this.size);
    for (let i = 0; i < this.size; i++) s[i] = this.visit[i] === this.epoch ? this.status[i] : 0;
    return s;
  }
}

export abstract class BTNode<A, W> {
  id = -1;
  readonly children: BTNode<A, W>[];

  constructor(
    readonly kind: NodeKind,
    readonly name: string,
    children: BTNode<A, W>[] = [],
  ) {
    this.children = children;
  }

  execute(ctx: TickCtx<A, W>, inst: BTInstance): Status {
    const st = this.run(ctx, inst);
    inst.status[this.id] = st;
    inst.visit[this.id] = inst.epoch;
    inst.running[this.id] = st === RUNNING ? 1 : 0;
    return st;
  }

  protected abstract run(ctx: TickCtx<A, W>, inst: BTInstance): Status;

  /** Interrupt this subtree if it is mid-execution. */
  abort(ctx: TickCtx<A, W>, inst: BTInstance) {
    if (!inst.running[this.id]) return;
    inst.running[this.id] = 0;
    this.onAbort(ctx, inst);
    for (const c of this.children) c.abort(ctx, inst);
  }

  protected onAbort(_ctx: TickCtx<A, W>, _inst: BTInstance) {}

  protected abortFrom(ctx: TickCtx<A, W>, inst: BTInstance, from: number, except = -1) {
    for (let j = from; j < this.children.length; j++) if (j !== except) this.children[j].abort(ctx, inst);
  }
}

/** Ticks every child each tick; returns RUNNING (used for the always-on root). */
export class Parallel<A, W> extends BTNode<A, W> {
  constructor(name: string, children: BTNode<A, W>[]) {
    super('parallel', name, children);
  }
  protected run(ctx: TickCtx<A, W>, inst: BTInstance): Status {
    for (const c of this.children) c.execute(ctx, inst);
    return RUNNING;
  }
}

/** Reactive priority selector: re-evaluates from the top every tick. */
export class Selector<A, W> extends BTNode<A, W> {
  constructor(name: string, children: BTNode<A, W>[]) {
    super('selector', name, children);
  }
  protected run(ctx: TickCtx<A, W>, inst: BTInstance): Status {
    for (let i = 0; i < this.children.length; i++) {
      const st = this.children[i].execute(ctx, inst);
      if (st !== FAILURE) {
        this.abortFrom(ctx, inst, i + 1);
        return st;
      }
    }
    return FAILURE;
  }
}

/** Reactive sequence: conditions at the front are re-checked every tick. */
export class Sequence<A, W> extends BTNode<A, W> {
  constructor(name: string, children: BTNode<A, W>[]) {
    super('sequence', name, children);
  }
  protected run(ctx: TickCtx<A, W>, inst: BTInstance): Status {
    for (let i = 0; i < this.children.length; i++) {
      const st = this.children[i].execute(ctx, inst);
      if (st !== SUCCESS) {
        this.abortFrom(ctx, inst, i + 1);
        return st;
      }
    }
    return SUCCESS;
  }
}

/** Sequence with memory: resumes at the running child (for multi-step actions). */
export class MemSequence<A, W> extends BTNode<A, W> {
  constructor(name: string, children: BTNode<A, W>[]) {
    super('memsequence', name, children);
  }
  protected run(ctx: TickCtx<A, W>, inst: BTInstance): Status {
    for (let i = inst.mem[this.id]; i < this.children.length; i++) {
      const st = this.children[i].execute(ctx, inst);
      if (st === RUNNING) {
        inst.mem[this.id] = i;
        return RUNNING;
      }
      if (st === FAILURE) {
        inst.mem[this.id] = 0;
        return FAILURE;
      }
    }
    inst.mem[this.id] = 0;
    return SUCCESS;
  }
  protected onAbort(_ctx: TickCtx<A, W>, inst: BTInstance) {
    inst.mem[this.id] = 0;
  }
}

export class Inverter<A, W> extends BTNode<A, W> {
  constructor(name: string, child: BTNode<A, W>) {
    super('inverter', name, [child]);
  }
  protected run(ctx: TickCtx<A, W>, inst: BTInstance): Status {
    const st = this.children[0].execute(ctx, inst);
    return st === SUCCESS ? FAILURE : st === FAILURE ? SUCCESS : RUNNING;
  }
}

export class Succeeder<A, W> extends BTNode<A, W> {
  constructor(name: string, child: BTNode<A, W>) {
    super('succeeder', name, [child]);
  }
  protected run(ctx: TickCtx<A, W>, inst: BTInstance): Status {
    const st = this.children[0].execute(ctx, inst);
    return st === RUNNING ? RUNNING : SUCCESS;
  }
}

/** Blocks re-entry for `seconds` after the child finishes successfully. */
export class Cooldown<A, W> extends BTNode<A, W> {
  constructor(
    name: string,
    readonly seconds: number,
    child: BTNode<A, W>,
  ) {
    super('cooldown', name, [child]);
  }
  protected run(ctx: TickCtx<A, W>, inst: BTInstance): Status {
    if (ctx.now < inst.mem[this.id]) return FAILURE;
    const st = this.children[0].execute(ctx, inst);
    if (st === SUCCESS) inst.mem[this.id] = ctx.now + this.seconds;
    return st;
  }
}

/** Fails a child that keeps running longer than `seconds`. */
export class Timeout<A, W> extends BTNode<A, W> {
  constructor(
    name: string,
    readonly seconds: number,
    child: BTNode<A, W>,
  ) {
    super('timeout', name, [child]);
  }
  protected run(ctx: TickCtx<A, W>, inst: BTInstance): Status {
    if (!inst.running[this.id]) inst.mem[this.id] = ctx.now;
    if (ctx.now - inst.mem[this.id] > this.seconds) {
      this.children[0].abort(ctx, inst);
      return FAILURE;
    }
    return this.children[0].execute(ctx, inst);
  }
}

export class Condition<A, W> extends BTNode<A, W> {
  constructor(
    name: string,
    readonly test: (ctx: TickCtx<A, W>) => boolean,
  ) {
    super('condition', name);
  }
  protected run(ctx: TickCtx<A, W>): Status {
    return this.test(ctx) ? SUCCESS : FAILURE;
  }
}

export interface ActionImpl<A, W> {
  start?: (ctx: TickCtx<A, W>) => void;
  tick: (ctx: TickCtx<A, W>) => Status;
  /** Called when the action finishes (success/failure) or is interrupted. */
  stop?: (ctx: TickCtx<A, W>, interrupted: boolean) => void;
}

export class Action<A, W> extends BTNode<A, W> {
  constructor(
    name: string,
    readonly impl: ActionImpl<A, W>,
  ) {
    super('action', name);
  }
  protected run(ctx: TickCtx<A, W>, inst: BTInstance): Status {
    if (!inst.running[this.id]) this.impl.start?.(ctx);
    const st = this.impl.tick(ctx);
    if (st !== RUNNING) this.impl.stop?.(ctx, false);
    return st;
  }
  protected onAbort(ctx: TickCtx<A, W>) {
    this.impl.stop?.(ctx, true);
  }
}

export interface TreeShape {
  id: number;
  name: string;
  kind: NodeKind;
  depth: number;
  parent: number;
}

/** A finalised tree: assigns preorder ids and exposes a flat shape for UIs. */
export class BehaviorTree<A, W> {
  readonly size: number;
  readonly shape: TreeShape[] = [];

  constructor(
    readonly key: string,
    readonly root: BTNode<A, W>,
  ) {
    const walk = (n: BTNode<A, W>, depth: number, parent: number) => {
      n.id = this.shape.length;
      this.shape.push({ id: n.id, name: n.name, kind: n.kind, depth, parent });
      for (const c of n.children) walk(c, depth + 1, n.id);
    };
    walk(root, 0, -1);
    this.size = this.shape.length;
  }

  createInstance() {
    return new BTInstance(this.size);
  }

  tick(inst: BTInstance, ctx: TickCtx<A, W>) {
    inst.epoch++;
    this.root.execute(ctx, inst);
  }

  /** Force-abort everything (e.g. unit went down). */
  reset(inst: BTInstance, ctx: TickCtx<A, W>) {
    this.root.abort(ctx, inst);
    inst.mem.fill(0);
  }
}
