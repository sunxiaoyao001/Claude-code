import {AbsoluteFill, Series} from 'remotion';
import {Background} from './components/Background';
import {SceneShell} from './components/SceneShell';
import {SCENES} from './script';
import {S1Hook} from './scenes/S1Hook';
import {S2Game} from './scenes/S2Game';
import {S3Loop} from './scenes/S3Loop';
import {S4Train} from './scenes/S4Train';
import {S5Detective} from './scenes/S5Detective';
import {S6Sample} from './scenes/S6Sample';
import {S7Hallucinate} from './scenes/S7Hallucinate';
import {S8Outro} from './scenes/S8Outro';

const COMPONENTS: Record<string, React.FC> = {
	hook: S1Hook,
	game: S2Game,
	loop: S3Loop,
	train: S4Train,
	detective: S5Detective,
	sample: S6Sample,
	hallucinate: S7Hallucinate,
	outro: S8Outro,
};

export type VideoProps = {subtitles: boolean};

export const Video: React.FC<VideoProps> = ({subtitles}) => (
	<AbsoluteFill>
		<Background />
		<Series>
			{SCENES.map((s) => {
				const Scene = COMPONENTS[s.id];
				return (
					<Series.Sequence key={s.id} durationInFrames={s.durationInFrames} name={s.id}>
						<SceneShell scene={s} subtitles={subtitles}>
							<Scene />
						</SceneShell>
					</Series.Sequence>
				);
			})}
		</Series>
	</AbsoluteFill>
);

// 单独预览某个镜头
export const SingleScene: React.FC<{id: string; subtitles: boolean}> = ({id, subtitles}) => {
	const s = SCENES.find((x) => x.id === id)!;
	const Scene = COMPONENTS[id];
	return (
		<AbsoluteFill>
			<Background />
			<SceneShell scene={s} subtitles={subtitles}>
				<Scene />
			</SceneShell>
		</AbsoluteFill>
	);
};
