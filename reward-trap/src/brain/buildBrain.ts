import * as THREE from 'three';
import {ICO_FREQ, buildAdjacency, fissure, makeIcosphere, makeNoise3, shapeHemisphere} from './geometry';

const srgb = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

const TISSUE = {
  crown: srgb(0.88, 0.66, 0.58),
  mid: srgb(0.76, 0.46, 0.43),
  sulcus: srgb(0.25, 0.05, 0.08),
  vessel: srgb(0.55, 0.08, 0.12),
};

export type BrainParts = {
  hemiR: THREE.BufferGeometry;
  hemiL: THREE.BufferGeometry;
  cerebellum: THREE.BufferGeometry;
  stem: THREE.BufferGeometry;
};

let cache: BrainParts | null = null;

const smoothField = (field: Float32Array, offs: Uint32Array, nbr: Uint32Array, passes: number): Float32Array => {
  let a: Float32Array = field;
  let b: Float32Array = new Float32Array(field.length);
  for (let p = 0; p < passes; p++) {
    for (let i = 0; i < a.length; i++) {
      let s = a[i] * 2;
      let c = 2;
      for (let k = offs[i]; k < offs[i + 1]; k++) {
        s += a[nbr[k]];
        c++;
      }
      b[i] = s / c;
    }
    [a, b] = [b, a];
  }
  return a;
};

const percentile = (arr: Float32Array, q: number) => {
  const s = Float32Array.from(arr).sort();
  return s[Math.floor(q * (s.length - 1))];
};

const buildHemi = (
  unitBase: Float32Array,
  idx: Uint32Array,
  folds: Uint8Array,
  offset: number,
  side: 1 | -1,
  adj: {offs: Uint32Array; nbr: Uint32Array},
  baseNormals: Float32Array,
) => {
  const n = unitBase.length / 3;
  let f: Float32Array = new Float32Array(n);
  for (let i = 0; i < n; i++) f[i] = folds[offset + i] / 255;
  f = smoothField(f, adj.offs, adj.nbr, 3);
  const lo = percentile(f, 0.03);
  const hi = percentile(f, 0.97);
  const noise = makeNoise3(side === 1 ? 101 : 202);
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const crown = new Float32Array(n);
  const tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = unitBase[i * 3], y = unitBase[i * 3 + 1], z = unitBase[i * 3 + 2];
    const t = Math.min(1, Math.max(0, (f[i] - lo) / (hi - lo)));
    // v-rich stripes become the sulci: narrow, deep clefts; the rest swells into rounded gyri.
    // Vary gyral width across the cortex so it never reads as a uniform maze.
    const a = 0.5 + noise(x * 3.1 + 5, y * 3.1, z * 3.1) * 0.09;
    const g = 1 - THREE.MathUtils.smoothstep(t, a, a + 0.34);
    const {syl, cen} = fissure(x, y, z);
    const medial = Math.max(0, 1 - (x - 0.016) / 0.05); // gentler folds on the flat medial wall
    const fold = -0.028 * Math.pow(1 - g, 1.1) * (1 - 0.5 * medial);
    const disp = fold - 0.028 * syl - 0.01 * cen + noise(x * 4, y * 4, z * 4) * 0.006;
    pos[i * 3] = (x + baseNormals[i * 3] * disp) * side;
    pos[i * 3 + 1] = y + baseNormals[i * 3 + 1] * disp;
    pos[i * 3 + 2] = z + baseNormals[i * 3 + 2] * disp;
    const ao = Math.min(1, Math.pow(g, 0.9) * (1 - 0.6 * syl));
    crown[i] = ao;
    tmp.copy(TISSUE.sulcus).lerp(TISSUE.mid, Math.min(1, ao * 1.6)).lerp(TISSUE.crown, Math.max(0, ao - 0.55) / 0.45);
    // Surface vessels: thin meandering lines riding the gyri.
    const vn = Math.abs(noise(x * 7 + 3, y * 7, z * 7 + noise(x * 3, y * 3, z * 3) * 0.6));
    const vessel = (1 - THREE.MathUtils.smoothstep(vn, 0.0, 0.022)) * 0.35 * ao;
    tmp.lerp(TISSUE.vessel, vessel);
    const shade = 1 + noise(x * 2.5 + 9, y * 2.5, z * 2.5) * 0.07;
    col[i * 3] = tmp.r * shade;
    col[i * 3 + 1] = tmp.g * shade;
    col[i * 3 + 2] = tmp.b * shade;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('crown', new THREE.BufferAttribute(crown, 1));
  let index = idx;
  if (side === -1) {
    index = new Uint32Array(idx.length);
    for (let t = 0; t < idx.length; t += 3) {
      index[t] = idx[t];
      index[t + 1] = idx[t + 2];
      index[t + 2] = idx[t + 1];
    }
  }
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeVertexNormals();
  return geo;
};

