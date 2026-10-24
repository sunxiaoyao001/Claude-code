import React, { createContext, useContext } from "react";
import { CanvasImage, staticFile, useCurrentFrame } from "remotion";
import { photoGrade } from "../grade";
import { COLORS } from "../theme";

// A crop window in normalised image coordinates (0..1 on both axes).
export type Crop = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
export const FULL: Crop = { x0: 0, y0: 0, x1: 1, y1: 1 };

type PrintGeometry = {
  readonly src: string;
  readonly imgW: number;
  readonly imgH: number;
  // display pixels per source pixel
  readonly scale: number;
  readonly crop: Crop;
  readonly develop: number;
  readonly colorRestore: number;
};

const PrintContext = createContext<PrintGeometry | null>(null);

export const usePrint = () => {
  const ctx = useContext(PrintContext);
  if (!ctx) {
    throw new Error("usePrint() must be used inside <PhotoPrint>");
  }
  return ctx;
};

// Image-normalised (u, v) -> pixels inside the print's visible window.
export const toWindow = (g: PrintGeometry, u: number, v: number) => ({
  x: (u - g.crop.x0) * g.imgW * g.scale,
  y: (v - g.crop.y0) * g.imgH * g.scale,
});

type Props = {
  readonly src: string;
  readonly imgW: number;
  readonly imgH: number;
  // Width of the visible image window in px; height follows from the crop's aspect ratio.
  readonly width: number;
  readonly crop?: Crop;
  readonly left: number;
  readonly top: number;
  readonly tilt?: number;
  readonly border?: number;
  readonly develop?: number;
  readonly colorRestore?: number;
  readonly lift?: number;
  readonly children?: React.ReactNode;
  readonly style?: React.CSSProperties;
};

// A physical print on the archive table: white border, slight tilt, real cast shadow.
export const PhotoPrint: React.FC<Props> = ({
  src,
  imgW,
  imgH,
  width,
  crop = FULL,
  left,
  top,
  tilt = 0,
  border = 16,
  develop = 1,
  colorRestore = 0,
  lift = 0,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const scale = width / ((crop.x1 - crop.x0) * imgW);
  const height = (crop.y1 - crop.y0) * imgH * scale;
  const geometry: PrintGeometry = { src, imgW, imgH, scale, crop, develop, colorRestore };
  // Lifting a print off the table lengthens and softens its shadow.
  const shadow = `0 ${6 + lift * 24}px ${14 + lift * 40}px rgba(0,0,0,${0.42 - lift * 0.1}), 0 1px 3px rgba(0,0,0,0.5)`;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        padding: border,
        backgroundColor: COLORS.printWhite,
        boxShadow: shadow,
        rotate: `${tilt}deg`,
        ...style,
      }}
    >
      <div style={{ position: "relative", width, height, overflow: "hidden", backgroundColor: COLORS.printWhite }}>
        <CanvasImage
          src={staticFile(src)}
          width={Math.round(imgW * scale)}
          height={Math.round(imgH * scale)}
          fit="fill"
          style={{ position: "absolute", left: -crop.x0 * imgW * scale, top: -crop.y0 * imgH * scale }}
          effects={photoGrade({ frame, develop, colorRestore })}
        />
        <PrintContext.Provider value={geometry}>{children}</PrintContext.Provider>
      </div>
    </div>
  );
};
