import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Rig} from './three/Rig';
import {Stage} from './three/Stage';
import {Studio} from './three/Lights';
import {CameraModel} from './three/CameraModel';

export const Test: React.FC = () => {
  const f = useCurrentFrame();
  const views: [number, number, number][] = [[1.6, 0.8, 2.6], [0.3, 0.1, 2.1], [-2.2, 0.6, 1.2]];
  const v = views[Math.min(2, Math.floor(f / 10))];
  return (
    <AbsoluteFill style={{background: '#04060b'}}>
      <Stage>
        <Rig position={v} target={[0, 0, 0.4]} fov={30} />
        <Studio mood="product" />
        <CameraModel aperture={f >= 10 && f < 20 ? 0.35 : 1} />
      </Stage>
    </AbsoluteFill>
  );
};
