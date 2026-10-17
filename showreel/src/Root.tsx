import React from 'react';
import { Composition, Still } from 'remotion';
import { DURATION, FPS, H, W } from './lib/core';
import { Sheet } from './Sheet';
import { Showreel } from './Showreel';

export const Root: React.FC = () => (
  <>
    <Composition id="Showreel" component={Showreel} durationInFrames={DURATION * FPS} fps={FPS} width={W} height={H} />
    {/* review aid: a grid of moments, e.g. --props='{"times":[0,0.4,1.2]}' */}
    <Still id="Sheet" component={Sheet} width={W} height={H} defaultProps={{ times: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4] }} />
  </>
);
