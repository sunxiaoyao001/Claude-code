import React from "react";
import { AbsoluteFill } from "remotion";
import { Desk } from "../components/Desk";
import {
  BrokenChain,
  BurinPlate,
  Candle,
  ChemicalBottles,
  Courthouse,
  Crescent,
  DarkroomTimer,
  Laurel,
  Loupe,
  PatternField,
  PlateCamera,
  PocketWatch,
  PosingStand,
  Proscenium,
  QuillInkwell,
  Rose,
  Safelight,
  Scales,
  ScissorsPaste,
} from "../components/Engravings";

// Every engraving on one frame, for checking the drawings (render a still at frame 89).
export const DevEngravings: React.FC = () => (
  <AbsoluteFill>
    <Desk />
    <PatternField period={2688} />
    <BurinPlate x={60} y={80} from={0} />
    <QuillInkwell x={420} y={330} from={0} />
    <BrokenChain x={700} y={120} from={0} links={7} />
    <Loupe path={[[860, 300], [900, 330]]} from={0} to={60} />
    <PosingStand x={140} y={860} from={0} />
    <Safelight x={400} y={500} from={0} />
    <DarkroomTimer x={620} y={640} from={0} runFrom={10} runTo={120} />
    <ChemicalBottles x={850} y={820} from={0} />
    <Scales x={260} y={1240} from={0} settleAt={40} />
    <Courthouse x={480} y={1240} w={260} from={0} />
    <PlateCamera x={780} y={1000} from={0} />
    <ScissorsPaste x={120} y={1420} from={0} />
    <Proscenium left={620} top={1380} right={960} bottom={1560} from={0} />
    <Rose x={120} y={1640} from={0} s={0.7} />
    <Candle x={330} y={1840} from={0} />
    <Crescent x={500} y={1660} r={60} from={0} />
    <PocketWatch x={700} y={1760} from={0} runFrom={10} runTo={80} />
    <Laurel x={820} y={1880} len={200} from={0} />
  </AbsoluteFill>
);
