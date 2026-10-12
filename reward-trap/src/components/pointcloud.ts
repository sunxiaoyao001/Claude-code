import {random} from 'remotion';

export type P3 = {x: number; y: number; z: number; w: number};

const gauss = (d2: number, s: number) => Math.exp(-d2 / (2 * s * s));

/**
 * A generic human head as a surface point cloud: cranium, face plane with nose, brow, lips, chin,
 * ears and neck. Units ≈ head half-height. Front of the face is +z.
 */
let headCache: P3[] | null = null;
export const headPoints = (n = 4200): P3[] => {
  if (headCache) return headCache;
  const pts: P3[] = [];
  let k = 0;
  while (pts.length < n && k < n * 6) {
    k++;
    // uniform direction
    const u = random(`hu${k}`) * 2 - 1;
    const th = random(`ht${k}`) * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const dx = s * Math.cos(th);
    const dy = u;
    const dz = s * Math.sin(th);
    // cranium: wider at the back-top, narrower jaw
    let rx = 0.72;
    let ry = 0.98;
    let rz = 0.86;
    if (dy < -0.2) {
      const j = (-dy - 0.2) / 0.8;
      rx *= 1 - 0.32 * j;
      rz *= 1 - 0.1 * j * (dz < 0 ? 1.6 : 0.4);
    }
    let x = dx * rx;
    let y = dy * ry + 0.05;
    let z = dz * rz;
    if (dz > 0) {
      // flatten the face plane a little, then add features
      z *= 0.92;
      const nose = gauss(x * x * 3.2 + (y + 0.08) ** 2 * 0.9, 0.12) * 0.2;
      const brow = gauss(x * x * 0.25 + (y - 0.22) ** 2 * 6, 0.12) * 0.05;
      const lips = gauss(x * x * 1.2 + (y + 0.42) ** 2 * 8, 0.12) * 0.06;
      const chin = gauss(x * x * 1.0 + (y + 0.68) ** 2 * 6, 0.14) * 0.07;
      const eyes = gauss((Math.abs(x) - 0.27) ** 2 * 4 + (y - 0.08) ** 2 * 8, 0.1) * -0.06;
      z += (nose + brow + lips + chin + eyes) * (0.4 + 0.6 * dz);
    }
    // ears
    const ear = gauss((y - 0.0) ** 2 * 3 + (z + 0.05) ** 2 * 6, 0.1) * 0.08 * (Math.abs(dx) > 0.85 ? 1 : 0);
    x += Math.sign(dx) * ear;
    // keep density roughly even on the surface
    if (random(`hk${k}`) > 0.55 + 0.45 * Math.abs(dz)) continue;
    pts.push({x, y, z, w: random(`hw${k}`)});
  }
  // neck
  for (let i = 0; i < n * 0.08; i++) {
    const a = random(`na${i}`) * Math.PI * 2;
    const h = random(`nh${i}`);
    pts.push({x: Math.cos(a) * 0.3, y: -0.82 - h * 0.42, z: Math.sin(a) * 0.3 - 0.12, w: random(`nw${i}`)});
  }
  // shoulders: a broad curved yoke that fades out at the bottom
  for (let i = 0; i < n * 0.22; i++) {
    const u = random(`su${i}`) * 2 - 1;
    const v = random(`sv${i}`);
    const x = u * 1.35;
    const y = -1.22 - v * 0.55 - Math.pow(Math.abs(u), 2.2) * 0.35;
    const z = (random(`sz${i}`) - 0.5) * 0.7 * Math.sqrt(1 - u * u * 0.6) - 0.1;
    if (random(`sk${i}`) > 1 - v * 0.5) continue;
    pts.push({x, y, z, w: random(`sw${i}`)});
  }
  headCache = pts;
  return pts;
};

export type Card3 = {x: number; y: number; z: number; tint: number; s: number};

/** A spiral galaxy of video thumbnails. */
let galaxyCache: Card3[] | null = null;
export const galaxyCards = (n = 2200): Card3[] => {
  if (galaxyCache) return galaxyCache;
  const out: Card3[] = [];
  for (let i = 0; i < n; i++) {
    const arm = i % 3;
    const t = Math.pow(random(`gt${i}`), 0.7);
    const r = 0.12 + t * 1.0;
    const a = arm * ((Math.PI * 2) / 3) + t * 5.2 + (random(`ga${i}`) - 0.5) * 0.55;
    const spread = 0.05 + t * 0.1;
    out.push({
      x: Math.cos(a) * r + (random(`gx${i}`) - 0.5) * spread,
      y: (random(`gy${i}`) - 0.5) * 0.06 * (1 - t * 0.5),
      z: Math.sin(a) * r + (random(`gz${i}`) - 0.5) * spread,
      tint: Math.floor(random(`gc${i}`) * 9),
      s: 0.6 + random(`gs${i}`) * 0.8,
    });
  }
  galaxyCache = out;
  return out;
};
