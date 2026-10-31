import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, EASE } from "../theme";

// Custom presentations for <TransitionSeries>. Each one is a physical action in the archive, not a
// preset: prints swept off the table, a leaf shutter closing and opening, a lantern slide carrier.
// Progress arrives already eased (see SceneTimeline in Main.tsx).

type NoProps = Record<string, never>;

// The outgoing shot's prints are swept off the table to the left, turning as they go; the next
// shot is already laid out underneath.
const SweepOff: React.FC<TransitionPresentationComponentProps<NoProps>> = ({ children, presentationDirection, presentationProgress }) => {
  if (presentationDirection === "entering") {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }
  const p = presentationProgress;
  return (
    <AbsoluteFill style={{ zIndex: 1, translate: `${-1180 * p}px ${70 * p}px`, rotate: `${-7 * p}deg`, transformOrigin: "540px 1400px" }}>{children}</AbsoluteFill>
  );
};
export const sweepOff = (): TransitionPresentation<NoProps> => ({ component: SweepOff, props: {} });

// A leaf shutter: six overlapping blades close over the outgoing shot and open on the next one.
// Each blade is dark paper with a silver leading edge and a faint sheen, so even fully closed the
// frame shows the blades' spiral, never a black frame.
const CX = 540;
const CY = 760;
const R_OPEN = 1250;
const FAR = 2600;
const vertex = (r: number, turn: number, i: number) => {
  const a = ((i * 60 + turn) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
};

const Shutter: React.FC<{ readonly closed: number }> = ({ closed }) => {
  const r = R_OPEN * (1 - closed);
  const turn = 40 * closed;
  const blades = Array.from({ length: 6 }, (_, i) => {
    const [x0, y0] = vertex(r, turn, i);
    const [x1, y1] = vertex(r, turn, i + 1);
    // The blade's leading edge leaves the aperture corner at 120° to the radius (a pinwheel).
    const a0 = ((i * 60 + turn + 120) * Math.PI) / 180;
    const a1 = (((i + 1) * 60 + turn + 120) * Math.PI) / 180;
    const fx0 = x0 + FAR * Math.cos(a0);
    const fy0 = y0 + FAR * Math.sin(a0);
    const fx1 = x1 + FAR * Math.cos(a1);
    const fy1 = y1 + FAR * Math.sin(a1);
    return { x0, y0, x1, y1, fx0, fy0, fx1, fy1, i };
  });
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs>
        {blades.map((b) => (
          <linearGradient key={b.i} id={`blade${b.i}`} gradientUnits="userSpaceOnUse" x1={b.x0} y1={b.y0} x2={(b.x1 + b.fx1) / 2} y2={(b.y1 + b.fy1) / 2}>
            <stop offset="0" stopColor={COLORS.silver} stopOpacity={0.32} />
            <stop offset="0.25" stopColor={COLORS.darkPaper} stopOpacity={1} />
            <stop offset="1" stopColor={COLORS.ink} stopOpacity={1} />
          </linearGradient>
        ))}
      </defs>
      {blades.map((b) => (
        <polygon key={b.i} points={`${b.x0},${b.y0} ${b.x1},${b.y1} ${b.fx1},${b.fy1} ${b.fx0},${b.fy0}`} fill={`url(#blade${b.i})`} />
      ))}
      {blades.map((b) => (
        <line key={b.i} x1={b.x0} y1={b.y0} x2={b.fx0} y2={b.fy0} stroke={COLORS.silver} strokeOpacity={0.7} strokeWidth={2} />
      ))}
    </svg>
  );
};

const IrisShutter: React.FC<TransitionPresentationComponentProps<NoProps>> = ({ children, presentationDirection, presentationProgress }) => {
  const p = presentationProgress;
  if (presentationDirection === "exiting") {
    return <AbsoluteFill style={{ opacity: p < 0.5 ? 1 : 0 }}>{children}</AbsoluteFill>;
  }
  // Closed at the midpoint: blades close on the old shot, then open on the new one.
  const closed = 0.985 * (p < 0.5 ? EASE.inOut(p * 2) : EASE.inOut(2 - p * 2));
  return (
    <AbsoluteFill style={{ zIndex: 1 }}>
      <AbsoluteFill style={{ opacity: p < 0.5 ? 0 : 1 }}>{children}</AbsoluteFill>
      {closed > 0.001 ? <Shutter closed={closed} /> : null}
    </AbsoluteFill>
  );
};
export const irisShutter = (): TransitionPresentation<NoProps> => ({ component: IrisShutter, props: {} });

// A lantern-slide carrier: the next slide pushes the current one out sideways, with the carrier's
// dark frame between them.
const CARRIER = 36;
const SlideCarrier: React.FC<TransitionPresentationComponentProps<NoProps>> = ({ children, presentationDirection, presentationProgress }) => {
  const p = presentationProgress;
  if (presentationDirection === "exiting") {
    return <AbsoluteFill style={{ translate: `${-(1080 + CARRIER) * p}px 0` }}>{children}</AbsoluteFill>;
  }
  const x = (1080 + CARRIER) * (1 - p);
  return (
    <AbsoluteFill style={{ translate: `${x}px 0` }}>
      <div
        style={{
          position: "absolute",
          left: -CARRIER,
          top: 0,
          width: CARRIER,
          height: 1920,
          backgroundColor: COLORS.ink,
          boxShadow: `inset 1px 0 0 rgba(142,138,132,0.4), inset -1px 0 0 rgba(142,138,132,0.4)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
export const slideCarrier = (): TransitionPresentation<NoProps> => ({ component: SlideCarrier, props: {} });
