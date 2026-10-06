import { ChartColumn, Menu, Pause, Play, StepForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { game } from '@/game/GameController';
import { useT } from '@/i18n';
import { useGame } from '@/store/gameStore';

export const SPEEDS = [0.5, 1, 2, 4];

export function SpeedControls({ statsOpen, onStats, onMenu }: { statsOpen: boolean; onStats: () => void; onMenu: () => void }) {
  const t = useT();
  const speed = useGame((s) => s.speed);
  const paused = useGame((s) => s.paused);
  return (
    <div className="hud-panel pointer-events-auto flex items-center gap-1 rounded-md p-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant={paused ? 'default' : 'ghost'} onClick={() => game.togglePause()} aria-label={paused ? t('hud.resume') : t('hud.pause')}>
            {paused ? <Play /> : <Pause />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{paused ? t('hud.resume') : t('hud.pause')} (Space)</TooltipContent>
      </Tooltip>
      {paused && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" onClick={() => game.stepOnce()} aria-label={t('hud.step')}>
              <StepForward />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('hud.step')}</TooltipContent>
        </Tooltip>
      )}
      <ToggleGroup type="single" value={String(speed)} onValueChange={(v) => v && game.setSpeed(Number(v), false)} aria-label={t('hud.speed')} className="border-0 bg-transparent p-0">
        {SPEEDS.map((s, i) => (
          <ToggleGroupItem key={s} value={String(s)} className="h-8 px-2 text-xs tabular-nums" aria-label={`${s}x (${i + 1})`}>
            {s}×
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="mx-0.5 h-5 w-px bg-hairline" aria-hidden />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant={statsOpen ? 'secondary' : 'ghost'} onClick={onStats} aria-label={t('hud.stats')} aria-pressed={statsOpen}>
            <ChartColumn />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('hud.stats')} (I)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" onClick={onMenu} aria-label={t('hud.menu')}>
            <Menu />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('hud.menu')} (Esc)</TooltipContent>
      </Tooltip>
    </div>
  );
}
