/**
 * 视觉系统：「深夜拍卖行」
 * ------------------------------------------------------------
 * 延续系列：暗底 + 顶光 + 胶片颗粒 + 宋体重磅大字；金 = 你 / 答案，红 = 亏损 / 危险。
 * 本集：蓝 = 他，青 = 面值（那张 100 元），琥珀 = 拍卖师。
 */
export const C = {
  bg: '#07060a',
  ink: '#F4EEE3',
  inkDim: 'rgba(244,238,227,0.58)',
  inkFaint: 'rgba(244,238,227,0.16)',
  gold: '#F6BC48', // 你 / 答案
  goldHot: '#FFE2A1',
  red: '#EC4A3C', // 亏损 / 危险
  redHot: '#FF8F7A',
  coop: '#3FD9B1', // 面值 / 价值（字幕标签 <c>）
  coopHot: '#B4F7E4',
  blue: '#74BDEB', // 他
  blueHot: '#C6E7FF',
  amber: '#FFB547', // 拍卖师
  hud: '#8FD3E8',
  panel: 'rgba(14,12,16,0.84)',
} as const;

export const FONT = {
  serif: '"Noto Serif SC", "Noto Sans SC", serif',
  sans: '"Noto Sans SC", sans-serif',
  num: '"Oswald", "Noto Sans SC", sans-serif',
  mono: '"JetBrains Mono", "Noto Sans SC", monospace',
} as const;
