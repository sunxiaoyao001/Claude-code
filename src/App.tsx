import { TooltipProvider } from '@/components/ui/tooltip';
import { PhaserGame } from '@/components/PhaserGame';
import { BattleHUD } from '@/hud/BattleHUD';
import { BattleSetup } from '@/screens/BattleSetup';
import { LoadingScreen } from '@/screens/LoadingScreen';
import { MainMenu } from '@/screens/MainMenu';
import { ResultsScreen } from '@/screens/ResultsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { useGame } from '@/store/gameStore';
import { useEffect } from 'react';

export default function App() {
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.settings.language);
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = lang === 'zh' ? '自主战线 · Autonomous Front' : 'Autonomous Front';
  }, [lang]);
  return (
    <TooltipProvider>
      <main className="relative h-full w-full overflow-hidden">
        <PhaserGame />
        {phase === 'boot' && <LoadingScreen boot />}
        {phase === 'menu' && <MainMenu />}
        {phase === 'setup' && <BattleSetup />}
        {phase === 'settings' && <SettingsScreen />}
        {(phase === 'battle' || phase === 'results') && <BattleHUD />}
        {phase === 'results' && <ResultsScreen />}
        {phase === 'loading' && <LoadingScreen boot={false} />}
      </main>
    </TooltipProvider>
  );
}
