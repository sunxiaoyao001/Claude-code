import {AbsoluteFill, Html5Audio, interpolate, Sequence, Series, staticFile, useCurrentFrame} from 'remotion';
import {Sfx, SfxEnabled} from '../components/Sfx';
import {PdBackground} from './components/PdBackground';
import {P1Hook} from './scenes/P1Hook';
import {P2Setup} from './scenes/P2Setup';
import {P3Matrix} from './scenes/P3Matrix';
import {P4Title} from './scenes/P4Title';
import {P5Life} from './scenes/P5Life';
import {P6Way} from './scenes/P6Way';
import {P7End} from './scenes/P7End';
import {fr, PD_SCENES, type PdSceneId} from './timeline';

const COMPONENTS: Record<PdSceneId, React.FC> = {
	hook: P1Hook,
	setup: P2Setup,
	matrix: P3Matrix,
	title: P4Title,
	life: P5Life,
	way: P6Way,
	end: P7End,
};

// 镜头外壳：淡入淡出（第一个镜头不淡入，第 0 帧就要有画面）
const Shell: React.FC<{dur: number; first: boolean; children: React.ReactNode}> = ({dur, first, children}) => {
	const frame = useCurrentFrame();
	const fadeIn = first ? 1 : interpolate(frame, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
	const fadeOut = interpolate(frame, [dur - 8, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const opacity = fadeIn * fadeOut;
	return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

export type PdProps = {music?: boolean; sfx?: boolean; musicVolume?: number};

const STARTS = PD_SCENES.map((_, i) => PD_SCENES.slice(0, i).reduce((sum, s) => sum + fr(s.sec), 0));

export const PrisonersDilemma: React.FC<PdProps> = ({music = true, sfx = true, musicVolume = 1}) => (
	<SfxEnabled.Provider value={sfx}>
		<AbsoluteFill>
			<PdBackground />
			{music ? <Html5Audio src={staticFile('audio/pd-music.mp3')} volume={musicVolume} /> : null}
			{STARTS.slice(2).map((f) => (
				<Sequence key={f} from={f - 8} layout="none">
					<Sfx name="whoosh" at={0} volume={0.6} />
				</Sequence>
			))}
			<Series>
				{PD_SCENES.map((s, i) => {
					const Scene = COMPONENTS[s.id];
					return (
						<Series.Sequence key={s.id} durationInFrames={fr(s.sec)} name={s.id}>
							<Shell dur={fr(s.sec)} first={i === 0}>
								<Scene />
							</Shell>
						</Series.Sequence>
					);
				})}
			</Series>
		</AbsoluteFill>
	</SfxEnabled.Provider>
);
