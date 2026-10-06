import type Matter from 'matter-js';
import type { BTInstance } from './ai/bt/BehaviorTree';
import { Locomotion } from './ai/locomotion';
import { ROLES, SOLDIER, SKILLS, TANK, WEAPONS, type SkillDef, type WeaponDef } from './config';
import type { Role, Skill, TeamId, UnitState } from './types';

export interface Contact {
  id: number;
  x: number;
  y: number;
  /** Last time seen or heard. */
  t: number;
  visible: boolean;
  /** Seen directly at least once (vs. only heard / reported). */
  confirmed: boolean;
  isTank: boolean;
}

export type Stance = 'stand' | 'crouch' | 'prone';

export type Anim = 'idle' | 'walk' | 'run' | 'aim' | 'throw' | 'reload' | 'revive' | 'downed' | 'dead';

export interface UnitStats {
  kills: number;
  downs: number;
  shots: number;
  hits: number;
  damage: number;
  revives: number;
  grenades: number;
  throwBacks: number;
  smokes: number;
  rockets: number;
  dodges: number;
}

const newStats = (): UnitStats => ({
  kills: 0,
  downs: 0,
  shots: 0,
  hits: 0,
  damage: 0,
  revives: 0,
  grenades: 0,
  throwBacks: 0,
  smokes: 0,
  rockets: 0,
  dodges: 0,
});

/** Shared blackboard for the soldier behaviour tree. */
export interface SoldierBB {
  /** Current fire-control target id (-1 none). */
  target: number;
  /** Chosen cover cell index (-1 none) and why. */
  cover: number;
  coverReason: 'hide' | 'fight' | 'tank' | '';
  /** Grenade the unit is reacting to. */
  grenade: number;
  /** Grenade the unit dived away from (dodge accounting). */
  dodging: number;
  /** Ally being rescued / treated. */
  rescue: number;
  /** Tank used as a moving shield. */
  shieldTank: number;
  shieldSlot: number;
  lastShield: number;
  /** Position the unit is advancing toward. */
  advance: { x: number; y: number } | null;
  /** Free-text of what the unit is doing (UI). */
  intent: string;
  /** Suppression-related timers. */
  lastCoverSearch: number;
  lastGrenade: number;
  lastSmoke: number;
  /** Time the current threat picture last changed (for reaction delay). */
  threatSince: number;
  /** Seconds remaining of an assigned "peek" before re-checking. */
  holdUntil: number;
  /** Formation slot target from the squad order. */
  slot: { x: number; y: number } | null;
  escape: { x: number; y: number } | null;
  throwTarget: { x: number; y: number; value: number } | null;
  smokeTarget: { x: number; y: number } | null;
  /** Throw-back decision cache (rolled once per grenade). */
  tbGrenade: number;
  tbDecision: boolean;
  flankTarget: { x: number; y: number } | null;
  lastFlank: number;
  scavenge: number;
  heal: number;
  healPhase: number;
  /** Enemy tank being dealt with. */
  tank: number;
  rocketAiming: boolean;
  rocketMoveAt: number;
  lastRocketTactic: number;
  advanceRetryAt: number;
  overwatchAt: number;
  /** Protection against current threats (cached for UI). */
  prot: number;
}

export class Soldier {
  readonly kind = 'soldier' as const;
  x: number;
  y: number;
  px: number;
  py: number;
  vx = 0;
  vy = 0;
  facing: number;
  pfacing: number;
  aim: number;
  hp = SOLDIER.hp;
  maxHp = SOLDIER.hp;
  state: UnitState = 'healthy';
  stance: Stance = 'stand';
  anim: Anim = 'idle';
  /** Animation phase accumulator (walk cycle). */
  phase = 0;
  radius = SOLDIER.radius;
  body: Matter.Body | null = null;

  readonly weapon: WeaponDef;
  mag: number;
  reserve: number;
  frags: number;
  smokes: number;
  rockets: number;

