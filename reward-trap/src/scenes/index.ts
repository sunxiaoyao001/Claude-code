import type {SceneId} from '../timeline';
import {EyeScene} from './EyeScene';
import {BedroomScene} from './BedroomScene';
import {TitleScene} from './TitleScene';
import {StatScene} from './StatScene';
import {FeedScene} from './FeedScene';
import {BrainScene} from './BrainScene';
import {SynapseScene} from './SynapseScene';
import {UncertaintyScene} from './UncertaintyScene';
import {SlotScene} from './SlotScene';
import {AlgorithmScene} from './AlgorithmScene';
import {NoEndScene} from './NoEndScene';
import {BrakeScene} from './BrakeScene';
import {BreakFreeScene} from './BreakFreeScene';
import {OutroScene} from './OutroScene';

export const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  eye: EyeScene,
  bedroom: BedroomScene,
  title: TitleScene,
  stat: StatScene,
  feed: FeedScene,
  brain: BrainScene,
  synapse: SynapseScene,
  uncertainty: UncertaintyScene,
  slot: SlotScene,
  algorithm: AlgorithmScene,
  noend: NoEndScene,
  brake: BrakeScene,
  breakfree: BreakFreeScene,
  outro: OutroScene,
};
