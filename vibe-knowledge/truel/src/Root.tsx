import React from 'react';
import {Composition} from 'remotion';
import {Truel} from './Truel';
import {FPS, HEIGHT, TOTAL_FRAMES, WIDTH} from './timeline';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Truel"
    component={Truel}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{withAudio: true}}
  />
);