  fireCd = 0;
  burstLeft = 0;
  reloadT = 0;
  aimT = 0;
  aimTarget = -1;
  /** Busy with an exclusive action (throwing, reviving, picking up) until this time. */
  busyUntil = 0;
  busyKind: '' | 'throw' | 'revive' | 'pickup' | 'rocket' | 'heal' = '';
  /** Direction to face while busy. */
  busyFacing = 0;
  rocketCd = 0;
  /** Stance to adopt while stationary (set by the behaviour tree). */
  wantStance: Stance = 'stand';
  /** Direction to watch when idle. */
  watch = 0;

  suppression = 0;
  bleed = 0;
  downedAt = 0;
  diedAt = 0;
  lastHitAt = -10;
  lastShotAt = -10;
  lastHitFrom = { x: 0, y: 0 };
  revivedCount = 0;

  squad = -1;
  leader = false;
  readonly skillDef: SkillDef;
  readonly vision: number;
  readonly speedMul: number;

  bt!: BTInstance;
  readonly bb: SoldierBB = {
    target: -1,
    cover: -1,
    coverReason: '',
    grenade: -1,
    dodging: -1,
    rescue: -1,
    shieldTank: -1,
    shieldSlot: -1,
    lastShield: -30,
    advance: null,
    intent: '',
    lastCoverSearch: -10,
    lastGrenade: -20,
    lastSmoke: -20,
    threatSince: 0,
    holdUntil: 0,
    slot: null,
    escape: null,
    throwTarget: null,
    smokeTarget: null,
    tbGrenade: -1,
    tbDecision: false,
    flankTarget: null,
    lastFlank: -30,
    scavenge: -1,
    heal: -1,
    healPhase: 0,
    tank: -1,
    rocketAiming: false,
    rocketMoveAt: 0,
    lastRocketTactic: -60,
    advanceRetryAt: 0,
    overwatchAt: 0,
    prot: 0,
  };
  readonly loco = new Locomotion();
  readonly contacts = new Map<number, Contact>();
  /** Recently perceived friendlies count (UI). */
  nearbyAllies = 0;
  readonly stats: UnitStats = newStats();
  /** Callout bubble (UI). */
  callout = '';
  calloutUntil = 0;
  /** Muzzle flash timestamp for rendering. */
  flashAt = -1;
  indoor = -1;
  /** Seeds per-unit personality traits. */
  traitSeed = 0;

  constructor(
    readonly id: number,
    readonly team: TeamId,
    readonly role: Role,
    readonly name: string,
    readonly skill: Skill,
    x: number,
    y: number,
    facing: number,
  ) {
    this.x = this.px = x;
    this.y = this.py = y;
    this.facing = this.pfacing = this.aim = this.watch = facing;
    const r = ROLES[role];
    this.weapon = WEAPONS[r.weapon];
    this.mag = this.weapon.mag;
    this.reserve = this.weapon.reserve;
    this.frags = r.frags;
    this.smokes = r.smokes;
    this.rockets = r.rockets;
    this.skillDef = SKILLS[skill];
    this.vision = r.vision * this.skillDef.visionMul;
    this.speedMul = r.speedMul;
  }

  get active() {
    return this.state === 'healthy' || this.state === 'wounded';
  }

  get alive() {
    return this.state !== 'dead';
  }

  busy(now: number) {
    return now < this.busyUntil;
  }

  say(text: string, now: number, dur = 1.6) {
    this.callout = text;
    this.calloutUntil = now + dur;
  }
}

export interface TankBB {
  target: number;
  goal: { x: number; y: number } | null;
  intent: string;
  lastReposition: number;
  lastBackOff: number;
  holdUntil: number;
  /** Drive backwards along the current path (retreating, keeping front armour on threat). */
  reverse: boolean;
  /** Turret rest direction when there is no target. */
  watch: number | null;
  /** Main gun cleared to fire at the current (non-tank) target. */
  cannonOK: boolean;
}

