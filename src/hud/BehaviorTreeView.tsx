import { useMemo, useState } from 'react';
import { getSoldierTree } from '@/game/sim/ai/soldierTree';
import { getTankTree } from '@/game/sim/ai/tankTree';
import type { NodeKind, TreeShape } from '@/game/sim/ai/bt/BehaviorTree';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

const SHAPES: Record<'soldier' | 'tank', TreeShape[]> = {
  soldier: getSoldierTree().shape,
  tank: getTankTree().shape,
};

const GLYPH: Partial<Record<NodeKind, string>> = {
  parallel: '⇉',
  selector: '?',
  sequence: '→',
  memsequence: '↠',
  inverter: '¬',
  succeeder: '✓',
  cooldown: '⏱',
  timeout: '⌛',
};

// statuses: 0 not evaluated, 1 success, 2 failure, 3 running
const TONE = ['text-foreground/30', 'text-ok', 'text-fail', 'text-signal'];

function Glyph({ kind, status }: { kind: NodeKind; status: number }) {
  if (kind === 'condition')
    return <span aria-hidden className={cn('inline-block h-2.5 w-4 shrink-0 rounded-full border-[1.5px] border-current', TONE[status])} />;
  if (kind === 'action')
    return <span aria-hidden className={cn('inline-block size-2.5 shrink-0 rounded-[1px] bg-current', TONE[status], status === 3 && 'animate-pulse-soft')} />;
  return (
    <span aria-hidden className={cn('inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-current/40 text-[11px] leading-none', TONE[status])}>
      {GLYPH[kind] ?? '·'}
    </span>
  );
}

/** Live behaviour-tree trace for the selected unit. */
export function BehaviorTreeView({ btKey, statuses }: { btKey: 'soldier' | 'tank'; statuses: number[] }) {
  const t = useT();
  const [full, setFull] = useState(false);
  const shape = SHAPES[btKey];
  const rows = useMemo(() => {
    if (full) return shape;
    // what was evaluated this tick; branches that failed collapse to a single line
    return shape.filter((n) => {
      if (n.parent < 0) return true;
      const ps = statuses[n.parent];
      return statuses[n.id] !== 0 && (ps === 1 || ps === 3);
    });
  }, [full, shape, statuses]);
  const statusName = ['', 'success', 'failure', 'running'];
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-[1px] bg-signal" aria-hidden />
            {t('inspect.bt.live')}
          </span>
        </div>
        <button className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" onClick={() => setFull((f) => !f)} aria-pressed={full}>
          {full ? t('inspect.bt.path') : t('inspect.bt.full')}
        </button>
      </div>
      <ul className="mt-1.5 font-sans text-[12.5px] leading-[1.15]" role="tree" aria-label={t('inspect.bt')}>
        {rows.map((n) => {
          const st = statuses[n.id] ?? 0;
          return (
            <li
              key={n.id}
              role="treeitem"
              aria-level={n.depth + 1}
              aria-label={`${t(n.name)} ${statusName[st]}`}
              className={cn('relative flex items-center gap-1.5 py-[3px] pr-1', st === 3 && 'bg-signal/[0.07]')}
              style={{ paddingLeft: n.depth * 11 + 2 }}
            >
              {Array.from({ length: n.depth }, (_, d) => (
                <span key={d} aria-hidden className="absolute inset-y-0 w-px bg-hairline" style={{ left: d * 11 + 7 }} />
              ))}
              <Glyph kind={n.kind} status={st} />
              <span className={cn('truncate', st === 0 ? 'text-foreground/35' : st === 2 ? 'text-foreground/60' : 'text-foreground', st === 3 && 'font-semibold')}>{t(n.name)}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {(
          [
            ['bg-signal', 'inspect.bt.running'],
            ['bg-ok', 'inspect.bt.success'],
            ['bg-fail', 'inspect.bt.failure'],
            ['bg-foreground/25', 'inspect.bt.idle'],
          ] as const
        ).map(([c, k]) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className={cn('size-2 rounded-[1px]', c)} aria-hidden />
            {t(k)}
          </span>
        ))}
      </p>
    </div>
  );
}

/** The top-level branch the unit is currently executing (for the decision summary). */
export function activeBranch(btKey: 'soldier' | 'tank', statuses: number[]): string | null {
  const shape = SHAPES[btKey];
  const main = shape.find((n) => n.name === (btKey === 'soldier' ? 'bt.main' : 'bt.tankDrive'));
  if (!main) return null;
  const kids = shape.filter((n) => n.parent === main.id);
  const hit = kids.find((n) => statuses[n.id] === 3) ?? kids.find((n) => statuses[n.id] === 1);
  return hit ? hit.name : null;
}
