import { Eye } from 'lucide-react';
import { useMemo } from 'react';
import { TeamMark } from '@/components/TeamMark';
import { game } from '@/game/GameController';
import { useT } from '@/i18n';
import { feedTeam, formatFeed } from '@/lib/feed';
import { clock } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useGame } from '@/store/gameStore';

/** Bottom-right battle log: kills, revives, captures and notable tactics. */
export function EventFeed() {
  const t = useT();
  const feed = useGame((s) => s.feed);
  const roster = useGame((s) => s.roster);
  const now = useGame((s) => s.hud?.time ?? 0);
  const items = useMemo(() => feed.slice(-7).reverse(), [feed]);
  return (
    <section className="hud-panel pointer-events-auto w-[min(380px,calc(100vw-1.5rem))] rounded-md" aria-labelledby="feed-title">
      <h2 id="feed-title" className="border-b border-hairline px-3 py-1.5 text-xs font-semibold text-foreground/80">
        {t('hud.feed')}
      </h2>
      <ol className="px-1.5 py-1" aria-live="polite">
        {items.length === 0 && <li className="px-1.5 py-1 text-xs text-muted-foreground">…</li>}
        {items.map((e) => {
          const age = now - e.t;
          const tactic = e.kind === 'tactic';
          return (
            <li key={e.id} className={cn('group flex items-start gap-2 rounded-sm px-1.5 py-[3px] text-[13px] leading-snug transition-opacity', age > 25 && 'opacity-55')}>
              <span className="w-9 shrink-0 pt-[1px] text-[11px] tabular-nums text-muted-foreground">{clock(e.t)}</span>
              <TeamMark team={feedTeam(roster, e)} size={9} className="mt-1" />
              <span className={cn('min-w-0 flex-1', tactic ? 'text-foreground' : 'text-foreground/80', e.kind === 'kill' && 'text-foreground/90')}>{formatFeed(t, roster, e)}</span>
              <button
                className="shrink-0 rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                onClick={() => (e.focus >= 0 ? game.focusUnit(e.focus, false) : game.focusPoint(e.x, e.y, false))}
                aria-label={t('hud.view')}
                title={t('hud.view')}
              >
                <Eye className="size-3.5" />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
