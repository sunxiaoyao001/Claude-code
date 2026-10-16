/**
 * 视觉系统：「月夜甲板上的金币」
 * ------------------------------------------------------------
 * 延续系列：暗底 + 顶光 + 胶片颗粒 + 宋体重磅大字。
 * 本集：金 = 金币 / 船长，蓝 = 海与被收买的人，青 = 赞成票，红 = 反对 / 落水，木色 = 甲板。
 */
export const C = {
  bg: '#06080d',
  ink: '#F4EEE3',
  inkDim: 'rgba(244,238,227,0.58)',
  inkFaint: 'rgba(244,238,227,0.16)',
  gold: '#F6BC48', // 金币 / 船长
  goldHot: '#FFE2A1',
  red: '#EC4A3C', // 反对 / 落水
  redHot: '#FF8F7A',
  coop: '#3FD9B1', // 赞成（字幕标签 <c>）
  coopHot: '#B4F7E4',
  blue: '#74BDEB', // 被收买的人（字幕标签 <b>）
  blueHot: '#C6E7FF',
  sea: '#1f5f86', // 海
  seaHot: '#7cc4e8',
  wood: '#8a5a36', // 甲板
  woodHot: '#c08a5a',
  hud: '#8FD3E8',
  panel: 'rgba(12,14,20,0.86)',
} as const;

export const FONT = {
  serif: '"Noto Serif SC", "Noto Sans SC", serif',
  sans: '"Noto Sans SC", sans-serif',
  num: '"Oswald", "Noto Sans SC", sans-serif',
  mono: '"JetBrains Mono", "Noto Sans SC", monospace',
} as const;
