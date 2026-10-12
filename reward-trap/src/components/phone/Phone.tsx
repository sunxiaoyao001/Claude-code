import React from 'react';
import {SH, SW} from './contents';

export const BODY_W = 420;
export const BODY_H = 874;
const INSET_X = (BODY_W - SW) / 2;
const INSET_Y = (BODY_H - SH) / 2;

/**
 * A modern slab phone, built from layered gradients: brushed titanium band, black glass,
 * screen with its own light spill, and a moving specular sheet that follows the tilt.
 * Children render in screen space (390 × 844).
 */
export const Phone: React.FC<{
  children?: React.ReactNode;
  /** rendered above the glass in screen coordinates, NOT clipped (thumbs, hearts, particles) */
  overlay?: React.ReactNode;
  tint?: [number, number, number];
  glow?: number;
  tiltX?: number; // degrees
  tiltY?: number;
  screenOn?: number;
  island?: boolean;
  frameColor?: 'titanium' | 'graphite';
  reflection?: number;
  style?: React.CSSProperties;
}> = ({children, overlay, tint = [140, 190, 255], glow = 0.6, tiltX = 0, tiltY = 0, screenOn = 1, island = true, frameColor = 'graphite', reflection = 1, style}) => {
  const [r, g, b] = tint;
  const thick = 9;
  const ex = Math.sin((tiltY * Math.PI) / 180) * thick * 2.2;
  const ey = -Math.sin((tiltX * Math.PI) / 180) * thick * 2.2;
  const band =
    frameColor === 'titanium'
      ? 'linear-gradient(135deg, #8d9097 0%, #e6e8ec 18%, #6b6f76 38%, #b9bcc2 60%, #4f5258 82%, #a7aab0 100%)'
      : 'linear-gradient(135deg, #3a3d44 0%, #9aa0a8 16%, #26282d 36%, #5d6168 58%, #1b1d21 80%, #6f747c 100%)';
  const sheen = 50 + tiltY * 2.2 - tiltX * 1.2;
  return (
    <div style={{position: 'relative', width: BODY_W, height: BODY_H, willChange: 'transform', ...style}}>
      {/* light the screen throws into the dark */}
      <div
        style={{
          position: 'absolute',
          left: -BODY_W * 0.9,
          top: -BODY_H * 0.45,
          width: BODY_W * 2.8,
          height: BODY_H * 1.9,
          borderRadius: '50%',
          background: `radial-gradient(ellipse at 50% 50%, rgba(${r},${g},${b},${0.32 * glow * screenOn}) 0%, rgba(${r},${g},${b},${0.12 * glow * screenOn}) 32%, rgba(${r},${g},${b},0) 62%)`,
          pointerEvents: 'none',
        }}
      />
      {/* contact shadow: a soft gradient instead of a 120px box-shadow blur */}
      <div
        style={{
          position: 'absolute',
          left: -BODY_W * 0.32,
          top: BODY_H * 0.06,
          width: BODY_W * 1.64,
          height: BODY_H * 1.12,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 50% 52%, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.32) 42%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
        }}
      />
      {/* body thickness */}
      <div
        style={{
          position: 'absolute',
          left: ex,
          top: ey,
          width: BODY_W,
          height: BODY_H,
          borderRadius: 66,
          background: 'linear-gradient(180deg, #2c2f35, #0d0e11)',
        }}
      />
      {/* side buttons */}
      <div style={{position: 'absolute', left: -4, top: 190, width: 6, height: 54, borderRadius: 3, background: band}} />
      <div style={{position: 'absolute', left: -4, top: 262, width: 6, height: 54, borderRadius: 3, background: band}} />
      <div style={{position: 'absolute', right: -4, top: 230, width: 6, height: 92, borderRadius: 3, background: band}} />
      {/* titanium band */}
      <div style={{position: 'absolute', inset: 0, borderRadius: 66, background: band}} />
      <div style={{position: 'absolute', inset: 2.5, borderRadius: 64, background: '#050506', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)'}} />
      {/* screen */}
      <div
        style={{
          position: 'absolute',
          left: INSET_X,
          top: INSET_Y,
          width: SW,
          height: SH,
          borderRadius: 52,
          overflow: 'hidden',
          background: '#000',
        }}
      >
        <div style={{position: 'absolute', inset: 0, opacity: screenOn}}>{children}</div>
        {island ? (
          <div style={{position: 'absolute', left: SW / 2 - 62, top: 12, width: 124, height: 36, borderRadius: 18, background: '#000'}}>
            <div
              style={{
                position: 'absolute',
                right: 13,
                top: 10,
                width: 16,
                height: 16,
                borderRadius: 8,
                background: 'radial-gradient(circle at 35% 35%, #3a4a6a 0%, #0b0e18 55%, #000 100%)',
              }}
            />
          </div>
        ) : null}
        {/* glass: specular sheet + top edge catchlight */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: reflection,
            background: `linear-gradient(118deg, rgba(255,255,255,0) ${sheen - 22}%, rgba(255,255,255,0.075) ${sheen - 6}%, rgba(255,255,255,0.13) ${sheen}%, rgba(255,255,255,0.03) ${sheen + 9}%, rgba(255,255,255,0) ${sheen + 24}%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 52,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.05)',
          }}
        />
      </div>
      {overlay ? <div style={{position: 'absolute', left: INSET_X, top: INSET_Y, width: SW, height: SH}}>{overlay}</div> : null}
    </div>
  );
};
