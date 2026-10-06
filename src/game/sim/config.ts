import type { Role, Skill } from './types';

export const TICK_RATE = 30;
export const DT = 1 / TICK_RATE;
/** Behaviour trees tick every N simulation ticks (staggered per unit). */
export const BT_INTERVAL = 3;
/** Perception refresh every N ticks (staggered per unit). */
export const PERCEPTION_INTERVAL = 6;

export type WeaponId = 'rifle' | 'carbine' | 'lmg' | 'sniper' | 'coax';

export interface WeaponDef {
  id: WeaponId;
  range: number;
  damage: number;
  /** Damage multiplier at max range. */
  falloff: number;
  rpm: number;
  burst: [number, number];
  pause: [number, number];
  mag: number;
  reserve: number;
  reload: number;
  /** Base spread (1 sigma, radians). */
  spread: number;
  suppression: number;
  /** Hearing radius of the report. */
  sound: number;
  headshot: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  rifle: { id: 'rifle', range: 42, damage: 20, falloff: 0.7, rpm: 620, burst: [2, 4], pause: [0.55, 1.3], mag: 30, reserve: 150, reload: 2.4, spread: 0.042, suppression: 0.09, sound: 55, headshot: 0.06 },
  carbine: { id: 'carbine', range: 32, damage: 18, falloff: 0.65, rpm: 760, burst: [3, 5], pause: [0.5, 1.1], mag: 30, reserve: 120, reload: 2.0, spread: 0.05, suppression: 0.07, sound: 48, headshot: 0.05 },
  lmg: { id: 'lmg', range: 48, damage: 18, falloff: 0.72, rpm: 780, burst: [6, 12], pause: [0.8, 1.6], mag: 100, reserve: 300, reload: 5.2, spread: 0.055, suppression: 0.17, sound: 68, headshot: 0.04 },
  sniper: { id: 'sniper', range: 78, damage: 75, falloff: 0.92, rpm: 38, burst: [1, 1], pause: [2.0, 3.2], mag: 5, reserve: 30, reload: 3.2, spread: 0.009, suppression: 0.22, sound: 80, headshot: 0.2 },
  coax: { id: 'coax', range: 46, damage: 16, falloff: 0.72, rpm: 650, burst: [5, 9], pause: [0.7, 1.4], mag: 200, reserve: 2000, reload: 4, spread: 0.045, suppression: 0.15, sound: 70, headshot: 0.04 },
};

export interface RoleDef {
  weapon: WeaponId;
  frags: number;
  smokes: number;
  rockets: number;
  speedMul: number;
  vision: number;
}

export const ROLES: Record<Role, RoleDef> = {
  rifleman: { weapon: 'rifle', frags: 2, smokes: 1, rockets: 0, speedMul: 1, vision: 46 },
  mg: { weapon: 'lmg', frags: 1, smokes: 0, rockets: 0, speedMul: 0.9, vision: 48 },
  medic: { weapon: 'carbine', frags: 0, smokes: 2, rockets: 0, speedMul: 1.05, vision: 42 },
  at: { weapon: 'carbine', frags: 1, smokes: 1, rockets: 3, speedMul: 0.95, vision: 46 },
  sniper: { weapon: 'sniper', frags: 0, smokes: 1, rockets: 0, speedMul: 1, vision: 64 },
};

export interface SkillDef {
  /** Spread multiplier (lower is better). */
  spreadMul: number;
  /** Seconds before reacting to a new threat (grenades, contacts). */
  reaction: number;
  /** Probability of attempting to throw a grenade back when possible. */
  throwBack: number;
  /** Probability of preferring cover when it matters. */
  coverUse: number;
  /** Grenade landing scatter (m, 1 sigma). */
  grenadeScatter: number;
  /** How often advanced tactics (smoke, flanking, tank cover) are used. */
  tactics: number;
  visionMul: number;
  /** Target acquisition time (s). */
  aimTime: number;
}

export const SKILLS: Record<Skill, SkillDef> = {
  recruit: { spreadMul: 1.65, reaction: 0.8, throwBack: 0.0, coverUse: 0.55, grenadeScatter: 2.8, tactics: 0.35, visionMul: 0.85, aimTime: 0.6 },
  regular: { spreadMul: 1.28, reaction: 0.52, throwBack: 0.3, coverUse: 0.75, grenadeScatter: 2.0, tactics: 0.6, visionMul: 0.95, aimTime: 0.42 },
  veteran: { spreadMul: 1.0, reaction: 0.34, throwBack: 0.55, coverUse: 0.9, grenadeScatter: 1.4, tactics: 0.85, visionMul: 1.0, aimTime: 0.3 },
  elite: { spreadMul: 0.8, reaction: 0.22, throwBack: 0.8, coverUse: 1.0, grenadeScatter: 0.9, tactics: 1.0, visionMul: 1.08, aimTime: 0.2 },
};

export const SOLDIER = {
  hp: 100,
  radius: 0.3,
  walk: 2.2,
  run: 3.9,
  sprint: 5.3,
  crouch: 1.5,
  bleedout: 32,
  reviveTime: 3.2,
  healRate: 14,
  fov: (150 * Math.PI) / 180,
  nearAwareness: 9,
  memory: 22,
};

export const GRENADE = {
  fuse: 3.6,
  smokeFuse: 1.1,
  radius: 6.5,
  lethal: 2.6,
  damage: 150,
  minThrow: 7,
  maxThrow: 26,
  gravity: 9.8,
  pickupTime: 0.35,
  windup: 0.55,
};

export const SMOKE = {
  radius: 5.2,
  grow: 2.4,
  life: 20,
  density: 0.42,
};

export const ROCKET = {
  speed: 44,
  range: 55,
  damage: 130,
  radius: 3.6,
  vsTank: 470,
  vsWall: 520,
  reload: 3.4,
};

export const TANK = {
  hp: 1200,
  length: 5.6,
  width: 3.2,
  speed: 4.4,
  escortSpeed: 2.3,
  reverse: 2.2,
  turnRate: 0.75,
  turretRate: 0.95,
  vision: 52,
  cannonReload: 4.6,
  shellSpeed: 95,
  shellDamage: 115,
  shellRadius: 3.4,
  shellVsTank: 440,
  shellVsWall: 760,
  shells: 40,
  cannonRange: 62,
};
