import React from 'react';
import {Environment, Lightformer} from '@react-three/drei';

export type LightMood = 'mirror' | 'photo' | 'neutral' | 'dark' | 'lab';

/**
 * Environment (for reflections on skin, glass and metal) + direct lights.
 * The env map is baked once (frames=1) so it costs nothing per frame.
 */
export const Studio: React.FC<{mood?: LightMood; intensity?: number; envRotation?: number}> = ({
  mood = 'neutral',
  intensity = 1,
  envRotation = 0,
}) => {
  const env = (
    <Environment resolution={256} frames={1} environmentIntensity={0.9 * intensity} environmentRotation={[0, envRotation, 0]}>
      {mood === 'mirror' ? (
        <>
          <Lightformer form="rect" intensity={2.4} color="#ffd7a8" position={[2.5, 1.5, 3]} scale={[3, 3, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={1.2} color="#ffb070" position={[-3, 0.5, 2]} scale={[2, 4, 1]} target={[0, 0, 0]} />
          <Lightformer form="ring" intensity={1.6} color="#fff2df" position={[0, 4, -1]} scale={3} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={0.6} color="#6a8cff" position={[0, -3, -3]} scale={[6, 2, 1]} target={[0, 0, 0]} />
        </>
      ) : mood === 'photo' ? (
        <>
          <Lightformer form="rect" intensity={4} color="#f2f8ff" position={[0, 0.3, 4]} scale={[1.2, 1.2, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={0.6} color="#9fc3ff" position={[-4, 1, 0]} scale={[2, 5, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={0.3} color="#ffffff" position={[3, 2, -3]} scale={[3, 3, 1]} target={[0, 0, 0]} />
        </>
      ) : mood === 'lab' ? (
        <>
          <Lightformer form="rect" intensity={2} color="#cfe8ff" position={[0, 4, 2]} scale={[8, 1, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={1.4} color="#5fd4ff" position={[-4, 0, 1]} scale={[1, 6, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={1.4} color="#b48cff" position={[4, 0, -1]} scale={[1, 6, 1]} target={[0, 0, 0]} />
          <Lightformer form="ring" intensity={1.2} color="#ffffff" position={[0, 0, 5]} scale={2} target={[0, 0, 0]} />
        </>
      ) : mood === 'dark' ? (
        <>
          <Lightformer form="rect" intensity={1.2} color="#9fb6ff" position={[0, 3, 3]} scale={[4, 1, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={0.8} color="#ffcc88" position={[3, 0, -2]} scale={[1, 4, 1]} target={[0, 0, 0]} />
        </>
      ) : (
        <>
          <Lightformer form="rect" intensity={2.2} color="#fff3e6" position={[2.5, 2, 3]} scale={[3, 3, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={1.0} color="#a8c8ff" position={[-3, 0.5, 1]} scale={[2, 4, 1]} target={[0, 0, 0]} />
          <Lightformer form="ring" intensity={1.4} color="#ffffff" position={[0, 4, -2]} scale={2.5} target={[0, 0, 0]} />
        </>
      )}
    </Environment>
  );

  const lights =
    mood === 'mirror' ? (
      <>
        <directionalLight position={[1.4, 1.2, 2.2]} intensity={2.3 * intensity} color="#ffd9b0" />
        <directionalLight position={[-2, 0.4, 1.2]} intensity={0.7 * intensity} color="#ffc08a" />
        <directionalLight position={[-1.5, 1.5, -2]} intensity={2.4 * intensity} color="#ffb36b" />
        <ambientLight intensity={0.08 * intensity} color="#ffe0c0" />
      </>
    ) : mood === 'photo' ? (
      <>
        {/* on-axis flash: flat, hard, unflattering */}
        <directionalLight position={[0, 0.15, 3]} intensity={3.6 * intensity} color="#f4f9ff" />
        <directionalLight position={[2, -1.5, -1]} intensity={0.6 * intensity} color="#7fa7ff" />
        <ambientLight intensity={0.04 * intensity} />
      </>
    ) : mood === 'lab' ? (
      <>
        <directionalLight position={[1, 2, 3]} intensity={1.6 * intensity} color="#e6f2ff" />
        <directionalLight position={[-2, 0, -2]} intensity={2 * intensity} color="#5fd4ff" />
        <directionalLight position={[2, -1, -2]} intensity={1.6 * intensity} color="#b48cff" />
      </>
    ) : mood === 'dark' ? (
      <>
        <directionalLight position={[1, 2, 2]} intensity={0.9 * intensity} color="#cfd8ff" />
        <directionalLight position={[-2, 0.5, -2]} intensity={1.6 * intensity} color="#ffb36b" />
      </>
    ) : (
      <>
        <directionalLight position={[1.5, 1.2, 2.2]} intensity={2.2 * intensity} color="#fff0e0" />
        <directionalLight position={[-2, 0.5, 1]} intensity={0.6 * intensity} color="#a8c8ff" />
        <directionalLight position={[-1.6, 1.4, -2]} intensity={2.2 * intensity} color="#9fc8ff" />
        <ambientLight intensity={0.06 * intensity} />
      </>
    );
  return (
    <>
      {env}
      {lights}
    </>
  );
};
