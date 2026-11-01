import { AbsoluteFill, CanvasImage, staticFile, useCurrentFrame } from "remotion";
import "../fonts";
import { photoGrade } from "../grade";
import { COLORS, FONTS } from "../theme";

// Dev-only check of the shared grade at several develop stages. Not part of the film.
export const DevGrade = () => {
  const frame = useCurrentFrame();
  const stages = [0.1, 0.4, 0.75, 1];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkPaper, flexDirection: "row", flexWrap: "wrap", padding: 40, gap: 30 }}>
      {stages.map((d) => (
        <div key={d} style={{ padding: 18, backgroundColor: COLORS.printWhite }}>
          <CanvasImage src={staticFile("dev/test_print.png")} width={440} height={660} fit="cover" effects={photoGrade({ frame, develop: d })} />
        </div>
      ))}
      <div style={{ padding: 18, backgroundColor: COLORS.printWhite }}>
        <CanvasImage src={staticFile("dev/test_print.png")} width={440} height={660} fit="cover" effects={photoGrade({ frame, colorRestore: 1 })} />
      </div>
      <div style={{ color: COLORS.printWhite, fontFamily: FONTS.serifZh, fontWeight: 900, fontSize: 64, width: 460 }}>林肯的 3 张假像</div>
    </AbsoluteFill>
  );
};
