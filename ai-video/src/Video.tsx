import {AbsoluteFill, Html5Audio, Sequence, Series, staticFile} from 'remotion';
import {Background} from './components/Background';
import {SceneShell} from './components/SceneShell';
import {Sfx, SfxEnabled} from './components/Sfx';
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

export type VideoProps = {
	subtitles: boolean;
	music?: boolean;
	sfx?: boolean;
	// 加了人声配音之后，建议把配乐调到 0.3 左右
	musicVolume?: number;
};

// 各镜头的起始帧
const STARTS = SCENES.map((_, i) => SCENES.slice(0, i).reduce((sum, x) => sum + x.durationInFrames, 0));

export const Video: React.FC<VideoProps> = ({subtitles, music = true, sfx = true, musicVolume = 1}) => (
	<SfxEnabled.Provider value={sfx}>
		<AbsoluteFill>
			<Background />
			{music ? <Html5Audio src={staticFile('audio/music.mp3')} volume={musicVolume} /> : null}
			{/* 镜头之间的转场声 */}
			{STARTS.slice(1).map((f) => (
				<Sequence key={f} from={f - 10} layout="none">
					<Sfx name="whoosh" at={0} volume={0.8} />
				</Sequence>
			))}
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
	</SfxEnabled.Provider>
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
