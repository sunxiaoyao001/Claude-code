import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { BattleScene } from '@/game/render/BattleScene';
import { BootScene } from '@/game/render/BootScene';
import { game } from '@/game/GameController';
import { useGame } from '@/store/gameStore';

let instance: Phaser.Game | null = null;

/** Mounts the Phaser canvas once (survives React StrictMode double effects). */
export function PhaserGame() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (instance) {
      // re-parent the existing canvas after a StrictMode remount
      if (instance.canvas.parentElement !== ref.current) ref.current.appendChild(instance.canvas);
      return;
    }
    instance = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: ref.current,
      backgroundColor: '#0b0d0c',
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      render: { antialias: true, pixelArt: false, powerPreference: 'high-performance' },
      scene: [BootScene, BattleScene],
      input: { mouse: { preventDefaultWheel: true } },
      disableContextMenu: true,
      banner: false,
    });
    // handles for automated tests and debugging from the console
    Object.assign(window as object, { __game: instance, __ctl: game, __store: useGame });
  }, []);
  return <div ref={ref} className="absolute inset-0 overflow-hidden" aria-label="Battlefield" />;
}
