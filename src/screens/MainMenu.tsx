import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TeamMark } from '@/components/TeamMark';
import { game } from '@/game/GameController';
import { randomSeed } from '@/game/core/rng';
import type { Biome } from '@/game/sim/types';
import { useT } from '@/i18n';
import { feedTeam, formatFeed } from '@/lib/feed';
import { useGame, type Language } from '@/store/gameStore';
import { Wordmark } from './Wordmark';

const BIOMES: Biome[] = ['urban', 'desert', 'snow'];

export function MainMenu() {
  const t = useT();
  const setPhase = useGame((s) => s.setPhase);
  const config = useGame((s) => s.config);
  const lang = useGame((s) => s.settings.language);
  const setSettings = useGame((s) => s.setSettings);

  const quick = () => {
    const biome = BIOMES[Math.floor(Math.random() * BIOMES.length)];
    void game.startBattle({ ...config, biome, seed: randomSeed() });
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {/* scrim so the menu stays legible over any biome */}
      <div className="absolute inset-y-0 left-0 w-full max-w-[640px] bg-[linear-gradient(90deg,rgb(12_15_10/0.94)_0%,rgb(12_15_10/0.82)_55%,rgb(12_15_10/0)_100%)]" />
      <section className="pointer-events-auto relative flex h-full w-full max-w-[540px] flex-col px-7 py-8 sm:px-14 sm:py-12">
        <Wordmark />
        <p className="mt-6 max-w-[30ch] text-lg leading-snug text-foreground/80">{t('app.tagline')}</p>

        <nav className="mt-10 flex w-full max-w-[18rem] flex-col gap-2.5" aria-label="Main">
          <Button size="lg" className="justify-start" onClick={() => setPhase('setup')} autoFocus>
            {t('menu.play')}
          </Button>
          <Button size="lg" variant="secondary" className="justify-start" onClick={quick}>
            {t('menu.quick')}
          </Button>
          <Button size="lg" variant="ghost" className="justify-start" onClick={() => setPhase('settings')}>
            {t('menu.settings')}
          </Button>
        </nav>

        <div className="mt-auto space-y-5 pt-10">
          <ul className="max-w-[42ch] space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            <li>{t('menu.how.1')}</li>
            <li>{t('menu.how.2')}</li>
            <li>{t('menu.how.3')}</li>
          </ul>
          <div className="flex flex-wrap items-center gap-4">
            <ToggleGroup type="single" value={lang} onValueChange={(v) => v && setSettings({ language: v as Language })} aria-label={t('settings.language')}>
              <ToggleGroupItem value="zh" className="px-3 py-1 text-xs">
                中文
              </ToggleGroupItem>
              <ToggleGroupItem value="en" className="px-3 py-1 text-xs">
                English
              </ToggleGroupItem>
            </ToggleGroup>
            <span className="text-xs text-muted-foreground/80">{t('menu.footer')}</span>
          </div>
        </div>
      </section>
      <LiveTicker />
    </div>
  );
}

/** What the background AI battle is doing right now. */
function LiveTicker() {
  const t = useT();
  const feed = useGame((s) => s.feed);
  const roster = useGame((s) => s.roster);
  const hud = useGame((s) => s.hud);
  const biome = game.sim?.config.biome;
  // newest last; keep one line per kind of event so the ticker shows variety
  const items = useMemo(() => {
    const seen = new Set<string>();
    const out = [];
    for (let i = feed.length - 1; i >= 0 && out.length < 4; i--) {
      const f = feed[i];
      if (f.kind === 'capture' || seen.has(f.key)) continue;
      seen.add(f.key);
      out.unshift(f);
    }
    return out;
  }, [feed]);
  if (!hud) return null;
  return (
    <aside className="pointer-events-auto absolute bottom-6 right-6 hidden w-[360px] hud-panel rounded-md p-4 md:block" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="size-2 rounded-full bg-destructive animate-pulse-soft" aria-hidden />
          {t('menu.live')}
        </div>
        {biome && <span className="text-xs text-muted-foreground">{t(`biome.${biome}`)}</span>}
      </div>
      <div className="mt-2.5 flex items-center gap-3 text-sm tabular-nums">
        <span className="flex items-center gap-1.5">
          <TeamMark team={0} size={10} />
          <span className="text-blue-team">{hud.alive[0]}</span>
        </span>
        <span className="text-muted-foreground">vs</span>
        <span className="flex items-center gap-1.5">
          <TeamMark team={1} size={10} />
          <span className="text-red-team">{hud.alive[1]}</span>
        </span>
      </div>
      <ul className="mt-3 space-y-1.5 border-t border-hairline pt-3 text-[13px] leading-snug">
        {items.length === 0 && <li className="text-muted-foreground">…</li>}
        {items.map((e) => (
          <li key={e.id} className="flex items-start gap-2 animate-ticker-in">
            <TeamMark team={feedTeam(roster, e)} size={9} className="mt-1" />
            <span className="text-foreground/85">{formatFeed(t, roster, e)}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
