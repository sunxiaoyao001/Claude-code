// One frame of the film: pick the inks on screen, draw each scene in each ink, add the corner labels.
import { staticFile } from 'remotion';
import { clamp, CX, CY, DURATION, expoInOut, H, P, polygon, seg, W } from './lib/core';
import { loadGlyphFont } from './lib/font';
import { BlueprintInk, C, HoloInk, Ink, InkKind, PaperInk } from './lib/ink';
import { floodR, hookAndType, curves, morphAndTile } from './scenes/paper';
import { blueprint } from './scenes/blueprint';
import { hologram } from './scenes/holo';

export const BAR_NAMES = ['DRAFT', 'TYPE', 'CURVE', 'MORPH', 'TILE', 'SOLID', 'GEAR', 'PANEL', 'DATA', 'LIGHT', 'WAVE', 'GLOBE', 'DRUM', 'FORM', 'END'];

let inks: Record<InkKind, Ink> | null = null;
let loading: Promise<void> | null = null;

export const loadAssets = () => {
  if (!loading) {
    loading = (async () => {
      const faces = [
        ['Geist-SemiBold.ttf', '600'],
        ['Geist-Bold.ttf', '700'],
        ['Geist-Black.ttf', '800'],
        ['Geist-UltraBlack.ttf', '900'],
      ].map(([f, w]) => new FontFace('Geist', `url(${staticFile(`fonts/${f}`)})`, { weight: w }));
      await Promise.all(faces.map((f) => f.load()));
      faces.forEach((f) => (document.fonts as any).add(f));
      await loadGlyphFont(staticFile('fonts/Geist-UltraBlack.ttf'));
      inks = { paper: new PaperInk(), blue: new BlueprintInk(), holo: new HoloInk() };
    })();
  }
  return loading;
};

// ------------------------------------------------------------------ scenes
const scene = (k: Ink, t: number) => {
  if (k.kind === 'paper') {
    if (t < 4.05) hookAndType(k, t);
    else if (t < 5.95) curves(k, t);
    else if (t < 10.0) morphAndTile(k, t);
    else hologram(k, t);
  } else if (k.kind === 'blue') blueprint(k, t);
  else hologram(k, t);
};

// ------------------------------------------------------------------ ink regions
type Region = { kind: InkKind; clip?: (ctx: CanvasRenderingContext2D) => void };

/** The scan line between blueprint and hologram, and between hologram and paper. */
export const scanY = (t: number) => {
  if (t >= 17.45 && t < 18.0) return -20 + (H + 40) * expoInOut(seg(t, 17.45, 18.0));
  if (t >= 27.95 && t < 28.5) return -20 + (H + 40) * expoInOut(seg(t, 27.95, 28.5));
  return null;
};

const regions = (t: number): Region[] => {
  const half = (kind: InkKind, above: boolean, y: number): Region => ({
    kind,
    clip: (ctx) => ctx.rect(0, above ? 0 : y, W, above ? y : H - y),
  });
  if (t < 9.6) return [{ kind: 'paper' }];
  if (t < 10.0) {
    const hex = polygon(6, floodR(t), -Math.PI / 2, [CX, CY]);
    return [
      { kind: 'paper' },
      {
        kind: 'blue',
        clip: (ctx) => {
          ctx.moveTo(hex[0][0], hex[0][1]);
          hex.slice(1).forEach((p: P) => ctx.lineTo(p[0], p[1]));
          ctx.closePath();
        },
      },
    ];
  }
  if (t < 17.45) return [{ kind: 'blue' }];
  if (t < 18.0) {
    const y = scanY(t)!;
    return [half('holo', true, y), half('blue', false, y)];
  }
  if (t < 27.95) return [{ kind: 'holo' }];
  if (t < 28.5) {
    const y = scanY(t)!;
    return [half('paper', true, y), half('holo', false, y)];
  }
  return [{ kind: 'paper' }];
};

// ------------------------------------------------------------------ corner labels
const pad2 = (n: number) => String(n).padStart(2, '0');
const cornerLabels = (k: Ink, t: number) => {
  const bar = clamp(Math.floor(t / 2), 0, 14);
  const beat = clamp(Math.floor(t / 0.5) + 1, 1, 60);
  k.text(`FIG. ${pad2(bar + 1)} — ${BAR_NAMES[bar]}`, 150, 90 + 19, { size: 26, weight: 800, track: 0.2 });
  k.text(`BEAT ${pad2(beat)} / 60`, 1770, 990, { size: 26, weight: 800, track: 0.2, align: 'right' });
};

export const renderFrame = (ctx: CanvasRenderingContext2D, time: number) => {
  if (!inks) return;
  const t = ((time % DURATION) + DURATION) % DURATION;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  for (const r of regions(t)) {
    const k = inks[r.kind];
    ctx.save();
    if (r.clip) {
      ctx.beginPath();
      r.clip(ctx);
      ctx.clip();
    }
    k.begin(ctx, t);
    scene(k, t);
    cornerLabels(k, t);
    k.end();
    ctx.restore();
  }
  // the scan line itself: the accent of the ink it leaves behind
  const y = scanY(t);
  if (y !== null) {
    const white = t > 20;
    ctx.save();
    ctx.fillStyle = white ? C.white : C.cyan;
    ctx.fillRect(0, y - 2, W, 4);
    if (!white) {
      ctx.fillStyle = C.white;
      ctx.fillRect(0, y - 0.6, W, 1.2);
    }
    ctx.restore();
  }
  ctx.restore();
};
