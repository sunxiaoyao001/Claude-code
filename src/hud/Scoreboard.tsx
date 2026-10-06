import { TeamMark } from '@/components/TeamMark';
import type { TeamId } from '@/game/sim/types';
import { useT } from '@/i18n';
import { clock } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useGame, type PointHud } from '@/store/gameStore';

function Side({ team }: { team: TeamId }) {
  const t = useT();
  const hud = useGame((s) => s.hud)!;
  const alive = hud.alive[team];
  const total = hud.total[team];
  const color = team === 0 ? 'var(--team-blue)' : 'var(--team-red)';
  const dom = hud.mode === 'domination';
  const right = team === 1;
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col gap-1 px-3 py-2', right ? 'items-end text-right' : 'items-start')}>
      <div className={cn('flex w-full items-center gap-2 text-xs font-medium', right && 'flex-row-reverse')}>
        <TeamMark team={team} size={10} />
        <span className="truncate" style={{ color }}>
          {t(`team.${team}`)}
        </span>
        {dom && (
          <span className={cn('tabular-nums text-muted-foreground', right ? 'mr-auto' : 'ml-auto')}>
            {t('hud.score')} <span className="text-foreground">{Math.floor(hud.score[team])}</span>
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 tabular-nums">
        <span className="text-3xl font-semibold leading-none" style={{ color }} aria-label={`${alive} ${t('hud.alive')}`}>
          {alive}
        </span>
        <span className="text-sm text-muted-foreground">/ {total}</span>
      </div>
      <div className="h-1 w-full max-w-[150px] overflow-hidden bg-hairline" aria-hidden>
        <div className={cn('h-full transition-[width] duration-500', right && 'ml-auto')} style={{ width: `${(alive / Math.max(1, total)) * 100}%`, background: color }} />
      </div>
      {dom && (
        <div className="h-[2px] w-full max-w-[150px] overflow-hidden bg-hairline/60" aria-hidden>
          <div className={cn('h-full bg-foreground/60', right && 'ml-auto')} style={{ width: `${Math.min(100, (hud.score[team] / hud.scoreLimit) * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function PointChip({ p }: { p: PointHud }) {
  const t = useT();
  const owner = p.owner;
  const lead = p.capture > 0 ? 0 : p.capture < 0 ? 1 : -1;
  const ring = Math.abs(p.capture);
  const c = owner === 0 ? 'var(--team-blue)' : owner === 1 ? 'var(--team-red)' : 'rgb(230 225 210 / 0.55)';
  const lc = lead === 0 ? 'var(--team-blue)' : 'var(--team-red)';
  const R = 13;
  const C = 2 * Math.PI * R;
  return (
    <div className="flex flex-col items-center" title={p.contested ? t('hud.contested') : undefined}>
      <svg width="34" height="34" viewBox="0 0 34 34" aria-label={`${p.label}`} className={cn(p.contested && 'animate-pulse-soft')}>
        <circle cx="17" cy="17" r={R} fill={owner === -1 ? 'rgb(0 0 0 / 0.35)' : c} fillOpacity={owner === -1 ? 1 : 0.28} stroke="rgb(230 225 210 / 0.18)" strokeWidth="2" />
        {lead !== -1 && ring < 0.999 && (
          <circle cx="17" cy="17" r={R} fill="none" stroke={lc} strokeWidth="2.6" strokeDasharray={`${C * ring} ${C}`} transform="rotate(-90 17 17)" strokeLinecap="round" />
        )}
        {owner !== -1 && <circle cx="17" cy="17" r={R} fill="none" stroke={c} strokeWidth="2" />}
        <text x="17" y="17.5" textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="700" fill="#efeadb">
          {p.label}
        </text>
      </svg>
    </div>
  );
}

/** Top-centre: both sides' strength and score, objectives and the clock. */
export function Scoreboard() {
  const t = useT();
  const hud = useGame((s) => s.hud);
  if (!hud) return null;
  return (
    <div className="hud-panel pointer-events-auto flex w-[min(640px,calc(100vw-1.5rem))] items-stretch rounded-md">
      <Side team={0} />
      <div className="flex flex-col items-center justify-center gap-1 border-x border-hairline px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          {hud.points.map((p) => (
            <PointChip key={p.id} p={p} />
          ))}
        </div>
        <div className="flex items-baseline gap-1.5 tabular-nums">
          <span className="text-base font-semibold" aria-label={t('hud.time')}>
            {clock(hud.time)}
          </span>
          {hud.timeLimit > 0 && <span className="text-[11px] text-muted-foreground">{t('hud.limit', { t: clock(hud.timeLimit) })}</span>}
        </div>
      </div>
      <Side team={1} />
    </div>
  );
}
