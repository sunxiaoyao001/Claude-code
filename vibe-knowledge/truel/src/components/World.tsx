/**
 * 世界层：决斗场 + 三位枪手 + 交火，整体挂在“摄像机”下面运镜
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {envelope, hash} from '../lib/anim';
import {arenaVisibility, cameraAt, cameraTransform, rewindAmount} from '../lib/world';
import {Floor, FloorDefs, Standoff, ThreatBeam, TurnArrows} from './Arena';
import {CombatDefs, FirstMoveSeal, GhostLabel, Reticles, Tracers, TurnRing} from './Combat';
import {Medal, MedalDefs} from './Medal';

/** 重点句出现时压暗世界层，让大字更突出 */
const dimOf = (f: number) =>
  Math.max(envelope(f, 1270, 1380, 10, 10) * 0.55, envelope(f, 2048, 2134, 8, 4) * 0.55);

export const World: React.FC = () => {
  const frame = useCurrentFrame();
  const vis = arenaVisibility(frame);
  if (vis <= 0.001) return null;

  const cam = cameraAt(frame);
  const rw = rewindAmount(frame);
  const threatOn = envelope(frame, 1660, 1985, 14, 14);
  // 倒带：横向抖动 + 色相偏移 + 轻微模糊（VHS 质感）
  const rwShift = rw > 0 ? (hash(frame * 3.7) - 0.5) * 60 * rw : 0;

  return (
    <AbsoluteFill style={{opacity: vis * (1 - dimOf(frame))}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1080,
          height: 1920,
          transformOrigin: '0 0',
          transform: `translateX(${rwShift}px) ${cameraTransform(cam)}`,
          filter: rw > 0.01 ? `blur(${rw * 2.5}px) hue-rotate(${-40 * rw}deg) saturate(${1 + rw})` : undefined,
        }}
      >
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{overflow: 'visible'}}>
          <FloorDefs />
          <MedalDefs />
          <CombatDefs />
          <Floor frame={frame} />
          <TurnArrows frame={frame} />
          <ThreatBeam frame={frame} />
          <Standoff frame={frame} />
          {/* 由远及近绘制，保证遮挡关系正确 */}
          <Medal id="jia" frame={frame} tagsOn={1} threatOn={threatOn} />
          <Medal id="yi" frame={frame} tagsOn={1} threatOn={threatOn} />
          <Medal id="bing" frame={frame} tagsOn={1} threatOn={threatOn} />
          <TurnRing frame={frame} />
          <Reticles frame={frame} />
          <Tracers frame={frame} />
          <FirstMoveSeal frame={frame} />
          <GhostLabel frame={frame} />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
