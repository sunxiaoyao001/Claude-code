import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {TimedScene} from '../script';
import {Chapter} from './Chapter';
import {Subtitles} from './Subtitles';

// 每个镜头的外壳：内容淡入淡出 + 章节标签 + 字幕
export const SceneShell: React.FC<{scene: TimedScene; subtitles: boolean; children: React.ReactNode}> = ({
	scene,
	subtitles,
	children,
}) => {
	const frame = useCurrentFrame();
	const d = scene.durationInFrames;
	const opacity = interpolate(frame, [0, 10, d - 10, d], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{opacity}}>
				{children}
				{scene.chapter ? <Chapter {...scene.chapter} /> : null}
			</AbsoluteFill>
			{subtitles ? <Subtitles lines={scene.lines} /> : null}
		</AbsoluteFill>
	);
};
