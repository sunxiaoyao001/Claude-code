import Phaser from 'phaser';
import { fbm, hash2, Rng, valueNoise } from '../core/rng';
import { Cell, CELL_INFO, Ground, type GameMap } from '../sim/map/GameMap';
import { ISO_H, ISO_W, isoX, isoY } from './iso';
import { BIOMES, hex, rgbStr, shade, type RGB } from './palette';

const CRISP = new Set<Ground>([Ground.Asphalt, Ground.Sidewalk, Ground.Tile, Ground.Plank, Ground.Crosswalk]);

/**
 * Static ground (painted once on a canvas, copied to a RenderTexture so decals can be
 * stamped on the GPU) plus a soft shadow layer that is re-baked when structures change.
 */
export class GroundLayer {
  readonly rt: Phaser.GameObjects.RenderTexture;
  readonly shadow: Phaser.GameObjects.Image;
  private shadowCanvas: HTMLCanvasElement;
  private shadowKey: string;
  readonly originX: number;
  readonly scale: number;
  private shadowDirty = false;
  private lastShadowBake = 0;

  constructor(
    private scene: Phaser.Scene,
    private map: GameMap,
    layer: Phaser.GameObjects.Layer,
    shadowLayer: Phaser.GameObjects.Layer,
  ) {
    const N = map.w;
    const W = N * ISO_W * 2;
    const H = N * ISO_H * 2;
    const maxTex = (scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer).getMaxTextureSize?.() ?? 4096;
    this.scale = W <= maxTex ? 1 : 0.5;
    this.originX = -N * ISO_W;
    const canvas = this.paint(W, H);
    const key = `ground_src_${Date.now()}`;
    scene.textures.addCanvas(key, canvas);
    this.rt = scene.add.renderTexture(this.originX, 0, W * this.scale, H * this.scale).setOrigin(0, 0);
    this.rt.draw(key, 0, 0);
    this.rt.setScale(1 / this.scale);
    scene.textures.remove(key);
    layer.add(this.rt);

    this.shadowKey = `ground_shadow_${Date.now()}`;
    this.shadowCanvas = document.createElement('canvas');
    this.shadowCanvas.width = Math.ceil(W / 2);
    this.shadowCanvas.height = Math.ceil(H / 2);
    this.bakeShadows();
    scene.textures.addCanvas(this.shadowKey, this.shadowCanvas);
    this.shadow = scene.add.image(this.originX, 0, this.shadowKey).setOrigin(0, 0).setScale(2).setAlpha(1);
    shadowLayer.add(this.shadow);
  }

  // ---------------------------------------------------------------------------
  // painting
  // ---------------------------------------------------------------------------

  private groundColor(g: Ground): RGB {
    const look = BIOMES[this.map.biome];
    return look.ground[g] ?? look.ground[Ground.Sand] ?? hex('#888888');
  }

