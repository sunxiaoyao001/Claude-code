import {Composition} from 'remotion';
import {Explosion} from './Explosion';
import {Journey} from './Journey';
import {loadFonts} from './fonts';

loadFonts();

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Explosion" component={Explosion} durationInFrames={210} fps={30} width={1280} height={720} />
    <Composition id="Journey" component={Journey} durationInFrames={400} fps={30} width={1280} height={800} />
  </>
);
