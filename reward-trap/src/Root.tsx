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
      </Folder>
    </>
  );
};
