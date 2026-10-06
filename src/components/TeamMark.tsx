import { cn } from '@/lib/utils';
import type { TeamId } from '@/game/sim/types';

/**
 * Team glyph following map-symbol convention: Blue force is a rectangle frame,
 * Red force a diamond. Shape carries the side as well as colour.
 */
export function TeamMark({ team, size = 12, filled = true, className, title }: { team: TeamId | -1; size?: number; filled?: boolean; className?: string; title?: string }) {
  if (team === -1) {
    return (
      <svg width={size} height={size} viewBox="0 0 12 12" className={cn('shrink-0', className)} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
        <circle cx="6" cy="6" r="4.6" fill={filled ? 'rgb(230 225 210 / 0.35)' : 'none'} stroke="rgb(230 225 210 / 0.7)" strokeWidth="1.4" />
      </svg>
    );
  }
  const color = team === 0 ? 'var(--team-blue)' : 'var(--team-red)';
  if (team === 0) {
    return (
      <svg width={size * 1.35} height={size} viewBox="0 0 16 12" className={cn('shrink-0', className)} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
        <rect x="1" y="1.5" width="14" height="9" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg width={size * 1.15} height={size * 1.15} viewBox="0 0 14 14" className={cn('shrink-0', className)} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d="M7 1 13 7 7 13 1 7Z" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export const teamColor = (team: TeamId | -1) => (team === 0 ? 'var(--team-blue)' : team === 1 ? 'var(--team-red)' : 'var(--muted-foreground)');
