// 《囚徒困境》——瑞士动态排版。整片是一张 1080×1920 的 SVG：纸、墨、浅灰、一块橙。
// 序幕是一个夜里的情景（Intro.tsx），点题之后，审讯室变成一张 2×2 的表。
import {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Html5Audio, staticFile, useCurrentFrame} from 'remotion';
import {fontsReady} from '../../fonts';
import {BEAT, E8, FPS, LINES, T} from '../score';
import {C, track} from '../sys';
import {Cases, EndingOrange, InsightCard, TitleCard, Wall} from './Chapters';
import {BarCounter, CaptionRow, GridFlash, Notes, Numeral} from './Furniture';
import {Chase, Night} from './Intro';
import {Matrix, Readout} from './Matrix';
import {Plates} from './Plates';
import {Statement} from './Type';

// 主矩阵的机位：序幕和规则里不动；规则三推进到"都揭发"那格再拉回
const focus = (wx: number, wy: number, sx: number, sy: number, s: number) => [wx, wy, sx, sy, Math.log(s)];
const CAM = track([
	[0, focus(744, 1320, 744, 1320, 1)],
	[T.push, focus(744, 1320, 540, 1150, 2.55), BEAT],
	[T.back, focus(744, 1320, 744, 1320, 1), BEAT],
]);

export type PdProps = {music?: boolean; musicVolume?: number};

export const Film: React.FC<PdProps> = ({music = true, musicVolume = 1}) => {
	const frame = useCurrentFrame();
	const t = frame / FPS;
	const [ready, setReady] = useState(false);
	const [handle] = useState(() => delayRender('pd fonts'));
	useEffect(() => {
		fontsReady.then(() => {
			setReady(true);
			continueRender(handle);
		});
	}, [handle]);

	const [wx, wy, sx, sy, ls] = CAM(t);
	const s = Math.exp(ls);
	const heroOn = t < T.cases[0] + E8 || t >= T.heroIn - E8;

	return (
		<AbsoluteFill style={{backgroundColor: C.page}}>
			{music ? <Html5Audio src={staticFile('audio/pd-mix.mp3')} volume={musicVolume} /> : null}
			{ready ? (
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<rect width={1080} height={1920} fill={C.page} />
					<GridFlash t={t} />
					{heroOn ? (
						<g transform={`matrix(${s} 0 0 ${s} ${sx - wx * s} ${sy - wy * s})`}>
							<Matrix t={t} />
							<Chase t={t} />
							<Readout t={t} />
						</g>
					) : null}
					<Night t={t} />
					<Cases t={t} />
					<Wall t={t} />
					<Numeral t={t} />
					<TitleCard t={t} />
					<InsightCard t={t} />
					{LINES.map((L, i) => (
						<Statement key={i} line={L} t={t} />
					))}
					<Plates t={t} />
					<Notes t={t} />
					<CaptionRow t={t} />
					<BarCounter t={t} />
					<EndingOrange t={t} />
				</svg>
			) : null}
		</AbsoluteFill>
	);
};
