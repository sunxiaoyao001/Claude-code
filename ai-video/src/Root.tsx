import {Composition, Folder} from 'remotion';
import './fonts';
import {FPS, SCENES, TOTAL_FRAMES} from './script';
import {SingleScene, Video} from './Video';

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="AIVideo" component={Video} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{subtitles: true}} />
		<Composition id="AIVideoNoSubs" component={Video} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{subtitles: false}} />
		<Folder name="Scenes">
			{SCENES.map((s) => (
				<Composition
					key={s.id}
					id={`Scene-${s.id}`}
					component={SingleScene}
					durationInFrames={s.durationInFrames}
					fps={FPS}
					width={1920}
					height={1080}
					defaultProps={{id: s.id, subtitles: true}}
				/>
			))}
		</Folder>
	</>
);
