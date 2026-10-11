import React, {useMemo} from 'react';
import * as THREE from 'three';

/** Glowing pulse ring used to point at features on the face. */
export const Ring: React.FC<
  JSX.IntrinsicElements['group'] & {radius?: number; color?: string; strength?: number; pulse?: number; thickness?: number}
> = ({radius = 0.03, color = '#ffc879', strength = 1, pulse = 0, thickness = 0.0025, ...group}) => {
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({color: new THREE.Color(color), transparent: true, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false}),
    [color],
  );
  const mat2 = useMemo(() => mat.clone(), [mat]);
  mat.color.set(color).multiplyScalar(3 * strength);
  mat.opacity = Math.min(1, strength);
  const pr = (pulse % 1) as number;
  mat2.color.set(color).multiplyScalar(2 * strength * (1 - pr));
  mat2.opacity = Math.min(1, strength) * (1 - pr);
  return (
    <group {...group}>
      <mesh material={mat} renderOrder={20}>
        <ringGeometry args={[radius - thickness, radius, 64]} />
      </mesh>
      <mesh material={mat2} renderOrder={20} scale={1 + pr * 1.6}>
        <ringGeometry args={[radius - thickness * 0.6, radius, 64]} />
      </mesh>
    </group>
  );
};
