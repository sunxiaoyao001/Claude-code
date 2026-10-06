import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TeamMark } from '@/components/TeamMark';
import { game } from '@/game/GameController';
import { randomSeed } from '@/game/core/rng';
import { SCORE_LIMIT } from '@/game/sim/Simulation';
import type { BattleScale, Biome, Skill, TeamId, VictoryMode } from '@/game/sim/types';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { useGame } from '@/store/gameStore';
import { MapPreview } from './MapPreview';

const BIOMES: Biome[] = ['urban', 'desert', 'snow'];
const SKILLS: Skill[] = ['recruit', 'regular', 'veteran', 'elite'];

function Field({ label, hint, children, id }: { label: string; hint?: string; children: ReactNode; id: string }) {
  return (
    <div role="group" aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 id={id} className="text-sm font-semibold text-foreground">
          {label}
        </h3>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function BattleSetup() {
  const t = useT();
  const config = useGame((s) => s.config);
  const setConfig = useGame((s) => s.setConfig);
  const setPhase = useGame((s) => s.setPhase);

  const setSkill = (team: TeamId, v: Skill) => {
    const skill = [...config.skill] as [Skill, Skill];
    skill[team] = v;
    setConfig({ skill });
  };
  const minutes = Math.round(config.timeLimit / 60);

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-background/72 backdrop-blur-[2px] scrollbar-thin">
      <div className="mx-auto flex min-h-full w-full max-w-[1080px] items-center px-4 py-6 sm:px-8">
        <section className="hud-panel w-full rounded-lg" aria-labelledby="setup-title">
          <header className="flex items-end justify-between gap-4 border-b border-hairline px-6 py-5">
            <h2 id="setup-title" className="text-3xl font-semibold leading-none">
              {t('setup.title')}
            </h2>
            <p className="hidden text-sm text-muted-foreground sm:block">
              {config.scale} vs {config.scale}
              {config.tanks > 0 ? ` + ${config.tanks} × ${t('role.tank')}` : ''}
            </p>
          </header>

          <div className="grid gap-8 px-6 py-6 lg:grid-cols-[1.15fr_1fr]">
            {/* battlefield choice with real previews */}
            <Field label={t('setup.map')} id="f-map">
              <div className="grid gap-3" role="radiogroup" aria-labelledby="f-map">
                {BIOMES.map((b) => {
                  const on = config.biome === b;
                  return (
                    <button
                      key={b}
                      role="radio"
                      aria-checked={on}
                      onClick={() => setConfig({ biome: b })}
                      className={cn(
                        'grid grid-cols-[minmax(0,148px)_1fr] items-center gap-4 rounded-md border p-2.5 text-left transition-colors',
                        on ? 'border-primary/80 bg-secondary/70' : 'border-hairline bg-black/15 hover:border-foreground/25',
                      )}
                    >
                      <div className="overflow-hidden rounded-sm bg-black/30">
                        <MapPreview biome={b} scale={config.scale} seed={config.seed} label={`${t('setup.preview')}: ${t(`biome.${b}`)}`} />
                      </div>
                      <div>
                        <div className="text-base font-semibold">{t(`biome.${b}`)}</div>
                        <p className="mt-1 text-sm leading-snug text-muted-foreground">{t(`biome.${b}.desc`)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="space-y-6">
              <Field label={t('setup.scale')} hint={t('setup.scale.desc')} id="f-scale">
                <ToggleGroup type="single" className="w-full" value={String(config.scale)} onValueChange={(v) => v && setConfig({ scale: Number(v) as BattleScale })}>
                  {[10, 15, 20].map((n) => (
                    <ToggleGroupItem key={n} value={String(n)} className="text-base tabular-nums">
                      {n} v {n}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>

              <Field label={t('setup.tanks')} id="f-tanks">
                <ToggleGroup type="single" className="w-full" value={String(config.tanks)} onValueChange={(v) => v && setConfig({ tanks: Number(v) })}>
                  {[0, 1, 2, 3].map((n) => (
                    <ToggleGroupItem key={n} value={String(n)} className="tabular-nums">
                      {n}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>

              <Field label={t('setup.skill')} id="f-skill">
                <div className="space-y-2.5">
                  {([0, 1] as TeamId[]).map((team) => (
                    <div key={team}>
                      <div className="flex items-center gap-3">
                        <span className="flex w-16 shrink-0 items-center gap-2 text-sm" style={{ color: team === 0 ? 'var(--team-blue)' : 'var(--team-red)' }}>
                          <TeamMark team={team} size={10} />
                          {t(`team.short.${team}`)}
                        </span>
                        <ToggleGroup type="single" className="w-full" value={config.skill[team]} onValueChange={(v) => v && setSkill(team, v as Skill)} aria-label={`${t(`team.${team}`)} ${t('setup.skill')}`}>
                          {SKILLS.map((k) => (
                            <ToggleGroupItem key={k} value={k} className="px-2 text-[13px]">
                              {t(`skill.${k}`)}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </div>
                      <p className="mt-1 pl-[4.75rem] text-xs text-muted-foreground">{t(`skill.${config.skill[team]}.desc`)}</p>
                    </div>
                  ))}
                </div>
              </Field>

              <Field label={t('setup.mode')} id="f-mode">
                <ToggleGroup type="single" className="w-full" value={config.mode} onValueChange={(v) => v && setConfig({ mode: v as VictoryMode })}>
                  <ToggleGroupItem value="domination">{t('mode.domination')}</ToggleGroupItem>
                  <ToggleGroupItem value="annihilation">{t('mode.annihilation')}</ToggleGroupItem>
                </ToggleGroup>
                <p className="mt-1.5 text-xs text-muted-foreground">{t(`mode.${config.mode}.desc`, { limit: SCORE_LIMIT })}</p>
              </Field>

              <div className="grid grid-cols-[1fr_auto] items-end gap-6">
                <Field label={t('setup.time')} hint={minutes ? t('setup.minutes', { n: minutes }) : t('setup.none')} id="f-time">
                  <Slider min={0} max={15} step={1} value={[minutes]} onValueChange={([m]) => setConfig({ timeLimit: m * 60 })} aria-labelledby="f-time" className="py-2" />
                </Field>
                <Field label={t('setup.seed')} id="f-seed">
                  <div className="flex gap-1.5">
                    <input
                      aria-labelledby="f-seed"
                      inputMode="numeric"
                      className="h-8 w-28 rounded-sm border border-input bg-black/25 px-2 text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-ring"
                      value={config.seed}
                      onChange={(e) => {
                        const n = parseInt(e.target.value.replace(/\D/g, '') || '0', 10);
                        setConfig({ seed: Math.min(4294967295, n) });
                      }}
                    />
                    <Button variant="secondary" size="sm" className="h-8" onClick={() => setConfig({ seed: randomSeed() })}>
                      {t('setup.reroll')}
                    </Button>
                  </div>
                </Field>
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-hairline px-6 py-4">
            <Button variant="ghost" onClick={() => setPhase('menu')}>
              {t('setup.back')}
            </Button>
            <Button size="lg" onClick={() => void game.startBattle({ ...config })} autoFocus>
              {t('setup.start')}
            </Button>
          </footer>
        </section>
      </div>
    </div>
  );
}
