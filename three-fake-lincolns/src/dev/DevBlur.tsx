import { CameraMotionBlur } from "@remotion/motion-blur";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import "../fonts";
import { IMG } from "../assets";
import { PhotoPrint } from "../components/PhotoPrint";
import { COLORS } from "../theme";

// Dev-only: does motion blur work on graded canvas prints in this renderer?
const Moving = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 10], [900, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <PhotoPrint src={IMG.lincolnComposite.file} imgW={IMG.lincolnComposite.width} imgH={IMG.lincolnComposite.height} width={300} left={x} top={500} />;
};

export const DevBlur = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkPaper }}>
      <CameraMotionBlur samples={6} shutterAngle={180}>
        <Moving />
      </CameraMotionBlur>
    </AbsoluteFill>
  );
};
