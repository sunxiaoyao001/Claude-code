import React from 'react';
import {Composition} from 'remotion';
import {DollarAuction} from './DollarAuction';
import {FPS, HEIGHT, TOTAL_FRAMES, WIDTH} from './timeline';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="DollarAuction"
    component={DollarAuction}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{withAudio: true}}
  />
);
