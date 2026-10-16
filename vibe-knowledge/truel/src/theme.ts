/**
 * 视觉系统：「黄昏决斗场 × 弹道实验室」
 * ------------------------------------------------------------
 * 近黑暖底 + 一束顶光 + 胶片颗粒，像西部片最后的三角对峙；
 * 数据部分切换为冷色实验室 HUD。三位枪手各占一种颜色，
 * 全片颜色语义固定：红 = 甲 / 危险，蓝 = 乙，金 = 丙 / 主角 / 答案。
 */
import type {PlayerId} from './timeline';

export const C = {
  bg: '#070605',
  ink: '#F4EEE3', // 骨白：正文
  inkDim: 'rgba(244,238,227,0.58)',
  inkFaint: 'rgba(244,238,227,0.16)',
  gold: '#F6BC48',
  goldHot: '#FFE2A1',
  red: '#EC4A3C',
  redHot: '#FF8F7A',
  blue: '#74BDEB',
  blueHot: '#C6E7FF',
  hud: '#8FD3E8',
} as const;

export const FONT = {
  serif: '"Noto Serif SC", "Noto Sans SC", serif',
  sans: '"Noto Sans SC", sans-serif',
  num: '"Oswald", "Noto Sans SC", sans-serif',
  mono: '"JetBrains Mono", "Noto Sans SC", monospace',
} as const;

export type PlayerDef = {
  id: PlayerId;
  name: string;
  title: string;
  acc: number;
  color: string;
  hot: string;
};

export const PLAYERS: Record<PlayerId, PlayerDef> = {
  jia: {id: 'jia', name: '甲', title: '神枪手', acc: 0.8, color: C.red, hot: C.redHot},
  yi: {id: 'yi', name: '乙', title: '老手', acc: 0.6, color: C.blue, hot: C.blueHot},
  bing: {id: 'bing', name: '丙', title: '菜鸟', acc: 0.4, color: C.gold, hot: C.goldHot},
};

export const PLAYER_IDS: PlayerId[] = ['jia', 'yi', 'bing'];

/* ------------------------------------------------------------
 * 决斗场几何：地面是一个倾斜的圆（正交投影成椭圆），
 * 三人站在内接三角形的三个顶点上，徽章悬浮在落点上方。
 * ---------------------------------------------------------- */
export const ARENA = {
  cx: 540,
  cy: 870,
  r: 330, // 站位半径
  tilt: 0.42, // 地面倾斜后的纵向压缩比
  hover: 175, // 徽章悬浮高度
  medal: 104, // 徽章半径
};

const ANGLE: Record<PlayerId, number> = {jia: -90, yi: 150, bing: 30};

/** 地面落点（舞台坐标） */
export const footOf = (id: PlayerId) => {
  const a = (ANGLE[id] * Math.PI) / 180;
  return {x: ARENA.cx + ARENA.r * Math.cos(a), y: ARENA.cy + ARENA.r * Math.sin(a) * ARENA.tilt};
};

/** 远小近大的景深缩放 */
export const depthScale = (id: PlayerId) => {
  const {y} = footOf(id);
  const minY = ARENA.cy - ARENA.r * ARENA.tilt;
  const maxY = ARENA.cy + ARENA.r * ARENA.tilt * 0.5;
  return 0.86 + 0.14 * ((y - minY) / (maxY - minY));
};

/** 徽章中心（舞台坐标） */
export const medalOf = (id: PlayerId) => {
  const f = footOf(id);
  return {x: f.x, y: f.y - ARENA.hover * depthScale(id), s: depthScale(id)};
};
