/**
 * ============================================================
 *  Vibe知识大赏 · 三人决斗（枪手博弈）
 * ============================================================
 *  图层（自下而上）：
 *   1. ShaderBackground  GLSL 烟雾体积光 + Three.js 三维浮尘
 *   2. World             决斗场 / 徽章 / 交火（挂在摄像机下运镜）
 *   3. 场景叠层           各段的大字、选项、图表、片尾
 *   4. Subtitles         全局旁白字幕
 *   5. 后期              倒带、闪白、暗角、颗粒、章节进度条
 *   6. Soundtrack        程序化配乐与音效
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Soundtrack} from './components/Soundtrack';
import {FlashLayer, Grain, RewindOverlay, TopBar, Vignette} from './components/Post';
import {ShaderBackground} from './components/ShaderBackground';
import {Subtitles} from './components/Subtitles';
import {World} from './components/World';
import {ensureFonts} from './lib/fonts';
import {
  CastOverlay,
  CaveatOverlay,
  HookOverlay,
  IntuitionOverlay,
  LogicOverlay,
  QuestionOverlay,
  TwistOverlay,
} from './scenes/Overlays';
import {OutroScene} from './scenes/Outro';
import {ProofScene} from './scenes/Proof';
import {C} from './theme';

ensureFonts();

export type TruelProps = {withAudio: boolean};

export const Truel: React.FC<TruelProps> = ({withAudio}) => (
  <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
    <ShaderBackground />
    <World />
    <HookOverlay />
    <CastOverlay />
    <QuestionOverlay />
    <IntuitionOverlay />
    <TwistOverlay />
    <LogicOverlay />
    <ProofScene />
    <CaveatOverlay />
    <OutroScene />
    <Subtitles />
    <RewindOverlay />
    <Vignette />
    <TopBar />
    <FlashLayer />
    <Grain />
    {withAudio ? <Soundtrack /> : null}
  </AbsoluteFill>
);
