import { PhaserGame } from './components/PhaserGame';
import { game } from './game/GameController';
import { useGame } from './store/gameStore';

export default function App() {
  const phase = useGame((s) => s.phase);
  const loading = useGame((s) => s.loading);
  const config = useGame((s) => s.config);
  return (
    <div className="relative h-full w-full text-white">
      <PhaserGame />
      <div className="absolute left-4 top-4 flex gap-2 text-sm">
        <span className="rounded bg-black/60 px-2 py-1">{phase} {Math.round(loading.progress * 100)}% {loading.label}</span>
        {(['urban', 'desert', 'snow'] as const).map((b) => (
          <button key={b} className="rounded bg-black/60 px-2 py-1" onClick={() => void game.startBattle({ ...config, biome: b })}>
            {b}
          </button>
        ))}
      </div>
    </div>
  );
}
