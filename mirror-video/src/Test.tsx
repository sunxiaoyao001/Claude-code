import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {Rig} from './three/Rig';
import {Stage} from './three/Stage';
import {Studio} from './three/Lights';
import {Brain, BRAIN} from './three/Brain';

export const Test: React.FC = () => {
  const f = useCurrentFrame();
  const views: [number, number, number][] = [[2.6, 0.9, 1.6], [3.2, 0.2, 0.0], [0.8, -2.8, 0.6], [0.0, 0.8, 3.4]];
  const v = views[Math.min(3, Math.floor(f / 10))];
  const x = f >= 40 ? 0.8 : 0;
  return (
    <AbsoluteFill style={{background: '#04060b'}}>
      <Stage>
        <Rig position={v} target={[0, -0.1, 0]} fov={34} />
        <Studio mood="neutral" />
        <Brain t={f / 30} xray={x} acts={[{pos: BRAIN.v1R, radius: 0.18, strength: 1, color: '#5fd4ff'}, {pos: BRAIN.ffaR, radius: 0.16, strength: 1, color: '#ffc879'}]} />
      </Stage>
    </AbsoluteFill>
  );
};
