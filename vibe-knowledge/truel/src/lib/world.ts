/**
 * 决斗场“世界状态”：给定帧号，推导每个人的生死、高亮、轮次、镜头……
 * 纯函数，不保存任何状态，可随意跳帧渲染。
 */
import {BULLET_FRAMES, CAMERA, IMPACTS, PlayerId, REWINDS, SCENES, SHOTS, TURNS} from '../timeline';
import {decayShake, ease, keyframes, prog} from './anim';

/* ---------------- 生死 ---------------- */
export type Life = {alive: boolean; since: number; revived: boolean};

const lifeEvents = (id: PlayerId) =>
  [
    ...SHOTS.filter((s) => s.hit && s.to === id).map((s) => ({f: s.t + BULLET_FRAMES, kind: 'death' as const})),
    ...REWINDS.map((f) => ({f, kind: 'revive' as const})),
  ].sort((a, b) => a.f - b.f);

export const lifeOf = (id: PlayerId, frame: number): Life => {
  let life: Life = {alive: true, since: -1e9, revived: false};
  for (const e of lifeEvents(id)) {
    if (e.f > frame) break;
    if (e.kind === 'death' && life.alive) life = {alive: false, since: e.f, revived: false};
    if (e.kind === 'revive' && !life.alive) life = {alive: true, since: e.f, revived: true};
  }
  return life;
};

/* ---------------- 登场时刻 ---------------- */
export const REVEAL: Record<PlayerId, number> = {jia: 168, yi: 253, bing: 338};

/** 徽章点亮程度 0~1 */
export const activationOf = (id: PlayerId, frame: number) => {
  if (frame < SCENES.cast.from) {
    // 钩子：丙从第 44 帧起被单独点亮
    if (id === 'bing') return 0.4 + 0.6 * prog(frame, 44, 58, ease.out);
    return 0.4 - 0.12 * prog(frame, 44, 58);
  }
  let a = 0.35 + 0.65 * prog(frame, REVEAL[id] - 2, REVEAL[id] + 10, ease.out);
  // 拆解段：丙“隐身”——没人把他当威胁
  if (id === 'bing') {
    const ghost = prog(frame, 1828, 1844, ease.out) * (1 - prog(frame, 1978, 1992, ease.out));
    a = a * (1 - 0.62 * ghost);
  }
  return a;
};

/** 抛问题段：镜头推向丙，其余两人淡出 */
export const focusFade = (id: PlayerId, frame: number) =>
  id === 'bing' ? 1 : 1 - 0.8 * prog(frame, 596, 630, ease.inOut) * (1 - prog(frame, 742, 772, ease.inOut));

export const ghostOf = (frame: number) =>
  prog(frame, 1828, 1844, ease.out) * (1 - prog(frame, 1978, 1992, ease.out));

/* ---------------- 轮次 ---------------- */
export const turnOf = (frame: number) => TURNS.find((t) => frame >= t.start && frame < t.end) ?? null;

/* ---------------- 决斗场可见度 ---------------- */
export const arenaVisibility = (frame: number) => {
  const outProof = prog(frame, SCENES.proof.from, SCENES.proof.from + 24, ease.inOut);
  const inCaveat = prog(frame, SCENES.caveat.from, SCENES.caveat.from + 24, ease.out);
  const outEnd = prog(frame, SCENES.outro.from - 10, SCENES.outro.from + 6, ease.in);
  if (frame < SCENES.proof.from + 24) return 1 - outProof;
  if (frame < SCENES.caveat.from) return 0;
  return inCaveat * (1 - outEnd);
};

/* ---------------- 镜头 ---------------- */
export type Cam = {x: number; y: number; s: number; r: number};

export const cameraAt = (frame: number): Cam => {
  const base = keyframes(CAMERA, frame, (a, b, k) => ({
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    s: a.s + (b.s - a.s) * k,
    r: a.r + (b.r - a.r) * k,
  }));
  // 手持呼吸感
  const t = frame / 30;
  const shake = IMPACTS.reduce(
    (acc, im) => {
      const s = decayShake(frame, im.f, im.shake, 18, im.f);
      return {x: acc.x + s.x, y: acc.y + s.y, r: acc.r + s.r};
    },
    {x: 0, y: 0, r: 0},
  );
  return {
    x: base.x + Math.sin(t * 0.55) * 3 - shake.x,
    y: base.y + Math.cos(t * 0.41) * 2.5 - shake.y,
    s: base.s * (1 + Math.sin(t * 0.33) * 0.004),
    r: base.r + Math.sin(t * 0.27) * 0.12 + shake.r,
  };
};

/** 镜头锚点：焦点 (x, y) 被放到屏幕的这个位置 */
export const ANCHOR = {x: 540, y: 850};

export const cameraTransform = (c: Cam) =>
  `translate(${ANCHOR.x}px, ${ANCHOR.y}px) rotate(${c.r}deg) scale(${c.s}) translate(${-c.x}px, ${-c.y}px)`;

/** 舞台坐标 → 屏幕坐标（给屏幕层的标签定位用） */
export const project = (c: Cam, x: number, y: number) => {
  const dx = (x - c.x) * c.s;
  const dy = (y - c.y) * c.s;
  const r = (c.r * Math.PI) / 180;
  return {
    x: ANCHOR.x + dx * Math.cos(r) - dy * Math.sin(r),
    y: ANCHOR.y + dx * Math.sin(r) + dy * Math.cos(r),
  };
};

/* ---------------- 倒带 ---------------- */
export const rewindAmount = (frame: number) =>
  REWINDS.reduce((acc, f) => {
    const d = frame - f;
    if (d < -14 || d > 6) return acc;
    // 倒带前 14 帧逐渐加强，复活后 6 帧内消散
    return Math.max(acc, d < 0 ? prog(d, -14, 0) : 1 - prog(d, 0, 6));
  }, 0);
