import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from 'remotion';
import { FPS, H, W } from './lib/core';
import { loadAssets, renderFrame } from './frame';

export const Showreel: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender('loading fonts'));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadAssets().then(() => {
      renderFrame(ref.current!.getContext('2d')!, frame / FPS);
      setReady(true);
      continueRender(handle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (ready) renderFrame(ref.current!.getContext('2d')!, frame / FPS);
  }, [frame, ready]);

  return (
    <AbsoluteFill>
      <canvas ref={ref} width={W} height={H} />
      <Audio src={staticFile('music.wav')} />
    </AbsoluteFill>
  );
};
