import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region } from "../assets";
import { Breath, BREATH_MAX_ZOOM } from "../components/Breath";
import { PhotoPrint, rectToCrop } from "../components/PhotoPrint";
import { MonoText } from "../components/Props";
import { SourceCaption } from "../components/SeriesChrome";
import { useTime } from "../time";
import { SCENES, SEANCE_COUNTER } from "../timeline";
import { CLAMP, COLORS, EASE, TYPE } from "../theme";
import { FAMILY_BOTTOM, FAMILY_CAPTION, FamilyPrint } from "./Code";

// Scene-local frames: 0 = 2112. The 1926 death notices are laid over the family print while the
// Halloween séances are counted 1927 → 1936 (F14, F16). 2208: the clipping is taken away and the
// family print bleaches back to blank paper — nothing came (F17).
const BASE = SCENES.seances.from;
const PAGE = region("houdiniClippings", "page");
const PAGE_W = Math.floor(fitWidth("houdiniClippings", PAGE, 640, BREATH_MAX_ZOOM));
const PAGE_H = Math.round((PAGE_W * (PAGE[3] - PAGE[1]) * IMG.houdiniClippings.height) / ((PAGE[2] - PAGE[0]) * IMG.houdiniClippings.width));
const PAGE_LEFT = 120;
const PAGE_TOP = 236;
const PAGE_BORDER = 12;
const PULL_AT = 96;

const Counter: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const { from, every, first, last } = SEANCE_COUNTER;
  let year = 0;
  for (let y = first; y <= last; y++) {
    if (t(from + (y - first) * every) - t(BASE) <= frame) year = y;
  }
  if (!year) return null;
  return (
    <div style={{ position: "absolute", left: 153, top: Math.max(FAMILY_BOTTOM, PAGE_TOP + PAGE_H + PAGE_BORDER * 2) + 70 }}>
      <MonoText color={COLORS.silver}>HALLOWEEN SÉANCE</MonoText>
      <div style={{ marginTop: 6 }}>
        <MonoText size={TYPE.subtitleZh} color={COLORS.printWhite}>
          {year}
        </MonoText>
      </div>
    </div>
  );
};

export const Seances: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const pageIn = interpolate(frame, [0, t(14)], [0, 1], { ...CLAMP, easing: EASE.spring });
  const pageOut = interpolate(frame, [t(PULL_AT), t(PULL_AT) + 14], [0, 1], { ...CLAMP, easing: EASE.inOut });
  // Developing in reverse: the white point climbs back until only paper is left.
  const develop = interpolate(frame, [t(PULL_AT) + 10, t(176)], [1, 0], { ...CLAMP, easing: EASE.inOut });
  return (
    <AbsoluteFill>
      <Breath phase={t(BASE)}>
        <FamilyPrint develop={develop} />
        <SourceCaption text={FAMILY_CAPTION} left={140} top={FAMILY_BOTTOM + 16} opacity={pageOut} />
        {pageOut < 1 ? (
          <>
            <PhotoPrint
              src={IMG.houdiniClippings.file}
              imgW={IMG.houdiniClippings.width}
              imgH={IMG.houdiniClippings.height}
              width={PAGE_W}
              crop={rectToCrop(PAGE)}
              left={PAGE_LEFT + (1 - pageIn) * 1000 - pageOut * 1100}
              top={PAGE_TOP}
              tilt={1.1 - 2 * pageOut}
              border={PAGE_BORDER}
              lift={pageOut * 0.7}
            />
            <SourceCaption text={IMG.houdiniClippings.caption} left={PAGE_LEFT} top={PAGE_TOP + PAGE_H + PAGE_BORDER * 2 + 14} opacity={pageIn * (1 - pageOut)} />
          </>
        ) : null}
        <Counter />
      </Breath>
    </AbsoluteFill>
  );
};
