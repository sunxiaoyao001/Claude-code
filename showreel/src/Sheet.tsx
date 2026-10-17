import React, { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender } from 'remotion';
import { H, W } from './lib/core';
import { loadAssets, renderFrame } from './frame';

/** Contact sheet: renders several moments of the film as thumbnails in one still. */
export const Sheet: React.FC<{ times: number[] }> = ({ times }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender('sheet'));

  useEffect(() => {
    loadAssets().then(() => {
      const out = ref.current!.getContext('2d')!;
      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const octx = off.getContext('2d')!;
      const n = times.length;
      const cols = n === 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
      const rows = Math.ceil(n / cols);
      const cw = W / cols;
      const ch = H / rows;
      out.fillStyle = '#333';
      out.fillRect(0, 0, W, H);
      times.forEach((t, i) => {
        renderFrame(octx, t);
        const s = Math.min(cw / W, ch / H) * 0.98;
        const x = (i % cols) * cw + (cw - W * s) / 2;
        const y = Math.floor(i / cols) * ch + (ch - H * s) / 2;
        out.drawImage(off, x, y, W * s, H * s);
        out.fillStyle = '#ff2d55';
        out.font = '700 22px Geist';
        out.fillText(t.toFixed(2), x + 8, y + 26);
      });
      continueRender(handle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AbsoluteFill>
      <canvas ref={ref} width={W} height={H} />
    </AbsoluteFill>
  );
};