export class Tank {
  readonly kind = 'tank' as const;
  x: number;
  y: number;
  px: number;
  py: number;
  vx = 0;
  vy = 0;
  /** Hull heading (radians). */
  angle: number;
  pangle: number;
  /** Turret heading (world radians). */
  turret: number;
  pturret: number;
  speed = 0;
  hp = TANK.hp;
  maxHp = TANK.hp;
  state: UnitState = 'healthy';
  body: Matter.Body | null = null;
  readonly length = TANK.length;
  readonly width = TANK.width;
  readonly radius = 2.4;
  cannonCd = 1.5;
  coaxCd = 0;
  coaxBurst = 0;
  shells = TANK.shells;
  recoilAt = -10;
  diedAt = 0;
  lastHitAt = -10;
  squad = -1;
  /** Soldier ids sheltering behind this tank (slot index -> id). */
  readonly escorts: number[] = [-1, -1, -1];
  readonly skillDef: SkillDef;
  bt!: BTInstance;
  readonly bb: TankBB = { target: -1, goal: null, intent: '', lastReposition: -10, lastBackOff: -20, holdUntil: 0, reverse: false, watch: null, cannonOK: false };
  readonly loco = new Locomotion();
  readonly contacts = new Map<number, Contact>();
  readonly stats: UnitStats = newStats();
  flashAt = -1;
  coaxFlashAt = -1;
  callout = '';
  calloutUntil = 0;
  /** Recent crush slow-down. */
  crushSlow = 0;
  smokeTrail = 0;

  constructor(
    readonly id: number,
    readonly team: TeamId,
    readonly name: string,
    readonly skill: Skill,
    x: number,
    y: number,
    angle: number,
  ) {
    this.x = this.px = x;
    this.y = this.py = y;
    this.angle = this.pangle = this.turret = this.pturret = angle;
    this.skillDef = SKILLS[skill];
  }

  get active() {
    return this.state !== 'dead';
  }

  get alive() {
    return this.state !== 'dead';
  }

  say(text: string, now: number, dur = 1.6) {
    this.callout = text;
    this.calloutUntil = now + dur;
  }
}

export type Agent = Soldier | Tank;

export interface Grenade {
  id: number;
  kind: 'frag' | 'smoke';
  team: TeamId;
  owner: number;
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  pz: number;
  vz: number;
  body: Matter.Body | null;
  /** Seconds until detonation. */
  fuse: number;
  landed: boolean;
  /** Soldier currently holding it for a throw-back (-1 none). */
  heldBy: number;
  /** Soldier running to pick it up (-1 none). */
  claimedBy: number;
  /** Who threw it back, if anyone. */
  returnedBy: number;
  /** Soldier id -> time they become aware of it. */
  readonly noticed: Map<number, number>;
  spin: number;
}

export interface Projectile {
  id: number;
  kind: 'rocket' | 'shell';
  team: TeamId;
  owner: number;
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  pz: number;
  dx: number;
  dy: number;
  speed: number;
  travelled: number;
  maxRange: number;
  /** Height change per metre (aimed slightly down toward the target). */
  slope: number;
  targetId: number;
}

export interface SmokeCloud {
  id: number;
  x: number;
  y: number;
  r: number;
  rMax: number;
  density: number;
  age: number;
  life: number;
  team: TeamId;
}

export interface Debris {
  id: number;
  body: Matter.Body | null;
  x: number;
  y: number;
  angle: number;
  size: number;
  mat: number;
  z: number;
  vz: number;
  life: number;
}

export interface Fire {
  id: number;
  x: number;
  y: number;
  life: number;
  intensity: number;
}

export interface SquadOrder {
  kind: 'capture' | 'defend' | 'assault' | 'regroup';
  x: number;
  y: number;
  point: number;
}

export interface Squad {
  id: number;
  team: TeamId;
  name: string;
  members: number[];
  order: SquadOrder | null;
  tank: number;
  /** Time of last order change. */
  orderedAt: number;
}
