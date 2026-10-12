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
import {S6Beauty} from './scenes/S6Beauty';
import {S7Camera} from './scenes/S7Camera';
import {S8End} from './scenes/S8End';

ensureFonts();

export const SCENES: {id: string; range: readonly [number, number]; C: React.FC}[] = [
  {id: 'S1Hook', range: T.hook, C: S1Hook},
  {id: 'S2Title', range: T.title, C: S2Title},
  {id: 'S3Flip', range: T.flip, C: S3Flip},
  {id: 'S4Tunnel', range: T.tunnel, C: S4Tunnel},
  {id: 'S5Brain', range: T.brain, C: S5Brain},
  {id: 'S6Beauty', range: T.beauty, C: S6Beauty},
  {id: 'S7Camera', range: T.camera, C: S7Camera},
  {id: 'S8End', range: T.end, C: S8End},
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
