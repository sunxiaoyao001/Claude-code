import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region } from "../assets";
import { Breath, BREATH_MAX_ZOOM } from "../components/Breath";
import { PhotoPrint, rectToCrop } from "../components/PhotoPrint";
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

const BOX = { left: 250, top: 800, width: 560, height: 300 } as const;
const BOX_AT = 48;

// A wooden box of glass slides seen from above: rim, the slides' edges, a manila label.
const SlideBox: React.FC<{ readonly top: number }> = ({ top }) => (
  <div
    style={{
      position: "absolute",
      left: BOX.left,
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
        <SlideBox top={BOX.top + (1 - boxIn) * 1100} />
      </Breath>
    </AbsoluteFill>
  );
};
