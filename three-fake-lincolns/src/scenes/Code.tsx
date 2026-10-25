import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region } from "../assets";
import { Breath, BREATH_MAX_ZOOM } from "../components/Breath";
import { PhotoPrint, rectToCrop } from "../components/PhotoPrint";
import { ManilaTag, TypedMono } from "../components/Props";
import { SourceCaption } from "../components/SeriesChrome";
import { useTime } from "../time";
import { SCENES, TYPED } from "../timeline";
import { CLAMP, EASE, TYPE } from "../theme";

// Scene-local frames: 0 = 2016. Houdini with his wife and his mother; the code he and his wife
// agreed on is typed on a tag in front of the print (F15).
const BASE = SCENES.code.from;
const PHOTO = region("houdiniFamily", "photo");
export const FAMILY = {
  width: Math.floor(fitWidth("houdiniFamily", PHOTO, 470, BREATH_MAX_ZOOM)),
  left: 140,
  top: 250,
  border: 14,
  tilt: -0.6,
} as const;
const FAMILY_H = Math.round((FAMILY.width * (PHOTO[3] - PHOTO[1]) * IMG.houdiniFamily.height) / ((PHOTO[2] - PHOTO[0]) * IMG.houdiniFamily.width));
export const FAMILY_BOTTOM = FAMILY.top + FAMILY_H + FAMILY.border * 2;

// The LoC record names the three sitters but not who stands where, so nobody is circled or labelled.
export const FAMILY_CAPTION = "LIBRARY OF CONGRESS · HOUDINI WITH WIFE AND MOTHER";

// `develop` < 1 bleaches the print back towards blank paper.
export const FamilyPrint: React.FC<{ readonly left?: number; readonly develop?: number }> = ({ left = FAMILY.left, develop = 1 }) => (
  <PhotoPrint
    src={IMG.houdiniFamily.file}
    imgW={IMG.houdiniFamily.width}
    imgH={IMG.houdiniFamily.height}
    width={FAMILY.width}
    crop={rectToCrop(PHOTO)}
    left={left}
    top={FAMILY.top}
    tilt={FAMILY.tilt}
    border={FAMILY.border}
    develop={develop}
  />
);

export const Code: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const inP = interpolate(frame, [0, t(16)], [0, 1], {
    ...CLAMP,
    easing: EASE.spring,
  });
  const tagIn = interpolate(frame, [t(6), t(10)], [0, 1], {
    ...CLAMP,
    easing: EASE.out,
  });
  return (
    <AbsoluteFill>
      <Breath phase={t(BASE)}>
        <FamilyPrint left={FAMILY.left + (1 - inP) * 900} />
        <SourceCaption text={FAMILY_CAPTION} left={FAMILY.left} top={FAMILY_BOTTOM + 16} opacity={inP} />
        <ManilaTag left={153 - (1 - tagIn) * 700} top={FAMILY_BOTTOM + 70} height={84} tilt={-1.4}>
          <TypedMono typed={TYPED.code} sceneFrom={BASE} size={TYPE.subtitleEn} />
        </ManilaTag>
      </Breath>
    </AbsoluteFill>
  );
};
