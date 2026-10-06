import { useEffect, useState } from 'react';
import { game } from '@/game/GameController';
import { useGame } from '@/store/gameStore';
import { BattleMenu } from './BattleMenu';
import { EventFeed } from './EventFeed';
import { Minimap } from './Minimap';
import { Scoreboard } from './Scoreboard';
import { SPEEDS, SpeedControls } from './SpeedControls';
import { StatsPanel } from './StatsPanel';
import { TacticalHint } from './TacticalHint';
import { UnitInspector } from './UnitInspector';

function cycleUnit(dir: 1 | -1) {
  const sim = game.sim;
  if (!sim) return;
  const units = [...sim.soldiers.filter((s) => s.active), ...sim.tanks.filter((t) => t.alive)].sort((a, b) => a.team - b.team || a.id - b.id);
  if (!units.length) return;
  const i = units.findIndex((u) => u.id === game.selected);
  const next = units[(i + dir + units.length) % units.length];
  game.focusUnit(next.id, true);
}

/** Everything drawn over the battlefield while a battle is running. */
export function BattleHUD() {
  const [statsOpen, setStatsOpen] = useState(() => window.innerWidth >= 1280);
  const [menuOpen, setMenuOpen] = useState(false);
  const phase = useGame((s) => s.phase);
  const selected = useGame((s) => s.selected);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (menuOpen || useGame.getState().phase !== 'battle') return;
      const st = useGame.getState();
      switch (e.key) {
        case ' ':
          e.preventDefault();
          game.togglePause();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          game.setSpeed(SPEEDS[Number(e.key) - 1], false);
          break;
        case 'Escape':
          if (game.selected >= 0) game.select(-1);
          else setMenuOpen(true);
          break;
        case 'f':
        case 'F':
          if (game.selected >= 0) {
            if (game.following) game.setFollowing(false);
            else game.focusUnit(game.selected, true);
          }
          break;
        case 'i':
        case 'I':
          setStatsOpen((v) => !v);
          break;
        case 'Tab':
          e.preventDefault();
          cycleUnit(e.shiftKey ? -1 : 1);
          break;
        case 'h':
        case 'H': {
          const order = ['damaged', 'always', 'off'] as const;
          st.setSettings({ healthBars: order[(order.indexOf(st.settings.healthBars) + 1) % order.length] });
          break;
        }
        case 'b':
        case 'B':
          st.setSettings({ aiDebug: !st.settings.aiDebug });
          break;
        case '.':
          if (game.paused) game.stepOnce();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const hideChrome = phase === 'results';
  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      {!hideChrome && (
        <>
          <div className="absolute inset-x-0 top-3 flex flex-col items-center gap-2 px-3">
            <Scoreboard />
            <div className="hidden sm:block">
              <TacticalHint />
            </div>
          </div>
          <div className="absolute right-3 top-[86px] xl:top-3">
            <SpeedControls statsOpen={statsOpen} onStats={() => setStatsOpen((v) => !v)} onMenu={() => setMenuOpen(true)} />
          </div>
          {statsOpen && (
            <div className="absolute bottom-[160px] left-3 top-[86px] hidden items-start md:flex xl:top-3">
              <StatsPanel onClose={() => setStatsOpen(false)} />
            </div>
          )}
          {selected >= 0 && (
            <div className="absolute inset-x-3 bottom-3 flex items-end sm:inset-x-auto sm:right-3 sm:top-[134px] sm:items-start md:bottom-[214px] xl:top-[62px]">
              <UnitInspector />
            </div>
          )}
          <div className="absolute bottom-3 left-3 hidden sm:block">
            <Minimap />
          </div>
          <div className="absolute bottom-3 right-3 hidden md:block">
            <EventFeed />
          </div>
        </>
      )}
      {menuOpen && <BattleMenu onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
