import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {T, TOTAL} from './copy';
import {C} from './theme';
import {Subtitles} from './ui/Subtitles';
import {ensureFonts} from './fonts';
import {S1Hook} from './scenes/S1Hook';
import {S2Title} from './scenes/S2Title';
import {S3Flip} from './scenes/S3Flip';
import {S4Tunnel} from './scenes/S4Tunnel';
import {S5Brain} from './scenes/S5Brain';

ensureFonts();

export const SCENES: {id: string; range: readonly [number, number]; C: React.FC}[] = [
  {id: 'S1Hook', range: T.hook, C: S1Hook},
  {id: 'S2Title', range: T.title, C: S2Title},
  {id: 'S3Flip', range: T.flip, C: S3Flip},
  {id: 'S4Tunnel', range: T.tunnel, C: S4Tunnel},
  {id: 'S5Brain', range: T.brain, C: S5Brain},
];

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{background: C.ink}}>
      {SCENES.map(({id, range, C: Scene}) => (
        <Sequence key={id} from={range[0]} durationInFrames={range[1] - range[0]} name={id}>
          <Scene />
        </Sequence>
      ))}
      <Subtitles />
    </AbsoluteFill>
  );
};

export {TOTAL};
