export type TeamId = 0 | 1;
export type Biome = 'desert' | 'snow' | 'urban';
export type Skill = 'recruit' | 'regular' | 'veteran' | 'elite';
export type Role = 'rifleman' | 'mg' | 'medic' | 'at' | 'sniper';
export type BattleScale = 10 | 15 | 20;
export type VictoryMode = 'annihilation' | 'domination';

export interface BattleConfig {
  biome: Biome;
  /** Infantry per team. */
  scale: BattleScale;
  /** Tanks per team (0-3). */
  tanks: number;
  skill: [Skill, Skill];
  seed: number;
  mode: VictoryMode;
  /** Seconds; 0 disables the time limit. */
  timeLimit: number;
}

export const DEFAULT_CONFIG: BattleConfig = {
  biome: 'urban',
  scale: 10,
  tanks: 1,
  skill: ['veteran', 'veteran'],
  seed: 1,
  mode: 'domination',
  timeLimit: 600,
};

export const TEAM_NAMES = ['Azure', 'Crimson'] as const;

export type UnitState = 'healthy' | 'wounded' | 'downed' | 'dead';
