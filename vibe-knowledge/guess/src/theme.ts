/**
 * 视觉系统：「数轴上的靶心」
 * ------------------------------------------------------------
 * 延续系列：暗底 + 顶光 + 胶片颗粒 + 宋体重磅大字。
 * 本集：金 = 目标（平均数的 2/3）/ 答案，蓝 = 别人的数字，青 = 赢家，
 *       红 = 输 / 误区，白 = 0 与纳什均衡，紫 = 凯恩斯的选美比赛。
 */
export const C = {
  bg: '#07070a',
  ink: '#F4EEE3',
  inkDim: 'rgba(244,238,227,0.58)',
  inkFaint: 'rgba(244,238,227,0.16)',
  gold: '#F6BC48', // 目标 2/3 / 答案
  goldHot: '#FFE2A1',
  red: '#EC4A3C', // 输 / 误区
  redHot: '#FF8F7A',
  coop: '#3FD9B1', // 赢家（字幕标签 <c>）
  coopHot: '#B4F7E4',
  blue: '#74BDEB', // 别人的数字
  blueHot: '#C6E7FF',
  violet: '#B07CE8', // 凯恩斯
  violetHot: '#DCC2FF',
  paper: '#E9DFC8', // 报纸
  hud: '#8FD3E8',
  panel: 'rgba(14,12,16,0.84)',
} as const;

export const FONT = {
  serif: '"Noto Serif SC", "Noto Sans SC", serif',
  sans: '"Noto Sans SC", sans-serif',
  num: '"Oswald", "Noto Sans SC", sans-serif',
  mono: '"JetBrains Mono", "Noto Sans SC", monospace',
} as const;
