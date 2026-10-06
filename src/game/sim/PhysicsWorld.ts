import Matter from 'matter-js';
import { Cell, Mat, type GameMap } from './map/GameMap';

/** Physics units per metre (Matter.js is tuned for "pixel-sized" bodies). */
export const PHYS = 20;
/** Fixed physics sub-step in ms (Matter's recommended maximum). */
export const SUBSTEP_MS = 1000 / 60;
/** m/s -> Matter velocity units (distance per 1/60 s). */
export const toPhysVel = (mps: number) => (mps * PHYS) / 60;
export const fromPhysVel = (v: number) => (v * 60) / PHYS;

export const CAT = {
  HARD: 0x0001, // rocks, wrecks, map border
  SOFT: 0x0002, // walls, windows, trees (tanks crush through)
  LOW: 0x0004, // sandbags, crates, barriers
  SOLDIER: 0x0008,
  TANK: 0x0010,
  GRENADE: 0x0020,
  DEBRIS: 0x0040,
  DOWNED: 0x0080,
} as const;

const SOLDIER_MASK = CAT.HARD | CAT.SOFT | CAT.LOW | CAT.SOLDIER | CAT.TANK;
const TANK_MASK = CAT.HARD | CAT.SOLDIER | CAT.TANK | CAT.DEBRIS | CAT.GRENADE;
const GRENADE_HIGH_MASK = CAT.HARD | CAT.SOFT | CAT.TANK;
const GRENADE_LOW_MASK = CAT.HARD | CAT.SOFT | CAT.TANK | CAT.LOW;
const DEBRIS_MASK = CAT.HARD | CAT.SOFT | CAT.LOW | CAT.DEBRIS | CAT.TANK;

export class PhysicsWorld {
  readonly engine: Matter.Engine;
  private readonly cellBodies = new Map<number, Matter.Body>();

