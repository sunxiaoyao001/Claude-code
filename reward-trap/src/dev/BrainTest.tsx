import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BrainStage, type BrainStageProps} from '../brain/BrainStage';

const SETS: Omit<BrainStageProps, 'frame'>[] = [
  {yaw: -1.2, pitch: 0.15},
  {yaw: -1.2, pitch: 0.15, scan: 0.45},
  {yaw: -1.2, pitch: 0.15, scan: 1, structures: 1, vta: 1, nac: 1},
  {yaw: -1.35, pitch: 0.12, scan: 1, structures: 0.6, vta: 1, nac: 1, flow: 1},
  {yaw: -0.5, pitch: 0.2, scan: 1, structures: 0.6, vta: 1, nac: 1, flow: 1, pfc: 1},
  {yaw: -1.57, pitch: 0.05, scan: 1, structures: 0.4, vta: 0.6, nac: 1, flow: 1, pfc: 0.8, pfcColor: '#5b8cff', camZ: 3.2},
];

export const BrainTest: React.FC = () => {
  const frame = useCurrentFrame();
  const set = SETS[frame % SETS.length];
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #121a33 0%, #04050b 70%)'}}>
      <BrainStage frame={frame * 7} {...set} />
    </AbsoluteFill>
  );
};
