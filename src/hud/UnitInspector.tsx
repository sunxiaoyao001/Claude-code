import { Crosshair, LocateFixed, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { TeamMark, teamColor } from '@/components/TeamMark';
import { game } from '@/game/GameController';
import { useT } from '@/i18n';
import { pct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useGame, type UnitInfo } from '@/store/gameStore';
import { activeBranch, BehaviorTreeView } from './BehaviorTreeView';

function Meter({ label, value, max, color, right }: { label: string; value: number; max: number; color: string; right?: ReactNode }) {
  const f = Math.max(0, Math.min(1, value / Math.max(1e-6, max)));
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground/90">{right}</span>
      </div>
      <div className="mt-1 h-1.5 bg-hairline" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
        <div className="h-full transition-[width] duration-300" style={{ width: `${f * 100}%`, background: color }} />
      </div>
    </div>
  );
}

/** One stage of the sense -> decide -> act pipeline. */
function Layer({ label, children, last }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <li className="relative grid grid-cols-[4.5rem_1fr] items-baseline gap-2 py-1 pl-4">
      <span aria-hidden className="absolute left-[3px] top-[0.7rem] size-[7px] rounded-full border border-signal/80 bg-background" />
      {!last && <span aria-hidden className="absolute bottom-[-0.45rem] left-[6px] top-[1.25rem] w-px bg-signal/35" />}
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-[13px] text-foreground">{children}</span>
    </li>
  );
}

function stateTone(state: string) {
  return state === 'healthy' ? 'text-ok' : state === 'wounded' ? 'text-signal' : state === 'downed' ? 'text-destructive' : 'text-muted-foreground';
}

/** Right-hand panel: the selected unit's vitals and live decision making. */
export function UnitInspector() {
  const t = useT();
  const u = useGame((s) => s.unit);
  if (!u) return null;
  return <InspectorBody u={u} t={t} />;
}

function InspectorBody({ u, t }: { u: UnitInfo; t: (k: string, p?: Record<string, string | number>) => string }) {
  const branch = activeBranch(u.btKey, u.bt);
  const color = teamColor(u.team);
  const acc = pct(u.stats.hits, u.stats.shots);
  return (
    <section className="hud-panel pointer-events-auto flex max-h-full w-[340px] flex-col rounded-md" aria-labelledby="inspect-name">
      <header className="flex items-start gap-3 border-b border-hairline px-3 pb-2.5 pt-3">
        <TeamMark team={u.team} size={14} className="mt-1.5" />
        <div className="min-w-0 flex-1">
          <h2 id="inspect-name" className="truncate text-xl font-semibold leading-tight" style={{ color }}>
            {u.name}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {t(`role.${u.role}`)}
            {u.squad && <span className="ml-2">{t('inspect.squad', { s: u.squad })}</span>}
            {u.leader && <span className="ml-2 text-signal">{t('inspect.leader')}</span>}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            size="icon-sm"
            variant={u.following ? 'secondary' : 'quiet'}
            onClick={() => (u.following ? game.setFollowing(false) : game.focusUnit(u.id, true))}
            aria-label={u.following ? t('inspect.unfollow') : t('inspect.follow')}
            aria-pressed={u.following}
            title={u.following ? t('inspect.unfollow') : t('inspect.follow')}
          >
            <LocateFixed />
          </Button>
          <Button size="icon-sm" variant="quiet" onClick={() => game.select(-1)} aria-label={t('inspect.close')} title={t('inspect.close')}>
            <X />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin">
        <div className="mt-2.5 flex items-center gap-3 text-xs">
          <span className={cn('font-semibold', stateTone(u.state))}>{t(`state.${u.state}`)}</span>
          {u.kind === 'soldier' && u.state !== 'dead' && <span className="text-muted-foreground">{t(`stance.${u.stance}`)}</span>}
          <span className="ml-auto text-muted-foreground">{t(`weapon.${u.weapon}`)}</span>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
          <Meter label={t('inspect.hp')} value={u.hp} max={u.maxHp} color={color} right={`${Math.ceil(u.hp)}/${u.maxHp}`} />
          {u.kind === 'soldier' ? (
            <Meter label={t('inspect.ammo')} value={u.mag} max={u.magSize} color="rgb(230 225 210 / 0.75)" right={`${u.mag}/${u.magSize} +${u.reserve}`} />
          ) : (
            <Meter label={t('inspect.shells')} value={u.shells} max={40} color="rgb(230 225 210 / 0.75)" right={u.shells} />
          )}
          {u.kind === 'soldier' && (
            <>
              <Meter label={t('inspect.supp')} value={u.suppression} max={1} color="var(--signal)" right={`${Math.round(u.suppression * 100)}%`} />
              <Meter label={t('inspect.cover')} value={u.protection} max={1} color="var(--ok)" right={`${Math.round(u.protection * 100)}%`} />
            </>
          )}
        </div>

        {u.kind === 'soldier' && (
          <div className="mt-2.5 flex gap-4 text-xs text-muted-foreground">
            <span>
              {t('inspect.grenades')} <span className="tabular-nums text-foreground">{u.frags}</span>
            </span>
            <span>
              {t('inspect.smokes')} <span className="tabular-nums text-foreground">{u.smokes}</span>
            </span>
            {u.role === 'at' && (
              <span>
                {t('inspect.rockets')} <span className="tabular-nums text-foreground">{u.rockets}</span>
              </span>
            )}
          </div>
        )}

        {/* perception -> decision -> action */}
        <ol className="mt-3 border-y border-hairline py-1.5" aria-label={t('inspect.layers')}>
          <Layer label={t('inspect.perception')}>{t('inspect.visibleKnown', { v: u.visible, k: u.known })}</Layer>
          <Layer label={t('inspect.decision')}>{branch ? t(branch) : t('inspect.none')}</Layer>
          <Layer label={t('inspect.action')} last>
            {t(`intent.${u.intent}`)}
            {u.target && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Crosshair className="size-3 text-destructive" aria-hidden />
                {u.target}
              </span>
            )}
          </Layer>
        </ol>

        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {(
            [
              ['inspect.kills', u.stats.kills],
              ['inspect.downs', u.stats.downs],
              ['inspect.revives', u.stats.revives],
              ['inspect.accuracy', `${acc}%`],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-sm bg-black/20 py-1.5">
              <div className="text-base font-semibold tabular-nums">{v}</div>
              <div className="text-[11px] text-muted-foreground">{t(k)}</div>
            </div>
          ))}
        </div>

        <h3 className="mt-4 text-sm font-semibold">{t('inspect.bt')}</h3>
        <div className="mt-1.5">
          <BehaviorTreeView btKey={u.btKey} statuses={u.bt} />
        </div>
      </div>
    </section>
  );
}
