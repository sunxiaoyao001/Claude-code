/**
 * 视觉系统：「1980 电脑大赛 × 博弈实验室」
 * ------------------------------------------------------------
 * 延续系列：暗底 + 胶片颗粒 + 宋体重磅大字 + 金色 = 主角 / 答案，红色 = 背叛 / 危险。
 * 本集新增：青色 = 合作；琥珀色 CRT 终端承载“程序”这条线索。
 */
export const C = {
  bg: '#060708',
  ink: '#F4EEE3',
  inkDim: 'rgba(244,238,227,0.58)',
  inkFaint: 'rgba(244,238,227,0.16)',
  gold: '#F6BC48', // 以牙还牙 / 冠军 / 答案
  goldHot: '#FFE2A1',
  red: '#EC4A3C', // 背叛
  redHot: '#FF8F7A',
  coop: '#3FD9B1', // 合作
  coopHot: '#B4F7E4',
  blue: '#74BDEB', // 对手 / 中性
  blueHot: '#C6E7FF',
  amber: '#FFB547', // CRT 磷光
  hud: '#8FD3E8',
  panel: 'rgba(12,14,16,0.82)',
} as const;

export const FONT = {
  serif: '"Noto Serif SC", "Noto Sans SC", serif',
  sans: '"Noto Sans SC", sans-serif',
  num: '"Oswald", "Noto Sans SC", sans-serif',
  mono: '"JetBrains Mono", "Noto Sans SC", monospace',
} as const;

/** 出招颜色 */
export const MOVE_COLOR = {C: C.coop, D: C.red} as const;
