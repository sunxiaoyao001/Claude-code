import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region, type ImageKey } from "../assets";
import { Breath, BREATH_MAX_ZOOM } from "../components/Breath";
import { PhotoPrint, rectToCrop, toWindow, usePrint } from "../components/PhotoPrint";
import { MonoText, PenMark, TypedMono } from "../components/Props";
import { SourceCaption } from "../components/SeriesChrome";
import { useTime } from "../time";
import { SCENES, TYPED } from "../timeline";
import { CLAMP, COLORS, EASE, SAFE, TYPE } from "../theme";

// Scene-local frames: 0 = 1200 in the base timeline.
const BASE = SCENES.trial.from;
const CARDS: readonly { key: ImageKey; tilt: number; at: number; mark: number; seed: number }[] = [
  { key: "mumlerElderlyMan", tilt: -1.6, at: 96, mark: 108, seed: 21 },
  { key: "mumlerWoman", tilt: 1.1, at: 100, mark: 120, seed: 22 },
  { key: "mumlerYoungMan", tilt: -0.6, at: 104, mark: 132, seed: 23 },
];
// Cartes de visite share one physical size, capped by the smallest scan.
const CARD_W = Math.floor(Math.min(...CARDS.map((c) => fitWidth(c.key, region(c.key, "card"), 250, BREATH_MAX_ZOOM))));
const GAP = 30;
const ROW_LEFT = Math.round((SAFE.margin + SAFE.right) / 2 - (CARDS.length * CARD_W + (CARDS.length - 1) * GAP) / 2);
const ROW_TOP = 300;
const cardH = (key: ImageKey) => {
  const r = region(key, "card");
  return Math.round((CARD_W * (r[3] - r[1]) * IMG[key].height) / ((r[2] - r[0]) * IMG[key].width));
};
const ROW_BOTTOM = ROW_TOP + Math.max(...CARDS.map((c) => cardH(c.key)));

const GhostMark: React.FC<{ readonly k: ImageKey; readonly from: number; readonly seed: number }> = ({ k, from, seed }) => {
  const g = usePrint();
  const r = region(k, "ghost");
  const a = toWindow(g, r[0], r[1]);
  const b = toWindow(g, r[2], r[3]);
  return <PenMark kind="circle" left={a.x} top={a.y} width={b.x - a.x} height={b.y - a.y} from={from} durationInFrames={12} seed={seed} />;
};

// A blank case card: printed heading, the date typed in. It is never laid on a photograph, so it
// cannot be read as the date of any picture (F10 dates the trial only).
const CASE = { width: 660, height: 260 } as const;
const CaseCard: React.FC<{ readonly left: number; readonly top: number; readonly tilt: number }> = ({ left, top, tilt }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width: CASE.width,
      height: CASE.height,
      rotate: `${tilt}deg`,
      backgroundColor: COLORS.printWhite,
      boxShadow: "0 10px 26px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.5)",
      padding: "34px 40px",
      boxSizing: "border-box",
    }}
  >
    <div style={{ position: "absolute", left: 0, right: 0, top: 18, height: 3, backgroundColor: COLORS.vermilion }} />
    <MonoText>W. H. MUMLER · FRAUD TRIAL</MonoText>
    <div style={{ height: 1, backgroundColor: COLORS.silver, opacity: 0.6, margin: "18px 0 30px" }} />
    <TypedMono typed={TYPED.trialStamp} sceneFrom={BASE} size={TYPE.subtitleEn} />
  </div>
);

// 1200: the trial date is typed on a blank case card.
// 1296: the card makes room; Mumler's spirit cards are dealt and one ghost is circled per eighth note.
export const Trial: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const caseIn = interpolate(frame, [0, t(12)], [0, 1], { ...CLAMP, easing: EASE.spring });
  const caseDown = interpolate(frame, [t(80), t(96)], [0, 1], { ...CLAMP, easing: EASE.spring });
  const caseLeft = Math.round((SAFE.margin + SAFE.right) / 2 - CASE.width / 2);
  return (
    <AbsoluteFill>
      <Breath phase={t(BASE)}>
        <CaseCard left={caseLeft + (1 - caseIn) * 900} top={420 + caseDown * (ROW_BOTTOM + 90 - 420)} tilt={-0.8 + caseDown * 1.4} />
        {CARDS.map((c, i) => {
          const inP = interpolate(frame, [t(c.at) - 10, t(c.at)], [0, 1], { ...CLAMP, easing: EASE.out });
          if (frame < t(c.at) - 10) return null;
          return (
            <PhotoPrint
              key={c.key}
              src={IMG[c.key].file}
              imgW={IMG[c.key].width}
              imgH={IMG[c.key].height}
              width={CARD_W}
              crop={rectToCrop(region(c.key, "card"))}
              left={ROW_LEFT + i * (CARD_W + GAP) + (1 - inP) * 900}
              top={ROW_TOP}
              tilt={c.tilt}
              border={0}
              lift={(1 - inP) * 0.6}
            >
              <GhostMark k={c.key} from={t(c.mark)} seed={c.seed} />
            </PhotoPrint>
          );
        })}
        <SourceCaption text={IMG.mumlerElderlyMan.caption} left={ROW_LEFT} top={ROW_BOTTOM + 28} opacity={interpolate(frame, [t(104), t(112)], [0, 1], CLAMP)} />
      </Breath>
    </AbsoluteFill>
  );
};
