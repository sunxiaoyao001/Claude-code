import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Look';
import {C, ease} from '../theme';
import {BrainStage, NAC, PFC, VTA, projectBrainPoint, type BrainStageProps} from '../brain/BrainStage';
import {Bokeh, Dust, LightLeak} from '../components/Atmosphere';
import {Callout} from '../components/Callout';
import {prog} from '../lib/math';

// 0–150 living tissue · 150–215 CT sweep · 215+ x-ray: VTA → pathways → NAc / PFC
export const BrainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const yaw = interpolate(frame, [0, 300, 460], [-2.45, -1.32, -1.12], {easing: ease.inOut});
  const pitch = interpolate(frame, [0, 460], [0.32, 0.14], {easing: ease.inOut});
  const camZ = interpolate(frame, [0, 200, 460], [5.2, 4.4, 3.75], {easing: ease.inOut});
  const scan = prog(frame, 150, 66, ease.inOut);
  const flow = prog(frame, 300, 110, ease.soft);
  const vta = prog(frame, 222, 26, ease.out);
  const nac = prog(frame, 355, 30, ease.out);
  const pfc = prog(frame, 380, 50, ease.soft) * 0.42;
  const structures = prog(frame, 205, 40) * 0.75;
  const reveal = prog(frame, 0, 48, ease.out);
  const burst = interpolate(frame, [356, 366, 400], [0, 1, 0.25], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const stage: BrainStageProps = {
    frame,
    yaw,
    pitch,
    scale: 1.22,
    position: [interpolate(frame, [0, 460], [0.12, 0.32], {easing: ease.inOut}), 0.02, 0],
    camZ,
    scan,
    flow,
    flowSpeed: 0.011,
    vta,
    nac,
    pfc,
    pfcColor: '#ffb547',
    structures,
    burst,
  };
  const pV = projectBrainPoint(VTA, stage);
  const pN = projectBrainPoint(NAC, stage);
  const pP = projectBrainPoint(PFC, stage);

  // A light sweep rakes across the tissue as it is revealed.
  const sweep = interpolate(frame, [6, 70], [-0.3, 1.3], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});

  return (
    <AbsoluteFill style={{background: C.void, overflow: 'hidden'}}>
      <Backdrop bg={`radial-gradient(ellipse 65% 75% at 52% 48%, #0f1730 0%, #070a16 45%, ${C.void} 80%)`} />
      <Bokeh seed="brainbk" count={20} colors={[[80, 120, 255], [120, 90, 255], [60, 200, 255]]} opacity={0.3} drift={0.6} />
      <LightLeak color={[60, 110, 255]} x={0.15} y={0.2} size={1400} intensity={0.22} seed="bl1" />
      <LightLeak color={[255, 150, 60]} x={0.62} y={0.72} size={900} intensity={0.16 * flow} seed="bl2" />
      <AbsoluteFill style={{opacity: reveal, filter: reveal < 0.99 ? `brightness(${0.4 + reveal * 0.6})` : undefined}}>
        <BrainStage {...stage} />
      </AbsoluteFill>
      {sweep > -0.3 && sweep < 1.3 && scan < 1 ? (
        <AbsoluteFill
          style={{
            background: `linear-gradient(105deg, rgba(190,220,255,0) ${sweep * 100 - 18}%, rgba(190,220,255,0.07) ${sweep * 100}%, rgba(190,220,255,0) ${sweep * 100 + 18}%)`,
            opacity: 1 - scan,
          }}
        />
      ) : null}
      {scan > 0 && scan < 1 ? <ScanHud frame={frame} scan={scan} /> : null}
      <Callout frame={frame} at={228} x={pV.x} y={pV.y} dx={-330} dy={70} title="腹侧被盖区" sub="VTA" out={445} />
      <Callout frame={frame} at={360} x={pN.x} y={pN.y} dx={-380} dy={-30} title="伏隔核" sub="NUCLEUS ACCUMBENS" out={445} />
      <Callout frame={frame} at={392} x={pP.x} y={pP.y} dx={-300} dy={-170} title="前额叶" sub="PREFRONTAL CORTEX" out={445} />
      <Dust seed="braindust" count={60} opacity={0.45} color="190,210,255" />
    </AbsoluteFill>
  );
};

const ScanHud: React.FC<{frame: number; scan: number}> = ({frame, scan}) => {
  const y = interpolate(scan, [0, 1], [250, 860]);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 1460, top: y - 14, fontFamily: '"JetBrains Mono", monospace', fontSize: 18, color: '#9fe6ff', letterSpacing: '0.25em', opacity: 0.8}}>
        SCAN {String(Math.round(scan * 100)).padStart(3, '0')}%
      </div>
      <div style={{position: 'absolute', left: 1440, top: y, width: 220, height: 1, background: 'linear-gradient(90deg, rgba(159,230,255,0.7), rgba(159,230,255,0))'}} />
      <div style={{position: 'absolute', left: 1460, top: y + 10, fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: '#9fe6ff', opacity: 0.45, letterSpacing: '0.2em'}}>
        {`Z ${(scan * 172).toFixed(1)}mm · ${(frame % 30) < 15 ? '●' : '○'}`}
      </div>
    </AbsoluteFill>
  );
};
