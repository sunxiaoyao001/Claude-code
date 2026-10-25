import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { CALHOUN_TO_LINCOLN, fitWidth, IMG, lincolnRectToCalhoun, region } from "../assets";
import { Breath } from "../components/Breath";
import { AlignedCalhoun, DifferenceOverlay } from "../components/Overlays";
import { PhotoPrint, rectToCrop } from "../components/PhotoPrint";
import { ManilaTag, MonoText, PenMark, Seal } from "../components/Props";
import { SourceCaption } from "../components/SeriesChrome";
import { useTime } from "../time";
import { CLAMP, COLORS, EASE, FONTS, TYPE } from "../theme";

// ---- shared geometry ---------------------------------------------------------------------
const L_CROP = region("lincolnComposite", "engraving");
const C_CROP = lincolnRectToCalhoun(L_CROP);
// Breath reaches 1.5% at most, so the print is sized for that zoom.
export const PRINT_W = Math.floor(fitWidth("lincolnComposite", L_CROP, 420, 1.015));
const PRINT_H = Math.round(PRINT_W * (((L_CROP[3] - L_CROP[1]) * IMG.lincolnComposite.height) / ((L_CROP[2] - L_CROP[0]) * IMG.lincolnComposite.width)));
const BORDER = 14;
const OUTER_W = PRINT_W + BORDER * 2;
const OUTER_H = PRINT_H + BORDER * 2;

// Cover: two prints side by side, overlapping by one grid column.
export const COVER = {
  lincoln: { left: 76, top: 300, tilt: -0.8 },
  calhoun: { left: 76 + OUTER_W - 77, top: 300 + 96, tilt: 1.0 },
};
const ALIGNED = { left: 220, top: 330, tilt: -0.8 };

// Window-relative (px) position of a Lincoln-normalised point; both prints share the framing.
const win = (u: number, v: number) => ({
  x: ((u - L_CROP[0]) / (L_CROP[2] - L_CROP[0])) * PRINT_W,
  y: ((v - L_CROP[1]) / (L_CROP[3] - L_CROP[1])) * PRINT_H,
});
const HEAD = region("lincolnComposite", "head");
const NECK = region("lincolnComposite", "neck");
const HEAD_C = win((HEAD[0] + HEAD[2]) / 2, (HEAD[1] + HEAD[3]) / 2);
const NECK_TL = win(NECK[0], NECK[1]);
const NECK_BR = win(NECK[2], NECK[3]);
const blobs = CALHOUN_TO_LINCOLN.differenceBlobs;

const LincolnPrint: React.FC<{ readonly left: number; readonly top: number; readonly tilt: number; readonly lift?: number; readonly children?: React.ReactNode }> = (p) => (
  <PhotoPrint src={IMG.lincolnComposite.file} imgW={IMG.lincolnComposite.width} imgH={IMG.lincolnComposite.height} width={PRINT_W} crop={rectToCrop(L_CROP)} border={BORDER} {...p} />
);
const CalhounPrint: React.FC<{ readonly left: number; readonly top: number; readonly tilt: number; readonly lift?: number; readonly children?: React.ReactNode }> = (p) => (
  <PhotoPrint src={IMG.calhoun1852.file} imgW={IMG.calhoun1852.width} imgH={IMG.calhoun1852.height} width={PRINT_W} crop={rectToCrop(C_CROP)} border={BORDER} {...p} />
);

const optionStyle: React.CSSProperties = { fontFamily: FONTS.serifZh, fontWeight: 900, fontSize: TYPE.subtitleZh, color: COLORS.ink, marginLeft: 18 };

