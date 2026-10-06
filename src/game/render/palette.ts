import { Ground, Mat } from '../sim/map/GameMap';
import type { Biome, TeamId } from '../sim/types';

export type RGB = [number, number, number];

export const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const rgbStr = (c: RGB, a = 1) => (a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);

export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const shade = (c: RGB, k: number): RGB => [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];

export const toInt = (c: RGB) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);

export interface TeamPalette {
  uniform: RGB;
  uniformDark: RGB;
  vest: RGB;
  helmet: RGB;
  accent: RGB;
  accentInt: number;
  tank: RGB;
  tankDark: RGB;
  ui: string;
}

/** Blue force vs red force (蓝军 / 红军), muted for uniforms and saturated for accents. */
export const TEAM: Record<TeamId, TeamPalette> = {
  0: {
    uniform: hex('#4a6688'),
    uniformDark: hex('#344a66'),
    vest: hex('#2c3a4c'),
    helmet: hex('#3c5576'),
    accent: hex('#4fa8ff'),
    accentInt: 0x4fa8ff,
    tank: hex('#58708a'),
    tankDark: hex('#3c4e62'),
    ui: '#4fa8ff',
  },
  1: {
    uniform: hex('#8e4c42'),
    uniformDark: hex('#69362f'),
    vest: hex('#4a2d29'),
    helmet: hex('#7a3e36'),
    accent: hex('#ff5a47'),
    accentInt: 0xff5a47,
    tank: hex('#8a6a58'),
    tankDark: hex('#5e4538'),
    ui: '#ff5a47',
  },
};

export const SKIN: RGB[] = [hex('#e0b48f'), hex('#c68f68'), hex('#9a6a4a'), hex('#f0c9a8'), hex('#7c5238')];
export const GUNMETAL = hex('#2a2d30');
export const BOOT = hex('#26221e');

export interface BiomeLook {
  ground: Partial<Record<Ground, RGB>>;
  /** Overall atmosphere tint applied by the camera colour grade. */
  grade: { tint: number; saturation: number; brightness: number; contrast: number };
  clear: string;
  rock: RGB;
  tree: RGB;
  fog: number;
}

export const BIOMES: Record<Biome, BiomeLook> = {
  desert: {
    ground: {
      [Ground.Sand]: hex('#d6b585'),
      [Ground.SandDark]: hex('#c49e6c'),
      [Ground.Dirt]: hex('#b28a5c'),
      [Ground.Gravel]: hex('#a8987e'),
      [Ground.Asphalt]: hex('#4a4744'),
      [Ground.Sidewalk]: hex('#b9a888'),
      [Ground.Concrete]: hex('#b8aa92'),
      [Ground.Tile]: hex('#c7b593'),
      [Ground.Plank]: hex('#9b7a55'),
      [Ground.Grass]: hex('#9a9a5a'),
      [Ground.Crosswalk]: hex('#4a4744'),
    },
    grade: { tint: 0xfff0dc, saturation: 0.08, brightness: 1.03, contrast: 0.08 },
    clear: '#bfa27a',
    rock: hex('#b48f68'),
    tree: hex('#5f7d3a'),
    fog: 0xe9d3b0,
  },
  snow: {
    ground: {
      [Ground.Snow]: hex('#e7edf2'),
      [Ground.SnowPacked]: hex('#d2dbe3'),
      [Ground.Ice]: hex('#b7d2e3'),
      [Ground.Dirt]: hex('#8b8178'),
      [Ground.Plank]: hex('#7d6247'),
      [Ground.Concrete]: hex('#b9bec3'),
      [Ground.Tile]: hex('#a8adb2'),
      [Ground.Gravel]: hex('#a5abb0'),
      [Ground.Sand]: hex('#e7edf2'),
      [Ground.SandDark]: hex('#d2dbe3'),
    },
    grade: { tint: 0xe6f0ff, saturation: -0.04, brightness: 1.02, contrast: 0.08 },
    clear: '#cfd9e2',
    rock: hex('#8f979e'),
    tree: hex('#2f4a3c'),
    fog: 0xdfe8f0,
  },
  urban: {
    ground: {
      [Ground.Asphalt]: hex('#3c3f42'),
      [Ground.Sidewalk]: hex('#8e8a83'),
      [Ground.Concrete]: hex('#97948c'),
      [Ground.Gravel]: hex('#8a8478'),
      [Ground.Dirt]: hex('#7c6c58'),
      [Ground.Tile]: hex('#b2a999'),
      [Ground.Plank]: hex('#8a6a4a'),
      [Ground.Grass]: hex('#6f7a4c'),
      [Ground.Crosswalk]: hex('#3c3f42'),
      [Ground.Sand]: hex('#a49a86'),
      [Ground.SandDark]: hex('#958b77'),
    },
    grade: { tint: 0xf2f0ea, saturation: -0.05, brightness: 1.0, contrast: 0.1 },
    clear: '#5c5a55',
    rock: hex('#7d7b76'),
    tree: hex('#4d4a3e'),
    fog: 0x8a8780,
  },
};

/** Base colour of a structure material (top-lit). */
export function matColor(mat: Mat, biome: Biome): RGB {
  switch (mat) {
    case Mat.Concrete:
      return hex('#a9a69d');
    case Mat.Brick:
      return hex('#9d5a44');
    case Mat.Adobe:
      return hex('#d4ad7f');
    case Mat.Wood:
      return hex('#7f5d3f');
    case Mat.Stone:
      return hex('#8f939a');
    case Mat.Sandbag:
      return biome === 'snow' ? hex('#c9c6b4') : hex('#b39e72');
    case Mat.Crate:
      return hex('#8f6a3e');
    case Mat.Barrier:
      return hex('#b3b0a6');
    case Mat.Logs:
      return hex('#6e5136');
    case Mat.Barrel:
      return hex('#5d6b4a');
    case Mat.Rock:
      return BIOMES[biome].rock;
    case Mat.Car:
      return hex('#4b4a48');
    case Mat.Truck:
      return hex('#556048');
    case Mat.TankWreck:
      return hex('#2e2b28');
    default:
      return hex('#888888');
  }
}
