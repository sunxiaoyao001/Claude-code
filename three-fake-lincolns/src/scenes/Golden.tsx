import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region, type ImageKey } from "../assets";
import { Breath, BREATH_MAX_ZOOM } from "../components/Breath";
import { PhotoPrint, rectToCrop } from "../components/PhotoPrint";
import { useTime } from "../time";
import { GOLDEN } from "../timeline";
import { CLAMP, COLORS, EASE, FONTS, SAFE, TYPE } from "../theme";

// The three fakes as a contact strip, held down so the golden line owns the frame.
const STRIP: readonly { key: ImageKey; crop: string; width: number; left: number; top: number; tilt: number }[] = [
  { key: "lincolnComposite", crop: "engraving", width: 200, left: 96, top: 300, tilt: -1.2 },
  { key: "maryLincolnGhost", crop: "photo", width: 170, left: 360, top: 330, tilt: 0.8 },
  { key: "houdiniLincolnGhost", crop: "slide", width: 290, left: 590, top: 360, tilt: -0.6 },
];

const Group: React.FC<{ readonly text: string; readonly at: number; readonly keyword: boolean }> = ({ text, at, keyword }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 12], [0, 1], { ...CLAMP, easing: EASE.out });
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingTop: 8 }}>
      <span style={{ display: "inline-block", translate: `0 ${(p - 1) * 60}px`, color: keyword ? COLORS.vermilion : COLORS.printWhite }}>{text}</span>
    </span>
  );
};

export const Golden: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const base = GOLDEN.from;
  const enIn = interpolate(frame, [t(36), t(36) + 12], [0, 1], { ...CLAMP, easing: EASE.out });
  return (
    <AbsoluteFill>
      <Breath phase={base}>
        {STRIP.map((s) => (
          <PhotoPrint
            key={s.key}
            src={IMG[s.key].file}
            imgW={IMG[s.key].width}
            imgH={IMG[s.key].height}
            width={Math.floor(fitWidth(s.key, region(s.key, s.crop), s.width, BREATH_MAX_ZOOM))}
            crop={rectToCrop(region(s.key, s.crop))}
            left={s.left}
            top={s.top}
            tilt={s.tilt}
            border={8}
          />
        ))}
        {/* Hold the strip down (60%) with a flat dark field, not a mask on the photos. */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 260, height: 520, backgroundColor: "rgba(14,14,16,0.6)" }} />
      </Breath>
      <div style={{ position: "absolute", left: SAFE.margin + 77, top: 820, fontFamily: FONTS.serifZh, fontWeight: 900, fontSize: TYPE.golden, lineHeight: "172px", letterSpacing: TYPE.titleTracking }}>
        <div>
          <Group text={GOLDEN.groups[0].text} at={t(GOLDEN.groups[0].at - base)} keyword={false} />
        </div>
        <div>
          <Group text={GOLDEN.groups[1].text} at={t(GOLDEN.groups[1].at - base)} keyword={false} />
          <Group text={GOLDEN.groups[2].text} at={t(GOLDEN.groups[2].at - base)} keyword />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: SAFE.margin + 77,
          top: 1196,
          fontFamily: FONTS.italicEn,
          fontStyle: "italic",
          fontSize: TYPE.subtitleEn,
          color: COLORS.silver,
          opacity: enIn,
          translate: `0 ${(1 - enIn) * 10}px`,
        }}
      >
        {GOLDEN.en}
      </div>
    </AbsoluteFill>
  );
};
