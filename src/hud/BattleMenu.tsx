import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { game } from '@/game/GameController';
import { randomSeed } from '@/game/core/rng';
import { useT } from '@/i18n';
import { useGame } from '@/store/gameStore';
import { SettingsPanel } from '@/screens/SettingsPanel';

/** In-battle menu (pauses the battle while open). */
export function BattleMenu({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [settings, setSettings] = useState(false);
  const setPhase = useGame((s) => s.setPhase);
  const wasPaused = useRef(game.paused);
  useEffect(() => {
    wasPaused.current = game.paused;
    game.setSpeed(game.speed, true);
    return () => game.setSpeed(game.speed, wasPaused.current);
  }, []);
  const restart = () => {
    const cfg = game.sim?.config;
    onClose();
    if (cfg) void game.startBattle({ ...cfg, seed: randomSeed() });
  };
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-background/60 p-4 backdrop-blur-[2px]" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <section className="hud-panel w-full max-w-md rounded-lg p-5" role="dialog" aria-modal="true" aria-labelledby="bm-title">
        <h2 id="bm-title" className="text-2xl font-semibold">
          {settings ? t('settings.title') : t('hud.menu')}
        </h2>
        {settings ? (
          <>
            <div className="mt-3">
              <SettingsPanel />
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setSettings(false)} autoFocus>
                {t('settings.done')}
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <Button size="lg" onClick={onClose} autoFocus className="justify-start">
              {t('hud.resume')}
            </Button>
            <Button size="lg" variant="secondary" className="justify-start" onClick={restart}>
              {t('results.rematch')}
            </Button>
            <Button size="lg" variant="secondary" className="justify-start" onClick={() => setSettings(true)}>
              {t('menu.settings')}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="justify-start"
              onClick={() => {
                onClose();
                setPhase('setup');
                void game.startAttract();
              }}
            >
              {t('results.setup')}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="justify-start"
              onClick={() => {
                onClose();
                game.exitToMenu();
              }}
            >
              {t('results.menu')}
            </Button>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t('hud.keys')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
