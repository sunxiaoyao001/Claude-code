import type { WeaponId } from './config';
import type { Cell, Mat } from './map/GameMap';
import type { TeamId } from './types';

export type HitKind = 'unit' | 'tank' | 'wall' | 'cover' | 'tree' | 'ground';

/** Everything the renderer and UI need to know about that happened during a tick. */
export type SimEvent =
  | { type: 'shot'; shooter: number; team: TeamId; weapon: WeaponId; x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; hit: HitKind }
  | { type: 'impact'; x: number; y: number; z: number; kind: 'dust' | 'spark' | 'blood' | 'wood' | 'snow' | 'stone'; dir: number }
  | { type: 'explosion'; x: number; y: number; r: number; kind: 'grenade' | 'rocket' | 'shell' | 'tank' | 'barrel' }
  | { type: 'throw'; id: number; kind: 'frag' | 'smoke'; x: number; y: number; tx: number; ty: number; back: boolean }
  | { type: 'smokeCloud'; id: number; x: number; y: number }
  | { type: 'downed'; id: number; by: number }
  | { type: 'killed'; id: number; by: number; weapon: string; victimTank: boolean }
  | { type: 'revived'; id: number; by: number }
  | { type: 'cellDestroyed'; x: number; y: number; cell: Cell; mat: Mat; cause: 'blast' | 'crush' | 'shot' }
  | { type: 'collapse'; building: number; x: number; y: number }
  | { type: 'launch'; kind: 'rocket' | 'shell'; owner: number; x: number; y: number; angle: number }
  | { type: 'capture'; point: number; team: TeamId | -1 }
  | { type: 'tactic'; kind: TacticKind; id: number; team: TeamId; x: number; y: number }
  | { type: 'end'; winner: TeamId | -1 };

export type TacticKind =
  | 'throwBack'
  | 'dodge'
  | 'rescue'
  | 'smokeRescue'
  | 'smokeCover'
  | 'tankShield'
  | 'flank'
  | 'suppress'
  | 'grenadeAttack'
  | 'antiTank'
  | 'crush'
  | 'scavenge'
  | 'heal';

export interface FeedEntry {
  id: number;
  t: number;
  kind: 'kill' | 'down' | 'revive' | 'tactic' | 'capture' | 'tank' | 'collapse';
  team: TeamId | -1;
  text: string;
  /** i18n key + params for the UI to format. */
  key: string;
  params: Record<string, string | number>;
  x: number;
  y: number;
  /** Unit to focus when clicked. */
  focus: number;
}
