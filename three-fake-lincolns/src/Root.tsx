import { CalculateMetadataFunction, Composition, Folder } from "remotion";
import { DevComponents } from "./dev/DevComponents";
import { DevGrade } from "./dev/DevGrade";
import { Main } from "./Main";
import { mainSchema, type MainProps } from "./schema";

const calculateMetadata: CalculateMetadataFunction<MainProps> = ({ props }) => {
  const fps = 30;
  return {
    durationInFrames: Math.round(props.durationSec * fps),
    fps,
    width: 1080,
    height: 1920,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={2688}
        fps={30}
        width={1080}
        height={1920}
        schema={mainSchema}
        defaultProps={{ durationSec: 89.6, aspect: "9:16", watermark: "@your_handle", motionBlur: false }}
        calculateMetadata={calculateMetadata}
      />
      <Folder name="Dev">
        <Composition id="DevComponents" component={DevComponents} durationInFrames={96} fps={30} width={1080} height={1920} />
        <Composition id="DevGrade" component={DevGrade} durationInFrames={30} fps={30} width={1080} height={1920} />
      </Folder>
    </>
  );
};
