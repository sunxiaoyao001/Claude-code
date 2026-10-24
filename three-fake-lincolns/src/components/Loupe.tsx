import React from "react";
import { CanvasImage, staticFile, useCurrentFrame } from "remotion";
import { photoGrade } from "../grade";
import { COLORS } from "../theme";
import { toWindow, usePrint } from "./PhotoPrint";

type Props = {
  // Centre of the lens in image-normalised coordinates.
  readonly u: number;
  readonly v: number;
  readonly radius: number;
  readonly zoom?: number;
  // 0 = lens away, 1 = lens fully over the print (drives the outside darkening).
  readonly presence: number;
};

// Must sit inside <PhotoPrint>: magnifies the same source, darkens everything outside the lens.
export const Loupe: React.FC<Props> = ({ u, v, radius, zoom = 2.5, presence }) => {
  const frame = useCurrentFrame();
  const g = usePrint();
  const { x, y } = toWindow(g, u, v);
  const s = g.scale * zoom;

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: `rgba(14,14,16,${0.35 * presence})`,
          maskImage: `radial-gradient(circle at ${x}px ${y}px, transparent ${radius}px, black ${radius + 1}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - radius,
          top: y - radius,
          width: radius * 2,
          height: radius * 2,
          borderRadius: "50%",
          overflow: "hidden",
          opacity: presence,
          boxShadow: `0 0 0 5px ${COLORS.ink}, 0 0 0 7px ${COLORS.silver}, 0 18px 40px rgba(0,0,0,0.55)`,
        }}
      >
        <CanvasImage
          src={staticFile(g.src)}
          width={Math.round(g.imgW * s)}
          height={Math.round(g.imgH * s)}
          fit="fill"
          style={{ position: "absolute", left: radius - u * g.imgW * s, top: radius - v * g.imgH * s }}
          effects={photoGrade({ frame, develop: g.develop, colorRestore: g.colorRestore })}
        />
      </div>
    </>
  );
};
