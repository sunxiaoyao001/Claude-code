// Packs shipped in the code package (CLAUDE.md §6, series A–C). Each entry only writes what differs
// from its series profile; LUTs live at /assets/luts/<id>.png and strip thumbnails at
// /assets/thumbs/<id>.jpg. Packs that arrive later from the CDN use the same shape (core/pack/PackStore).
import type { PackDefinition } from './CameraPack';

export const BUILTIN_PACKS: readonly PackDefinition[] = [
  // A · 日系彩色 135
  {
    id: 'sunny-fun', name: '阳光罐头', latinName: 'Sunny fun', tagline: '一次性 · 暖黄日常',
    series: 'jp-color', inspiredBy: 'Kodak FunSaver 一次性相机（内置 ISO 800 胶卷）', free: true,
    filter: {
      vignette: { strength: 0.32 },
      halation: { strength: 0.18 },
      grain: { size: 1.6, intensity: 0.07 },
      lightLeak: { probability: 0.35, opacityMin: 0.25, opacityMax: 0.55 },
      dateStamp: { enabled: true },
    },
    ui: { themeColor: '#F2C94C', shutterStyle: 'disposable' },
  },
  {
    id: 'pocket-gold', name: '口袋金', latinName: 'Pocket gold', tagline: '日常 · 金色午后',
    series: 'jp-color', inspiredBy: 'Olympus mju-II + Kodak Gold 200', free: false,
    filter: {
      halation: { strength: 0.25 },
      lightLeak: { probability: 0.3 },
      dateStamp: { enabled: true },
    },
    ui: { themeColor: '#E8C88A', shutterStyle: 'mechanical-gold' },
  },
  {
    id: 'green-flash', name: '绿闪', latinName: 'Green flash', tagline: '一次性 · 清爽绿调',
    series: 'jp-color', inspiredBy: '富士 QuickSnap Flash + Fujifilm Superia X-TRA 400', free: false,
    filter: {
      grain: { size: 1.6, intensity: 0.06 },
      lightLeak: { probability: 0.2 },
    },
    ui: { themeColor: '#8FD694', shutterStyle: 'disposable' },
  },
  {
    id: 'knight-t2', name: '骑士', latinName: 'Knight', tagline: '街机 · 蓝绿阴影',
    series: 'jp-color', inspiredBy: 'Contax T2 + Agfa Vista 200', free: false,
    filter: { vignette: { strength: 0.2 } },
    ui: { themeColor: '#7FB8C8' },
  },
  {
    id: 'moonlight', name: '月光机', latinName: 'Moonlight', tagline: '夜拍 · 高感暖亮',
    series: 'jp-color', inspiredBy: '富士 NATURA S + Fujifilm Natura 1600', free: true,
    filter: {
      halation: { strength: 0.28 },
      grain: { size: 2, intensity: 0.085 },
    },
    ui: { themeColor: '#F0B66B' },
  },
  {
    id: 'red-box', name: '红盒', latinName: 'Red box', tagline: '浓郁 · 高饱和',
    series: 'jp-color', inspiredBy: '美能达 TC-1 + Kodak Ektar 100', free: false,
    filter: {
      vignette: { strength: 0.2 },
      grain: { size: 1.1, intensity: 0.03 },
    },
    ui: { themeColor: '#E76F51' },
  },
  {
    id: 'sakura-premium', name: '绯樱', latinName: 'Sakura', tagline: '日杂 · 粉调人像',
    series: 'jp-color', inspiredBy: 'Contax T3 + Fujifilm Superia Premium 400（日本本土版人像卷）', free: false,
    filter: { vignette: { strength: 0.18 } },
    ui: { themeColor: '#F4A6B7' },
  },
  {
    id: 'pastel-160', name: '盐系', latinName: 'Pastel 160', tagline: '低饱和 · 奶油清透',
    series: 'jp-color', inspiredBy: 'Yashica T4 + Kodak Portra 160', free: false,
    filter: {
      vignette: { strength: 0.18 },
      halation: { strength: 0.1 },
      grain: { size: 1.2, intensity: 0.035 },
    },
    ui: { themeColor: '#E9D8C4' },
  },

  // B · 街头黑白
  {
    id: 'm3-hp5', name: 'M3 黑白', latinName: 'M3 mono', tagline: '人文 · 经典黑白',
    series: 'street-bw', inspiredBy: '徕卡 M3 + Ilford HP5 Plus 400', free: true,
    ui: { themeColor: '#E6E4DC' },
  },
  {
    id: 'street-gr', name: '街拍', latinName: 'Street', tagline: '高反差 · 粗颗粒',
    series: 'street-bw', inspiredBy: '理光 GR21 + Kodak Tri-X 400', free: false,
    filter: {
      vignette: { strength: 0.35 },
      grain: { size: 2.2, intensity: 0.13 },
    },
    ui: { themeColor: '#BDBDB5' },
  },
  {
    id: 'night-3200', name: '夜猫', latinName: 'Night owl', tagline: '夜拍 · 黑白粗颗粒',
    series: 'street-bw', inspiredBy: '尼康 FM2 + Ilford Delta 3200', free: false,
    filter: { grain: { size: 2.8, intensity: 0.17 } },
    ui: { themeColor: '#9AA0B4' },
  },
  {
    id: 'silver-50', name: '银盐细语', latinName: 'Silver 50', tagline: '细腻 · 低反差',
    series: 'street-bw', inspiredBy: '禄来 35 + Ilford PAN F Plus 50', free: false,
    filter: {
      vignette: { strength: 0.22 },
      grain: { size: 0.9, intensity: 0.025 },
    },
    ui: { themeColor: '#D9D6CC' },
  },
  {
    id: 'ql17-street', name: '连动', latinName: 'Range', tagline: '旁轴 · 柔和灰阶',
    series: 'street-bw', inspiredBy: '佳能 Canonet QL17 G-III + Fujifilm Neopan 400', free: false,
    filter: { grain: { size: 1.7, intensity: 0.08 } },
    ui: { themeColor: '#C2B8A3' },
  },
  {
    id: 'silk-xp2', name: '绢黑', latinName: 'Silk', tagline: '无颗粒 · 丝滑黑白',
    series: 'street-bw', inspiredBy: '奥林巴斯 XA + Ilford XP2 Super（C-41 黑白）', free: false,
    filter: { grain: { intensity: 0 } },
    ui: { themeColor: '#E0DDD5' },
  },

  // C · CCD 千禧
  {
    id: 'ccd-casio', name: '冷白闪', latinName: 'Cool flash', tagline: '冷白皮 · 橙日期',
    series: 'ccd', inspiredBy: '卡西欧 Exilim EX-S500（2005）', free: false,
    ui: { themeColor: '#CFE3FF' },
  },
  {
    id: 'ccd-sony', name: '蓝调', latinName: 'Blue hour', tagline: '蓝调 · 高光截断',
    series: 'ccd', inspiredBy: '索尼 Cyber-shot DSC-T10（2006）', free: false,
    ui: { themeColor: '#6FA8FF' },
  },
  {
    id: 'ccd-canon', name: '暖卡', latinName: 'Warm card', tagline: '暖调 · 卡片机',
    series: 'ccd', inspiredBy: '佳能 Digital IXUS 860 IS（2007）', free: false,
    ui: { themeColor: '#FFB86B' },
  },
  {
    id: 'ccd-fuji', name: '冷萃', latinName: 'Cold brew', tagline: '肤色 · 柔和高光',
    series: 'ccd', inspiredBy: '富士 FinePix F40fd（2007）', free: false,
    ui: { themeColor: '#A8E0D1' },
  },
  {
    id: 'ccd-nikon', name: '转方', latinName: 'Swivel', tagline: '千禧 · 玩具艳色',
    series: 'ccd', inspiredBy: '尼康 Coolpix SQ（2003）', free: false,
    filter: { fx: { chromaticAberration: 0.002 } },
    ui: { themeColor: '#FF8FB1' },
  },
  {
    id: 'vhs-c', name: '老录像', latinName: 'Tape days', tagline: '扫描线 · 磁带噪声',
    series: 'ccd', inspiredBy: '索尼 Handycam（VHS-C 磁带）', free: false,
    filter: {
      vignette: { strength: 0.2 },
      grain: { size: 2, intensity: 0.06 },
      frame: { aspectRatio: '4:3' },
      fx: { chromaticAberration: 0.004, scanlines: 0.35 },
    },
    ui: { themeColor: '#FF5C8A', shutterStyle: 'tape' },
  },
];
