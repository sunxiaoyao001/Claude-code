import React from "react";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { linearTiming, TransitionSeries, type TransitionPresentation } from "@remotion/transitions";
import { AbsoluteFill, Sequence, Track, useCurrentFrame, useVideoConfig } from "remotion";
import "./fonts";
import { Desk } from "./components/Desk";
import { FilmLook } from "./components/FilmLook";
import { Soundtrack } from "./components/Soundtrack";
import { slideCarrier, sweepOff } from "./components/Transitions";
import { InkFilter } from "./components/Props";
import { ArchiveProgress, ArchiveTag, Watermark } from "./components/SeriesChrome";
import { Subtitle } from "./components/Subtitle";
import type { MainProps } from "./schema";
import { BorrowedBody } from "./scenes/BorrowedBody";
import { Centenary } from "./scenes/Centenary";
import { Code } from "./scenes/Code";
import { Darkroom } from "./scenes/Darkroom";
import { Golden } from "./scenes/Golden";
import { Grant } from "./scenes/Grant";
import { Outro } from "./scenes/Outro";
import { Question } from "./scenes/Question";
import { Seances } from "./scenes/Seances";
import { Trial } from "./scenes/Trial";
import { Twist } from "./scenes/Twist";
import { WidowGhost } from "./scenes/WidowGhost";
import { EASE } from "./theme";
import { TimeScale, useTime } from "./time";
import { ARCHIVE_TAGS, BAR, BASE_TOTAL, BLUR_WINDOWS, CHAPTERS, LINES, REWIND, SCENES } from "./timeline";

const Subtitles: React.FC = () => {
  const t = useTime();
  return (
    <Track name="Subtitles">
      {LINES.map((line) => (
        <Sequence key={line.from} name={line.zh.replace(/\*/g, "")} from={t(line.from)} durationInFrames={t(line.to) - t(line.from)} layout="none">
          <Subtitle zh={line.zh} en={line.en} durationInFrames={t(line.to) - t(line.from)} isStatic={line.isStatic} holdToEnd={line.to === BASE_TOTAL} size={line.size} />
        </Sequence>
      ))}
    </Track>
  );
};

const Chrome: React.FC<{ readonly watermark: string }> = ({ watermark }) => {
  const t = useTime();
  return (
    <>
      <Watermark handle={watermark} />
      <ArchiveTag entries={ARCHIVE_TAGS.map((e) => ({ from: t(e.from), text: e.text }))} />
      <ArchiveProgress bounds={CHAPTERS.bounds.map(t)} labels={CHAPTERS.labels} barFrames={t(BAR)} rewind={[t(REWIND[0]), t(REWIND[1])]} />
    </>
  );
};

const SCENE_COMPONENTS: Record<keyof typeof SCENES, { name: string; Component: React.FC }> = {
  borrowedBody: { name: "Borrowed body", Component: BorrowedBody },
  widowGhost: { name: "The widow's ghost", Component: WidowGhost },
  trial: { name: "Trial", Component: Trial },
  darkroom: { name: "Darkroom (illustrative)", Component: Darkroom },
  grant: { name: "Grant composite", Component: Grant },
  question: { name: "The third?", Component: Question },
  twist: { name: "Twist", Component: Twist },
  code: { name: "The code", Component: Code },
  seances: { name: "Séances", Component: Seances },
  centenary: { name: "Centenary", Component: Centenary },
  golden: { name: "Golden line", Component: Golden },
  outro: { name: "Credits and loop", Component: Outro },
};

// Scene changes that grow out of the content (custom presentations, Transitions.tsx). The key is
// the outgoing scene; the incoming scene still starts exactly on its boundary, the outgoing one is
// extended under the transition. Scenes not listed cut hard on the beat.
const TRANSITIONS: Partial<Record<keyof typeof SCENES, { readonly length: number; readonly make: () => TransitionPresentation<Record<string, never>> }>> = {
  borrowedBody: { length: 16, make: sweepOff },
  widowGhost: { length: 16, make: sweepOff },
  darkroom: { length: 16, make: sweepOff },
  grant: { length: 16, make: sweepOff },
  twist: { length: 14, make: slideCarrier },
};

const Scenes: React.FC = () => {
  const t = useTime();
  const keys = Object.keys(SCENE_COMPONENTS) as (keyof typeof SCENES)[];
  return (
    <TransitionSeries>
      {keys.flatMap((key) => {
        const entry = SCENE_COMPONENTS[key];
        const s = SCENES[key];
        const tr = TRANSITIONS[key];
        const items = [
          <TransitionSeries.Sequence key={key} name={entry.name} durationInFrames={t(s.to) - t(s.from) + (tr ? t(tr.length) : 0)}>
            <entry.Component />
          </TransitionSeries.Sequence>,
        ];
        if (tr) {
          items.push(<TransitionSeries.Transition key={`${key}-out`} timing={linearTiming({ durationInFrames: t(tr.length), easing: EASE.inOut })} presentation={tr.make()} />);
        }
        return items;
      })}
    </TransitionSeries>
  );
};

// Motion blur for the final render, only on frames with fast movement (BLUR_WINDOWS); drafts leave
// it off. A 100° shutter with 10 samples keeps the sub-frame copies ≤ 4 px apart at the fastest
// sweep (~130 px/frame), so edges smear instead of showing a comb of discrete copies.
const MaybeBlur: React.FC<{ readonly on: boolean; readonly children: React.ReactNode }> = ({ on, children }) => {
  const frame = useCurrentFrame();
  const t = useTime();
  const moving = on && BLUR_WINDOWS.some(([a, b]) => frame >= t(a) && frame <= t(b));
  return moving ? (
    <CameraMotionBlur shutterAngle={100} samples={10}>
      {children}
    </CameraMotionBlur>
  ) : (
    <>{children}</>
  );
};

export const Main: React.FC<MainProps> = ({ watermark, motionBlur }) => {
  const { durationInFrames } = useVideoConfig();
  return (
    <TimeScale.Provider value={durationInFrames / BASE_TOTAL}>
      <AbsoluteFill>
        <InkFilter />
        <Desk />
        {/* Own stacking context: transitions layer scenes with z-index but never cover subtitles. */}
        <AbsoluteFill style={{ isolation: "isolate", filter: "contrast(1.08)" }}>
          <MaybeBlur on={motionBlur}>
            <Scenes />
          </MaybeBlur>
        </AbsoluteFill>
        <Subtitles />
        <Chrome watermark={watermark} />
        <FilmLook />
        <Soundtrack />
      </AbsoluteFill>
    </TimeScale.Provider>
  );
};
