import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';

const TILE = 512;
let grainUrl: string | null = null;
const getGrain = () => {
  if (grainUrl) return grainUrl;
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(TILE, TILE);
  for (let i = 0; i < TILE * TILE; i++) {
    // zero-mean grain as light and dark specks with alpha: reads like overlay grain, blends as cheap normal alpha
    const g = (random(`g${i}a`) + random(`g${i}b`) + random(`g${i}c`)) / 1.5 - 1;
    const v = g > 0 ? 255 : 0;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = Math.round(Math.min(1, Math.abs(g) * 1.6) * 255);
  }
  ctx.putImageData(img, 0, 0);
  grainUrl = canvas.toDataURL('image/png');
  return grainUrl;
};

/**
 * Animated photographic grain. The tiled texture is rasterised once on its own compositor layer
 * and only translated per frame, so it costs almost nothing in software rendering.
 */
export const FilmGrain: React.FC<{opacity?: number}> = ({opacity = 0.085}) => {
  const frame = useCurrentFrame();
  const url = useMemo(getGrain, []);
  const ox = Math.floor(random(`gx${frame}`) * TILE);
  const oy = Math.floor(random(`gy${frame}`) * TILE);
  return (
    <AbsoluteFill style={{overflow: 'hidden', pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1920 + TILE,
          height: 1080 + TILE,
          backgroundImage: `url(${url})`,
          backgroundSize: `${TILE}px ${TILE}px`,
          opacity: opacity * 0.55,
          willChange: 'transform',
          transform: `translate3d(${-ox}px, ${-oy}px, 0)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{strength?: number; inner?: number}> = ({strength = 0.72, inner = 48}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) ${inner}%, rgba(0,0,0,${strength * 0.55}) 78%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: 'none',
      willChange: 'transform',
    }}
  />
);

/** Static full-frame background on its own cached layer (gradients are costly to re-raster in software). */
export const Backdrop: React.FC<{bg: string; opacity?: number}> = ({bg, opacity = 1}) => (
  <AbsoluteFill style={{background: bg, opacity, willChange: 'transform', pointerEvents: 'none'}} />
);

/** Thin cinematic bars that can slide in for “movie” moments. */
export const Letterbox: React.FC<{amount: number}> = ({amount}) => {
  const h = 120 * amount;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: h, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: h, background: '#000'}} />
    </AbsoluteFill>
  );
};
