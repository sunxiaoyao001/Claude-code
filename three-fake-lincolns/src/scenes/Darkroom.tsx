import React from "react";
import { AbsoluteFill, CanvasImage, interpolate, staticFile, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region } from "../assets";
import { Breath, BREATH_MAX_ZOOM, Dolly } from "../components/Breath";
import { CameraDiagram } from "../components/Illustrations";
import { PhotoPrint, rectToCrop, usePrint } from "../components/PhotoPrint";
import { IllustrativeMark, SourceCaption } from "../components/SeriesChrome";
import { photoGrade } from "../grade";
import { useTime } from "../time";
import { SCENES } from "../timeline";
import { CLAMP, COLORS, EASE, SAFE } from "../theme";

// Scene-local frames: 0 = 1392. A schematic of double exposure with an unrelated, anonymous sitter
// (The Met, CC0). It shows the general technique only, not how Mumler worked (F11).
const BASE = SCENES.darkroom.from;
// Top band: a line drawing of the wet-plate camera and the two exposures. Below it, the plate itself.
const PORTRAIT = region("metSitter", "bust");
const PLATE_W = Math.floor(fitWidth("metSitter", PORTRAIT, 400, BREATH_MAX_ZOOM));
const PLATE_H = Math.round((PLATE_W * (PORTRAIT[3] - PORTRAIT[1]) * IMG.metSitter.height) / ((PORTRAIT[2] - PORTRAIT[0]) * IMG.metSitter.width));
const FRAME = 26; // plate holder rails
const HOLDER_W = PLATE_W + FRAME * 2;
const HOLDER_H = PLATE_H + FRAME * 2;
const TABLE_W = HOLDER_W + 180;
const TABLE_H = HOLDER_H + 130;
const TABLE_LEFT = Math.round((SAFE.margin + SAFE.right) / 2 - TABLE_W / 2);
const TABLE_TOP = 590;
const HOLDER_LEFT = TABLE_LEFT + (TABLE_W - HOLDER_W) / 2;
const HOLDER_TOP = TABLE_TOP + (TABLE_H - HOLDER_H) / 2;

// Exposure times inside the scene (base frames from the scene start): 1416 and 1488.
const EXPOSURE_1 = 24;
const EXPOSURE_2 = 96;

// The second exposure: the same sitter, shifted and fainter, feathered so only the figure shows.
const SecondExposure: React.FC<{ readonly amount: number }> = ({ amount }) => {
  const frame = useCurrentFrame();
  const g = usePrint();
  const w = Math.round(g.imgW * g.scale);
  const h = Math.round(g.imgH * g.scale);
  const dx = -0.26 * PLATE_W;
  const dy = -0.09 * PLATE_H;
  return (
    <div
      style={{
        position: "absolute",
        left: -g.crop.x0 * g.imgW * g.scale + dx,
        top: -g.crop.y0 * g.imgH * g.scale + dy,
        width: w,
        height: h,
        opacity: 0.3 * amount,
        filter: "blur(1.5px)",
        maskImage: "radial-gradient(ellipse 22% 34% at 53% 42%, black 55%, transparent 100%)",
      }}
    >
      <CanvasImage src={staticFile(g.src)} width={w} height={h} fit="fill" effects={photoGrade({ frame })} />
    </div>
  );
};

export const Darkroom: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const inP = interpolate(frame, [0, t(12)], [0, 1], { ...CLAMP, easing: EASE.spring });
  // The dark slide is drawn out of the holder before the first exposure.
  const slide = interpolate(frame, [t(8), t(22)], [0, 1], { ...CLAMP, easing: EASE.inOut });
  // Each shutter lands on its beat: the latent image comes up, then the faint "ghost".
  const develop = interpolate(frame, [t(EXPOSURE_1), t(EXPOSURE_1) + 18], [0, 1], { ...CLAMP, easing: EASE.out });
  const ghost = interpolate(frame, [t(EXPOSURE_2), t(EXPOSURE_2) + 14], [0, 1], { ...CLAMP, easing: EASE.out });
  // Each shutter release is one flash of exposure light across the plate (a single event per click).
  const flash = Math.max(
    ...[EXPOSURE_1, EXPOSURE_2].map((e) => interpolate(frame, [t(e) - 1, t(e) + 1, t(e) + 10], [0, 0.6, 0], { ...CLAMP, easing: EASE.out })),
  );
  // The loaded holder is pushed in from the right (never through the subtitle band).
  const rise = (1 - inP) * 900;
  return (
    <AbsoluteFill>
      <Breath phase={t(BASE)}>
        <Dolly from={0.94} end={192} originX={TABLE_LEFT + TABLE_W / 2} originY={TABLE_TOP + TABLE_H / 2}>
        <CameraDiagram drawFrom={2} exp1={t(EXPOSURE_1)} exp2={t(EXPOSURE_2)} />
        {/* Viewing table: a flat field of warm light, no glow. */}
        <div style={{ position: "absolute", left: TABLE_LEFT, top: TABLE_TOP, width: TABLE_W, height: TABLE_H, backgroundColor: COLORS.printWhite, opacity: 0.16 }} />
        <div style={{ position: "absolute", left: rise, top: 0, width: 1080, height: 1920 }}>
          <div
            style={{
              position: "absolute",
              left: HOLDER_LEFT,
              top: HOLDER_TOP,
              width: HOLDER_W,
              height: HOLDER_H,
              backgroundColor: COLORS.ink,
              boxShadow: "inset 0 0 0 2px rgba(142,138,132,0.25), 0 18px 40px rgba(0,0,0,0.55)",
            }}
          />
          <PhotoPrint
            src={IMG.metSitter.file}
            imgW={IMG.metSitter.width}
            imgH={IMG.metSitter.height}
            width={PLATE_W}
            crop={rectToCrop(PORTRAIT)}
            left={HOLDER_LEFT + FRAME}
            top={HOLDER_TOP + FRAME}
            border={0}
            develop={develop}
            style={{ boxShadow: "none" }}
            layers={
              <>
                <SecondExposure amount={ghost} />
                <div style={{ position: "absolute", inset: 0, backgroundColor: COLORS.printWhite, opacity: flash }} />
              </>
            }
          />
          {/* Dark slide, pulled straight up out of the holder. */}
          <div
            style={{
              position: "absolute",
              left: HOLDER_LEFT + FRAME - 6,
              top: HOLDER_TOP + FRAME - 6 - slide * (HOLDER_H + 700),
              width: PLATE_W + 12,
              height: PLATE_H + 12,
              backgroundColor: COLORS.ink,
              boxShadow: "inset 0 0 0 2px rgba(142,138,132,0.25)",
            }}
          >
            <div style={{ position: "absolute", left: "50%", top: 14, width: 120, height: 10, marginLeft: -60, borderRadius: 5, backgroundColor: COLORS.darkPaper }} />
          </div>
        </div>
        <SourceCaption text="THE MET 287722 · CC0 · SITTER UNRELATED" left={SAFE.margin} top={236} />
        </Dolly>
      </Breath>
      <IllustrativeMark />
    </AbsoluteFill>
  );
};
