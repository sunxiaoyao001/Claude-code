import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS } from "../theme";

// Custom presentations for <TransitionSeries>. Each one is a physical action in the archive, not a
// preset: prints swept off the table, a lantern slide carrier.
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
