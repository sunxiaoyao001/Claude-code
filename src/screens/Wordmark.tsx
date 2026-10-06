import { useGame } from '@/store/gameStore';
import { cn } from '@/lib/utils';

/** Stencil wordmark (the one loud typographic element in the UI). */
export function Wordmark({ size = 'lg', className }: { size?: 'md' | 'lg'; className?: string }) {
  const lang = useGame((s) => s.settings.language);
  return (
    <div className={cn('select-none', className)}>
      <h1
        className={cn(
          'font-display font-[750] uppercase tracking-[-0.01em] text-foreground',
          size === 'lg' ? 'text-[clamp(3.4rem,8vw,6.8rem)]' : 'text-[clamp(2.6rem,5vw,4rem)]',
          'leading-[0.86]',
        )}
      >
        Autonomous
        <br />
        Front
      </h1>
      {lang === 'zh' && (
        <p className={cn('mt-3 font-semibold tracking-[0.18em] text-foreground/90', size === 'lg' ? 'text-3xl' : 'text-xl')}>自主战线</p>
      )}
    </div>
  );
}
