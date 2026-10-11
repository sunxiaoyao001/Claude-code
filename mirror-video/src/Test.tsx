import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Head} from './three/Head';
import {Rig} from './three/Rig';
import {Stage} from './three/Stage';
import {Studio} from './three/Lights';
import {Mirror} from './three/Mirror';
import {Dust} from './three/Dust';

export const Test: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#04060b'}}>
      <Stage>
        <Rig position={[0.55, 0.32, 1.25]} target={[-0.05, 0.18, -0.4]} fov={32} />
        <Studio mood="mirror" />
        <Head position={[0, 0, 0]} rotation={[0, Math.PI, 0]} gaze={[0, 0.2, 1.4]} />
        <Mirror position={[0, 0.1, -0.7]} width={0.75} height={1.5} />
        <Dust count={600} box={[4, 3, 4]} />
      </Stage>
    </AbsoluteFill>
  );
};
