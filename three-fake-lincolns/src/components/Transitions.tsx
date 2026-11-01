import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import React from "react";
import { AbsoluteFill } from "remotion";

// Custom presentations for <TransitionSeries>. Each one is a physical action in the archive, not a
// preset: prints swept off the table, the projector's lamp switched off.
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

// The projector is switched off (the click at 2016): the projection goes dark within 3 frames, a
// lamp going out rather than a dissolve, while the next shot's photograph is already being laid in
// from the right underneath it.
const LampOff: React.FC<TransitionPresentationComponentProps<NoProps>> = ({ children, presentationDirection, presentationProgress }) => {
  if (presentationDirection === "entering") {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }
  const off = Math.min(1, presentationProgress / 0.2);
  return <AbsoluteFill style={{ zIndex: 1, opacity: 1 - off, filter: `brightness(${1 - 0.5 * off})` }}>{children}</AbsoluteFill>;
};
export const lampOff = (): TransitionPresentation<NoProps> => ({ component: LampOff, props: {} });
