import React from "react";
import { AbsoluteFill, CanvasImage, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region, type ImageKey } from "../assets";
import { Breath, BREATH_MAX_ZOOM, Dolly } from "../components/Breath";
import { PhotoPrint, rectToCrop, toWindow, usePrint } from "../components/PhotoPrint";
import { Drawing, Ink } from "../components/LineArt";
import { ArchiveStamp, PenMark } from "../components/Props";
import { IllustrativeMark, SourceCaption } from "../components/SeriesChrome";
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

const Card: React.FC<{ readonly k: ImageKey; readonly left: number; readonly top: number; readonly tilt: number; readonly lift?: number; readonly blur?: number }> = ({
  k,
  left,
  top,
  tilt,
  lift = 0,
  blur = 0,
}) => {
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
        borderRadius: 7,
        overflow: "hidden",
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        boxShadow: `0 1px 2px rgba(0,0,0,0.55), ${3 + lift * 20}px ${6 + lift * 26}px ${12 + lift * 40}px rgba(0,0,0,${0.5 - lift * 0.12})`,
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
        const inP = interpolate(frame, [t(c.at), t(c.at) + 12], [0, 1], { ...CLAMP, easing: EASE.land });
        const isWidow = c.key === "maryLincolnGhost";
        const p = isWidow ? pick : 0;
        return (
          <Card
            key={c.key}
            blur={isWidow ? 0 : 2.4 * pick}
            k={c.key}
            left={c.left + (1 - inP) * 900 + p * 40}
            top={c.top - p * 90}
            tilt={c.tilt * (1 - p)}
            lift={isWidow ? p : 0}
          />
        );
      })}
      <SourceCaption text="W. H. MUMLER · SPIRIT PHOTOGRAPHS · 1860S–70S" left={120} top={1090} />
      {/* The second file is stamped open. */}
      <ArchiveStamp label="ARCHIVE" number="No.002" left={660} top={760} at={t(60)} tilt={-8} />
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

// Darkroom print tongs: two long strips hinged at the top, rubber-tipped jaws on the corner.
const PrintTongs: React.FC<{ readonly x: number; readonly y: number; readonly from: number }> = ({ x, y, from }) => (
  <Drawing>
    <Ink d={`M ${x - 18} ${y + 14} L ${x + 190} ${y - 34} M ${x - 6} ${y + 34} L ${x + 196} ${y - 6} M ${x + 190} ${y - 34} Q ${x + 214} ${y - 24} ${x + 196} ${y - 6}`} from={from} duration={10} width={3} opacity={0.85} />
    <Ink d={`M ${x - 18} ${y + 14} L ${x + 2} ${y + 10} M ${x - 6} ${y + 34} L ${x + 12} ${y + 30}`} from={from + 6} duration={4} width={7} color={COLORS.ink} opacity={1} />
  </Drawing>
);

const PHOTO = region("maryLincolnGhost", "photo");
// No zoom beyond the breath: this source is small, so the print is capped by the 1.5x budget.
const DEV_W = Math.floor(fitWidth("maryLincolnGhost", PHOTO, 380, BREATH_MAX_ZOOM));
const DEV_H = Math.round((DEV_W * ((PHOTO[3] - PHOTO[1]) * IMG.maryLincolnGhost.height)) / ((PHOTO[2] - PHOTO[0]) * IMG.maryLincolnGhost.width));

