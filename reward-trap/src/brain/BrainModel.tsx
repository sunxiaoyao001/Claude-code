import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {BrainParts} from './buildBrain';

export const useStudioEnvironment = (intensity = 0.55) => {
  const {gl, scene} = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = intensity;
    pm.dispose();
  }, [gl, scene, intensity]);
};

export const useTissueMaterial = () =>
  useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.5,
        metalness: 0,
        clearcoat: 0.45,
        clearcoatRoughness: 0.32,
        sheen: 0.6,
        sheenColor: new THREE.Color('#ff9a86'),
        sheenRoughness: 0.55,
        specularIntensity: 0.55,
      }),
    [],
  );

export const BrainMeshes: React.FC<{parts: BrainParts; material: THREE.Material}> = ({parts, material}) => (
  <group>
    <mesh geometry={parts.hemiR} material={material} />
    <mesh geometry={parts.hemiL} material={material} />
    <mesh geometry={parts.cerebellum} material={material} />
    <mesh geometry={parts.stem} material={material} />
  </group>
);