// ---- 0–288: cover, bet, title (one continuous shot) ----------------------------------------
const CoverBetTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const spring = { ...CLAMP, easing: EASE.spring };
  // During the bet the prints rise and shrink so the two options never cover the evidence.
  const group = interpolate(frame, [t(96), t(120)], [0, 1], spring);
  const groupScale = 1 - 0.2 * group;
  const tagIn = (at: number) => interpolate(frame, [t(at) - 10, t(at)], [1, 0], spring);
  const count = frame >= t(176) ? "01" : frame >= t(160) ? "02" : frame >= t(144) ? "03" : "";
  const titleRise = (at: number) => interpolate(frame, [t(at), t(at) + 12], [0, 1], { ...CLAMP, easing: EASE.out });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transformOrigin: `${COVER.lincoln.left}px ${COVER.lincoln.top}px`, scale: groupScale, translate: `0 ${-36 * group}px` }}>
        <LincolnPrint {...COVER.lincoln}>
          <PenMark kind="underline" left={NECK_TL.x - 6} top={NECK_TL.y} width={NECK_BR.x - NECK_TL.x + 12} height={NECK_BR.y - NECK_TL.y} from={t(36)} durationInFrames={12} />
        </LincolnPrint>
        <CalhounPrint {...COVER.calhoun} />
        {/* The "?" tag hides the lender's head. */}
        <ManilaTag left={COVER.calhoun.left + BORDER + HEAD_C.x - 58} top={COVER.calhoun.top + BORDER + HEAD_C.y - 46} height={92} tilt={4} style={{ paddingLeft: 40, paddingRight: 30 }}>
          <MonoText size={TYPE.subtitleZh} color={COLORS.vermilion}>?</MonoText>
        </ManilaTag>
        <SourceCaption text="LIBRARY OF CONGRESS · CA. 1865 / 1852" left={COVER.lincoln.left} top={COVER.calhoun.top + OUTER_H + 24} opacity={1 - group} />
      </AbsoluteFill>
      {/* The bet: two symmetric options, then a quarter-note-triplet countdown. */}
      <ManilaTag left={153 - 600 * tagIn(108)} top={840} height={92} tilt={-1}>
        <MonoText size={TYPE.label}>A</MonoText>
        <span style={optionStyle}>一位废奴派</span>
      </ManilaTag>
      <ManilaTag left={153 - 600 * tagIn(120)} top={950} height={92} tilt={0.6}>
        <MonoText size={TYPE.label}>B</MonoText>
        <span style={optionStyle}>一位蓄奴派</span>
      </ManilaTag>
      {count && frame < t(192) ? (
        <div style={{ position: "absolute", left: 760, top: 900, fontFamily: FONTS.mono, fontWeight: 500, fontSize: TYPE.subtitleZh, letterSpacing: TYPE.monoTracking, color: COLORS.vermilion }}>{count}</div>
      ) : null}
      {/* Title card in the lower half; the question stays visible above it. */}
      {frame >= t(192) ? (
        <>
          <div style={{ position: "absolute", left: 153, top: 1070, opacity: titleRise(192) }}>
            <MonoText size={TYPE.label} color={COLORS.silver}>THREE FAKE LINCOLNS</MonoText>
          </div>
          {["林肯的", "3 张假像"].map((line, i) => (
            <div key={line} style={{ position: "absolute", left: 153, top: 1100 + i * 136, overflow: "hidden", height: 140 }}>
              <div
                style={{
                  fontFamily: FONTS.serifZh,
                  fontWeight: 900,
                  fontSize: TYPE.title,
                  lineHeight: "136px",
                  letterSpacing: TYPE.titleTracking,
                  color: COLORS.printWhite,
                  translate: `0 ${(1 - titleRise(192 + i * 2)) * 40}px`,
                }}
              >
                {line}
              </div>
            </div>
          ))}
          <Seal text="假" left={790} top={1252} size={112} at={t(240)} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// ---- 288–384: answer, alignment, wipe ---------------------------------------------------------
const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const spring = { ...CLAMP, easing: EASE.spring };
  const ease = { ...CLAMP, easing: EASE.inOut };
  // Local frame 0 = 288.
  const back = interpolate(frame, [0, t(24)], [0, 1], spring);
  const align = interpolate(frame, [t(18), t(42)], [0, 1], spring);
  const aligned = frame >= t(42);
  const line = interpolate(frame, [t(42), t(66), t(90)], [0.02, 0.96, (HEAD_C.x / PRINT_W) as number], ease);
  const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
  const lincolnPos = { left: lerp(COVER.lincoln.left, ALIGNED.left, back), top: lerp(COVER.lincoln.top, ALIGNED.top, back), tilt: lerp(COVER.lincoln.tilt, ALIGNED.tilt, back) };
  const calhounPos = { left: lerp(COVER.calhoun.left, ALIGNED.left, align), top: lerp(COVER.calhoun.top, ALIGNED.top, align), tilt: lerp(COVER.calhoun.tilt, ALIGNED.tilt, align) };
  const tagLift = interpolate(frame, [0, t(18)], [0, 1], { ...CLAMP, easing: EASE.inOut });
  const titleOut = interpolate(frame, [0, 12], [0, 1], { ...CLAMP, easing: EASE.inOut });
  const optionsOut = interpolate(frame, [12, 24], [0, 1], { ...CLAMP, easing: EASE.inOut });
  return (
    <AbsoluteFill>
      <LincolnPrint {...lincolnPos}>
        {aligned ? (
          <>
            <AlignedCalhoun revealFromX={line} />
            <div style={{ position: "absolute", left: line * PRINT_W - 1.5, top: 0, width: 3, height: PRINT_H, backgroundColor: COLORS.vermilion }} />
          </>
        ) : null}
      </LincolnPrint>
      {!aligned ? <CalhounPrint {...calhounPos} lift={Math.sin(Math.PI * align) * 0.6} /> : null}
      {/* The "?" tag is lifted off the lender's face. */}
      <ManilaTag
        left={COVER.calhoun.left + BORDER + HEAD_C.x - 58 + 120 * tagLift}
        top={COVER.calhoun.top + BORDER + HEAD_C.y - 46 - 700 * tagLift}
        height={92}
        tilt={4 + 14 * tagLift}
        style={{ paddingLeft: 40, paddingRight: 30 }}
      >
        <MonoText size={TYPE.subtitleZh} color={COLORS.vermilion}>?</MonoText>
      </ManilaTag>
      {/* Answer B is circled, then the bet and title are pulled off the table. */}
      <div style={{ position: "absolute", left: 153 - 700 * optionsOut, top: 840 }}>
        <ManilaTag left={0} top={0} height={92} tilt={-1}>
          <MonoText size={TYPE.label}>A</MonoText>
          <span style={optionStyle}>一位废奴派</span>
        </ManilaTag>
        <ManilaTag left={0} top={110} height={92} tilt={0.6}>
          <MonoText size={TYPE.label}>B</MonoText>
          <span style={optionStyle}>一位蓄奴派</span>
        </ManilaTag>
        <PenMark kind="circle" left={0} top={110} width={330} height={92} from={0} durationInFrames={10} />
      </div>
      <div style={{ position: "absolute", left: 153, top: 1100 + 520 * titleOut, opacity: 1 - titleOut }}>
        <div style={{ fontFamily: FONTS.serifZh, fontWeight: 900, fontSize: TYPE.title, lineHeight: "136px", letterSpacing: TYPE.titleTracking, color: COLORS.printWhite }}>
          林肯的
          <br />3 张假像
        </div>
      </div>
      <Sequence from={t(78)} layout="none">
        <ManilaTag left={ALIGNED.left + 40} top={ALIGNED.top + OUTER_H + 26} height={96} tilt={1.5} style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 6 }}>
          <MonoText size={TYPE.label}>JOHN C. CALHOUN</MonoText>
          <MonoText size={TYPE.label} color={COLORS.silver} style={{ color: "#5b564f" }}>VICE PRESIDENT · 1825–1832</MonoText>
        </ManilaTag>
      </Sequence>
    </AbsoluteFill>
  );
};

