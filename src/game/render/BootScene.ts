import Phaser from 'phaser';
import { useGame } from '@/store/gameStore';
import { buildFxTextures } from './textures/fxTextures';
import { buildUnitAtlases } from './textures/spriteFactory';

/** Generates every procedural texture, then hands over to the battle scene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'boot' });
  }

  create() {
    void this.run();
  }

  private async run() {
    const st = useGame.getState();
    st.setLoading(0.02, 'loading.textures');
    buildFxTextures(this.textures);
    const atlases = await buildUnitAtlases(this.textures, (p) => st.setLoading(0.04 + p * 0.9, 'loading.units'));
    st.setLoading(1, 'loading.ready');
    if (useGame.getState().phase === 'boot') st.setPhase('menu');
    this.scene.start('battle', { atlases });
  }
}
