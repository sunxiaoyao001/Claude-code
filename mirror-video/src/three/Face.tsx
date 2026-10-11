import React, {useMemo} from 'react';
import * as THREE from 'three';
import {clone as skeletonClone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {useFaceAssets} from './assets';

export type Morphs = Partial<Record<string, number>>;

type Props = JSX.IntrinsicElements['group'] & {
  morphs?: Morphs;
  flip?: boolean;
};

export const Face: React.FC<Props> = ({morphs = {}, flip = false, ...group}) => {
  const assets = useFaceAssets();
  const scene = useMemo(() => (assets ? skeletonClone(assets.scene) : null), [assets]);
  const meshes = useMemo(() => {
    const out: THREE.Mesh[] = [];
    scene?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) out.push(m);
    });
    return out;
  }, [scene]);
  if (!scene) return null;
  for (const m of meshes) {
    if (!m.morphTargetDictionary || !m.morphTargetInfluences) continue;
    for (const [k, i] of Object.entries(m.morphTargetDictionary)) {
      m.morphTargetInfluences[i] = morphs[k] ?? 0;
    }
  }
  return (
    <group {...group}>
      <group scale={[flip ? -1 : 1, 1, 1]}>
        <primitive object={scene} />
      </group>
    </group>
  );
};
