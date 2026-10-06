import { useEffect, useRef } from 'react';
import { game } from '@/game/GameController';
import { drawMapThumb, thumbPos, thumbToWorld } from '@/game/render/mapThumb';
import type { GameMap } from '@/game/sim/map/GameMap';
import { useT } from '@/i18n';

const W = 248;
const H = 124;
const BLUE = '#4fa8ff';
const RED = '#ff5a47';

/** Isometric minimap: terrain, objectives, smoke, every unit (team by shape) and the camera view. */
export function Minimap() {
  const t = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = W * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d')!;
    let base: HTMLCanvasElement | null = null;
    let baseMap: GameMap | null = null;
    let baseVersion = -1;
    let lastBase = 0;
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 66) return;
      last = now;
      const sim = game.sim;
      if (!sim) return;
      const map = sim.map;
      if (!base || baseMap !== map || (map.version !== baseVersion && now - lastBase > 1500)) {
        base = base ?? document.createElement('canvas');
        base.width = c.width;
        base.height = c.height;
        drawMapThumb(base.getContext('2d')!, map, base.width, base.height);
        baseMap = map;
        baseVersion = map.version;
        lastBase = now;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(base, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const P = (x: number, y: number) => thumbPos(map, W, H, x, y);
      // smoke
      for (const s of sim.smokes) {
        const p = P(s.x, s.y);
        const r = (s.r / map.w) * (W / 2) * 1.2;
        ctx.fillStyle = `rgba(235,235,230,${0.3 + s.density})`;
        ctx.beginPath();
        ctx.ellipse(p.px, p.py, r, r / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // objectives
      for (const pt of sim.points) {
        const p = P(pt.x, pt.y);
        const r = (pt.r / map.w) * (W / 2) * 1.4;
        ctx.strokeStyle = pt.owner === 0 ? BLUE : pt.owner === 1 ? RED : 'rgba(240,235,220,0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(p.px, p.py, r, r / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // units: blue squares, red diamonds; downed hollow
      for (const s of sim.soldiers) {
        if (s.state === 'dead') continue;
        const p = P(s.x, s.y);
        const col = s.team === 0 ? BLUE : RED;
        const sel = s.id === game.selected;
        const k = sel ? 3.2 : 2.2;
        ctx.beginPath();
        if (s.team === 0) ctx.rect(p.px - k, p.py - k * 0.8, k * 2, k * 1.6);
        else {
          ctx.moveTo(p.px, p.py - k * 1.2);
          ctx.lineTo(p.px + k * 1.2, p.py);
          ctx.lineTo(p.px, p.py + k * 1.2);
          ctx.lineTo(p.px - k * 1.2, p.py);
          ctx.closePath();
        }
        if (s.state === 'downed') {
          ctx.strokeStyle = col;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = col;
          ctx.fill();
          ctx.strokeStyle = sel ? '#f2d27a' : 'rgba(8,10,8,0.85)';
          ctx.lineWidth = sel ? 1.5 : 0.8;
          ctx.stroke();
        }
      }
      for (const tk of sim.tanks) {
        const p = P(tk.x, tk.y);
        ctx.fillStyle = tk.alive ? (tk.team === 0 ? BLUE : RED) : 'rgba(40,36,32,0.9)';
        ctx.strokeStyle = tk.id === game.selected ? '#f2d27a' : 'rgba(8,10,8,0.9)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.rect(p.px - 5, p.py - 3.5, 10, 7);
        ctx.fill();
        ctx.stroke();
      }
      // camera viewport
      const corners = game.scene?.viewCorners();
      if (corners) {
        ctx.strokeStyle = 'rgba(242,210,122,0.95)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        corners.forEach((cw, i) => {
          const p = P(cw.x, cw.y);
          if (i === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        });
        ctx.closePath();
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.type === 'pointermove' && e.buttons !== 1) return;
    const sim = game.sim;
    if (!sim) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const py = ((e.clientY - r.top) / r.height) * H;
    const w = thumbToWorld(sim.map, W, H, px, py);
    game.focusPoint(Math.max(0, Math.min(sim.map.w, w.x)), Math.max(0, Math.min(sim.map.h, w.y)));
  };

  return (
    <div className="hud-panel pointer-events-auto rounded-md p-2">
      <canvas
        ref={ref}
        style={{ width: W, height: H }}
        className="block cursor-crosshair touch-none"
        role="img"
        aria-label={t('hud.view')}
        onPointerDown={onPointer}
        onPointerMove={onPointer}
      />
    </div>
  );
}