// ---- 384–480: the lender ------------------------------------------------------------------------
const Lender: React.FC = () => {
  const t = useTime();
  return (
    <AbsoluteFill>
      <CalhounPrint left={153} top={330} tilt={0.6} />
      <SourceCaption text={IMG.calhoun1852.caption} left={153} top={330 + OUTER_H + 20} />
      <Sequence from={t(48)} layout="none">
        <ManilaTag left={153 + 30} top={330 + OUTER_H + 64} height={64} tilt={-1.5}>
          <MonoText size={TYPE.label}>SENATE · 1837 · “A POSITIVE GOOD”</MonoText>
        </ManilaTag>
      </Sequence>
    </AbsoluteFill>
  );
};

// ---- 480–576: the irony -------------------------------------------------------------------------
const Irony: React.FC = () => {
  const t = useTime();
  const faceBox = { left: HEAD_C.x - 44, top: HEAD_C.y - 52, width: 88, height: 104 };
  return (
    <AbsoluteFill>
      <LincolnPrint {...COVER.lincoln}>
        <PenMark kind="circle" {...faceBox} from={0} durationInFrames={18} seed={3} />
      </LincolnPrint>
      <CalhounPrint {...COVER.calhoun}>
        <PenMark kind="circle" {...faceBox} from={t(24)} durationInFrames={18} seed={9} />
      </CalhounPrint>
      <ManilaTag left={COVER.lincoln.left} top={COVER.lincoln.top - 74} height={56} tilt={-1}>
        <MonoText size={TYPE.label}>EMANCIPATION PROCLAMATION · 1863</MonoText>
      </ManilaTag>
      <Sequence from={t(24)} layout="none">
        <ManilaTag left={COVER.calhoun.left + 60} top={COVER.calhoun.top + OUTER_H + 18} height={56} tilt={1}>
          <MonoText size={TYPE.label}>“A POSITIVE GOOD” · 1837</MonoText>
        </ManilaTag>
      </Sequence>
    </AbsoluteFill>
  );
};

