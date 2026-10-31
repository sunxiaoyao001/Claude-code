import { measureText } from "@remotion/layout-utils";
import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { CALHOUN_TO_LINCOLN, fitWidth, IMG, lincolnRectToCalhoun, region } from "../assets";
import { Breath, Dolly } from "../components/Breath";
import { EngravedFrame } from "../components/Illustrations";
import { Drawing, Ink } from "../components/LineArt";
import { AlignedCalhoun, DifferenceOverlay } from "../components/Overlays";
import { PhotoPrint, rectToCrop } from "../components/PhotoPrint";
import { ManilaTag, MonoText, PenMark, Seal } from "../components/Props";
import { SourceCaption } from "../components/SeriesChrome";
import { useTime } from "../time";
import { arc, CLAMP, COLORS, EASE, FONTS, SAFE, swing, TYPE } from "../theme";

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
// The cover's camera: frame 0 (and the loop's last frame) sits slightly wide, centred on both prints.
export const COVER_SCALE = 0.96;
export const COVER_ORIGIN = { x: 460, y: 628 } as const;

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

type PrintPlacement = {
  readonly left: number;
  readonly top: number;
  readonly tilt: number;
  readonly lift?: number;
  readonly sheenAt?: number;
  readonly layers?: React.ReactNode;
  readonly children?: React.ReactNode;
};
const LincolnPrint: React.FC<PrintPlacement> = (p) => (
  <PhotoPrint src={IMG.lincolnComposite.file} imgW={IMG.lincolnComposite.width} imgH={IMG.lincolnComposite.height} width={PRINT_W} crop={rectToCrop(L_CROP)} border={BORDER} {...p} />
);
const CalhounPrint: React.FC<PrintPlacement> = (p) => (
  <PhotoPrint src={IMG.calhoun1852.file} imgW={IMG.calhoun1852.width} imgH={IMG.calhoun1852.height} width={PRINT_W} crop={rectToCrop(C_CROP)} border={BORDER} {...p} />
);

// The "?" tag sways a little from frame 0 (period 3.2 s divides the 89.6 s cut, so the loop is seamless).
const useTagSway = (phase: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return 1.6 * (2 * swing((frame + phase) / fps, 3.2) - 1);
};

// The cover: both prints, the lender's head under a "?" tag. Also the loop's last shot (Outro).
export const CoverPrints: React.FC<{
  readonly phase?: number;
  readonly captionOpacity?: number;
  readonly lincolnMarks?: React.ReactNode;
  readonly sheenAt?: number;
  readonly matches?: React.ReactNode;
}> = ({ phase = 0, captionOpacity = 1, lincolnMarks, sheenAt, matches }) => {
  const sway = useTagSway(phase);
  return (
    <>
      <LincolnPrint {...COVER.lincoln} sheenAt={sheenAt}>
        {lincolnMarks}
      </LincolnPrint>
      <CalhounPrint {...COVER.calhoun} sheenAt={sheenAt === undefined ? undefined : sheenAt + 8} />
      <ManilaTag
        left={COVER.calhoun.left + BORDER + HEAD_C.x - 58}
        top={COVER.calhoun.top + BORDER + HEAD_C.y - 46}
        height={92}
        tilt={4 + sway}
        style={{ paddingLeft: 40, paddingRight: 30, transformOrigin: "20px 50%" }}
      >
        <MonoText size={TYPE.subtitleZh} color={COLORS.vermilion}>?</MonoText>
      </ManilaTag>
      {matches}
      <SourceCaption text="LIBRARY OF CONGRESS · CA. 1865 / 1852" left={COVER.lincoln.left} top={COVER.calhoun.top + OUTER_H + 24} opacity={captionOpacity} />
    </>
  );
};

