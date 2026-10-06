import { useEffect, useRef } from 'react';
import { generateMap } from '@/game/sim/map/generate';
import { drawMapThumb, thumbPos } from '@/game/render/mapThumb';
import { DEFAULT_CONFIG, type BattleScale, type Biome } from '@/game/sim/types';

const W = 280;
const H = 140;

/** Renders the actual generated battlefield for a biome/scale/seed as a small iso diamond. */
export function MapPreview({ biome, scale, seed, label }: { biome: Biome; scale: BattleScale; seed: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = W * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d')!;
    const map = generateMap({ ...DEFAULT_CONFIG, biome, scale, seed });
    drawMapThumb(ctx, map, c.width, c.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    // spawn zones
    map.spawns.forEach((z, team) => {
      const p = thumbPos(map, W, H, (z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2);
      ctx.fillStyle = team === 0 ? '#4fa8ff' : '#ff5a47';
      ctx.strokeStyle = 'rgba(10,12,9,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (team === 0) ctx.rect(p.px - 6, p.py - 4, 12, 8);
      else {
        ctx.moveTo(p.px, p.py - 6);
        ctx.lineTo(p.px + 6, p.py);
        ctx.lineTo(p.px, p.py + 6);
        ctx.lineTo(p.px - 6, p.py);
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
    });
    // objectives
    ctx.font = '600 10px "IBM Plex Sans Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const pt of map.points) {
      const p = thumbPos(map, W, H, pt.x, pt.y);
      ctx.fillStyle = 'rgba(12,14,10,0.78)';
      ctx.beginPath();
      ctx.arc(p.px, p.py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(242,210,122,0.9)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#f2d27a';
      ctx.fillText(pt.label, p.px, p.py + 0.5);
    }
    ctx.restore();
  }, [biome, scale, seed]);
  return <canvas ref={ref} role="img" aria-label={label} className="block aspect-[2/1] w-full" />;
}
