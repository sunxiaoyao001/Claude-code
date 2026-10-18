import {createContext, useContext} from 'react';
import {Html5Audio, Sequence, staticFile} from 'remotion';

export type SfxName =
	| 'tick'
	| 'typing'
	| 'blip'
	| 'pop'
	| 'whoosh'
	| 'riser'
	| 'impact'
	| 'error'
	| 'ding'
	| 'ratchet'
	| 'stamp'
	| 'spin'
	| 'count'
	| 'chime'
	| 'slideUp'
	| 'slideDown'
	| 'paper'
	| 'swell';

export const SfxEnabled = createContext(true);

// 在镜头内第 at 帧播放一个音效（音效文件由 scripts/make-audio.ts 生成）
export const Sfx: React.FC<{name: SfxName; at: number; volume?: number; frames?: number}> = ({name, at, volume = 1, frames}) => {
	const enabled = useContext(SfxEnabled);
	if (!enabled) return null;
	return (
		<Sequence from={Math.max(0, Math.round(at))} durationInFrames={frames} layout="none" name={`♪ ${name}`}>
			<Html5Audio src={staticFile(`audio/sfx/${name}.wav`)} volume={volume} />
		</Sequence>
	);
};

// 打字声：从 at 开始，持续 chars 个字（按每秒 cps 字）
export const Typing: React.FC<{at: number; chars: number; cps: number; volume?: number}> = ({at, chars, cps, volume = 0.8}) => (
	<Sfx name="typing" at={at} frames={Math.max(1, Math.round((chars / cps) * 30))} volume={volume} />
);
