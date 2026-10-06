import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FeedEntry } from '@/game/sim/events';
import type { UnitStats } from '@/game/sim/entities';
import type { TeamStats, TimelineSample } from '@/game/sim/Simulation';
import { DEFAULT_CONFIG, type BattleConfig, type TeamId, type VictoryMode } from '@/game/sim/types';

export type Phase = 'boot' | 'menu' | 'setup' | 'settings' | 'loading' | 'battle' | 'results';
export type Language = 'zh' | 'en';
export type Quality = 'low' | 'medium' | 'high';

export interface Settings {
  language: Language;
  quality: Quality;
  healthBars: 'damaged' | 'always' | 'off';
  callouts: boolean;
  roofs: boolean;
  blood: boolean;
  shake: boolean;
  edgeScroll: boolean;
  aiDebug: boolean;
  hints: boolean;
}

export interface PointHud {
  id: number;
  label: string;
  owner: TeamId | -1;
  capture: number;
  contested: boolean;
  n: [number, number];
}

export interface HudSnapshot {
  time: number;
  timeLimit: number;
  mode: VictoryMode;
  scoreLimit: number;
  alive: [number, number];
  total: [number, number];
  tanks: [number, number];
  score: [number, number];
  points: PointHud[];
  stats: [TeamStats, TeamStats];
  structures: number;
  timeline: TimelineSample[];
  fps: number;
  stepMs: number;
  ended: boolean;
}

export interface UnitInfo {
  id: number;
  kind: 'soldier' | 'tank';
  team: TeamId;
  name: string;
  role: string;
  squad: string;
  leader: boolean;
  state: string;
  stance: string;
  hp: number;
  maxHp: number;
  mag: number;
  magSize: number;
  reserve: number;
  frags: number;
  smokes: number;
  rockets: number;
  shells: number;
  suppression: number;
  protection: number;
  intent: string;
  target: string;
  visible: number;
  known: number;
  weapon: string;
  stats: UnitStats;
  bt: number[];
  btKey: 'soldier' | 'tank';
  following: boolean;
}

export interface UnitCard {
  id: number;
  team: TeamId;
  name: string;
  role: string;
  kind: 'soldier' | 'tank';
  stats: UnitStats;
  state: string;
}

export interface BattleResult {
  winner: TeamId | -1;
  duration: number;
  config: BattleConfig;
  stats: [TeamStats, TeamStats];
  alive: [number, number];
  total: [number, number];
  score: [number, number];
  structures: number;
  mvp: UnitCard[];
  timeline: TimelineSample[];
}

interface GameState {
  phase: Phase;
  prevPhase: Phase;
  config: BattleConfig;
  settings: Settings;
  hud: HudSnapshot | null;
  unit: UnitInfo | null;
  selected: number;
  feed: FeedEntry[];
  loading: { progress: number; label: string };
  result: BattleResult | null;
  speed: number;
  paused: boolean;
  /** Unit names for feed formatting (id -> name/role/team). */
  roster: Record<number, { name: string; role: string; team: TeamId; kind: 'soldier' | 'tank' }>;
  setPhase: (p: Phase) => void;
  setConfig: (c: Partial<BattleConfig>) => void;
  setSettings: (s: Partial<Settings>) => void;
  setHud: (h: HudSnapshot) => void;
  setUnit: (u: UnitInfo | null) => void;
  setSelected: (id: number) => void;
  pushFeed: (f: FeedEntry[]) => void;
  clearFeed: () => void;
  setLoading: (progress: number, label: string) => void;
  setResult: (r: BattleResult | null) => void;
  setSpeed: (speed: number, paused: boolean) => void;
  setRoster: (r: GameState['roster']) => void;
}

const detectLanguage = (): Language => {
  try {
    return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  } catch {
    return 'zh';
  }
};

export const DEFAULT_SETTINGS: Settings = {
  language: detectLanguage(),
  quality: 'high',
  healthBars: 'damaged',
  callouts: true,
  roofs: true,
  blood: true,
  shake: true,
  edgeScroll: false,
  aiDebug: true,
  hints: true,
};

export const useGame = create<GameState>()(
  persist(
    (set) => ({
      phase: 'boot',
      prevPhase: 'boot',
      config: { ...DEFAULT_CONFIG },
      settings: { ...DEFAULT_SETTINGS },
      hud: null,
      unit: null,
      selected: -1,
      feed: [],
      loading: { progress: 0, label: '' },
      result: null,
      speed: 1,
      paused: false,
      roster: {},
      setPhase: (p) => set((s) => ({ phase: p, prevPhase: s.phase })),
      setConfig: (c) => set((s) => ({ config: { ...s.config, ...c } })),
      setSettings: (c) => set((s) => ({ settings: { ...s.settings, ...c } })),
      setHud: (h) => set({ hud: h }),
      setUnit: (u) => set({ unit: u }),
      setSelected: (id) => set({ selected: id }),
      pushFeed: (f) => set((s) => ({ feed: [...s.feed, ...f].slice(-80) })),
      clearFeed: () => set({ feed: [] }),
      setLoading: (progress, label) => set({ loading: { progress, label } }),
      setResult: (r) => set({ result: r }),
      setSpeed: (speed, paused) => set({ speed, paused }),
      setRoster: (r) => set({ roster: r }),
    }),
    {
      name: 'autonomous-front',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ settings: s.settings, config: { ...s.config } }),
    },
  ),
);
