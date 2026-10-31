import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region } from "../assets";
import { Breath, BREATH_MAX_ZOOM, Dolly } from "../components/Breath";
import { PhotoPrint, rectToCrop } from "../components/PhotoPrint";
import { Drawing, Ink, InkLabel } from "../components/LineArt";
import { ManilaTag, MonoText } from "../components/Props";
import { useTime } from "../time";
import { SCENES } from "../timeline";
import { CLAMP, COLORS, EASE, SAFE } from "../theme";

// Scene-local frames: 0 = 1776. Fakes No.1 and No.2 slide in side by side; slot No.3 is empty.
// 1824: a box of glass lantern slides is pushed into frame. 1905–1920 is the film's only silence.
const BASE = SCENES.question.from;
const BORDER = 12;
const L_CROP = region("lincolnComposite", "engraving");
const M_CROP = region("maryLincolnGhost", "photo");
const L_W = Math.floor(fitWidth("lincolnComposite", L_CROP, 250, BREATH_MAX_ZOOM));
const L_H = Math.round((L_W * (L_CROP[3] - L_CROP[1]) * IMG.lincolnComposite.height) / ((L_CROP[2] - L_CROP[0]) * IMG.lincolnComposite.width));
const M_W = Math.floor(fitWidth("maryLincolnGhost", M_CROP, 230, BREATH_MAX_ZOOM));
const GAP = 24;
const SLOT_W = L_W;
const SLOT_H = L_H;
const ROW_W = L_W + M_W + SLOT_W + BORDER * 6 + GAP * 2;
const ROW_LEFT = Math.round((SAFE.margin + SAFE.right) / 2 - ROW_W / 2);
const ROW_TOP = 300;
const SLOT_LEFT = ROW_LEFT + L_W + M_W + BORDER * 4 + GAP * 2;
// The empty third place on screen; the twist's viewfinder grows out of exactly this rectangle.
export const EMPTY_SLOT = { left: SLOT_LEFT, top: ROW_TOP, width: SLOT_W + BORDER * 2, height: SLOT_H + BORDER * 2 } as const;

const BOX = { left: 250, top: 880, width: 560, height: 240 } as const;
const BOX_AT = 48;

// A wooden box of glass slides seen from above: rim, the slides' edges, a manila label.
const SlideBox: React.FC<{ readonly top: number; readonly left: number }> = ({ top, left }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width: BOX.width,
      height: BOX.height,
      backgroundColor: COLORS.darkPaper,
      boxShadow: `inset 0 0 0 10px ${COLORS.ink}, inset 0 0 0 12px rgba(142,138,132,0.28), 0 22px 50px rgba(0,0,0,0.6)`,
    }}
  >
    {Array.from({ length: 22 }, (_, i) => (
      <div
        key={i}
        style={{ position: "absolute", left: 30 + i * 23, top: 26, width: 3, height: BOX.height - 52, backgroundColor: COLORS.silver, opacity: 0.18 + (i % 3) * 0.06 }}
      />
    ))}
    <ManilaTag left={BOX.width / 2 - 170} top={BOX.height - 74} height={52} tilt={-0.8}>
      <MonoText>GLASS LANTERN SLIDES</MonoText>
    </ManilaTag>
  </div>
);

// A timeline ruled under the row: each fake hangs from its year; the third hangs from a dashed "?".
const M_H = Math.round((M_W * (M_CROP[3] - M_CROP[1]) * IMG.maryLincolnGhost.height) / ((M_CROP[2] - M_CROP[0]) * IMG.maryLincolnGhost.width));
const TL = { y: 790, left: 100, right: 930, from: 1850, to: 1935 } as const;
const yearX = (year: number) => TL.left + ((year - TL.from) / (TL.to - TL.from)) * (TL.right - TL.left);
const SLOTS = [
  { x: ROW_LEFT + BORDER + L_W / 2, bottom: ROW_TOP + L_H + 2 * BORDER, year: 1865 },
  { x: ROW_LEFT + L_W + 3 * BORDER + GAP + M_W / 2, bottom: ROW_TOP + 14 + M_H + 2 * BORDER, year: 1872, from: 1869 },
] as const;
const SLOT3_X = SLOT_LEFT + BORDER + SLOT_W / 2;

