import type Phaser from 'phaser';

export interface AtlasFrame {
  key: string;
  frame: string;
}

interface Page {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  shelfH: number;
}

interface PendingFrame {
  name: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Anchor in frame pixels. */
  ax: number;
  ay: number;
}

const PAD = 2;

/**
 * Shelf-packs procedurally drawn frames into 2048² canvas pages and registers
 * them as Phaser canvas textures with per-frame pivots (the unit's feet).
 */
export class AtlasBuilder {
  private pages: Page[] = [];
  private frames: PendingFrame[] = [];
  readonly lookup = new Map<string, AtlasFrame>();

  constructor(
    readonly prefix: string,
    readonly size = 2048,
  ) {}

  private newPage(): Page {
    const canvas = document.createElement('canvas');
    canvas.width = this.size;
    canvas.height = this.size;
    const ctx = canvas.getContext('2d')!;
    const page = { canvas, ctx, x: PAD, y: PAD, shelfH: 0 };
    this.pages.push(page);
    return page;
  }

  /** Copy region `r` of `src` into the atlas; (ax, ay) is the anchor in `src` coordinates. */
  add(name: string, src: CanvasImageSource, r: { x: number; y: number; w: number; h: number }, ax: number, ay: number) {
    let page = this.pages[this.pages.length - 1] ?? this.newPage();
    if (page.x + r.w + PAD > this.size) {
      page.x = PAD;
      page.y += page.shelfH + PAD;
      page.shelfH = 0;
    }
    if (page.y + r.h + PAD > this.size) {
      page = this.newPage();
    }
    page.ctx.drawImage(src, r.x, r.y, r.w, r.h, page.x, page.y, r.w, r.h);
    this.frames.push({ name, page: this.pages.length - 1, x: page.x, y: page.y, w: r.w, h: r.h, ax: ax - r.x, ay: ay - r.y });
    page.x += r.w + PAD;
    page.shelfH = Math.max(page.shelfH, r.h);
  }

  /** Register all pages as textures. Safe to call once per builder. */
  commit(textures: Phaser.Textures.TextureManager) {
    this.pages.forEach((p, i) => {
      const key = `${this.prefix}${i}`;
      if (textures.exists(key)) textures.remove(key);
      const tex = textures.addCanvas(key, p.canvas)!;
      for (const f of this.frames) {
        if (f.page !== i) continue;
        const fr = tex.add(f.name, 0, f.x, f.y, f.w, f.h);
        if (fr) {
          fr.customPivot = true;
          fr.pivotX = f.ax / f.w;
          fr.pivotY = f.ay / f.h;
        }
        this.lookup.set(f.name, { key, frame: f.name });
      }
    });
    this.frames = [];
  }

  get pageCount() {
    return this.pages.length;
  }
}

export const nextFrame = () => new Promise<void>((r) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(() => r()) : setTimeout(r, 0)));
