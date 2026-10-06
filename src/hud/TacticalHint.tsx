import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TeamMark } from '@/components/TeamMark';
import { game } from '@/game/GameController';
import type { FeedEntry } from '@/game/sim/events';
import { useT } from '@/i18n';
import { feedTeam, formatFeed } from '@/lib/feed';
import { useGame } from '@/store/gameStore';

/** Spotlights an interesting AI tactic as it happens, with a jump-to button. */
export function TacticalHint() {
  const t = useT();
  const feed = useGame((s) => s.feed);
  const roster = useGame((s) => s.roster);
  const enabled = useGame((s) => s.settings.hints);
  const [hint, setHint] = useState<FeedEntry | null>(null);
  const lastShown = useRef(0);
  const seen = useRef(0);

  useEffect(() => {
    if (!enabled || feed.length === 0) return;
    const fresh = feed.filter((f) => f.id > seen.current && f.kind === 'tactic');
    if (feed.length) seen.current = Math.max(seen.current, feed[feed.length - 1].id);
    if (!fresh.length) return;
    const now = performance.now();
    if (now - lastShown.current < 5000) return;
    // prefer the rarer, more showy tactics
    const rank = ['tactic.throwBack', 'tactic.smokeRescue', 'tactic.tankShield', 'tactic.antiTank', 'tactic.crush', 'tactic.smokeCover', 'tactic.flank', 'tactic.dodge', 'tactic.grenadeAttack', 'tactic.rescue'];
    fresh.sort((a, b) => (rank.indexOf(a.key) + 99) % 99 - ((rank.indexOf(b.key) + 99) % 99));
    lastShown.current = now;
    setHint(fresh[0]);
  }, [feed, enabled]);

  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(null), 5200);
    return () => clearTimeout(id);
  }, [hint]);

  if (!hint || !enabled) return null;
  return (
    <div key={hint.id} className="hud-panel pointer-events-auto flex max-w-[min(520px,calc(100vw-1.5rem))] items-center gap-3 rounded-md border-l-2 border-l-signal py-1.5 pl-3 pr-1.5 animate-ticker-in" role="status">
      <span className="shrink-0 text-xs font-semibold text-signal">{t('hud.hint')}</span>
      <TeamMark team={feedTeam(roster, hint)} size={9} />
      <span className="min-w-0 truncate text-sm">{formatFeed(t, roster, hint)}</span>
      <Button size="sm" variant="secondary" onClick={() => game.focusUnit(hint.focus, true)}>
        {t('hud.view')}
      </Button>
    </div>
  );
}
