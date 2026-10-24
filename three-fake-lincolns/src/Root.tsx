import { Composition, Folder } from "remotion";
import { DevComponents } from "./dev/DevComponents";
import { DevGrade } from "./dev/DevGrade";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Dev">
        <Composition id="DevComponents" component={DevComponents} durationInFrames={96} fps={30} width={1080} height={1920} />
        <Composition id="DevGrade" component={DevGrade} durationInFrames={30} fps={30} width={1080} height={1920} />
      </Folder>
    </>
  );
};