const buildCerebellum = () => {
  const {pos: unit, idx} = makeIcosphere(96);
  const n = unit.length / 3;
  const noise = makeNoise3(77);
  const C = [0, -0.41, -0.5];
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const crownArr = new Float32Array(n);
  const tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const ux = unit[i * 3], uy = unit[i * 3 + 1], uz = unit[i * 3 + 2];
    // Two lateral lobes joined by the vermis: notch the midline at the back.
    const lobe = 1 - 0.14 * Math.exp(-((ux / 0.2) ** 2)) * Math.max(0, -uz);
    let x = ux * 0.48 * lobe, y = uy * 0.21, z = uz * 0.29 * lobe;
    if (y > 0) y *= 0.8;
    // Folia: transverse ridges stacked like gently bent shelves.
    const shelf = y - 0.55 * z * z + 0.25 * x * x + noise(x * 5, y * 5, z * 5) * 0.012;
    const s = Math.abs(Math.sin(shelf * 210));
    const g = Math.pow(s, 0.55);
    const r = 1 - 0.03 * (1 - g);
    x *= r; y *= r; z *= r;
    pos[i * 3] = x + C[0];
    pos[i * 3 + 1] = y + C[1];
    pos[i * 3 + 2] = z + C[2];
    crownArr[i] = g;
    tmp.copy(TISSUE.sulcus).lerp(TISSUE.mid, g).lerp(TISSUE.crown, Math.max(0, g - 0.6) * 1.5);
    col[i * 3] = tmp.r * 0.95;
    col[i * 3 + 1] = tmp.g * 0.93;
    col[i * 3 + 2] = tmp.b * 0.93;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('crown', new THREE.BufferAttribute(crownArr, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  return geo;
};

const buildStem = () => {
  // Pons + medulla as a lathe swept along a gently curved spine.
  const pts: THREE.Vector2[] = [];
  const prof: [number, number][] = [
    [0.0, 0.0], [0.08, 0.01], [0.11, 0.06], [0.125, 0.13], [0.12, 0.2], [0.095, 0.27], [0.075, 0.36], [0.065, 0.46], [0.06, 0.52], [0.0, 0.53],
  ];
  for (const [r, h] of prof) pts.push(new THREE.Vector2(r, -h));
  const geo = new THREE.LatheGeometry(pts, 64);
  geo.scale(1, 1, 0.85);
  geo.rotateX(-0.3);
  geo.translate(0, -0.27, -0.14);
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  const crownArr = new Float32Array(n).fill(0.8);
  const c = srgb(0.78, 0.55, 0.5);
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('crown', new THREE.BufferAttribute(crownArr, 1));
  geo.computeVertexNormals();
  return geo;
};

export const buildBrain = (folds: Uint8Array): BrainParts => {
  if (cache) return cache;
  const {pos: unit, idx} = makeIcosphere(ICO_FREQ);
  const base = shapeHemisphere(unit);
  const baseGeo = new THREE.BufferGeometry();
  baseGeo.setAttribute('position', new THREE.BufferAttribute(base, 3));
  baseGeo.setIndex(new THREE.BufferAttribute(idx, 1));
  baseGeo.computeVertexNormals();
  const baseNormals = baseGeo.attributes.normal.array as Float32Array;
  const adj = buildAdjacency(idx, unit.length / 3);
  const n = unit.length / 3;
  cache = {
    hemiR: buildHemi(base, idx, folds, 0, 1, adj, baseNormals),
    hemiL: buildHemi(base, idx, folds, n, -1, adj, baseNormals),
    cerebellum: buildCerebellum(),
    stem: buildStem(),
  };
  return cache;
};
