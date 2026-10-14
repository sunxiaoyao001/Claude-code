/**
 * 场景镜头：每个场景内缓慢推近（Ken Burns），重击时震屏
 * 纯函数，可任意跳帧。
 */
import {IMPACTS, SCENES} from '../timeline';
import {decayShake, ease, prog} from './anim';

export const cameraAt = (frame: number) => {
  const scene = Object.values(SCENES).find((s) => frame >= s.from && frame < s.from + s.dur) ?? SCENES.hook;
  const zoom = 1 + 0.035 * ease.inOut(prog(frame, scene.from, scene.from + scene.dur));
  const shake = IMPACTS.reduce(
    (acc, im) => {
      const s = decayShake(frame, im.f, im.shake, 18, im.f);
      return {x: acc.x + s.x, y: acc.y + s.y, r: acc.r + s.r};
    },
    {x: 0, y: 0, r: 0},
  );
  const t = frame / 30;
  return {
    s: zoom,
    x: shake.x + Math.sin(t * 0.5) * 2,
    y: shake.y + Math.cos(t * 0.37) * 2,
    r: shake.r,
  };
};
