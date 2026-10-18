import {Composition, Folder} from 'remotion';
import './fonts';
import {FPS, SCENES, TOTAL_FRAMES} from './script';
import {SingleScene, Video} from './Video';
import {Film} from './pd/film/Film';
import {FPS as PD_FPS, FRAMES as PD_FRAMES} from './pd/score';

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="AIVideo" component={Video} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{subtitles: true, music: true, sfx: true, musicVolume: 1}} />
		<Composition id="AIVideoNoSubs" component={Video} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{subtitles: false, music: true, sfx: true, musicVolume: 1}} />
		<Composition
			id="PrisonersDilemma"
			component={Film}
			durationInFrames={PD_FRAMES}
			fps={PD_FPS}
			width={1080}
			height={1920}
			defaultProps={{music: true, musicVolume: 1}}
		/>
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
