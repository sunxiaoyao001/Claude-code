import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region, type ImageKey } from "../assets";
import { Breath, BREATH_MAX_ZOOM } from "../components/Breath";
import { PhotoPrint, rectToCrop } from "../components/PhotoPrint";
import { MonoText } from "../components/Props";
import { useTime } from "../time";
import { GOLDEN } from "../timeline";
import { CLAMP, COLORS, EASE, FONTS, SAFE, TYPE } from "../theme";

// The three fakes as a contact sheet: one sheet of paper, each frame with a black film edge and its
// number, held down so the golden line owns the frame.
const SHEET = { left: 76, top: 268, width: 874, height: 392 } as const;
const STRIP: readonly { key: ImageKey; crop: string; width: number; left: number; label: string }[] = [
  { key: "lincolnComposite", crop: "engraving", width: 200, left: 112, label: "No.001" },
  { key: "maryLincolnGhost", crop: "photo", width: 170, left: 368, label: "No.002" },
  { key: "houdiniLincolnGhost", crop: "slide", width: 290, left: 594, label: "No.003" },
];
const FRAME_TOP = SHEET.top + 28;

export const ContactSheet: React.FC<{ readonly dim: number }> = ({ dim }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", ...SHEET, backgroundColor: COLORS.printWhite, rotate: "-0.4deg", boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }} />
    {STRIP.map((s) => (
      <React.Fragment key={s.key}>
        <PhotoPrint
          src={IMG[s.key].file}
          imgW={IMG[s.key].width}
          imgH={IMG[s.key].height}
          width={Math.floor(fitWidth(s.key, region(s.key, s.crop), s.width, BREATH_MAX_ZOOM))}
          crop={rectToCrop(region(s.key, s.crop))}
          left={s.left}
          top={FRAME_TOP}
          border={7}
          style={{ backgroundColor: COLORS.ink, boxShadow: "none" }}
        />
        <div style={{ position: "absolute", left: s.left, top: SHEET.top + SHEET.height - 46 }}>
          <MonoText>{s.label}</MonoText>
        </div>
      </React.Fragment>
    ))}
    {/* A flat dark field with feathered edges holds the sheet down; the photos are not masked. */}
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: SHEET.top - 70,
        height: SHEET.height + 140,
        opacity: dim,
        background: `linear-gradient(to bottom, rgba(14,14,16,0) 0, ${COLORS.ink} 70px, ${COLORS.ink} calc(100% - 70px), rgba(14,14,16,0) 100%)`,
      }}
    />
  </AbsoluteFill>
);

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
      <Breath phase={t(base)}>
        <ContactSheet dim={0.6} />
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