// The tray: a white enamel darkroom dish (a chipped rim, a pouring lip) holding dark developer.
const TRAY_RIM = 26;
const Tray: React.FC<{ readonly left: number; readonly top: number; readonly width: number; readonly height: number; readonly sheen: number }> = ({ left, top, width, height, sheen }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width,
      height,
      borderRadius: 22,
      backgroundColor: COLORS.printWhite,
      // Enamel under the lamp: lit from the top left, falling off toward the far corner.
      backgroundImage: "linear-gradient(150deg, rgba(14,14,16,0.02) 0%, rgba(14,14,16,0.22) 70%, rgba(14,14,16,0.36) 100%)",
      boxShadow: "0 2px 3px rgba(0,0,0,0.5), 10px 24px 50px rgba(0,0,0,0.55), inset 0 2px 0 rgba(236,230,218,0.6), inset 0 -3px 6px rgba(14,14,16,0.35)",
    }}
  >
    {/* Chips in the enamel, the dark iron showing through. */}
    {[
      [0.12, 0.012, 7],
      [0.83, 0.985, 5],
      [0.988, 0.42, 4],
    ].map(([u, v, r], i) => (
      <div key={i} style={{ position: "absolute", left: u * width - r, top: v * height - r, width: 2 * r, height: 1.4 * r, borderRadius: "45%", backgroundColor: COLORS.ink, opacity: 0.75 }} />
    ))}
    {/* The pouring lip on the near-left corner. */}
    <div style={{ position: "absolute", left: -10, top: height - 70, width: 22, height: 40, borderRadius: "50% 0 0 50%", backgroundColor: COLORS.printWhite, opacity: 0.85 }} />
    {/* The well, full of developer: dark liquid with the lamp's reflection drifting across it. */}
    <div
      style={{
        position: "absolute",
        inset: TRAY_RIM,
        borderRadius: 12,
        backgroundColor: COLORS.ink,
        boxShadow: "inset 0 10px 24px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(236,230,218,0.25)",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(105deg, transparent ${sheen * 100 - 16}%, rgba(236,230,218,0.1) ${sheen * 100}%, transparent ${sheen * 100 + 16}%)` }} />
    </div>
  </div>
);

const DeveloperTray: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  // Local 0 = 768. The print goes in with its shadows already coming up (no blank sheet); the face and
  // dress by 840, the hands by 936 (marked 1008/1020), the faint "spirit" last, fully there at 1032 and
  // circled on the 1056 downbeat. Continuous tone throughout (see grade.ts).
  const develop = interpolate(frame, [0, t(72), t(168), t(264)], [0.12, 0.5, 0.78, 1], { ...CLAMP, easing: EASE.inOut });
  // The developer's surface: a slow reflection that keeps travelling, over the print too.
  const sheen = EASE.inOut((frame / t(144)) % 1) * 1.8 - 0.4;
  // 1152: the print is lifted out of the tray and laid on the table beside it.
  const out = interpolate(frame, [t(384), t(408)], [0, 1], { ...CLAMP, easing: EASE.inOut });
  const down = interpolate(frame, [t(408), t(426)], [0, 1], { ...CLAMP, easing: EASE.out });
  const printLift = out * (1 - down) * 0.9;
  const trayW = DEV_W + 2 * TRAY_RIM + 100;
  const trayH = DEV_H + 2 * TRAY_RIM + 110;
  const trayLeft = 540 - trayW / 2 - 40;
  const trayTop = 300;
  // Print tongs (line art) close on the corner, lift the print with it, then leave.
  const printLeft = trayLeft + TRAY_RIM + 40 + out * 70;
  const printTop = trayTop + TRAY_RIM + 45 - out * 46;
  const tongsAway = interpolate(frame, [t(426), t(442)], [0, 1], { ...CLAMP, easing: EASE.inOut });
  // Under the liquid: the surface reflection and a faint darkening ride over the print until it is
  // lifted out.
  const wet = 1 - out;
  // The 示意 mark qualifies only the developing animation; it leaves once the print has developed.
  const markOpacity = interpolate(frame, [0, 8, t(264), t(276)], [0, 1, 1, 0], { ...CLAMP, easing: EASE.inOut });
  return (
    <AbsoluteFill>
      <Tray left={trayLeft} top={trayTop} width={trayW} height={trayH} sheen={sheen} />
      <PhotoPrint
        src={IMG.maryLincolnGhost.file}
        imgW={IMG.maryLincolnGhost.width}
        imgH={IMG.maryLincolnGhost.height}
        width={DEV_W}
        crop={rectToCrop(PHOTO)}
        left={printLeft}
        top={printTop}
        tilt={0.4 + out * 2.2}
        border={10}
        develop={develop}
        lift={printLift}
        sheenAt={t(392)}
        layers={
          wet > 0.01 ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: wet,
                background: `linear-gradient(105deg, transparent ${sheen * 100 - 16}%, rgba(236,230,218,0.16) ${sheen * 100}%, transparent ${sheen * 100 + 16}%), rgba(14,14,16,0.06)`,
              }}
            />
          ) : null
        }
      >
        <HandMark area="ghostHandLeft" from={t(240)} seed={12} />
        <HandMark area="ghostHandRight" from={t(252)} seed={14} />
        <GhostMark from={t(288)} />
      </PhotoPrint>
      {tongsAway < 1 ? (
        <div style={{ position: "absolute", inset: 0, translate: `${tongsAway * 300}px ${-tongsAway * 40}px`, opacity: 1 - tongsAway }}>
          <PrintTongs x={printLeft + DEV_W + 20 - 8} y={printTop + 6} from={t(372)} />
        </div>
      ) : null}
      {markOpacity > 0 ? <IllustrativeMark text="显影过程为示意" left={trayLeft + trayW - 196} top={trayTop - 46} opacity={markOpacity} /> : null}
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
          <Dolly from={0.96} end={96} originX={460} originY={700}>
            <CardTray />
          </Dolly>
        </Sequence>
        {/* 14 seconds in the developer: the camera creeps in the whole time (0.9 → 1). The developing
            is a schematic (an albumen carte was printed out in daylight), so it carries a 示意 mark
            while it develops; the developed print is the real photograph and carries none. */}
        <Sequence from={t(96)} layout="none">
          <Dolly from={0.9} end={420} originX={500} originY={640}>
            <DeveloperTray />
          </Dolly>
        </Sequence>
      </Breath>
    </AbsoluteFill>
  );
};
