import {Easing, interpolate, spring} from 'remotion';

export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

// 0→1 的进度，start 之前为 0，start+dur 之后为 1
export const progress = (frame: number, start: number, dur = 15, easing = easeOut) =>
	interpolate(frame, [start, start + dur], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing,
	});

export const pop = (frame: number, fps: number, start: number, damping = 14) =>
	spring({frame: frame - start, fps, config: {damping, stiffness: 180, mass: 0.7}});

// 入场：淡入 + 上移；base 是元素原本的 transform（会保留在前面）
export const rise = (frame: number, start: number, dur = 15, distance = 24, base = '') => {
	const p = progress(frame, start, dur);
	return {opacity: p, transform: `${base} translateY(${(1 - p) * distance}px)`.trim()};
};

// 在 [a, b] 区间内可见，两头淡入淡出
export const visible = (frame: number, a: number, b: number, fade = 12) =>
	interpolate(frame, [a, a + fade, b - fade, b], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

export const blink = (frame: number, period = 30) => (Math.floor(frame / (period / 2)) % 2 === 0 ? 1 : 0);

// 打字机：从 start 帧开始，每秒 cps 个字
export const typed = (text: string, frame: number, start: number, cps = 14) => {
	const chars = Array.from(text);
	const n = Math.max(0, Math.floor(((frame - start) / 30) * cps));
	return chars.slice(0, n).join('');
};
