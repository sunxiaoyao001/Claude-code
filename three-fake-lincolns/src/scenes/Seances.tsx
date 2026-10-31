import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region } from "../assets";
import { Breath, BREATH_MAX_ZOOM, Dolly } from "../components/Breath";
import { PhotoPrint, rectToCrop } from "../components/PhotoPrint";
import { Drawing, Ink, InkLabel } from "../components/LineArt";
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
// The headline strip is laid across the lower half of the family print, leaving the faces visible.
const PAGE_TOP = 620;
const PAGE_BORDER = 12;
const PULL_AT = 96;

const DIGIT_H = 64;
// One digit of a mechanical counter: when it changes it rolls up through its window (6 frames).
const RollingDigit: React.FC<{ readonly prev: string; readonly next: string; readonly p: number }> = ({ prev, next, p }) => (
  <span style={{ display: "inline-block", position: "relative", height: DIGIT_H, overflow: "hidden", verticalAlign: "top" }}>
    <span style={{ display: "block", translate: `0 ${prev === next ? 0 : -p * DIGIT_H}px` }}>
      <span style={{ display: "block", height: DIGIT_H, lineHeight: `${DIGIT_H}px` }}>{prev}</span>
      <span style={{ display: "block", height: DIGIT_H, lineHeight: `${DIGIT_H}px` }}>{next}</span>
    </span>
  </span>
);

const COUNTER_TOP = Math.max(FAMILY_BOTTOM, PAGE_TOP + PAGE_H + PAGE_BORDER * 2) + 70;

// Ten Halloweens as calendar cells, 1927–1936, each ticked as it is counted (a neutral tally: the
// facts say she held a séance each year, not what happened at each). The last one is marked LAST (F17).
const CELL = { left: 360, top: COUNTER_TOP + 34, w: 54, h: 62, gap: 4 } as const;
const HalloweenCells: React.FC = () => {
  const t = useTime();
  const { from, every, first, last } = SEANCE_COUNTER;
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  return (
    <Drawing>
      {years.map((y, i) => {
        const x = CELL.left + i * (CELL.w + CELL.gap);
        const at = t(from + i * every) - t(BASE);
        return (
          <React.Fragment key={y}>
            <Ink d={`M ${x} ${CELL.top} h ${CELL.w} v ${CELL.h} h ${-CELL.w} Z`} from={t(2) + i * 2} duration={8} width={1.5} opacity={0.55} />
            <InkLabel x={x + CELL.w / 2} y={CELL.top + 40} text={`'${String(y).slice(2)}`} from={t(4) + i * 2} anchor="middle" />
            <Ink d={`M ${x + CELL.w / 2} ${CELL.top + CELL.h - 8} V ${CELL.top + CELL.h - 18}`} from={at} duration={4} color={COLORS.printWhite} width={2.5} opacity={0.9} />
            {y === last ? (
              <>
                <Ink d={`M ${x - 3} ${CELL.top - 3} h ${CELL.w + 6} v ${CELL.h + 6} h ${-CELL.w - 6} Z`} from={at + 4} duration={8} color={COLORS.vermilion} width={2} opacity={1} />
                <InkLabel x={x + CELL.w / 2} y={CELL.top + CELL.h + 30} text="LAST" from={at + 8} anchor="middle" color={COLORS.vermilion} />
              </>
            ) : null}
          </React.Fragment>
        );
      })}
    </Drawing>
  );
};

const Counter: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const { from, every, first, last } = SEANCE_COUNTER;
  let year = 0;
  let changedAt = 0;
  for (let y = first; y <= last; y++) {
    const at = t(from + (y - first) * every) - t(BASE);
    if (at <= frame) {
      year = y;
      changedAt = at;
    }
  }
  if (!year) return null;
  const roll = interpolate(frame, [changedAt, changedAt + 6], [0, 1], { ...CLAMP, easing: EASE.inOut });
  const prev = String(year === first ? year : year - 1);
  const next = String(year);
  return (
    <div style={{ position: "absolute", left: 153, top: COUNTER_TOP }}>
      <MonoText color={COLORS.silver}>HALLOWEEN SÉANCE</MonoText>
      <div style={{ marginTop: 6 }}>
        <MonoText size={TYPE.subtitleZh} color={COLORS.printWhite} style={{ display: "inline-flex" }}>
          {[...next].map((d, i) => (
            <RollingDigit key={i} prev={prev[i]} next={d} p={roll} />
          ))}
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
        <Dolly from={0.95} end={192} originX={420} originY={580}>
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
              sheenAt={t(10)}
            />
            <SourceCaption text={IMG.houdiniClippings.caption} left={PAGE_LEFT} top={PAGE_TOP + PAGE_H + PAGE_BORDER * 2 + 14} opacity={pageIn * (1 - pageOut)} />
          </>
        ) : null}
        <Counter />
        <HalloweenCells />
        </Dolly>
      </Breath>
    </AbsoluteFill>
  );
};