const Timeline: React.FC = () => {
  const t = useTime();
  const decades = Array.from({ length: 9 }, (_, i) => TL.from + i * 10);
  const halves = Array.from({ length: 8 }, (_, i) => TL.from + 5 + i * 10);
  return (
    <Drawing>
      <Ink d={`M ${TL.left} ${TL.y} H ${TL.right}`} from={t(4)} duration={t(20)} width={1.5} opacity={0.7} />
      {decades.map((yr, i) => (
        <React.Fragment key={yr}>
          <Ink d={`M ${yearX(yr)} ${TL.y} V ${TL.y - 16}`} from={t(4) + i * 2} duration={6} width={1.5} opacity={0.7} />
          <InkLabel x={yearX(yr)} y={TL.y + 34} text={String(yr)} from={t(8) + i * 2} anchor="middle" />
        </React.Fragment>
      ))}
      <Ink d={halves.map((yr) => `M ${yearX(yr)} ${TL.y} V ${TL.y - 8}`).join(" ")} from={t(10)} duration={t(14)} width={1} opacity={0.45} />
      {SLOTS.map((sl, i) => (
        <React.Fragment key={sl.year}>
          <Ink d={`M ${sl.x} ${sl.bottom + 6} V ${TL.y - 40} L ${yearX(sl.year)} ${TL.y - 4}`} from={t(18 + i * 6)} duration={12} width={1.5} opacity={0.8} />
          {"from" in sl ? (
            <Ink d={`M ${yearX(sl.from)} ${TL.y - 6} V ${TL.y + 6} M ${yearX(sl.from)} ${TL.y} H ${yearX(sl.year)} M ${yearX(sl.year)} ${TL.y - 6} V ${TL.y + 6}`} from={t(24 + i * 6)} duration={6} color={COLORS.vermilion} width={3} opacity={1} />
          ) : (
            <Ink d={`M ${yearX(sl.year) - 6} ${TL.y} a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0`} from={t(24 + i * 6)} duration={6} color={COLORS.vermilion} width={2} opacity={1} />
          )}
        </React.Fragment>
      ))}
      {/* The third: no year yet, a dashed span over the decades still to come. */}
      <Ink d={`M ${SLOT3_X} ${ROW_TOP + SLOT_H + 2 * BORDER + 6} V ${TL.y - 40}`} from={t(32)} duration={10} width={1.5} dash="6 6" color={COLORS.vermilion} opacity={0.9} />
      <Ink d={`M ${yearX(1880)} ${TL.y - 26} H ${TL.right} M ${yearX(1880)} ${TL.y - 32} V ${TL.y - 20} M ${TL.right} ${TL.y - 32} V ${TL.y - 20}`} from={t(38)} duration={12} width={1.5} dash="6 6" color={COLORS.vermilion} opacity={0.9} />
    </Drawing>
  );
};

export const Question: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const spring = { ...CLAMP, easing: EASE.spring };
  const slideIn = (delay: number) => interpolate(frame, [t(delay), t(delay) + 18], [0, 1], spring);
  const slotIn = interpolate(frame, [t(10), t(10) + 10], [0, 1], { ...CLAMP, easing: EASE.out });
  const boxIn = interpolate(frame, [t(BOX_AT), t(BOX_AT) + 18], [0, 1], spring);
  return (
    <AbsoluteFill>
      <Breath phase={t(BASE)}>
        <Dolly from={0.94} end={129} originX={SLOT_LEFT + SLOT_W / 2} originY={ROW_TOP + SLOT_H / 2}>
        <PhotoPrint
          src={IMG.lincolnComposite.file}
          imgW={IMG.lincolnComposite.width}
          imgH={IMG.lincolnComposite.height}
          width={L_W}
          crop={rectToCrop(L_CROP)}
          left={ROW_LEFT + (1 - slideIn(0)) * 900}
          top={ROW_TOP}
          tilt={-1.2}
          border={BORDER}
          sheenAt={t(14)}
        />
        <PhotoPrint
          src={IMG.maryLincolnGhost.file}
          imgW={IMG.maryLincolnGhost.width}
          imgH={IMG.maryLincolnGhost.height}
          width={M_W}
          crop={rectToCrop(M_CROP)}
          left={ROW_LEFT + L_W + BORDER * 2 + GAP + (1 - slideIn(4)) * 900}
          top={ROW_TOP + 14}
          tilt={0.9}
          border={BORDER}
          sheenAt={t(18)}
        />
        {/* The empty third place: a bare patch of table and its catalogue tag. */}
        <div
          style={{
            position: "absolute",
            left: SLOT_LEFT,
            top: ROW_TOP,
            width: SLOT_W + BORDER * 2,
            height: SLOT_H + BORDER * 2,
            border: `2px solid ${COLORS.silver}`,
            opacity: 0.35 * slotIn,
          }}
        />
        <ManilaTag left={SLOT_LEFT + 24} top={ROW_TOP + (SLOT_H + BORDER * 2) / 2 - 30 - (1 - slotIn) * 40} height={60} tilt={2} style={{ opacity: slotIn }}>
          <MonoText>No.003</MonoText>
          <MonoText color={COLORS.vermilion} style={{ marginLeft: 14 }}>
            ?
          </MonoText>
        </ManilaTag>
        <Timeline />
        <SlideBox top={BOX.top} left={BOX.left + (1 - boxIn) * 900} />
        </Dolly>
      </Breath>
    </AbsoluteFill>
  );
};