// The same three features on both prints (Lincoln-normalised coordinates; the Calhoun print shows
// the registered region, so the same window position is the same feature): hand on the table,
// the globe, the left foot.
const MATCHES = [
  { u: 0.645, v: 0.545 },
  { u: 0.215, v: 0.64 },
  { u: 0.51, v: 0.78 },
] as const;
const dot = (x: number, y: number, r = 7) => `M ${x - r} ${y} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;

const MatchLines: React.FC<{ readonly from: number; readonly out: number }> = ({ from, out }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [out, out + 10], [1, 0], { ...CLAMP, easing: EASE.inOut });
  if (fade <= 0) return null;
  return (
    <Drawing opacity={fade}>
      {MATCHES.map((m, i) => {
        const w = win(m.u, m.v);
        const a = { x: COVER.lincoln.left + BORDER + w.x, y: COVER.lincoln.top + BORDER + w.y };
        const b = { x: COVER.calhoun.left + BORDER + w.x, y: COVER.calhoun.top + BORDER + w.y };
        const at = from + i * 12;
        return (
          <React.Fragment key={i}>
            <Ink d={dot(a.x, a.y)} from={at} duration={6} color={COLORS.vermilion} width={2.5} opacity={1} />
            <Ink d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} from={at + 3} duration={9} color={COLORS.vermilion} width={2} dash="7 6" opacity={0.95} />
            <Ink d={dot(b.x, b.y)} from={at + 10} duration={6} color={COLORS.vermilion} width={2.5} opacity={1} />
          </React.Fragment>
        );
      })}
    </Drawing>
  );
};

// A pair of scissors (line art) cutting along a dashed line at the neck.
const scissors = (x: number, y: number) =>
  [dot(x - 28, y - 9, 7), dot(x - 28, y + 9, 7), `M ${x - 21} ${y - 6} L ${x + 20} ${y + 3}`, `M ${x - 21} ${y + 6} L ${x + 20} ${y - 3}`].join(" ");
const CutLine: React.FC<{ readonly left: number; readonly top: number; readonly from: number }> = ({ left, top, from }) => {
  const y = top + BORDER + (NECK_TL.y + NECK_BR.y) / 2;
  const x0 = left - 6;
  const x1 = left + OUTER_W + 10;
  return (
    <Drawing>
      <Ink d={scissors(x0, y)} from={from} duration={8} width={2} opacity={0.9} />
      <Ink d={`M ${x0 + 24} ${y} H ${x1}`} from={from + 4} duration={12} color={COLORS.vermilion} width={2} dash="9 7" opacity={0.95} />
    </Drawing>
  );
};

const optionStyle: React.CSSProperties = { fontFamily: FONTS.sansZh, fontWeight: 700, fontSize: TYPE.subtitleZh, color: COLORS.ink, marginLeft: 18 };

// ---- 0–288: cover, bet, title (one continuous shot) ----------------------------------------
const CoverBetTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const spring = { ...CLAMP, easing: EASE.spring };
  // During the bet the prints rise and shrink so the two options never cover the evidence.
  const group = interpolate(frame, [t(96), t(120)], [0, 1], spring);
  const groupScale = 1 - 0.2 * group;
  const tagIn = (at: number) => interpolate(frame, [t(at) - 10, t(at)], [1, 0], { ...CLAMP, easing: EASE.land });
  const count = frame >= t(176) ? "01" : frame >= t(160) ? "02" : frame >= t(144) ? "03" : "";
  const titleRise = (at: number) => interpolate(frame, [t(at), t(at) + 12], [0, 1], { ...CLAMP, easing: EASE.out });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transformOrigin: `${COVER.lincoln.left}px ${COVER.lincoln.top}px`, scale: groupScale, translate: `0 ${-36 * group}px` }}>
        <CoverPrints
          sheenAt={t(4)}
          matches={<MatchLines from={t(24)} out={t(84)} />}
          captionOpacity={1 - group}
          lincolnMarks={
            // The seam: one stroke across the neck, reaching half a neck-width past it on each side.
            <PenMark
              kind="underline"
              left={NECK_TL.x - (NECK_BR.x - NECK_TL.x) / 2}
              top={NECK_TL.y}
              width={(NECK_BR.x - NECK_TL.x) * 2}
              height={NECK_BR.y - NECK_TL.y}
              from={t(3)}
              durationInFrames={12}
            />
          }
        />
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
        // The countdown at title size, beside the two options, so it reads as a countdown on a phone.
        <div style={{ position: "absolute", left: 700, top: 868, fontFamily: FONTS.mono, fontWeight: 500, fontSize: TYPE.title, lineHeight: 1, letterSpacing: "0.02em", color: COLORS.vermilion }}>{count}</div>
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
          {/* An engraved double-rule frame draws itself around the title, corners last. */}
          <EngravedFrame from={t(192)} x={120} y={1052} w={810} h={360} />
          <Seal text="假" left={790} top={1252} size={112} at={t(240)} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// Registration marks that lock onto the four corners when the two prints snap into alignment,
// with hairlines drawn out through them (scene-local frame `at`).
const RegistrationLock: React.FC<{ readonly at: number; readonly left: number; readonly top: number; readonly width: number; readonly height: number }> = ({
  at,
  left,
  top,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const lock = interpolate(frame, [at, at + 10], [0, 1], { ...CLAMP, easing: EASE.out });
  const rule = interpolate(frame, [at, at + 14], [0, 1], { ...CLAMP, easing: EASE.inOut });
  const settle = interpolate(frame, [at + 18, at + 36], [1, 0.35], { ...CLAMP, easing: EASE.inOut });
  const corners = [
    [left, top],
    [left + width, top],
    [left, top + height],
    [left + width, top + height],
  ] as const;
  return (
    <>
      {/* Hairlines through the corners, drawn outward from the print. */}
      {[top, top + height].map((y) => (
        <div key={`h${y}`} style={{ position: "absolute", left: left - 60 * rule, width: width + 120 * rule, top: y, height: 1, backgroundColor: COLORS.silver, opacity: 0.45 * settle }} />
      ))}
      {[left, left + width].map((x) => (
        <div key={`v${x}`} style={{ position: "absolute", top: top - 60 * rule, height: height + 120 * rule, left: x, width: 1, backgroundColor: COLORS.silver, opacity: 0.45 * settle }} />
      ))}
      {corners.map(([x, y]) => (
        <div key={`${x}-${y}`} style={{ position: "absolute", left: x - 20, top: y - 20, width: 40, height: 40, scale: 1.7 - 0.7 * lock, rotate: `${45 * (1 - lock)}deg`, opacity: lock * (0.4 + 0.6 * settle) }}>
          <div style={{ position: "absolute", left: 19, top: 0, width: 2, height: 40, backgroundColor: COLORS.vermilion }} />
          <div style={{ position: "absolute", left: 0, top: 19, width: 40, height: 2, backgroundColor: COLORS.vermilion }} />
          <div style={{ position: "absolute", left: 11, top: 11, width: 18, height: 18, border: `2px solid ${COLORS.vermilion}`, borderRadius: "50%", boxSizing: "border-box" }} />
        </div>
      ))}
    </>
  );
};

// ---- 288–384: answer, alignment, wipe ---------------------------------------------------------
const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const spring = { ...CLAMP, easing: EASE.spring };
  // Local frame 0 = 288.
  const back = interpolate(frame, [0, t(24)], [0, 1], spring);
  const align = interpolate(frame, [t(18), t(42)], [0, 1], spring);
  const aligned = frame >= t(42);
  // Blink comparator: the registered prints swap with a hard cut every eighth note. Only the head
  // and the papers jump; everything else stays still, which reads even at phone size.
  const swaps = [54, 66, 78, 90].filter((f) => frame >= t(f)).length;
  const showCalhoun = aligned && swaps % 2 === 0;
  const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
  const lincolnPos = { left: lerp(COVER.lincoln.left, ALIGNED.left, back), top: lerp(COVER.lincoln.top, ALIGNED.top, back), tilt: lerp(COVER.lincoln.tilt, ALIGNED.tilt, back) };
  const calhounPos = { left: lerp(COVER.calhoun.left, ALIGNED.left, align), top: lerp(COVER.calhoun.top, ALIGNED.top, align), tilt: lerp(COVER.calhoun.tilt, ALIGNED.tilt, align) };
  const tagLift = interpolate(frame, [0, t(18)], [0, 1], { ...CLAMP, easing: EASE.inOut });
  const optionsOut = interpolate(frame, [12, 24], [0, 1], { ...CLAMP, easing: EASE.inOut });
  return (
    <AbsoluteFill>
      <LincolnPrint {...lincolnPos} layers={showCalhoun ? <AlignedCalhoun revealFromX={0} /> : null} sheenAt={t(42)} />
      <RegistrationLock at={t(42)} left={ALIGNED.left} top={ALIGNED.top} width={OUTER_W} height={OUTER_H} />
      {aligned ? (
        <div style={{ position: "absolute", left: ALIGNED.left + OUTER_W + 18, top: ALIGNED.top + 40, display: "flex", flexDirection: "column", gap: 10 }}>
          <MonoText color={showCalhoun ? COLORS.silver : COLORS.printWhite} style={{ opacity: showCalhoun ? 0.5 : 1 }}>CA. 1865</MonoText>
          <MonoText color={showCalhoun ? COLORS.printWhite : COLORS.silver} style={{ opacity: showCalhoun ? 1 : 0.5 }}>1852</MonoText>
        </div>
      ) : null}
      {!aligned ? <CalhounPrint {...calhounPos} lift={arc(align) * 0.6} /> : null}
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
      {/* The lender's tag lands only once the blink comparator has stopped on his print (378), so it
          never hangs under Lincoln's face. */}
      <Sequence from={t(90)} layout="none">
        <ManilaTag left={ALIGNED.left - 60} top={ALIGNED.top + OUTER_H + 26} height={124} tilt={1.5} style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 6 }}>
          <MonoText size={TYPE.subtitleEn}>JOHN C. CALHOUN</MonoText>
          <MonoText size={TYPE.subtitleEn} style={{ opacity: 0.7 }}>VICE PRESIDENT · 1825–1832</MonoText>
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
      <CalhounPrint left={153} top={330} tilt={0.6} sheenAt={t(6)} />
      <SourceCaption text={IMG.calhoun1852.caption} left={153} top={330 + OUTER_H + 20} />
      <Sequence from={t(48)} layout="none">
        <ManilaTag left={153 + 30} top={330 + OUTER_H + 64} height={124} tilt={-1.5} style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 6 }}>
          <MonoText size={TYPE.subtitleEn}>SENATE · 1837</MonoText>
          <MonoText size={TYPE.subtitleEn}>“A POSITIVE GOOD”</MonoText>
        </ManilaTag>
      </Sequence>
    </AbsoluteFill>
  );
};

// A context note in vermilion pencil at the English-subtitle size (it carries the irony, so it must
// read on a phone). It never runs into the right-hand UI band.
const PencilNote: React.FC<{ readonly text: string; readonly left: number; readonly top: number; readonly from: number; readonly tilt: number }> = ({ text, left, top, from, tilt }) => {
  const frame = useCurrentFrame();
  if (frame < from) return null;
  const { width } = measureText({ text: text.toUpperCase(), fontFamily: FONTS.mono, fontSize: TYPE.subtitleEn, letterSpacing: TYPE.monoTracking, fontWeight: "500" });
  const x = Math.min(left, SAFE.right - width);
  return (
    <div style={{ position: "absolute", left: x, top, rotate: `${tilt}deg` }}>
      <MonoText size={TYPE.subtitleEn} color={COLORS.vermilion} style={{ fontWeight: 500 }}>
        {text}
      </MonoText>
      <PenMark kind="underline" left={0} top={0} width={Math.round(width)} height={48} from={from + 4} durationInFrames={10} seed={17} />
    </div>
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
      {/* Where the head was cut and the body kept: a dashed cut line across each neck. */}
      <CutLine left={COVER.lincoln.left} top={COVER.lincoln.top} from={t(48)} />
      <CutLine left={COVER.calhoun.left} top={COVER.calhoun.top} from={t(60)} />
      {/* Context notes in vermilion pencil, so they never read as the prints' own dates. */}
      <PencilNote text="EMANCIPATION PROCLAMATION · 1863" left={COVER.lincoln.left + 6} top={COVER.lincoln.top - 68} from={0} tilt={-1.2} />
      <PencilNote text="“A POSITIVE GOOD” · 1837" left={COVER.calhoun.left + 40} top={COVER.calhoun.top + OUTER_H + 22} from={t(24)} tilt={1} />
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
  // The comparison is computed top to bottom: a scan line crosses the print and the difference map
  // is left behind it. Each region is boxed as the line clears it (head ≈ 588, papers ≈ 600).
  const scan = interpolate(frame, [0, t(30)], [0, 1], ease);
  const scanY = scan * PRINT_H;
  const behind = `inset(0 0 ${PRINT_H - scanY}px 0)`;
  return (
    <AbsoluteFill>
      <LincolnPrint {...ALIGNED}>
        <div style={{ position: "absolute", inset: 0, clipPath: behind }}>
          <div style={{ position: "absolute", inset: 0, clipPath: clip(head) }}>
            <DifferenceOverlay opacity={0.55} />
          </div>
          <div style={{ position: "absolute", inset: 0, clipPath: clip(papers) }}>
            <DifferenceOverlay opacity={0.55} />
          </div>
        </div>
        {scan > 0 && scan < 1 ? (
          <>
            <div style={{ position: "absolute", left: -BORDER - 18, width: PRINT_W + 2 * BORDER + 36, top: scanY - 1, height: 2, backgroundColor: COLORS.printWhite, opacity: 0.85 }} />
            <div style={{ position: "absolute", left: -BORDER - 18, width: PRINT_W + 2 * BORDER + 36, top: scanY + 2, height: 1, backgroundColor: COLORS.vermilion }} />
          </>
        ) : null}
        <PenMark kind="box" {...toWin(head)} from={t(12)} durationInFrames={14} seed={4} />
        <PenMark kind="box" {...toWin(papers)} from={t(24)} durationInFrames={14} seed={5} />
      </LincolnPrint>
      <div style={{ position: "absolute", left: ALIGNED.left, top: ALIGNED.top + OUTER_H + 24, fontFamily: FONTS.sansZh, fontWeight: 500, fontSize: TYPE.label, color: COLORS.silver }}>
        差异图 · 由两张馆藏扫描件配准计算
      </div>
    </AbsoluteFill>
  );
};

export const BorrowedBody: React.FC = () => {
  const t = useTime();
  return (
    <AbsoluteFill>
      <Breath>
        {/* The cover starts wide (frame 0 = the loop's last frame) and settles in over the first bar. */}
        <Sequence durationInFrames={t(288)} layout="none">
          <Dolly from={COVER_SCALE} end={96} originX={COVER_ORIGIN.x} originY={COVER_ORIGIN.y}>
            <CoverBetTitle />
          </Dolly>
        </Sequence>
        <Sequence from={t(288)} durationInFrames={t(96)} layout="none">
          <Dolly from={0.97} end={42} originX={ALIGNED.left + OUTER_W / 2} originY={ALIGNED.top + OUTER_H / 2}>
            <Reveal />
          </Dolly>
        </Sequence>
        <Sequence from={t(384)} durationInFrames={t(96)} layout="none">
          <Dolly from={0.93} end={96} originX={153 + BORDER + HEAD_C.x} originY={330 + BORDER + HEAD_C.y}>
            <Lender />
          </Dolly>
        </Sequence>
        <Sequence from={t(480)} durationInFrames={t(96)} layout="none">
          <Dolly from={0.97} to={0.97} end={96} originX={460} originY={628} panX={[24, -24]}>
            <Irony />
          </Dolly>
        </Sequence>
        <Sequence from={t(576)} layout="none">
          <Dolly from={0.95} end={96} originX={ALIGNED.left + OUTER_W / 2} originY={ALIGNED.top + OUTER_H / 2}>
            <Difference />
          </Dolly>
        </Sequence>
      </Breath>
    </AbsoluteFill>
  );
};
