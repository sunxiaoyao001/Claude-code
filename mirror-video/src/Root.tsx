import React from 'react';
import {Composition} from 'remotion';
import {Video, SCENES, TOTAL} from './Video';
import {Test} from './Test';
import {ensureFonts} from './fonts';

ensureFonts();

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="MirrorBrain" component={Video} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
      {SCENES.map(({id, range, C}) => (
        <Composition key={id} id={id} component={C} durationInFrames={range[1] - range[0]} fps={30} width={1920} height={1080} />
      ))}
      <Composition id="Test" component={Test} durationInFrames={60} fps={30} width={1920} height={1080} />
    </>
  );
};
