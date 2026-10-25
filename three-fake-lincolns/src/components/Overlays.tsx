import React from "react";
import { CanvasImage, Img, staticFile, useCurrentFrame } from "remotion";
import { CALHOUN_TO_LINCOLN, IMG } from "../assets";
import { photoGrade } from "../grade";
import { usePrint } from "./PhotoPrint";

// Inside a Lincoln-composite <PhotoPrint>: the 1852 Calhoun print laid exactly on top using the
// measured registration. `revealFromX` (0..1 of the window width) clips it so the Lincoln print
// shows to the left of a wipe line.
export const AlignedCalhoun: React.FC<{ readonly revealFromX: number; readonly develop?: number }> = ({ revealFromX, develop = 1 }) => {
  const frame = useCurrentFrame();
  const g = usePrint();
  const C = IMG.calhoun1852;
  const { tx, ty, scale, rotationDeg } = CALHOUN_TO_LINCOLN;
  const left = (tx - g.crop.x0 * g.imgW) * g.scale;
  const top = (ty - g.crop.y0 * g.imgH) * g.scale;
  const windowW = (g.crop.x1 - g.crop.x0) * g.imgW * g.scale;
  const clipLeft = Math.max(0, revealFromX * windowW - left);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left,
          top,
          width: C.width * scale * g.scale,
          height: C.height * scale * g.scale,
          rotate: `${rotationDeg}deg`,
          transformOrigin: "0 0",
          clipPath: `inset(0 0 0 ${clipLeft}px)`,
        }}
      >
        <CanvasImage
          src={staticFile(C.file)}
          width={Math.round(C.width * scale * g.scale)}
          height={Math.round(C.height * scale * g.scale)}
          fit="fill"
          effects={photoGrade({ frame, develop })}
        />
      </div>
    </div>
  );
};

// Inside a Lincoln-composite <PhotoPrint>: where the two plates differ (computed mask).
export const DifferenceOverlay: React.FC<{ readonly opacity: number }> = ({ opacity }) => {
  const g = usePrint();
  return (
    <Img
      src={staticFile(CALHOUN_TO_LINCOLN.differenceMask)}
      style={{
        position: "absolute",
        left: -g.crop.x0 * g.imgW * g.scale,
        top: -g.crop.y0 * g.imgH * g.scale,
        width: g.imgW * g.scale,
        height: g.imgH * g.scale,
        opacity,
        mixBlendMode: "screen",
      }}
    />
  );
};
