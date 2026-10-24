import { Composition, Folder } from "remotion";
import { DevGrade } from "./dev/DevGrade";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Dev">
        <Composition id="DevGrade" component={DevGrade} durationInFrames={30} fps={30} width={1080} height={1920} />
      </Folder>
    </>
  );
};
