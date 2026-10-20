// Browser side of scripts/render-samples.mjs: renders sample photos through the real pipeline for each
// built-in pack (the same code path as a capture), then composes thumbnails and contact sheets.
import { computeViewTransform } from '/core/camera/viewTransform';
import { GLRenderer } from '/core/gl/GLRenderer';
import { captureSize, Pipeline } from '/core/gl/Pipeline';
import { rollShot } from '/core/gl/shotRandom';
import { BUILTIN_PACKS } from '/core/pack/builtinPacks';
import { parseAspect } from '/core/pack/FilterParams';
import { buildCatalog } from '/core/pack/PackStore';
import { drawDateStamp } from '/core/stamp/DateStamp';
import { formatStamp } from '/core/stamp/sevenSegment';

const catalog = buildCatalog(BUILTIN_PACKS);
const BG = '#0D0D0F';
const TEXT_0 = '#F5F4F0';
const TEXT_1 = '#8E8E93';
const FONT = '"PingFang SC", "WenQuanYi Zen Hei", sans-serif';
// A fixed date for the stamp so sheets are reproducible.
const STAMP_DATE = new Date(2026, 9, 19, 17, 42);

let gl = null;
function context() {
  if (gl) return gl;
  const canvas = document.createElement('canvas');
  canvas.createImage = () => new Image();
  const renderer = GLRenderer.create(canvas, 4, 4);
  if (!renderer) throw new Error('WebGL unavailable');
  gl = { canvas, renderer, pipeline: new Pipeline(renderer), luts: new Map(), photos: new Map() };
  return gl;
}

async function texture(cache, src) {
  const { renderer } = context();
  if (cache.has(src)) return cache.get(src);
  const image = await renderer.loadImage(src);
  const tex = renderer.createTexture();
  renderer.uploadImage(tex, image);
  const entry = { texture: tex, width: image.width, height: image.height };
  cache.set(src, entry);
  return entry;
}

/** Renders one pack onto a new 2D canvas of the given size (cover crop of the photo). */
async function renderPack(pack, photoSrc, width, height, { seed = 7, leak = false, stamp = false } = {}) {
  const ctx = context();
  const photo = await texture(ctx.photos, photoSrc);
  const lut = await texture(ctx.luts, `/assets/luts/${pack.filter.lut.id}.png`);
  ctx.pipeline.setLook(pack.filter, lut.texture);
  const shot = rollShot(seed, pack.filter);
  const uv = computeViewTransform({ frameWidth: photo.width, frameHeight: photo.height, viewWidth: width, viewHeight: height, rotation: 0, mirror: false }).matrix;
  ctx.pipeline.renderCapture({ texture: photo.texture, width: photo.width, height: photo.height }, uv, width, height, leak ? shot : { ...shot, leak: null });
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const g = out.getContext('2d');
  // Same task as the draw, so the WebGL drawing buffer is still valid.
  g.drawImage(ctx.canvas, 0, 0);
  if (stamp && pack.filter.dateStamp.enabled) drawDateStamp(g, formatStamp(STAMP_DATE), width, height);
  return out;
}

export function packIds() {
  return catalog.packs.map((pack) => pack.id);
}

export async function thumbnail(id, photoSrc, size, quality) {
  const pack = catalog.packs.find((p) => p.id === id);
  const canvas = await renderPack(pack, photoSrc, size, size);
  return canvas.toDataURL('image/jpeg', quality);
}

/** Full-size render at the pack's aspect for UI previews (no stamp; leak optional). */
export async function frame(id, photoSrc, width, height, options) {
  const pack = catalog.packs.find((p) => p.id === id);
  const canvas = await renderPack(pack, photoSrc, width, height, options);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** Contact sheet: one cell per pack, grouped by series, with name, prototype and the date stamp. */
export async function sheet(photoSrc, { columns = 5, cell = 260, quality = 0.9, ids = packIds(), seed = 7, leak = false } = {}) {
  const packs = ids.map((id) => catalog.packs.find((p) => p.id === id));
  const pad = 20;
  const label = 58;
  const cellH = Math.round(cell * 4 / 3);
  const rows = Math.ceil(packs.length / columns);
  const out = document.createElement('canvas');
  out.width = pad + columns * (cell + pad);
  out.height = pad + rows * (cellH + label + pad);
  const g = out.getContext('2d');
  g.fillStyle = BG;
  g.fillRect(0, 0, out.width, out.height);
  for (let i = 0; i < packs.length; i++) {
    const pack = packs[i];
    const x = pad + (i % columns) * (cell + pad);
    const y = pad + Math.floor(i / columns) * (cellH + label + pad);
    // Each pack at its own aspect, as large as fits the 3:4 cell.
    const aspect = parseAspect(pack.filter.frame.aspectRatio);
    const fit = captureSize(cell, cellH, pack.filter.frame.aspectRatio);
    const w = aspect >= cell / cellH ? cell : fit.width;
    const h = Math.round(w / aspect);
    const rendered = await renderPack(pack, photoSrc, w * 2, h * 2, { seed: seed + i, leak, stamp: true });
    g.drawImage(rendered, x + (cell - w) / 2, y + (cellH - h) / 2, w, h);
    g.strokeStyle = '#26262A';
    g.lineWidth = 1;
    g.strokeRect(x + (cell - w) / 2 + 0.5, y + (cellH - h) / 2 + 0.5, w - 1, h - 1);
    g.fillStyle = pack.ui.themeColor;
    g.beginPath();
    g.arc(x + 5, y + cellH + 19, 5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = TEXT_0;
    g.font = `20px ${FONT}`;
    g.fillText(pack.name, x + 16, y + cellH + 26);
    const nameWidth = g.measureText(pack.name).width;
    g.fillStyle = TEXT_1;
    g.font = `600 11px ${FONT}`;
    g.fillText(`${pack.series.letter} · ${pack.latinName.toUpperCase()}${pack.free ? ' · FREE' : ''}`, x + 24 + nameWidth, y + cellH + 25);
    g.font = `12px ${FONT}`;
    g.fillText(pack.inspiredBy.slice(0, 30), x, y + cellH + 48);
  }
  return out.toDataURL('image/jpeg', quality);
}
