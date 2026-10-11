import {useThree} from '@react-three/fiber';
import {useLayoutEffect} from 'react';
import * as THREE from 'three';

export type Vec3 = [number, number, number];

/** Frame-driven camera: sets pose synchronously during render commit. */
export const Rig: React.FC<{
  position: Vec3;
  target: Vec3;
  fov?: number;
  roll?: number;
  near?: number;
  far?: number;
}> = ({position, target, fov = 30, roll = 0, near = 0.01, far = 200}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...position);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(...target);
    camera.fov = fov;
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
  });
  return null;
};
