import Phaser from 'phaser';

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Observer camera: drag to pan, wheel zoom anchored at the cursor, WASD/arrow
 * keys, optional edge scrolling, follow-a-target and a slow cinematic drift.
 */
export class CameraController {
  readonly cam: Phaser.Cameras.Scene2D.Camera;
  zoom = 1;
  private targetZoom = 1;
  private dragging = false;
  private downAt: { x: number; y: number; sx: number; sy: number } | null = null;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  follow: (() => { x: number; y: number } | null) | null = null;
  cinematic: (() => { x: number; y: number } | null) | null = null;
  edgeScroll = false;
  onClick: ((wx: number, wy: number, double: boolean) => void) | null = null;
  onHover: ((wx: number, wy: number) => void) | null = null;
  private lastClick = 0;
  private cineTarget = { x: 0, y: 0 };
  private cineT = 0;
  minZoom = 0.3;
  maxZoom = 3.2;
  private pointerInside = true;

  constructor(
    private scene: Phaser.Scene,
    public bounds: Bounds,
  ) {
    this.cam = scene.cameras.main;
    const input = scene.input;
    input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.event.target !== scene.game.canvas) return;
      this.downAt = { x: p.x, y: p.y, sx: this.cam.scrollX, sy: this.cam.scrollY };
      this.dragging = false;
    });
    input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.pointerInside = true;
      if (this.downAt && p.isDown) {
        const dx = p.x - this.downAt.x;
        const dy = p.y - this.downAt.y;
        if (!this.dragging && Math.hypot(dx, dy) > 5) {
          this.dragging = true;
          this.follow = null;
        }
        if (this.dragging) {
          this.cam.scrollX = this.downAt.sx - dx / this.cam.zoom;
          this.cam.scrollY = this.downAt.sy - dy / this.cam.zoom;
          this.clamp();
        }
      } else if (this.onHover) {
        const w = this.toWorld(p.x, p.y);
        this.onHover(w.x, w.y);
      }
    });
    input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.downAt && !this.dragging && p.event.target === scene.game.canvas) {
        const w = this.toWorld(p.x, p.y);
        const now = performance.now();
        const dbl = now - this.lastClick < 320;
        this.lastClick = now;
        this.onClick?.(w.x, w.y, dbl);
      }
      this.downAt = null;
      this.dragging = false;
    });
    input.on('gameout', () => {
      this.pointerInside = false;
    });
    input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      const factor = Math.exp(-dy * 0.0015);
      this.zoomAt(this.targetZoom * factor, p.x, p.y);
    });
    const kb = input.keyboard;
    if (kb) {
      for (const k of ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'Q', 'E']) this.keys[k] = kb.addKey(k, false, false);
    }
  }

  /** Screen (canvas px) -> world (scene px). */
  toWorld(px: number, py: number) {
    const c = this.cam;
    const ox = c.width * c.originX;
    const oy = c.height * c.originY;
    return { x: (px - ox) / c.zoom + ox + c.scrollX, y: (py - oy) / c.zoom + oy + c.scrollY };
  }

  zoomAt(z: number, px: number, py: number) {
    const nz = Phaser.Math.Clamp(z, this.minZoom, this.maxZoom);
    const w = this.toWorld(px, py);
    this.targetZoom = nz;
    this.anchor = { wx: w.x, wy: w.y, px, py };
  }

  private anchor: { wx: number; wy: number; px: number; py: number } | null = null;

  setZoom(z: number) {
    this.targetZoom = Phaser.Math.Clamp(z, this.minZoom, this.maxZoom);
    this.zoom = this.targetZoom;
    this.cam.setZoom(this.zoom);
    this.anchor = null;
  }

  centerOn(x: number, y: number) {
    this.cam.centerOn(x, y);
    this.clamp();
  }

  panTo(x: number, y: number) {
    this.cam.pan(x, y, 500, 'Sine.easeInOut');
  }

  private clamp() {
    const c = this.cam;
    const b = this.bounds;
    const cx = c.scrollX + c.width / 2;
    const cy = c.scrollY + c.height / 2;
    const nx = Phaser.Math.Clamp(cx, b.minX, b.maxX);
    const ny = Phaser.Math.Clamp(cy, b.minY, b.maxY);
    c.scrollX += nx - cx;
    c.scrollY += ny - cy;
  }

  update(dt: number) {
    const c = this.cam;
    // smooth zoom, keeping the anchor point under the cursor
    if (Math.abs(this.zoom - this.targetZoom) > 1e-4) {
      this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 14);
      if (Math.abs(this.zoom - this.targetZoom) < 1e-3) this.zoom = this.targetZoom;
      c.setZoom(this.zoom);
      if (this.anchor) {
        const ox = c.width * c.originX;
        const oy = c.height * c.originY;
        c.scrollX = this.anchor.wx - ox - (this.anchor.px - ox) / this.zoom;
        c.scrollY = this.anchor.wy - oy - (this.anchor.py - oy) / this.zoom;
      }
    } else this.anchor = null;
    // keyboard pan
    const k = this.keys;
    const speed = (760 / this.zoom) * dt;
    let mx = 0;
    let my = 0;
    if (k.A?.isDown || k.LEFT?.isDown) mx -= 1;
    if (k.D?.isDown || k.RIGHT?.isDown) mx += 1;
    if (k.W?.isDown || k.UP?.isDown) my -= 1;
    if (k.S?.isDown || k.DOWN?.isDown) my += 1;
    if (k.Q?.isDown) this.zoomAt(this.targetZoom * (1 - dt * 1.5), c.width / 2, c.height / 2);
    if (k.E?.isDown) this.zoomAt(this.targetZoom * (1 + dt * 1.5), c.width / 2, c.height / 2);
    if (this.edgeScroll && this.pointerInside && !this.downAt) {
      const p = this.scene.input.activePointer;
      const m = 14;
      if (p.x < m) mx -= 1;
      if (p.x > c.width - m) mx += 1;
      if (p.y < m) my -= 1;
      if (p.y > c.height - m) my += 1;
    }
    if (mx || my) {
      this.follow = null;
      c.scrollX += mx * speed;
      c.scrollY += my * speed;
    }
    // follow / cinematic
    const f = this.follow?.();
    if (f) {
      const cx = c.scrollX + c.width / 2;
      const cy = c.scrollY + c.height / 2;
      const k2 = Math.min(1, dt * 4);
      c.scrollX += (f.x - cx) * k2;
      c.scrollY += (f.y - cy) * k2;
    } else if (this.cinematic && !this.dragging) {
      this.cineT -= dt;
      if (this.cineT <= 0) {
        const t = this.cinematic();
        if (t) this.cineTarget = t;
        this.cineT = 5;
      }
      const cx = c.scrollX + c.width / 2;
      const cy = c.scrollY + c.height / 2;
      const k2 = Math.min(1, dt * 0.35);
      c.scrollX += (this.cineTarget.x - cx) * k2;
      c.scrollY += (this.cineTarget.y - cy) * k2;
    }
    this.clamp();
  }

  destroy() {
    this.scene.input.removeAllListeners();
  }
}
