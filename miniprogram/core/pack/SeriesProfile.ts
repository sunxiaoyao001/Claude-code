// The eight series base profiles (CLAUDE.md §5–§6). A camera pack only writes what differs from its
// series; everything else is inherited from here, so these defaults must be complete and valid.
import type { FilterParams } from './FilterParams';

export type SeriesId =
  | 'jp-color' | 'street-bw' | 'ccd' | 'instant'
  | 'medium-format' | 'cine-slide' | 'toy' | 'darkroom';

export interface UiParams {
  /** Accent colour injected as --accent while this camera is loaded. */
  themeColor: string;
  /** Skin variant for the shutter and frame lines. */
  shutterStyle: string;
}

export interface SeriesProfile {
  id: SeriesId;
  letter: string;
  name: string;
  /** Small caps label, e.g. "SERIES A · COLOR NEGATIVE 135". */
  latin: string;
  description: string;
  dotColor: string;
  filter: FilterParams;
  ui: UiParams;
}

const NO_FX = { chromaticAberration: 0, scanlines: 0 };

// lut.id '' means "use the pack's own id"; CameraPack.resolvePack fills it in.
export const SERIES: Record<SeriesId, SeriesProfile> = {
  'jp-color': {
    id: 'jp-color', letter: 'A', name: '日系彩色 135', latin: 'Series A · Color negative 135',
    description: '口袋相机与彩色负片，日常的温度', dotColor: '#E8C88A',
    filter: {
      lut: { id: '', intensity: 1 },
      vignette: { strength: 0.25, softness: 0.45 },
      halation: { strength: 0.15, threshold: 0.85, radius: 1 },
      grain: { size: 1.4, intensity: 0.05, lumaWeight: 0.6, colored: false },
      lightLeak: { probability: 0.15, opacityMin: 0.2, opacityMax: 0.45 },
      frame: { aspectRatio: '3:4' },
      dateStamp: { enabled: false },
      fx: NO_FX,
    },
    ui: { themeColor: '#E8C88A', shutterStyle: 'compact' },
  },
  'street-bw': {
    id: 'street-bw', letter: 'B', name: '街头黑白', latin: 'Series B · Black & white street',
    description: '旁轴与黑白卷，灰阶里的人间', dotColor: '#C9C9C4',
    filter: {
      lut: { id: '', intensity: 1 },
      vignette: { strength: 0.3, softness: 0.5 },
      // The red-biased halo would tint a monochrome frame, so B&W keeps it off.
      halation: { strength: 0, threshold: 0.88, radius: 1 },
      grain: { size: 1.8, intensity: 0.09, lumaWeight: 0.5, colored: false },
      // Leaks are coloured; on a monochrome frame they would read as a tint, not light.
      lightLeak: { probability: 0, opacityMin: 0.15, opacityMax: 0.3 },
      frame: { aspectRatio: '2:3' },
      dateStamp: { enabled: false },
      fx: NO_FX,
    },
    ui: { themeColor: '#C9C9C4', shutterStyle: 'rangefinder' },
  },
  ccd: {
    id: 'ccd', letter: 'C', name: 'CCD 千禧', latin: 'Series C · Early digital CCD',
    description: '千禧年卡片机，冷白闪光与橙色日期', dotColor: '#9FC2FF',
    filter: {
      lut: { id: '', intensity: 1 },
      vignette: { strength: 0.12, softness: 0.5 },
      halation: { strength: 0.05, threshold: 0.9, radius: 0.8 },
      // Digital sensor noise: fine and chromatic rather than film grain.
      grain: { size: 1, intensity: 0.035, lumaWeight: 0.3, colored: true },
      lightLeak: { probability: 0, opacityMin: 0, opacityMax: 0 },
      frame: { aspectRatio: '3:4' },
      dateStamp: { enabled: true },
      fx: { chromaticAberration: 0.0015, scanlines: 0 },
    },
    ui: { themeColor: '#9FC2FF', shutterStyle: 'digital' },
  },
  instant: {
    id: 'instant', letter: 'D', name: '即时成像', latin: 'Series D · Instant film',
    description: '按下快门，等它慢慢显影', dotColor: '#F2E6D0',
    filter: {
      lut: { id: '', intensity: 1 },
      vignette: { strength: 0.3, softness: 0.5 },
      halation: { strength: 0.1, threshold: 0.85, radius: 1 },
      grain: { size: 1.2, intensity: 0.04, lumaWeight: 0.5, colored: false },
      lightLeak: { probability: 0.1, opacityMin: 0.15, opacityMax: 0.35 },
      frame: { aspectRatio: '1:1' },
      dateStamp: { enabled: false },
      fx: NO_FX,
    },
    ui: { themeColor: '#F2E6D0', shutterStyle: 'instant' },
  },
  'medium-format': {
    id: 'medium-format', letter: 'E', name: '中画幅', latin: 'Series E · Medium format 120',
    description: '更大的底片，更细腻的层次', dotColor: '#D8C7A6',
    filter: {
      lut: { id: '', intensity: 1 },
      vignette: { strength: 0.18, softness: 0.5 },
      halation: { strength: 0.1, threshold: 0.86, radius: 1 },
      grain: { size: 1, intensity: 0.03, lumaWeight: 0.5, colored: false },
      lightLeak: { probability: 0.05, opacityMin: 0.15, opacityMax: 0.3 },
      frame: { aspectRatio: '1:1' },
      dateStamp: { enabled: false },
      fx: NO_FX,
    },
    ui: { themeColor: '#D8C7A6', shutterStyle: 'waist-level' },
  },
  'cine-slide': {
    id: 'cine-slide', letter: 'F', name: '电影与反转片', latin: 'Series F · Cine & slide film',
    description: '电影负片的红晕，反转片的浓烈', dotColor: '#E05A47',
    filter: {
      lut: { id: '', intensity: 1 },
      vignette: { strength: 0.22, softness: 0.5 },
      halation: { strength: 0.3, threshold: 0.8, radius: 1.4 },
      grain: { size: 1.3, intensity: 0.05, lumaWeight: 0.6, colored: false },
      lightLeak: { probability: 0.08, opacityMin: 0.15, opacityMax: 0.35 },
      frame: { aspectRatio: '3:4' },
      dateStamp: { enabled: false },
      fx: NO_FX,
    },
    ui: { themeColor: '#E05A47', shutterStyle: 'cine' },
  },
  toy: {
    id: 'toy', letter: 'G', name: '玩具胶片', latin: 'Series G · Toy cameras',
    description: '塑料镜头和意外，才是乐趣本身', dotColor: '#C792EA',
    filter: {
      lut: { id: '', intensity: 1 },
      vignette: { strength: 0.55, softness: 0.5 },
      halation: { strength: 0.2, threshold: 0.82, radius: 1.2 },
      grain: { size: 1.8, intensity: 0.08, lumaWeight: 0.6, colored: false },
      lightLeak: { probability: 0.45, opacityMin: 0.3, opacityMax: 0.7 },
      frame: { aspectRatio: '1:1' },
      dateStamp: { enabled: false },
      fx: NO_FX,
    },
    ui: { themeColor: '#C792EA', shutterStyle: 'toy' },
  },
  darkroom: {
    id: 'darkroom', letter: 'H', name: '暗房工艺', latin: 'Series H · Darkroom process',
    description: '过期、迫冲、反冲——每一张都是开盲盒', dotColor: '#7FD1B9',
    filter: {
      lut: { id: '', intensity: 1 },
      vignette: { strength: 0.25, softness: 0.5 },
      halation: { strength: 0.15, threshold: 0.84, radius: 1 },
      grain: { size: 1.6, intensity: 0.07, lumaWeight: 0.6, colored: false },
      lightLeak: { probability: 0.2, opacityMin: 0.2, opacityMax: 0.45 },
      frame: { aspectRatio: '3:4' },
      dateStamp: { enabled: false },
      fx: NO_FX,
    },
    ui: { themeColor: '#7FD1B9', shutterStyle: 'darkroom' },
  },
};

export const SERIES_ORDER: readonly SeriesId[] = [
  'jp-color', 'street-bw', 'ccd', 'instant', 'medium-format', 'cine-slide', 'toy', 'darkroom',
];