  constructor(readonly map: GameMap) {
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0, scale: 0 },
      enableSleeping: false,
      positionIterations: 6,
      velocityIterations: 4,
    });
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) this.syncCell(x, y);
    const W = map.w * PHYS;
    const H = map.h * PHYS;
    const t = 4 * PHYS;
    const border = { isStatic: true, collisionFilter: { category: CAT.HARD, mask: 0xffff } };
    Matter.Composite.add(this.engine.world, [
      Matter.Bodies.rectangle(W / 2, -t / 2, W + 2 * t, t, border),
      Matter.Bodies.rectangle(W / 2, H + t / 2, W + 2 * t, t, border),
      Matter.Bodies.rectangle(-t / 2, H / 2, t, H + 2 * t, border),
      Matter.Bodies.rectangle(W + t / 2, H / 2, t, H + 2 * t, border),
    ]);
  }

  /** Create/remove the static body for a structure cell so it matches the grid. */
  syncCell(x: number, y: number) {
    const map = this.map;
    const i = map.idx(x, y);
    const k = map.cells[i] as Cell;
    const existing = this.cellBodies.get(i);
    if (existing) {
      Matter.Composite.remove(this.engine.world, existing);
      this.cellBodies.delete(i);
    }
    let category = 0;
    if (k === Cell.Rock) category = CAT.HARD;
    else if (k === Cell.Wall || k === Cell.Window || k === Cell.Tree) category = CAT.SOFT;
    else if (k === Cell.Low) category = CAT.LOW;
    // wrecks: map wrecks get bodies; tank wrecks keep the tank's own body
    else if (k === Cell.Wreck && map.mat[i] !== Mat.TankWreck) category = CAT.HARD;
    if (!category) return;
    const cx = (x + 0.5) * PHYS;
    const cy = (y + 0.5) * PHYS;
    const opts: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      friction: 0,
      restitution: 0.4,
      collisionFilter: { category, mask: 0xffff },
      label: 'cell',
    };
    const body =
      k === Cell.Tree
        ? Matter.Bodies.circle(cx, cy, 0.3 * PHYS, opts, 8)
        : Matter.Bodies.rectangle(cx, cy, PHYS, PHYS, opts);
    (body as Matter.Body & { cellIndex?: number }).cellIndex = i;
    Matter.Composite.add(this.engine.world, body);
    this.cellBodies.set(i, body);
  }

  addSoldier(x: number, y: number, radius: number): Matter.Body {
    const b = Matter.Bodies.circle(x * PHYS, y * PHYS, radius * PHYS, {
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      restitution: 0,
      density: 0.002,
      inertia: Infinity,
      collisionFilter: { category: CAT.SOLDIER, mask: SOLDIER_MASK },
      label: 'soldier',
    }, 10);
    Matter.Composite.add(this.engine.world, b);
    return b;
  }

  setDowned(b: Matter.Body) {
    b.collisionFilter.category = CAT.DOWNED;
    b.collisionFilter.mask = CAT.HARD | CAT.SOFT | CAT.LOW;
    Matter.Body.setVelocity(b, { x: 0, y: 0 });
  }

  setUp(b: Matter.Body) {
    b.collisionFilter.category = CAT.SOLDIER;
    b.collisionFilter.mask = SOLDIER_MASK;
  }

  addTank(x: number, y: number, length: number, width: number, angle: number): Matter.Body {
    const b = Matter.Bodies.rectangle(x * PHYS, y * PHYS, length * PHYS, width * PHYS, {
      friction: 0.02,
      frictionAir: 0,
      restitution: 0,
      density: 0.02,
      inertia: Infinity,
      angle,
      collisionFilter: { category: CAT.TANK, mask: TANK_MASK },
      label: 'tank',
    });
    Matter.Composite.add(this.engine.world, b);
    return b;
  }

  /** Destroyed tank: becomes a static obstacle. */
  freezeTank(b: Matter.Body) {
    Matter.Body.setVelocity(b, { x: 0, y: 0 });
    Matter.Body.setStatic(b, true);
    b.collisionFilter.category = CAT.HARD;
    b.collisionFilter.mask = 0xffff;
  }

  addGrenade(x: number, y: number): Matter.Body {
    const b = Matter.Bodies.circle(x * PHYS, y * PHYS, 0.11 * PHYS, {
      friction: 0.1,
      frictionAir: 0,
      restitution: 0.42,
      density: 0.004,
      collisionFilter: { category: CAT.GRENADE, mask: GRENADE_HIGH_MASK },
      label: 'grenade',
    }, 8);
    Matter.Composite.add(this.engine.world, b);
    return b;
  }

  setGrenadeLow(b: Matter.Body, low: boolean) {
    b.collisionFilter.mask = low ? GRENADE_LOW_MASK : GRENADE_HIGH_MASK;
  }

  addDebris(x: number, y: number, size: number, angle: number): Matter.Body {
    const b = Matter.Bodies.rectangle(x * PHYS, y * PHYS, size * PHYS, size * 0.7 * PHYS, {
      friction: 0.3,
      frictionAir: 0.07,
      restitution: 0.25,
      density: 0.003,
      angle,
      collisionFilter: { category: CAT.DEBRIS, mask: DEBRIS_MASK },
      label: 'debris',
    });
    Matter.Composite.add(this.engine.world, b);
    return b;
  }

  remove(b: Matter.Body) {
    Matter.Composite.remove(this.engine.world, b);
  }

  /** Velocity in m/s. */
  setVelocity(b: Matter.Body, vx: number, vy: number) {
    Matter.Body.setVelocity(b, { x: toPhysVel(vx), y: toPhysVel(vy) });
  }

  getVelocity(b: Matter.Body): { x: number; y: number } {
    return { x: fromPhysVel(b.velocity.x), y: fromPhysVel(b.velocity.y) };
  }

  /** Add an instantaneous velocity change (m/s). */
  kick(b: Matter.Body, dvx: number, dvy: number) {
    if (b.isStatic) return;
    Matter.Body.setVelocity(b, { x: b.velocity.x + toPhysVel(dvx), y: b.velocity.y + toPhysVel(dvy) });
  }

  setPosition(b: Matter.Body, x: number, y: number) {
    Matter.Body.setPosition(b, { x: x * PHYS, y: y * PHYS });
  }

  setAngle(b: Matter.Body, a: number) {
    Matter.Body.setAngle(b, a);
  }

  /** Advance one simulation tick (two Matter sub-steps). */
  step(substeps = 2) {
    for (let i = 0; i < substeps; i++) Matter.Engine.update(this.engine, SUBSTEP_MS);
  }

  get bodyCount() {
    return this.engine.world.bodies.length;
  }
}
