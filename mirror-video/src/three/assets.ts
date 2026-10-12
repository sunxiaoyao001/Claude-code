import React, {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

export type HeadAssets = {
  geometry: THREE.BufferGeometry;
  /** eyeball centres (head-local, after normalisation) and radius */
  eyeL: THREE.Vector3;
  eyeR: THREE.Vector3;
  eyeRadius: number;
  map: THREE.Texture;
  spec: THREE.Texture;
  normal: THREE.Texture;
};

let headPromise: Promise<HeadAssets> | null = null;

const loadTexture = (url: string, srgb: boolean) =>
  new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.flipY = true;
        t.anisotropy = 8;
        resolve(t);
      },
      undefined,
      reject,
    );
  });

export const loadHead = (): Promise<HeadAssets> => {
  if (headPromise) return headPromise;
  headPromise = Promise.all([
    new GLTFLoader().loadAsync(staticFile('head/LeePerrySmith.glb')),
    loadTexture(staticFile('head/Map-COL.jpg'), true),
    loadTexture(staticFile('head/Map-SPEC.jpg'), false),
    loadTexture(staticFile('head/Infinite-Level_02_Tangent_SmoothUV.jpg'), false),
  ]).then(([gltf, map, spec, normal]) => {
    let geometry: THREE.BufferGeometry | null = null;
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !geometry) geometry = m.geometry;
    });
    if (!geometry) throw new Error('head mesh missing');
    const g = geometry as THREE.BufferGeometry;
    g.computeBoundingBox();
    // centre the scan so the face looks down +Z with the origin between the eyes-ish
    const bb = g.boundingBox!;
    const c = new THREE.Vector3();
    bb.getCenter(c);
    g.translate(-c.x, -c.y, -c.z);
    const size = new THREE.Vector3();
    bb.getSize(size);
    const s = 1 / size.y;
    g.scale(s, s, s);
    g.computeBoundingSphere();
    // weld normals across UV seams (the scan has separate islands around the
    // mouth/eyes whose normals don't match, which shows up in rim lighting)
    {
      const pa = g.attributes.position as THREE.BufferAttribute;
      const na = g.attributes.normal as THREE.BufferAttribute;
      const acc = new Map<string, [number, number, number]>();
      const key = (i: number) =>
        `${Math.round(pa.getX(i) * 2e4)},${Math.round(pa.getY(i) * 2e4)},${Math.round(pa.getZ(i) * 2e4)}`;
      for (let i = 0; i < pa.count; i++) {
        const k = key(i);
        const a = acc.get(k) ?? [0, 0, 0];
        a[0] += na.getX(i);
        a[1] += na.getY(i);
        a[2] += na.getZ(i);
        acc.set(k, a);
      }
      for (let i = 0; i < pa.count; i++) {
        const a = acc.get(key(i))!;
        const l = Math.hypot(a[0], a[1], a[2]) || 1;
        na.setXYZ(i, a[0] / l, a[1] / l, a[2] / l);
      }
      na.needsUpdate = true;
    }
    if (!g.attributes.tangent) {
      try {
        g.computeTangents();
      } catch {
        /* normal map falls back to derivatives */
      }
    }
    // strip the scan's embedded eyeballs (UV-mapped to the corner discs / red
    // texels) so procedural eyes with real irises can sit in the sockets
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const pos = g.attributes.position as THREE.BufferAttribute;
    const eyeL = new THREE.Vector3(-0.0925, 0.2195, 0.1915);
    const eyeR = new THREE.Vector3(0.0652, 0.2113, 0.1958);
    const tmp = new THREE.Vector3();
    const isEyeUV = (i: number) => {
      const x = uv.getX(i) * 1024;
      const y = (1 - uv.getY(i)) * 1024;
      const uvHit =
        (x < 90 && y < 75) ||
        (x > 934 && y < 75) ||
        Math.hypot(x - 463, y - 303) < 4 ||
        Math.hypot(x - 562, y - 303) < 4;
      if (!uvHit) return false;
      tmp.fromBufferAttribute(pos, i);
      return tmp.distanceTo(eyeL) < 0.07 || tmp.distanceTo(eyeR) < 0.07;
    };
    const idx = g.index!;
    const keep: number[] = [];
    for (let t = 0; t < idx.count; t += 3) {
      const a = idx.getX(t);
      const b = idx.getX(t + 1);
      const c2 = idx.getX(t + 2);
      if (!(isEyeUV(a) || isEyeUV(b) || isEyeUV(c2))) keep.push(a, b, c2);
    }
    g.setIndex(keep);
    return {geometry: g, map, spec, normal, eyeL, eyeR, eyeRadius: 0.0352};
  });
  return headPromise;
};

let headCache: HeadAssets | null = null;

/** synchronous access – only valid inside a <Preloaded> subtree */
export const useHeadAssets = (): HeadAssets | null => headCache;

export const preloadAll = () =>
  loadHead().then((h) => {
    headCache = h;
  });

/**
 * DOM-level gate: ThreeCanvas renders with frameloop="never", so anything that
 * arrives asynchronously inside the canvas would never be drawn. Load first,
 * mount the canvas afterwards.
 */
export const Preloaded: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [ready, setReady] = useState(headCache !== null);
  const [handle] = useState(() => (headCache ? null : delayRender('preload assets')));
  useEffect(() => {
    if (ready) return;
    preloadAll()
      .then(() => {
        setReady(true);
        if (handle !== null) continueRender(handle);
      })
      .catch((e) => {
        console.error(e);
      });
  }, [handle, ready]);
  return ready ? React.createElement(React.Fragment, null, children) : null;
};
