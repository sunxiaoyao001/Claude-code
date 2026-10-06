import { useGame } from '@/store/gameStore';
import { useT } from '@/i18n';
import { Wordmark } from './Wordmark';

/** Full-screen loader while textures are painted or a battlefield is generated. */
export function LoadingScreen({ boot }: { boot: boolean }) {
  const t = useT();
  const loading = useGame((s) => s.loading);
  const pct = Math.round(loading.progress * 100);
  return (
    <div className={boot ? 'absolute inset-0 z-40 flex items-center bg-background' : 'absolute inset-0 z-40 flex items-center bg-background/80 backdrop-blur-sm'}>
      <div className="w-full max-w-xl px-8 sm:px-14">
        <Wordmark size="md" />
        <div className="mt-10 flex items-baseline justify-between text-sm text-muted-foreground" aria-live="polite">
          <span>{loading.label ? t(loading.label) : ''}</span>
          <span className="tabular-nums text-foreground">{pct}%</span>
        </div>
        <div className="mt-2 h-[3px] w-full overflow-hidden bg-hairline" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
