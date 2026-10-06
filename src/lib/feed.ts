import type { FeedEntry } from '@/game/sim/events';
import type { TeamId } from '@/game/sim/types';

export type Roster = Record<number, { name: string; role: string; team: TeamId; kind: 'soldier' | 'tank' }>;
type T = (key: string, params?: Record<string, string | number>) => string;

const UNIT_PARAMS = ['victim', 'killer', 'medic', 'unit'] as const;

export function unitLabel(t: T, roster: Roster, id: number) {
  const r = roster[id];
  if (!r) return t('feed.unknown');
  return r.kind === 'tank' ? r.name : `${r.name}`;
}

/** Turn a sim feed entry (i18n key + ids) into a readable line. */
export function formatFeed(t: T, roster: Roster, e: FeedEntry): string {
  const p: Record<string, string | number> = { ...e.params };
  for (const k of UNIT_PARAMS) if (typeof e.params[k] === 'number') p[k] = unitLabel(t, roster, e.params[k] as number);
  if (typeof e.params.weapon === 'string') p.weapon = t(`weapon.${e.params.weapon}`);
  return t(e.key, p);
}

/** Team of the acting unit for the entry's marker. */
export function feedTeam(roster: Roster, e: FeedEntry): TeamId | -1 {
  const id = (e.params.killer ?? e.params.medic ?? e.params.unit) as number | undefined;
  if (typeof id === 'number' && roster[id]) return roster[id].team;
  return e.team;
}
