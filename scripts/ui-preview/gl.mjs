// Browser side of scripts/ui-preview.mjs: paints the viewfinder canvas with the real preview pipeline
// (sample photo standing in for the camera feed) and settles layout the way the page code would.
import { toCanvasViewport } from '/core/camera/frameLayout';
import { computeViewTransform } from '/core/camera/viewTransform';
import { GLRenderer } from '/core/gl/GLRenderer';
import { Pipeline } from '/core/gl/Pipeline';
import { BUILTIN_PACKS } from '/core/pack/builtinPacks';
import { buildCatalog } from '/core/pack/PackStore';

const catalog = buildCatalog(BUILTIN_PACKS);

async function upload(renderer, src) {
  const image = await renderer.loadImage(src);
  const texture = renderer.createTexture();
  renderer.uploadImage(texture, image);
  return { texture, width: image.width, height: image.height };
}

export async function paint({ packId, sample, frame, pixelRatio, grainSeed = 3.7, raw = false }) {
  const canvas = document.getElementById('viewfinder-gl');
  if (!canvas) return;
  canvas.createImage = () => new Image();
  const width = Math.round(canvas.clientWidth * pixelRatio);
  const height = Math.round(canvas.clientHeight * pixelRatio);
  const renderer = GLRenderer.create(canvas, width, height);
  if (!renderer) throw new Error('WebGL unavailable');
  const pack = catalog.packs.find((p) => p.id === packId);
  const pipeline = new Pipeline(renderer);
  pipeline.setLook(pack.filter, (await upload(renderer, `/assets/luts/${pack.filter.lut.id}.png`)).texture);
  const photo = await upload(renderer, sample);
  const viewport = toCanvasViewport(frame, pixelRatio, height);
  const uv = computeViewTransform({ frameWidth: photo.width, frameHeight: photo.height, viewWidth: viewport.width, viewHeight: viewport.height, rotation: 0, mirror: false }).matrix;
  pipeline.renderPreview(photo, { frameRect: viewport, uvMatrix: uv, halation: true, grainSeed, raw, grayscale: false });
}

export function controlsTop() {
  return document.getElementById('controls')?.getBoundingClientRect().top ?? window.innerHeight;
}

/** What film-roll-strip does after measuring: scroll so the active card sits in the centre. */
export function centreStrip() {
  const scroll = document.querySelector('.strip-scroll');
  const active = document.querySelector('.strip-item--active');
  if (!scroll || !active) return;
  scroll.scrollLeft = active.offsetLeft + active.offsetWidth / 2 - scroll.clientWidth / 2;
}

export async function settle() {
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => (img.complete ? null : img.decode().catch(() => null))));
}
