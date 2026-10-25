import React from "react";
import { AbsoluteFill, Sequence, Track, useVideoConfig } from "remotion";
import "./fonts";
import { Desk } from "./components/Desk";
import { InkFilter } from "./components/Props";
import { ArchiveTag, ProgressTicks, Watermark } from "./components/SeriesChrome";
import { Subtitle } from "./components/Subtitle";
import type { MainProps } from "./schema";
import { BorrowedBody } from "./scenes/BorrowedBody";
import { Golden } from "./scenes/Golden";
import { Twist } from "./scenes/Twist";
import { WidowGhost } from "./scenes/WidowGhost";
import { TimeScale, useTime } from "./time";
import { ARCHIVE_TAGS, BARS, BASE_TOTAL, LINES, SCENES } from "./timeline";

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
  const { durationInFrames } = useVideoConfig();
  return (
    <>
      <Watermark handle={watermark} />
      <ArchiveTag entries={ARCHIVE_TAGS.map((e) => ({ from: t(e.from), text: e.text }))} />
      <ProgressTicks bars={BARS} barFrames={durationInFrames / BARS} />
    </>
  );
};

const SCENE_COMPONENTS: Partial<Record<keyof typeof SCENES, { name: string; Component: React.FC }>> = {
  borrowedBody: { name: "Borrowed body", Component: BorrowedBody },
  widowGhost: { name: "The widow's ghost", Component: WidowGhost },
  twist: { name: "Twist", Component: Twist },
  golden: { name: "Golden line", Component: Golden },
};

const Scenes: React.FC = () => {
  const t = useTime();
  return (
    <Track name="Scenes">
      {(Object.keys(SCENE_COMPONENTS) as (keyof typeof SCENES)[]).map((key) => {
        const entry = SCENE_COMPONENTS[key];
        if (!entry) return null;
        const s = SCENES[key];
        return (
          <Sequence key={key} name={entry.name} from={t(s.from)} durationInFrames={t(s.to) - t(s.from)}>
            <entry.Component />
          </Sequence>
        );
      })}
    </Track>
  );
};

export const Main: React.FC<MainProps> = ({ watermark }) => {
  const { durationInFrames } = useVideoConfig();
  return (
    <TimeScale.Provider value={durationInFrames / BASE_TOTAL}>
      <AbsoluteFill>
        <InkFilter />
        <Desk />
        <Scenes />
        <Subtitles />
        <Chrome watermark={watermark} />
      </AbsoluteFill>
    </TimeScale.Provider>
  );
};
