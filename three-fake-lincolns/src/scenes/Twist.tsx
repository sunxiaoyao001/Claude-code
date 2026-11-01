import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region } from "../assets";
import { Breath, BREATH_MAX_ZOOM, Dolly } from "../components/Breath";
import { PhotoPrint, rectToCrop, toWindow, usePrint } from "../components/PhotoPrint";
import { ManilaTag, MonoText, PenMark } from "../components/Props";
import { MagicLantern } from "../components/Illustrations";
import { EMPTY_SLOT } from "./Question";
import { SourceCaption } from "../components/SeriesChrome";
import { useTime } from "../time";
import { CLAMP, COLORS, EASE } from "../theme";
import { Proscenium } from "../components/Engravings";

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
  const p = interpolate(frame, [from - 10, from], [0, 1], { ...CLAMP, easing: EASE.land });
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
  // The punch is the very first frame: a hard cut to the whole projection, lamp at full and the
  // colour cut in (the frame before is black and white, after half a second of silence). No growing
  // window: its lit corner read as a glitch on the first two frames.
  const open = 1;
  const restore = 1;
  const lamp = interpolate(frame, [0, t(24), t(48)], [1, 0.85, 0.22], { ...CLAMP, easing: EASE.inOut });
  const cx = LEFT + SLIDE_W / 2;
  const cy = TOP + SLIDE_H / 2;
  const lerp = (a: number, b: number) => a + (b - a) * open;
  const winL = lerp(EMPTY_SLOT.left, LEFT - 40);
  const winT = lerp(EMPTY_SLOT.top, TOP - 40);
  const winR = lerp(EMPTY_SLOT.left + EMPTY_SLOT.width, LEFT + SLIDE_W + 40);
  const winB = lerp(EMPTY_SLOT.top + EMPTY_SLOT.height, TOP + SLIDE_H + 40);
  // No glow: the light is the projected rectangle itself. The screen margin around the slide is lit
  // at full on 1920 and settles to a dim rim; a faint wedge of beam runs back to the lantern's lens.
  const lens = { x: 330, y: 1062 };
  // The beam appears with the lantern that casts it (drawn from 1948), never before its source.
  const beam = interpolate(frame, [t(28), t(40)], [0, 1], { ...CLAMP, easing: EASE.inOut });
  return (
    <AbsoluteFill>
      <Breath phase={t(1920)} originX={cx} originY={cy}>
        <Dolly from={0.97} start={20} end={96} originX={cx} originY={cy}>
        {/* The beam: a soft cone that is brightest at the lens and thins out toward the screen, its
            edges feathered (light through air, not a flat grey card). */}
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <linearGradient id="beam" gradientUnits="userSpaceOnUse" x1={lens.x} y1={lens.y} x2={(winL + winR) / 2} y2={(winT + winB) / 2}>
              <stop offset="0" stopColor={COLORS.printWhite} stopOpacity={(0.16 + 0.12 * lamp) * beam} />
              <stop offset="1" stopColor={COLORS.printWhite} stopOpacity={(0.02 + 0.03 * lamp) * beam} />
            </linearGradient>
            <filter id="beamSoft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>
          <polygon points={`${lens.x},${lens.y - 16} ${winL},${winT} ${winR},${winT} ${winR},${winB} ${lens.x},${lens.y + 16}`} fill="url(#beam)" filter="url(#beamSoft)" />
        </svg>
        <div style={{ position: "absolute", left: winL, top: winT, width: winR - winL, height: winB - winT, backgroundColor: COLORS.printWhite, opacity: 0.12 + 0.88 * lamp }} />
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(${winT}px ${1080 - winR}px ${1920 - winB}px ${winL}px)` }}>
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
        <MagicLantern from={t(28)} target={{ left: LEFT - 40, top: TOP - 40, right: LEFT + SLIDE_W + 40, bottom: TOP + SLIDE_H + 40 }} />
        {/* A magician's stage around the projection: valance and curtains drawn back. */}
        <Proscenium left={LEFT - 40} top={TOP - 70} right={LEFT + SLIDE_W + 40} bottom={TOP + SLIDE_H - 40} from={t(4)} />
        {/* The caption sits on the dark table under the projected image, out of the light and the stage. */}
        <SourceCaption text={IMG.houdiniLincolnGhost.caption} left={950} top={TOP + SLIDE_H + 56} opacity={open} />
        </Dolly>
      </Breath>
    </AbsoluteFill>
  );
};
