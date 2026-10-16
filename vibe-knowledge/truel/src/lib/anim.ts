/**
 * 动画工具：缓动、区间映射、关键帧插值、确定性随机
 * Remotion 渲染是逐帧无状态的，所有动画都必须是 frame 的纯函数。
 */
import {Easing, interpolate} from 'remotion';

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** 将 frame 在 [a, b] 区间映射为 0→1，可选缓动 */
export const prog = (frame: number, a: number, b: number, ease: (t: number) => number = (t) => t) =>
  ease(clamp01((frame - a) / Math.max(1e-6, b - a)));

export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1), //       急停：适合入场
  inOut: Easing.bezier(0.65, 0, 0.35, 1), //    镜头运动
  in: Easing.bezier(0.7, 0, 0.84, 0), //        出场
  back: Easing.bezier(0.34, 1.56, 0.64, 1), //  回弹
  expoOut: Easing.bezier(0.19, 1, 0.22, 1),
};

/** 进入-停留-退出 的不透明度包络 */
export const envelope = (frame: number, from: number, to: number, fadeIn = 8, fadeOut = 8) =>
  interpolate(frame, [from, from + fadeIn, to - fadeOut, to], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 通用关键帧插值：keys 需按 f 升序，返回插值后的对象 */
export function keyframes<T extends {f: number}>(
  keys: T[],
  frame: number,
  mix: (a: T, b: T, t: number) => Omit<T, 'f'>,
  easing: (t: number) => number = ease.inOut,
): Omit<T, 'f'> {
  if (frame <= keys[0].f) return mix(keys[0], keys[0], 0);
  const last = keys[keys.length - 1];
  if (frame >= last.f) return mix(last, last, 0);
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].f <= frame) i++;
  const a = keys[i];
  const b = keys[i + 1];
  return mix(a, b, easing((frame - a.f) / (b.f - a.f)));
}

/** 确定性伪随机（同一个 seed 永远返回同一个值） */
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

/** 衰减震荡：用于震屏 */
export const decayShake = (frame: number, start: number, amp: number, dur = 18, seed = 1) => {
  const t = frame - start;
  if (t < 0 || t > dur) return {x: 0, y: 0, r: 0};
  const k = Math.pow(1 - t / dur, 2);
  return {
    x: (hash(t * 3.1 + seed) - 0.5) * 2 * amp * k,
    y: (hash(t * 7.7 + seed * 2) - 0.5) * 2 * amp * k,
    r: (hash(t * 1.3 + seed * 5) - 0.5) * 1.2 * k * (amp / 20),
  };
};

/** 数字滚动 */
export const countUp = (frame: number, a: number, b: number, from: number, to: number) =>
  interpolate(frame, [a, b], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease.out,
  });
