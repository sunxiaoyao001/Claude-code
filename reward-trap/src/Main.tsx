import React from 'react';
import {AbsoluteFill, Html5Audio, staticFile} from 'remotion';
import {TransitionSeries, linearTiming, type TransitionPresentation} from '@remotion/transitions';
import {SCENES, allCues, type TransitionKind} from './timeline';
import {SCENE_COMPONENTS} from './scenes';
import {dissolve, flash, swipeUp, zoomThrough} from './transitions';
import {Subtitles} from './components/Subtitles';
import {FilmGrain, Vignette} from './components/Look';
import {C} from './theme';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const presentation = (kind: TransitionKind): TransitionPresentation<any> => {
  switch (kind) {
    case 'zoom':
      return zoomThrough();
    case 'flash':
      return flash();
    case 'swipe':
      return swipeUp();
    default:
      return dissolve();
  }
};

const cues = allCues();

export const Main: React.FC = () => {
  return (
    <AbsoluteFill style={{background: C.void}}>
      <TransitionSeries>
        {SCENES.flatMap((s, i) => {
          const Comp = SCENE_COMPONENTS[s.id];
          const items = [
            <TransitionSeries.Sequence key={s.id} durationInFrames={s.dur} name={s.id}>
              <Comp />
            </TransitionSeries.Sequence>,
          ];
          if (s.next && i < SCENES.length - 1) {
            items.push(
              <TransitionSeries.Transition
                key={`${s.id}-t`}
                presentation={presentation(s.next.kind)}
                timing={linearTiming({durationInFrames: s.next.dur})}
              />,
            );
          }
          return items;
        })}
      </TransitionSeries>
      <Vignette strength={0.62} />
      <FilmGrain opacity={0.07} />
      <Subtitles cues={cues} />
      {/* procedural score + sound design (scripts/gen-audio.ts), locked to the same timeline */}
      <Html5Audio src={staticFile('audio/score.mp3')} />
    </AbsoluteFill>
  );
};
