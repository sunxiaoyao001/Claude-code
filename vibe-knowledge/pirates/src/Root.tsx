import React from 'react';
import {Composition} from 'remotion';
import {PirateGold} from './PirateGold';
import {FPS, HEIGHT, TOTAL_FRAMES, WIDTH} from './timeline';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="PirateGold"
    component={PirateGold}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{withAudio: true}}
  />
);