  private paint(W: number, H: number): HTMLCanvasElement {
    const map = this.map;
    const N = map.w;
    const seed = map.seed;
    const canvas = document.createElement('canvas');
    canvas.width = W * this.scale;
    canvas.height = H * this.scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(this.scale, this.scale);

    // pass 1: natural surfaces, per pixel at half resolution. Cell colours are blended
    // bilinearly with noise-jittered weights so biome patches have organic edges.
    const hw = Math.ceil(W / 2);
    const hh = Math.ceil(H / 2);
    const low = document.createElement('canvas');
    low.width = hw;
    low.height = hh;
    const lctx = low.getContext('2d')!;
    const img = lctx.createImageData(hw, hh);
    const d = img.data;
    const biome = map.biome;
    const base = new Float32Array(N * N * 3);
    for (let i = 0; i < N * N; i++) {
      const g = map.ground[i] as Ground;
      const c = this.groundColor(CRISP.has(g) ? Ground.Concrete : g);
      base[i * 3] = c[0];
      base[i * 3 + 1] = c[1];
      base[i * 3 + 2] = c[2];
    }
    const iceTint = hex('#c8d6e4');
    const ox0 = this.originX;
    for (let py = 0; py < hh; py++) {
      for (let px = 0; px < hw; px++) {
        const a = (px * 2 + 1 + ox0) / ISO_W;
        const b = (py * 2 + 1) / ISO_H;
        const wx = (a + b) / 2;
        const wy = (b - a) / 2;
        const o = (py * hw + px) * 4;
        if (wx < 0 || wy < 0 || wx >= N || wy >= N) {
          d[o + 3] = 0;
          continue;
        }
        const n1 = fbm(wx * 0.07, wy * 0.07, seed, 3);
        const jitter = valueNoise(wx * 0.9, wy * 0.9, seed + 21) - 0.5;
        const fx = Math.min(N - 1.001, Math.max(0, wx - 0.5));
        const fy = Math.min(N - 1.001, Math.max(0, wy - 0.5));
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        let tx = fx - x0 + jitter * 0.9;
        let ty = fy - y0 - jitter * 0.9;
        tx = tx < 0 ? 0 : tx > 1 ? 1 : tx;
        ty = ty < 0 ? 0 : ty > 1 ? 1 : ty;
        tx = tx * tx * (3 - 2 * tx);
        ty = ty * ty * (3 - 2 * ty);
        const i00 = (y0 * N + x0) * 3;
        const i10 = i00 + 3;
        const i01 = i00 + N * 3;
        const i11 = i01 + 3;
        let r = (base[i00] * (1 - tx) + base[i10] * tx) * (1 - ty) + (base[i01] * (1 - tx) + base[i11] * tx) * ty;
        let gg = (base[i00 + 1] * (1 - tx) + base[i10 + 1] * tx) * (1 - ty) + (base[i01 + 1] * (1 - tx) + base[i11 + 1] * tx) * ty;
        let bb = (base[i00 + 2] * (1 - tx) + base[i10 + 2] * tx) * (1 - ty) + (base[i01 + 2] * (1 - tx) + base[i11 + 2] * tx) * ty;
        const g = map.ground[Math.floor(wy) * N + Math.floor(wx)] as Ground;
        const n2 = valueNoise(wx * 1.6, wy * 1.6, seed + 9);
        let k = 0.9 + n1 * 0.16 + (n2 - 0.5) * 0.05;
        if (biome === 'desert') k += Math.sin((wx * 0.8 + wy * 1.9) * 2.2 + n1 * 9) * 0.022;
        if (biome === 'snow') {
          const m = Math.max(0, n1 - 0.5) * 0.6;
          r += (iceTint[0] - r) * m;
          gg += (iceTint[1] - gg) * m;
          bb += (iceTint[2] - bb) * m;
          if (hash2(px, py, seed) > 0.996) k += 0.12;
          if (g === Ground.Ice) k += Math.sin((wx - wy) * 3) * 0.02;
        }
        if (g === Ground.Gravel) k += (hash2(px, py, seed + 3) - 0.5) * 0.12;
        d[o] = Math.min(255, r * k);
        d[o + 1] = Math.min(255, gg * k);
        d[o + 2] = Math.min(255, bb * k);
        d[o + 3] = 255;
      }
    }
    lctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(low, 0, 0, W, H);

    // pass 2: crisp man-made surfaces cell by cell
    const rng = new Rng(seed ^ 0xbeef);
    const diamond = (x: number, y: number, inset = 0) => {
      const ox = -this.originX;
      ctx.beginPath();
      ctx.moveTo(isoX(x + inset, y + inset) + ox, isoY(x + inset, y + inset));
      ctx.lineTo(isoX(x + 1 - inset, y + inset) + ox, isoY(x + 1 - inset, y + inset));
      ctx.lineTo(isoX(x + 1 - inset, y + 1 - inset) + ox, isoY(x + 1 - inset, y + 1 - inset));
      ctx.lineTo(isoX(x + inset, y + 1 - inset) + ox, isoY(x + inset, y + 1 - inset));
      ctx.closePath();
    };
    const P = (x: number, y: number): [number, number] => [isoX(x, y) - this.originX, isoY(x, y)];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const g = map.ground[y * N + x] as Ground;
        if (!CRISP.has(g)) continue;
        const base = this.groundColor(g);
        const n = fbm(x * 0.12, y * 0.12, seed + 5, 2);
        const c = shade(base, 0.93 + n * 0.12 + (hash2(x, y, seed) - 0.5) * 0.05);
        diamond(x, y, -0.02);
        ctx.fillStyle = rgbStr(c);
        ctx.fill();
        if (g === Ground.Sidewalk) {
          ctx.strokeStyle = 'rgba(0,0,0,0.13)';
          ctx.lineWidth = 0.8;
          diamond(x, y, 0.02);
          ctx.stroke();
        } else if (g === Ground.Tile) {
          ctx.strokeStyle = 'rgba(60,50,40,0.18)';
          ctx.lineWidth = 0.6;
          for (const t of [0.5]) {
            ctx.beginPath();
            ctx.moveTo(...P(x + t, y));
            ctx.lineTo(...P(x + t, y + 1));
            ctx.moveTo(...P(x, y + t));
            ctx.lineTo(...P(x + 1, y + t));
            ctx.stroke();
          }
        } else if (g === Ground.Plank) {
          ctx.strokeStyle = 'rgba(40,24,10,0.3)';
          ctx.lineWidth = 0.7;
          for (const t of [0.25, 0.5, 0.75]) {
            ctx.beginPath();
            ctx.moveTo(...P(x, y + t));
            ctx.lineTo(...P(x + 1, y + t));
            ctx.stroke();
          }
        } else if (g === Ground.Crosswalk) {
          ctx.fillStyle = 'rgba(225,222,210,0.8)';
          diamond(x, y, 0.18);
          ctx.fill();
        } else if (g === Ground.Asphalt) {
          if (rng.chance(0.05)) {
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            let px = x + rng.range(0.1, 0.9);
            let py = y + rng.range(0.1, 0.9);
            ctx.moveTo(...P(px, py));
            for (let k = 0; k < 3; k++) {
              px += rng.range(-0.4, 0.4);
              py += rng.range(-0.4, 0.4);
              ctx.lineTo(...P(px, py));
            }
            ctx.stroke();
          }
        }
      }
    // lane markings: dashed lines along the long axis of asphalt strips
    ctx.strokeStyle = 'rgba(232,214,140,0.55)';
    ctx.lineWidth = 1.4;
    for (let y = 1; y < N - 1; y++)
      for (let x = 1; x < N - 1; x++) {
        const g = map.ground[y * N + x];
        if (g !== Ground.Asphalt) continue;
        const up = map.ground[(y - 1) * N + x] === Ground.Asphalt;
        const dn = map.ground[(y + 1) * N + x] === Ground.Asphalt;
        const lf = map.ground[y * N + x - 1] === Ground.Asphalt;
        const rt = map.ground[y * N + x + 1] === Ground.Asphalt;
        // centre line of horizontal roads (width 4): boundary between rows y-1|y where both are asphalt and 2 rows each side
        if (x % 3 !== 0) continue;
        const twoUp = map.ground[(y - 2) * N + x] === Ground.Asphalt;
        const twoDn = y + 1 < N && map.ground[(y + 1) * N + x] === Ground.Asphalt;
        if (lf && rt && up && twoUp && dn && twoDn && map.ground[(y - 3) * N + x] !== Ground.Asphalt) {
          ctx.beginPath();
          ctx.moveTo(...P(x, y));
          ctx.lineTo(...P(x + 1.6, y));
          ctx.stroke();
        }
      }

