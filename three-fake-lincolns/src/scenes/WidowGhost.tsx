import React from "react";
import { AbsoluteFill, CanvasImage, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region, type ImageKey } from "../assets";
import { Breath, BREATH_MAX_ZOOM } from "../components/Breath";
import { PhotoPrint, rectToCrop, toWindow, usePrint } from "../components/PhotoPrint";
import { PenMark } from "../components/Props";
import { SourceCaption } from "../components/SeriesChrome";
import { photoGrade } from "../grade";
import { useTime } from "../time";
import { CLAMP, COLORS, EASE } from "../theme";

// Scene-local frames: 0 = 672 in the base timeline.
const CARD_W = 210; // every carte de visite on the table shares one physical size
const CARDS: readonly { key: ImageKey; left: number; top: number; tilt: number; at: number }[] = [
  { key: "mumlerElderlyMan", left: 120, top: 380, tilt: -4, at: 0 },
  { key: "mumlerWoman", left: 360, top: 330, tilt: 2.5, at: 12 },
  { key: "mumlerYoungMan", left: 600, top: 400, tilt: -1.5, at: 24 },
  { key: "maryLincolnGhost", left: 330, top: 690, tilt: 1.2, at: 36 },
];

const Card: React.FC<{ readonly k: ImageKey; readonly left: number; readonly top: number; readonly tilt: number; readonly lift?: number }> = ({ k, left, top, tilt, lift = 0 }) => {
  const frame = useCurrentFrame();
  const img = IMG[k];
  const h = (CARD_W * img.height) / img.width;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: CARD_W,
        height: h,
        rotate: `${tilt}deg`,
        boxShadow: `0 ${4 + lift * 26}px ${10 + lift * 40}px rgba(0,0,0,${0.5 - lift * 0.12})`,
      }}
    >
      <CanvasImage src={staticFile(img.file)} width={CARD_W} height={Math.round(h)} fit="fill" effects={photoGrade({ frame })} />
    </div>
  );
};

const CardTray: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  // 744: the widow's card is lifted out of the tray and carried toward the camera.
  const pick = interpolate(frame, [t(72), t(96)], [0, 1], { ...CLAMP, easing: EASE.inOut });
  return (
    <AbsoluteFill>
      {CARDS.map((c) => {
        const inP = interpolate(frame, [t(c.at), t(c.at) + 12], [0, 1], { ...CLAMP, easing: EASE.spring });
        const isWidow = c.key === "maryLincolnGhost";
        const p = isWidow ? pick : 0;
        return (
          <Card
            key={c.key}
            k={c.key}
            left={c.left + (1 - inP) * 900 + p * 40}
            top={c.top - p * 90}
            tilt={c.tilt * (1 - p)}
            lift={isWidow ? p : 0}
          />
        );
      })}
      <SourceCaption text="W. H. MUMLER · SPIRIT PHOTOGRAPHS · 1860S–70S" left={120} top={1090} />
    </AbsoluteFill>
  );
};

// Inside the widow's print: circle the "spirit" once it has developed.
const GhostMark: React.FC<{ readonly from: number }> = ({ from }) => {
  const g = usePrint();
  const r = region("maryLincolnGhost", "ghost");
  const a = toWindow(g, r[0], r[1]);
  const b = toWindow(g, r[2], r[3]);
  return <PenMark kind="circle" left={a.x} top={a.y} width={b.x - a.x} height={b.y - a.y} from={from} durationInFrames={24} seed={11} />;
};

// Two short vermilion strokes under the hands resting on her shoulders (F07).
const HandMark: React.FC<{ readonly area: string; readonly from: number; readonly seed: number }> = ({ area, from, seed }) => {
  const g = usePrint();
  const r = region("maryLincolnGhost", area);
  const a = toWindow(g, r[0], r[1]);
  const b = toWindow(g, r[2], r[3]);
  return <PenMark kind="underline" left={a.x} top={a.y} width={b.x - a.x} height={b.y - a.y} from={from} durationInFrames={10} seed={seed} />;
};

const PHOTO = region("maryLincolnGhost", "photo");
// No zoom beyond the breath: this source is small, so the print is capped by the 1.5x budget.
const DEV_W = Math.floor(fitWidth("maryLincolnGhost", PHOTO, 380, BREATH_MAX_ZOOM));
const DEV_H = Math.round((DEV_W * ((PHOTO[3] - PHOTO[1]) * IMG.maryLincolnGhost.height)) / ((PHOTO[2] - PHOTO[0]) * IMG.maryLincolnGhost.width));

const DeveloperTray: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  // Local 0 = 768. Darkest tones first, the faint "spirit" last (it lands on 1056, a phrase downbeat).
  const develop = interpolate(frame, [t(72), t(168), t(276), t(300)], [0, 0.35, 0.68, 1], { ...CLAMP, easing: EASE.inOut });
  // The developer's surface: a slow sheen that keeps travelling, so the tray reads as liquid.
  const sheen = ((frame / t(144)) % 1) * 1.8 - 0.4;
  // 1152: the print is lifted out of the tray and laid on the table beside it.
  const out = interpolate(frame, [t(384), t(408)], [0, 1], { ...CLAMP, easing: EASE.inOut });
  const down = interpolate(frame, [t(408), t(426)], [0, 1], { ...CLAMP, easing: EASE.out });
  const printLift = out * (1 - down) * 0.9;
  const trayW = DEV_W + 140;
  const trayH = DEV_H + 150;
  const trayLeft = 540 - trayW / 2 - 40;
  const trayTop = 300;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: trayLeft,
          top: trayTop,
          width: trayW,
          height: trayH,
          backgroundColor: COLORS.ink,
          borderRadius: 10,
          boxShadow: `inset 0 0 0 3px ${COLORS.silver}55, inset 0 3px 0 4px rgba(236,230,218,0.12), inset 0 18px 40px rgba(0,0,0,0.7), 0 20px 50px rgba(0,0,0,0.55)`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(105deg, transparent ${sheen * 100 - 14}%, rgba(236,230,218,0.09) ${sheen * 100}%, transparent ${sheen * 100 + 14}%)`,
          }}
        />
      </div>
      <PhotoPrint
        src={IMG.maryLincolnGhost.file}
        imgW={IMG.maryLincolnGhost.width}
        imgH={IMG.maryLincolnGhost.height}
        width={DEV_W}
        crop={rectToCrop(PHOTO)}
        left={trayLeft + 70 - 10 + out * 70}
        top={trayTop + 75 - 10 - out * 46}
        tilt={0.4 + out * 2.2}
        border={10}
        develop={develop}
        lift={printLift}
      >
        <HandMark area="ghostHandLeft" from={t(192)} seed={12} />
        <HandMark area="ghostHandRight" from={t(204)} seed={14} />
        <GhostMark from={t(288)} />
      </PhotoPrint>
      <SourceCaption text={IMG.maryLincolnGhost.caption} left={trayLeft} top={trayTop + trayH + 20} />
    </AbsoluteFill>
  );
};

export const WidowGhost: React.FC = () => {
  const t = useTime();
  return (
    <AbsoluteFill>
      <Breath phase={t(672)}>
        <Sequence durationInFrames={t(96)} layout="none">
          <CardTray />
        </Sequence>
        <Sequence from={t(96)} layout="none">
          <DeveloperTray />
        </Sequence>
      </Breath>
    </AbsoluteFill>
  );
};
