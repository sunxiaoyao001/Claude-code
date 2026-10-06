import { Button } from '@/components/ui/button';
import { TeamMark, teamColor } from '@/components/TeamMark';
import { game } from '@/game/GameController';
import { randomSeed } from '@/game/core/rng';
import { CompareRow, StrengthChart, tacticRows } from '@/hud/StatsPanel';
import { useT } from '@/i18n';
import { clock, pct } from '@/lib/format';
import { useGame } from '@/store/gameStore';

/** After-action report. */
export function ResultsScreen() {
  const t = useT();
  const r = useGame((s) => s.result);
  const setPhase = useGame((s) => s.setPhase);
  if (!r) return null;
  const s = r.stats;
  const headline = r.winner === -1 ? t('results.draw') : t('results.victory', { team: t(`team.${r.winner}`) });
  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-background/70 backdrop-blur-[2px] scrollbar-thin">
      <div className="mx-auto flex min-h-full max-w-[980px] items-center px-4 py-6">
        <section className="hud-panel w-full rounded-lg" aria-labelledby="res-title">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline px-6 pb-5 pt-6">
            <div className="flex items-center gap-4">
              <TeamMark team={r.winner} size={26} />
              <h2 id="res-title" className="font-display text-5xl font-[750] uppercase leading-none sm:text-6xl" style={{ color: teamColor(r.winner) }}>
                {headline}
              </h2>
            </div>
            <dl className="flex gap-6 text-sm">
              <div>
                <dt className="text-muted-foreground">{t('results.duration')}</dt>
                <dd className="text-lg font-semibold tabular-nums">{clock(r.duration)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('results.survivors')}</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  <span className="text-blue-team">{r.alive[0]}</span>
                  <span className="mx-1 text-muted-foreground">/</span>
                  <span className="text-red-team">{r.alive[1]}</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t(`biome.${r.config.biome}`)}</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {r.config.scale} v {r.config.scale}
                </dd>
              </div>
            </dl>
          </header>

          <div className="grid gap-8 px-6 py-6 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <h3 className="text-sm font-semibold">{t('stats.strength')}</h3>
              <div className="mt-2">
                <StrengthChart timeline={r.timeline} total={r.total} height={110} />
              </div>
              <h3 className="mt-5 text-sm font-semibold">{t('stats.casualties')}</h3>
              <div className="mt-1">
                <CompareRow label={t('stats.kills')} v={[s[0].kills, s[1].kills]} />
                <CompareRow label={t('stats.downed')} v={[s[1].downed, s[0].downed]} />
                <CompareRow label={t('stats.revives')} v={[s[0].revives, s[1].revives]} />
                <CompareRow label={t('stats.accuracy')} v={[pct(s[0].hits, s[0].shots), pct(s[1].hits, s[1].shots)]} fmt={(n) => `${n}%`} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t('stats.tactics')}</h3>
              <div className="mt-1">
                {tacticRows(s).map((row) => (
                  <CompareRow key={row.key} label={t(row.key)} v={row.v} fmt={row.fmt} />
                ))}
              </div>
              <h3 className="mt-5 text-sm font-semibold">{t('results.mvp')}</h3>
              <ol className="mt-2 divide-y divide-hairline">
                {r.mvp.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 py-1.5 text-sm">
                    <TeamMark team={u.team} size={10} />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold" style={{ color: teamColor(u.team) }}>
                        {u.name}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">{t(`role.${u.role}`)}</span>
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {t('inspect.kills')} <span className="text-foreground">{u.stats.kills}</span>
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {t('inspect.revives')} <span className="text-foreground">{u.stats.revives}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-6 py-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => game.exitToMenu()}>
                {t('results.menu')}
              </Button>
              <Button variant="ghost" onClick={() => setPhase('battle')}>
                {t('results.watch')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setPhase('setup')}>
                {t('results.setup')}
              </Button>
              <Button variant="secondary" onClick={() => void game.startBattle({ ...r.config })}>
                {t('results.replay')}
              </Button>
              <Button onClick={() => void game.startBattle({ ...r.config, seed: randomSeed() })} autoFocus>
                {t('results.rematch')}
              </Button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
