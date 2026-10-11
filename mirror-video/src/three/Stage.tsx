import React from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import {BlendFunction, ToneMappingMode} from 'postprocessing';
import {Preloaded} from './assets';

export type PostFx = {
  bloom?: number;
  threshold?: number;
  radius?: number;
  vignette?: number;
  noise?: number;
  ca?: number;
};

const Post: React.FC<PostFx> = ({bloom = 0.9, threshold = 0.62, radius = 0.75, vignette = 0.55, noise = 0.05, ca = 0.0006}) => {
  const caOffset = React.useMemo(() => new THREE.Vector2(ca, ca * 0.6), [ca]);
  return (
    <EffectComposer multisampling={4}>
      <Bloom intensity={bloom} luminanceThreshold={threshold} luminanceSmoothing={0.2} mipmapBlur radius={radius} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <ChromaticAberration offset={caOffset} radialModulation modulationOffset={0.35} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={noise * 6} />
      <Vignette darkness={vignette} offset={0.28} />
    </EffectComposer>
  );
};

type Props = {
  children: React.ReactNode;
  bg?: string;
  fog?: [string, number, number];
  post?: PostFx | false;
  style?: React.CSSProperties;
  exposure?: number;
  shadows?: boolean;
};

export const Stage: React.FC<Props> = ({children, bg = '#04060b', fog, post = {}, style, exposure = 1, shadows = false}) => {
  const {width, height} = useVideoConfig();
  return (
    <Preloaded>
      <ThreeCanvas
        width={width}
        height={height}
        style={style}
        shadows={shadows ? 'soft' : false}
        camera={{fov: 30, near: 0.01, far: 200, position: [0, 0, 3]}}
        gl={{antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: exposure, powerPreference: 'high-performance'}}
        onCreated={({gl}) => {
          gl.localClippingEnabled = true;
        }}
      >
        <color attach="background" args={[bg]} />
        {fog ? <fog attach="fog" args={fog} /> : null}
        {children}
        {post ? <Post {...post} /> : null}
      </ThreeCanvas>
    </Preloaded>
  );
};
