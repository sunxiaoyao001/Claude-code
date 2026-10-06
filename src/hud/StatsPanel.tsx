import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamMark } from '@/components/TeamMark';
import type { TeamStats, TimelineSample } from '@/game/sim/Simulation';
import { useT } from '@/i18n';
import { pct } from '@/lib/format';
import { useGame } from '@/store/gameStore';

type Row = { key: string; v: [number, number]; fmt?: (n: number) => string };

/** Diverging comparison: blue grows left of the centre line, red to the right. */
export function CompareRow({ label, v, fmt }: { label: string; v: [number, number]; fmt?: (n: number) => string }) {
  const max = Math.max(1, v[0], v[1]);
  const f = fmt ?? ((n: number) => String(Math.round(n)));
  return (
    <div className="grid grid-cols-[2.5rem_1fr_minmax(0,auto)_1fr_2.5rem] items-center gap-2 py-[3px] text-[13px]">
      <span className="text-right tabular-nums text-blue-team">{f(v[0])}</span>
      <div className="flex h-1.5 justify-end bg-hairline/50">
        <div className="h-full bg-blue-team/85" style={{ width: `${(v[0] / max) * 100}%` }} />
      </div>
      <span className="min-w-[6.5rem] text-center text-xs text-muted-foreground">{label}</span>
      <div className="h-1.5 bg-hairline/50">
        <div className="h-full bg-red-team/85" style={{ width: `${(v[1] / max) * 100}%` }} />
      </div>
      <span className="tabular-nums text-red-team">{f(v[1])}</span>
    </div>
  );
}

/** Active-unit counts over time for both sides. */
export function StrengthChart({ timeline, total, height = 64 }: { timeline: TimelineSample[]; total: [number, number]; height?: number }) {
  const W = 300;
  const H = height;
  if (timeline.length < 2) return <div style={{ height: H }} className="text-xs text-muted-foreground">…</div>;
  const t0 = timeline[0].t;
  const t1 = timeline[timeline.length - 1].t || 1;
  const maxN = Math.max(1, total[0], total[1]);
  const path = (team: 0 | 1) =>
    timeline
      .map((s, i) => {
        const x = ((s.t - t0) / Math.max(1, t1 - t0)) * W;
        const y = H - 2 - (s.alive[team] / maxN) * (H - 6);
        return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ height: H }} preserveAspectRatio="none" role="img" aria-label="strength chart">
      <line x1="0" x2={W} y1={H - 2} y2={H - 2} stroke="rgb(230 225 210 / 0.15)" />
      <path d={path(0)} fill="none" stroke="var(--team-blue)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      <path d={path(1)} fill="none" stroke="var(--team-red)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeDasharray="5 3" />
    </svg>
  );
}

export function tacticRows(stats: [TeamStats, TeamStats]): Row[] {
  const g = (k: keyof TeamStats): [number, number] => [stats[0][k], stats[1][k]];
  return [
    { key: 'stats.grenades', v: g('grenades') },
    { key: 'stats.throwBacks', v: g('throwBacks') },
    { key: 'stats.dodges', v: g('dodges') },
    { key: 'stats.smokes', v: g('smokes') },
    { key: 'stats.revives', v: g('revives') },
    { key: 'stats.flanks', v: g('flanks') },
    { key: 'stats.tankShield', v: g('tankShield'), fmt: (n) => `${Math.round(n)}s` },
    { key: 'stats.rockets', v: g('rockets') },
    { key: 'stats.tankKills', v: g('tankKills') },
  ];
}

export function StatsPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const hud = useGame((s) => s.hud);
  if (!hud) return null;
  const s = hud.stats;
  return (
    <section className="hud-panel pointer-events-auto flex max-h-full w-[330px] flex-col rounded-md" aria-labelledby="stats-title">
      <header className="flex items-center justify-between border-b border-hairline py-2 pl-3 pr-1.5">
        <h2 id="stats-title" className="text-sm font-semibold">
          {t('hud.stats')}
        </h2>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-blue-team">
            <TeamMark team={0} size={9} />
            {t('team.short.0')}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-red-team">
            <TeamMark team={1} size={9} />
            {t('team.short.1')}
          </span>
          <Button size="icon-sm" variant="quiet" onClick={onClose} aria-label={t('inspect.close')}>
            <X />
          </Button>
        </div>
      </header>
      <div className="min-h-0 overflow-y-auto px-3 pb-3 scrollbar-thin">
        <h3 className="mt-3 text-xs font-semibold text-foreground/80">{t('stats.strength')}</h3>
        <div className="mt-1.5">
          <StrengthChart timeline={hud.timeline} total={hud.total} />
        </div>
        <h3 className="mt-4 text-xs font-semibold text-foreground/80">{t('stats.casualties')}</h3>
        <div className="mt-1">
          <CompareRow label={t('stats.kills')} v={[s[0].kills, s[1].kills]} />
          <CompareRow label={t('stats.downed')} v={[s[1].downed, s[0].downed]} />
          <CompareRow label={t('stats.accuracy')} v={[pct(s[0].hits, s[0].shots), pct(s[1].hits, s[1].shots)]} fmt={(n) => `${n}%`} />
          <CompareRow label={t('stats.damage')} v={[s[0].damage, s[1].damage]} />
        </div>
        <h3 className="mt-4 text-xs font-semibold text-foreground/80">{t('stats.tactics')}</h3>
        <div className="mt-1">
          {tacticRows(s).map((r) => (
            <CompareRow key={r.key} label={t(r.key)} v={r.v} fmt={r.fmt} />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t('stats.structures')}: <span className="tabular-nums text-foreground">{hud.structures}</span>
        </p>
      </div>
    </section>
  );
}
