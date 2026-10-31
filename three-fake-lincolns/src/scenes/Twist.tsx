import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region } from "../assets";
import { Breath, BREATH_MAX_ZOOM, Dolly } from "../components/Breath";
import { PhotoPrint, rectToCrop, toWindow, usePrint } from "../components/PhotoPrint";
import { ManilaTag, MonoText, PenMark } from "../components/Props";
import { MagicLantern } from "../components/Illustrations";
import { SourceCaption } from "../components/SeriesChrome";
import { useTime } from "../time";
import { CLAMP, COLORS, EASE } from "../theme";

const SLIDE = region("houdiniLincolnGhost", "slide");
// The scan caps the slide's width (1.5x budget); the projector light fills the rest of the frame.
const SLIDE_W = Math.floor(fitWidth("houdiniLincolnGhost", SLIDE, 700, BREATH_MAX_ZOOM));
const SLIDE_H = Math.round((SLIDE_W * ((SLIDE[3] - SLIDE[1]) * IMG.houdiniLincolnGhost.height)) / ((SLIDE[2] - SLIDE[0]) * IMG.houdiniLincolnGhost.width));
const LEFT = Math.round(540 - SLIDE_W / 2 - 30);
const TOP = 390;

// As the lamp settles, a tag names the man in the slide (F13, F20), so the next line's "胡迪尼" lands.
const HoudiniTag: React.FC<{ readonly from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const g = usePrint();
  const p = interpolate(frame, [from - 10, from], [0, 1], { ...CLAMP, easing: EASE.out });
  if (frame < from - 10) return null;
  const at = toWindow(g, 0.08, 0.84);
  return (
    <ManilaTag left={at.x} top={at.y - (1 - p) * 40} height={52} tilt={-1.5} style={{ opacity: p }}>
      <MonoText>HARRY HOUDINI</MonoText>
    </ManilaTag>
  );
};

const GhostHeadMark: React.FC<{ readonly from: number }> = ({ from }) => {
  const g = usePrint();
  const r = region("houdiniLincolnGhost", "ghostHead");
  const a = toWindow(g, r[0], r[1]);
  const b = toWindow(g, r[2], r[3]);
  return <PenMark kind="circle" left={a.x} top={a.y} width={b.x - a.x} height={b.y - a.y} from={from} durationInFrames={20} seed={13} />;
};

// 1920: the one heavy punch. A projector viewfinder opens onto Houdini's own fake, in the scan's
// original colour (the only colour moment in the film).
export const Twist: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const open = interpolate(frame, [0, 20], [0, 1], { ...CLAMP, easing: EASE.inOut });
  const restore = interpolate(frame, [0, 18], [0, 1], { ...CLAMP, easing: EASE.out });
  // The lamp hits full on the punch (1920–1944), then settles back by 1968.
  const lamp = interpolate(frame, [0, t(24), t(48)], [0.88, 0.8, 0.2], { ...CLAMP, easing: EASE.inOut });
  const cx = LEFT + SLIDE_W / 2;
  const cy = TOP + SLIDE_H / 2;
  const w = 60 + (SLIDE_W + 80 - 60) * open;
  const h = 44 + (SLIDE_H + 80 - 44) * open;
  // The light reaches past the viewfinder: wide while the lamp is hot, a narrow rim once it settles.
  const throwX = Math.min(1080 - (SLIDE_W + 80), 260) * open * Math.min(1, lamp / 0.8);
  const throwY = 260 * open * Math.min(1, lamp / 0.8);
  return (
    <AbsoluteFill>
      <Breath phase={t(1920)} originX={cx} originY={cy}>
        <Dolly from={0.97} start={20} end={96} originX={cx} originY={cy}>
        {/* Flat projector light (no glow): a warm field that throws well past the slide on the punch. */}
        <div
          style={{
            position: "absolute",
            left: cx - (w + throwX) / 2,
            top: cy - (h + throwY) / 2,
            width: w + throwX,
            height: h + throwY,
            backgroundColor: COLORS.printWhite,
            opacity: lamp,
          }}
        />
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(${cy - h / 2}px ${1080 - (cx + w / 2)}px ${1920 - (cy + h / 2)}px ${cx - w / 2}px)` }}>
          <PhotoPrint
            src={IMG.houdiniLincolnGhost.file}
            imgW={IMG.houdiniLincolnGhost.width}
            imgH={IMG.houdiniLincolnGhost.height}
            width={SLIDE_W}
            crop={rectToCrop(SLIDE)}
            left={LEFT}
            top={TOP}
            border={0}
            colorRestore={restore}
            style={{ backgroundColor: COLORS.ink, boxShadow: "none" }}
          >
            <HoudiniTag from={t(24)} />
            <GhostHeadMark from={t(48)} />
          </PhotoPrint>
        </div>
        <MagicLantern from={t(28)} target={{ left: LEFT + 40, right: LEFT + SLIDE_W - 40, y: TOP + SLIDE_H + 30 }} />
        <SourceCaption text={IMG.houdiniLincolnGhost.caption} left={950} top={TOP + SLIDE_H + 94} opacity={open} />
        </Dolly>
      </Breath>
    </AbsoluteFill>
  );
};
