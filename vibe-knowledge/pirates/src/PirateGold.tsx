/**
 * ============================================================
 *  Vibe知识大赏 · 第 6 集 · 海盗分金
 * ============================================================
 *  图层（自下而上）：
 *   1. ShaderBackground  GLSL 烟雾 + 顶部聚光灯 + Three.js 三维浮尘
 *   2. 场景层             8 个场景，挂在“镜头”下（场景内缓推 + 重击震屏）
 *   3. Subtitles         全局旁白字幕
 *   4. 后期              暗角、章节进度条、闪白、胶片颗粒
 *   5. Soundtrack        程序化配乐与音效
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FlashLayer, Grain, TopBar, Vignette} from './components/Post';
import {ShaderBackground} from './components/ShaderBackground';
import {Soundtrack} from './components/Soundtrack';
import {Subtitles} from './components/Subtitles';
import {cameraAt} from './lib/camera';
import {ensureFonts} from './lib/fonts';
import {BackwardScene} from './scenes/Backward';
import {MeaningScene, OutroScene} from './scenes/Ending';
import {HumanScene} from './scenes/Human';
import {GuessScene, HookScene, RulesScene} from './scenes/Opening';
import {WhyScene} from './scenes/Why';
import {C} from './theme';

ensureFonts();

export type PirateGoldProps = {withAudio: boolean};

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame);
  return (
    <AbsoluteFill
      style={{
        transformOrigin: '540px 820px',
        transform: `translate(${cam.x}px, ${cam.y}px) rotate(${cam.r}deg) scale(${cam.s})`,
      }}
    >
      <HookScene />
      <RulesScene />
      <GuessScene />
      <BackwardScene />
      <WhyScene />
      <HumanScene />
      <MeaningScene />
      <OutroScene />
    </AbsoluteFill>
  );
};

export const PirateGold: React.FC<PirateGoldProps> = ({withAudio}) => (
  <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
    <ShaderBackground />
    <Stage />
    <Subtitles />
    <Vignette />
    <TopBar />
    <FlashLayer />
    <Grain />
    {withAudio ? <Soundtrack /> : null}
  </AbsoluteFill>
);
