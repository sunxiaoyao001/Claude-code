import React from 'react';
import {Composition} from 'remotion';
import {Ultimatum} from './Ultimatum';
import {FPS, HEIGHT, TOTAL_FRAMES, WIDTH} from './timeline';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Ultimatum"
    component={Ultimatum}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{withAudio: true}}
  />
);