    // pass 3: scatter details (pebbles, tufts, cracks, snow mounds)
    for (let i = 0; i < N * N * 0.35; i++) {
      const x = rng.range(0, N);
      const y = rng.range(0, N);
      const g = map.ground[Math.floor(y) * N + Math.floor(x)] as Ground;
      const [sx, sy] = P(x, y);
      if (g === Ground.Sand || g === Ground.SandDark || g === Ground.Dirt || g === Ground.Gravel) {
        ctx.fillStyle = rng.chance(0.5) ? 'rgba(90,70,45,0.35)' : 'rgba(255,245,220,0.3)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, rng.range(0.6, 1.8), rng.range(0.4, 1), 0, 0, Math.PI * 2);
        ctx.fill();
        if (biome === 'desert' && rng.chance(0.03)) {
          ctx.strokeStyle = 'rgba(110,100,50,0.7)';
          ctx.lineWidth = 1;
          for (let k = 0; k < 5; k++) {
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + rng.range(-4, 4), sy - rng.range(2, 6));
            ctx.stroke();
          }
        }
      } else if (g === Ground.Grass) {
        ctx.strokeStyle = rng.chance(0.5) ? 'rgba(70,90,40,0.6)' : 'rgba(130,140,70,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + rng.range(-2, 2), sy - rng.range(2, 4));
        ctx.stroke();
      } else if (g === Ground.Snow) {
        if (rng.chance(0.15)) {
          ctx.fillStyle = 'rgba(160,180,200,0.25)';
          ctx.beginPath();
          ctx.ellipse(sx, sy, rng.range(3, 8), rng.range(1.5, 3), 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (g === Ground.Concrete && biome === 'urban' && rng.chance(0.08)) {
        ctx.fillStyle = 'rgba(40,36,30,0.18)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, rng.range(3, 9), rng.range(1.5, 4), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // urban: scattered litter/rubble flecks; desert: tyre tracks along dirt
    if (biome === 'urban') {
      for (let i = 0; i < N * 10; i++) {
        const [sx, sy] = P(rng.range(0, N), rng.range(0, N));
        ctx.fillStyle = `rgba(${rng.int(60, 120)},${rng.int(55, 100)},${rng.int(50, 90)},0.5)`;
        ctx.fillRect(sx, sy, rng.range(1, 2.5), rng.range(1, 2));
      }
    }
    // soft vignette of the map edge
    const ox = -this.originX;
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const edge = 6;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let k = 0; k < edge; k++) {
      const a = 0.05 * (1 - k / edge);
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.beginPath();
      ctx.moveTo(isoX(k, k) + ox, isoY(k, k));
      ctx.lineTo(isoX(N - k, k) + ox, isoY(N - k, k));
      ctx.lineTo(isoX(N - k, N - k) + ox, isoY(N - k, N - k));
      ctx.lineTo(isoX(k, N - k) + ox, isoY(k, N - k));
      ctx.closePath();
      ctx.rect(0, 0, W, H);
      ctx.fill('evenodd');
    }
    ctx.restore();
    return canvas;
  }

  // ---------------------------------------------------------------------------
  // shadows
  // ---------------------------------------------------------------------------

  /** Shadow offset (metres) per metre of height: sun from the upper-left. */
  static readonly SUN = { x: 0.36 * 0.85, y: -0.93 * 0.85 };

  private bakeShadows() {
    const map = this.map;
    const N = map.w;
    const c = this.shadowCanvas;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.setTransform(0.5, 0, 0, 0.5, -this.originX * 0.5, 0);
    const P = (x: number, y: number): [number, number] => [isoX(x, y), isoY(x, y)];
    const sun = GroundLayer.SUN;
    // ambient occlusion pass (wide, faint)
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const k = map.cells[y * N + x] as Cell;
        if (k === Cell.Empty || k === Cell.Rubble) continue;
        const h = CELL_INFO[k].height;
        if (h < 0.5) continue;
        const sx = sun.x * h * (k === Cell.Tree ? 0.8 : 1);
        const sy = sun.y * h * (k === Cell.Tree ? 0.8 : 1);
        const inset = k === Cell.Tree ? 0.3 : k === Cell.Rock ? 0.12 : 0;
        const pts = [P(x + inset, y + inset), P(x + 1 - inset, y + inset), P(x + 1 - inset + sx, y + inset + sy), P(x + 1 - inset + sx, y + 1 - inset + sy), P(x + inset + sx, y + 1 - inset + sy), P(x + inset, y + 1 - inset)];
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
      }
    ctx.globalAlpha = 0.46;
    try {
      ctx.filter = 'blur(1.5px)';
    } catch {
      /* filter unsupported */
    }
    ctx.fill('nonzero');
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Request a shadow re-bake (structures changed). Throttled. */
  invalidateShadows() {
    this.shadowDirty = true;
  }

  update(time: number) {
    if (this.shadowDirty && time - this.lastShadowBake > 400) {
      this.shadowDirty = false;
      this.lastShadowBake = time;
      this.bakeShadows();
      const tex = this.scene.textures.get(this.shadowKey) as Phaser.Textures.CanvasTexture;
      tex.refresh?.();
    }
  }

  // ---------------------------------------------------------------------------
  // decals
  // ---------------------------------------------------------------------------

  /** Stamp a decal texture at world (x, y). */
  stamp(key: string, x: number, y: number, opts: { scale?: number; alpha?: number; tint?: number; angle?: number } = {}) {
    const sx = (isoX(x, y) - this.originX) * this.scale;
    const sy = isoY(x, y) * this.scale;
    this.rt.stamp(key, undefined, sx, sy, {
      alpha: opts.alpha ?? 1,
      tint: opts.tint ?? 0xffffff,
      angle: opts.angle ?? 0,
      scale: (opts.scale ?? 1) * this.scale,
      originX: 0.5,
      originY: 0.5,
    });
  }

  destroy() {
    this.rt.destroy();
    this.shadow.destroy();
    if (this.scene.textures.exists(this.shadowKey)) this.scene.textures.remove(this.shadowKey);
  }
}
