import { createContext, useContext } from "react";

// Ratio between the rendered duration and the 89.6 s base cut. 1 for the default.
export const TimeScale = createContext(1);

// Converts a base frame (from timeline.ts) into a frame of the current render.
export const useTime = () => {
  const k = useContext(TimeScale);
  return (baseFrame: number) => Math.round(baseFrame * k);
};
