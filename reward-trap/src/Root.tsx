import React from 'react';
import {AbsoluteFill, Composition, Folder} from 'remotion';
import {ensureFonts} from './lib/fonts';
import {Main} from './Main';
import {SCENES, sceneStarts} from './timeline';
import {SCENE_COMPONENTS} from './scenes';
import {Subtitles} from './components/Subtitles';
import {FilmGrain, Vignette} from './components/Look';
import {BrainTest} from './dev/BrainTest';
import {PhoneTest} from './dev/PhoneTest';
import * as P from './dev/Baseline';
import {EyeScene} from './scenes/EyeScene';
import {TitleScene} from './scenes/TitleScene';
import {FeedScene} from './scenes/FeedScene';
import {FPS, W, H} from './theme';

ensureFonts();

// Each scene is also exposed on its own (with its own subtitles) for fast iteration in the Studio.
const solo = (id: (typeof SCENES)[number]['id']) => {
  const def = SCENES.find((s) => s.id === id)!;
  const Comp = SCENE_COMPONENTS[id];
  const Solo: React.FC = () => (
    <AbsoluteFill style={{background: '#000'}}>
      <Comp />
      <Vignette strength={0.62} />
      <FilmGrain opacity={0.07} />
      <Subtitles cues={def.cues.map(([start, end, text]) => ({start, end, text}))} />
    </AbsoluteFill>
  );
  return Solo;
};

export const Root: React.FC = () => {
  const {total} = sceneStarts();
  return (
    <>
      <Composition id="Main" component={Main} durationInFrames={total} fps={FPS} width={W} height={H} />
      <Folder name="Scenes">
        {SCENES.map((s, i) => (
          <Composition
            key={s.id}
            id={`S${String(i + 1).padStart(2, '0')}-${s.id}`}
            component={solo(s.id)}
            durationInFrames={s.dur}
            fps={FPS}
            width={W}
            height={H}
          />
        ))}
      </Folder>
      <Folder name="Dev">
        <Composition id="BrainTest" component={BrainTest} durationInFrames={200} fps={FPS} width={W} height={H} />
        <Composition id="PhoneTest" component={PhoneTest} durationInFrames={200} fps={FPS} width={W} height={H} />
        {(['Baseline', 'PGrain', 'PVignette', 'PLeak', 'PBokeh', 'PDust', 'PSubs', 'PRadial', 'PVignetteWC', 'PRadialWC', 'PMove'] as const).map((k) => (
          <Composition key={k} id={k} component={P[k]} durationInFrames={100} fps={FPS} width={W} height={H} />
        ))}
        {['nofloor', 'nocanvas', 'nofloor-nocanvas'].map((k) => (
          <Composition key={k} id={`Title-${k}`} component={TitleScene} defaultProps={{probe: k}} durationInFrames={200} fps={FPS} width={W} height={H} />
        ))}
        {['notrace', 'nothumb', 'nofeed', 'noatmo', 'notrace-nothumb-nofeed-noatmo'].map((k) => (
          <Composition key={k} id={`Feed-${k}`} component={FeedScene} defaultProps={{probe: k}} durationInFrames={450} fps={FPS} width={W} height={H} />
        ))}
        {['noreflect', 'noiris', 'nolids', 'noreflect-noiris-nolids'].map((k) => (
          <Composition key={k} id={`Eye-${k}`} component={EyeScene} defaultProps={{probe: k}} durationInFrames={180} fps={FPS} width={W} height={H} />
        ))}
      </Folder>
    </>
  );
};
