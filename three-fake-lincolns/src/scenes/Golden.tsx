import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region, type ImageKey } from "../assets";
import { Breath, BREATH_MAX_ZOOM, Dolly } from "../components/Breath";
import { PhotoPrint, rectToCrop } from "../components/PhotoPrint";
import { MonoText, PenMark } from "../components/Props";
import { useTime } from "../time";
import { GOLDEN } from "../timeline";
import { CLAMP, COLORS, EASE, FONTS, SAFE, TYPE } from "../theme";

// The three fakes as a contact sheet: one sheet of paper, each frame with a black film edge and its
// number, held down so the golden line owns the frame.
const SHEET = { left: 76, top: 268, width: 874, height: 430 } as const;
const STRIP: readonly { key: ImageKey; crop: string; width: number; left: number; label: string }[] = [
  { key: "lincolnComposite", crop: "engraving", width: 200, left: 112, label: "No.001" },
  { key: "maryLincolnGhost", crop: "photo", width: 170, left: 368, label: "No.002" },
  { key: "houdiniLincolnGhost", crop: "slide", width: 290, left: 594, label: "No.003" },
];
const FRAME_TOP = SHEET.top + 40;
// The film rebate printed on the sheet: a black band with a row of sprocket holes along each edge.
const BAND = { left: SHEET.left + 16, right: SHEET.left + SHEET.width - 16, top: SHEET.top + 8, bottom: FRAME_TOP + 300 + 30 } as const;
const HOLES = Array.from({ length: Math.floor((BAND.right - BAND.left - 20) / 34) }, (_, i) => BAND.left + 14 + i * 34);

// `soft` puts the sheet slightly out of focus (depth of field) behind the golden line.
export const ContactSheet: React.FC<{ readonly dim: number; readonly soft?: number }> = ({ dim, soft = 0 }) => (
  <AbsoluteFill style={{ filter: soft > 0.05 ? `blur(${soft}px)` : undefined }}>
    <div style={{ position: "absolute", ...SHEET, backgroundColor: COLORS.printWhite, rotate: "-0.4deg", boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}>
      <div style={{ position: "absolute", left: BAND.left - SHEET.left, top: BAND.top - SHEET.top, width: BAND.right - BAND.left, height: BAND.bottom - BAND.top, backgroundColor: COLORS.ink }}>
        {HOLES.map((x) => (
          <React.Fragment key={x}>
            <div style={{ position: "absolute", left: x - BAND.left, top: 8, width: 16, height: 14, borderRadius: 3, backgroundColor: COLORS.printWhite, opacity: 0.85 }} />
            <div style={{ position: "absolute", left: x - BAND.left, bottom: 8, width: 16, height: 14, borderRadius: 3, backgroundColor: COLORS.printWhite, opacity: 0.85 }} />
          </React.Fragment>
        ))}
      </div>
    </div>
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
      {/* Starts fully above its own mask (−110% of its height) and falls into place. */}
      <span style={{ display: "inline-block", translate: `0 ${(p - 1) * 110}%`, color: keyword ? COLORS.vermilion : COLORS.printWhite }}>{text}</span>
    </span>
  );
};

export const Golden: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const base = GOLDEN.from;
  const enIn = interpolate(frame, [t(GOLDEN.enAt - base), t(GOLDEN.enAt - base) + 12], [0, 1], { ...CLAMP, easing: EASE.out });
  return (
    <AbsoluteFill>
      <Breath phase={t(base)}>
        <Dolly from={0.97} end={144} originX={513} originY={464}>
          <ContactSheet dim={0.6} soft={interpolate(frame, [0, t(24)], [0, 1.6], { ...CLAMP, easing: EASE.inOut })} />
        </Dolly>
      </Breath>
      <div style={{ position: "absolute", left: SAFE.margin + 77, top: 820, fontFamily: FONTS.serifZh, fontWeight: 900, fontSize: TYPE.golden, lineHeight: "172px", letterSpacing: TYPE.titleTracking }}>
        {/* One character per eighth note, each falling into its own mask. */}
        {GOLDEN.lines.map((line, i) => (
          <div key={i}>
            {line.map((c) => (
              <Group key={c.at} text={c.text} at={t(c.at - base)} keyword={c.keyword} />
            ))}
          </div>
        ))}
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
      {/* 2508: one stroke under 想相信, an eighth after the line has formed. */}
      <PenMark kind="underline" left={SAFE.margin + 77 + 2 * 150} top={820 + 172 + 8} width={3 * 150} height={150} from={t(GOLDEN.enAt - base + 12)} durationInFrames={12} seed={27} />
    </AbsoluteFill>
  );
};
