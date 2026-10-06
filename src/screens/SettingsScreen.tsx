import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';
import { useGame } from '@/store/gameStore';
import { SettingsPanel } from './SettingsPanel';

export function SettingsScreen() {
  const t = useT();
  const setPhase = useGame((s) => s.setPhase);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 p-4 backdrop-blur-[2px]">
      <section className="hud-panel w-full max-w-lg rounded-lg p-6" aria-labelledby="settings-title">
        <h2 id="settings-title" className="text-2xl font-semibold">
          {t('settings.title')}
        </h2>
        <div className="mt-4">
          <SettingsPanel />
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setPhase('menu')} autoFocus>
            {t('settings.done')}
          </Button>
        </div>
      </section>
    </div>
  );
}