// ---- 576–672: the difference map ----------------------------------------------------------------
const Difference: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const ease = { ...CLAMP, easing: EASE.inOut };
  const head = blobs[0];
  const papers = blobs[1];
  const toWin = (b: readonly number[]) => {
    const a = win(b[0], b[1]);
    const z = win(b[2], b[3]);
    return { left: a.x, top: a.y, width: z.x - a.x, height: z.y - a.y };
  };
  const clip = (b: readonly number[]) => {
    const r = toWin(b);
    return `inset(${r.top}px ${PRINT_W - r.left - r.width}px ${PRINT_H - r.top - r.height}px ${r.left}px)`;
  };
  return (
    <AbsoluteFill>
      <LincolnPrint {...ALIGNED}>
        <div style={{ position: "absolute", inset: 0, clipPath: clip(head) }}>
          <DifferenceOverlay opacity={interpolate(frame, [0, 12], [0, 0.55], ease)} />
        </div>
        <div style={{ position: "absolute", inset: 0, clipPath: clip(papers) }}>
          <DifferenceOverlay opacity={interpolate(frame, [t(24), t(24) + 12], [0, 0.55], ease)} />
        </div>
        <PenMark kind="box" {...toWin(head)} from={0} durationInFrames={18} seed={4} />
        <PenMark kind="box" {...toWin(papers)} from={t(24)} durationInFrames={18} seed={5} />
      </LincolnPrint>
      <div style={{ position: "absolute", left: ALIGNED.left, top: ALIGNED.top + OUTER_H + 24, fontFamily: FONTS.sansZh, fontWeight: 500, fontSize: TYPE.label, color: COLORS.silver }}>
        差异图 · 由两张原件配准计算
      </div>
    </AbsoluteFill>
  );
};

export const BorrowedBody: React.FC = () => {
  const t = useTime();
  return (
    <AbsoluteFill>
      <Breath>
        <Sequence durationInFrames={t(288)} layout="none">
          <CoverBetTitle />
        </Sequence>
        <Sequence from={t(288)} durationInFrames={t(96)} layout="none">
          <Reveal />
        </Sequence>
        <Sequence from={t(384)} durationInFrames={t(96)} layout="none">
          <Lender />
        </Sequence>
        <Sequence from={t(480)} durationInFrames={t(96)} layout="none">
          <Irony />
        </Sequence>
        <Sequence from={t(576)} durationInFrames={t(96)} layout="none">
          <Difference />
        </Sequence>
      </Breath>
    </AbsoluteFill>
  );
};
