// 《白熊效应》——瑞士动态排版，竖屏。上面是"程序"（大字、注释、年份），下面整片是舞台（出血）。
// 底在纸、夜、群青之间切换；全片只有一样东西用信号色：那只白熊（群青方块里镂空的白熊）。
import {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Html5Audio, staticFile, useCurrentFrame} from 'remotion';
import {fontsReady} from '../../fonts';
import {FPS, LINES} from '../score';
import {C} from '../sys';
import {BarCounter, CaptionRow, Notes, Numeral} from './Furniture';
import {HookScene, Pops, TitleCard} from './Hook';
import {Background, Cover, KnifePlate} from './Kit';
import {ExpClock, Grid, Lab, Rebound, Ruler} from './Lab';
import {Cake, Head, Person, Sleep} from './Life';
import {Bounce, Leave, Method1, Method1Drive, Method2, Outline, Smaller} from './Methods';
import {Mind, Spring} from './Mind';
import {BlueBear, Manuscript, Room, Stopwatch} from './Origin';
import {Statement} from './Type';

export type WbProps = {music?: boolean; musicVolume?: number};

export const WhiteBear: React.FC<WbProps> = ({music = true, musicVolume = 1}) => {
	const frame = useCurrentFrame();
	const t = frame / FPS;
	const [ready, setReady] = useState(false);
	const [handle] = useState(() => delayRender('wb fonts'));
	useEffect(() => {
		fontsReady.then(() => {
			setReady(true);
			continueRender(handle);
		});
	}, [handle]);
	return (
		<AbsoluteFill style={{backgroundColor: C.page}}>
			{music ? <Html5Audio src={staticFile('audio/wb-mix.mp3')} volume={musicVolume} /> : null}
			{ready ? (
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<Background t={t} />
					<KnifePlate t={t} />
					<HookScene t={t} />
					<Pops t={t} />
					<Room t={t} />
					<Manuscript t={t} />
					<BlueBear t={t} />
					<Stopwatch t={t} />
					<Ruler t={t} />
					<Lab t={t} />
					<Grid t={t} />
					<Rebound t={t} />
					<Spring t={t} />
					<Mind t={t} />
					<Sleep t={t} />
					<Person t={t} />
					<Cake t={t} />
					<Head t={t} />
					<Bounce t={t} />
					<Method1 t={t} />
					<Method1Drive t={t} />
					<Smaller t={t} />
					<Method2 t={t} />
					<Leave t={t} />
					<Outline t={t} />
					<Cover t={t} />
					<Numeral t={t} />
					<ExpClock t={t} />
					<TitleCard t={t} />
					{LINES.map((L, i) => (
						<Statement key={i} line={L} t={t} />
					))}
					<Notes t={t} />
					<CaptionRow t={t} />
					<BarCounter t={t} />
				</svg>
			) : null}
		</AbsoluteFill>
	);
};
