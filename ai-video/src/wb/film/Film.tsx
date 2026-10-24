// 《白熊效应》——瑞士动态排版，竖屏。上半页是"程序"（大字、注释、年份），下半页那张纸是舞台。
// 全片只有一样东西用信号色：那只白熊（群青方块里镂空的白熊）。
import {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Html5Audio, staticFile, useCurrentFrame} from 'remotion';
import {fontsReady} from '../../fonts';
import {E8, FPS, LINES} from '../score';
import {C, lin, SHEET} from '../sys';
import {BarCounter, CaptionRow, Notes, Numeral} from './Furniture';
import {ExpClock, Grid, Lab, Notebook, Rebound, Timeline, Writer} from './History';
import {HookScene, Pops, TitleBear, TitleCard} from './Hook';
import {Cake, Ending, Head, Method1, Method2, Person, Sleep, Smaller} from './Life';
import {Mind} from './Mind';
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
	// 纸：开场一个八分音符里从上往下擦出来
	const sheetH = (SHEET.y1 - SHEET.y0) * lin(t, 0, E8);
	return (
		<AbsoluteFill style={{backgroundColor: C.page}}>
			{music ? <Html5Audio src={staticFile('audio/wb-mix.mp3')} volume={musicVolume} /> : null}
			{ready ? (
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<rect width={1080} height={1920} fill={C.page} />
					<rect x={SHEET.x0} y={SHEET.y0} width={SHEET.x1 - SHEET.x0} height={sheetH} fill={C.paper} />
					<HookScene t={t} />
					<TitleBear t={t} />
					<Writer t={t} />
					<Notebook t={t} />
					<Timeline t={t} />
					<Lab t={t} />
					<Grid t={t} />
					<Rebound t={t} />
					<Mind t={t} />
					<Sleep t={t} />
					<Person t={t} />
					<Cake t={t} />
					<Head t={t} />
					<Method1 t={t} />
					<Smaller t={t} />
					<Method2 t={t} />
					<Ending t={t} />
					<Numeral t={t} />
					<ExpClock t={t} />
					<TitleCard t={t} />
					{LINES.map((L, i) => (
						<Statement key={i} line={L} t={t} />
					))}
					<Notes t={t} />
					<CaptionRow t={t} />
					<BarCounter t={t} />
					<Pops t={t} />
				</svg>
			) : null}
		</AbsoluteFill>
	);
};
