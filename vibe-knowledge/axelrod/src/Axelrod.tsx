/**
 * ============================================================
 *  Vibe知识大赏 · 第 2 集 · 阿克塞尔罗德大赛（重复囚徒困境）
 * ============================================================
 *  图层（自下而上）：
 *   1. ShaderBackground  GLSL 烟雾体积光 + 透视网格地面 + Three.js 三维浮尘
 *   2. 场景层             9 个场景，挂在“镜头”下（场景内缓推 + 重击震屏）
 *   3. Subtitles         全局旁白字幕
 *   4. 后期              CRT 扫描线、暗角、章节进度条、闪白、胶片颗粒
 *   5. Soundtrack        程序化配乐与音效
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FlashLayer, Grain, Scanlines, TopBar, Vignette} from './components/Post';
import {ShaderBackground} from './components/ShaderBackground';
import {Soundtrack} from './components/Soundtrack';
import {Subtitles} from './components/Subtitles';
import {ease, prog} from './lib/anim';
import {cameraAt} from './lib/camera';
import {ensureFonts} from './lib/fonts';
import {BoardScene} from './scenes/Board';
import {CaveatScene} from './scenes/Caveat';
import {DilemmaScene} from './scenes/Dilemma';
import {EvolveScene} from './scenes/Evolve';
import {HookScene} from './scenes/Hook';
import {OutroScene} from './scenes/Outro';
import {ParadoxScene} from './scenes/Paradox';
import {TftScene} from './scenes/Tft';
import {TourneyScene} from './scenes/Tourney';
import {C} from './theme';
import {SCENES} from './timeline';

ensureFonts();

export type AxelrodProps = {withAudio: boolean};

/** CRT 换台：在这些场景切换点，画面被压成一条亮线再展开 */
const CUTS = [SCENES.tourney.from, SCENES.tft.from, SCENES.evolve.from, SCENES.caveat.from, SCENES.outro.from];
const crtCut = (f: number) => {
  for (const c of CUTS) {
    const d = f - c;
    if (d >= -6 && d < 0) return prog(d, -6, 0, ease.in);
    if (d >= 0 && d < 9) return 1 - prog(d, 0, 9, ease.out);
  }
  return 0;
};

const CrtLine: React.FC = () => {
  const k = crtCut(useCurrentFrame());
  if (k < 0.02) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 540 - 540 * (0.25 + 0.75 * k),
        width: 1080 * (0.25 + 0.75 * k),
        top: 818,
        height: 4 + 6 * k,
        borderRadius: 4,
        background: '#fff6e4',
        boxShadow: `0 0 ${40 * k}px #ffd28a, 0 0 ${120 * k}px #ffb547`,
        opacity: k,
      }}
    />
  );
};

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame);
  const cut = crtCut(frame);
  return (
    <AbsoluteFill
      style={{
        transformOrigin: '540px 820px',
        transform: `translate(${cam.x}px, ${cam.y}px) rotate(${cam.r}deg) scale(${cam.s}) scaleY(${1 - 0.985 * cut})`,
        filter: cut > 0.02 ? `brightness(${1 + 1.5 * cut})` : undefined,
      }}
    >
      <HookScene />
      <DilemmaScene />
      <TourneyScene />
      <BoardScene />
      <TftScene />
      <ParadoxScene />
      <EvolveScene />
      <CaveatScene />
      <OutroScene />
    </AbsoluteFill>
  );
};

export const Axelrod: React.FC<AxelrodProps> = ({withAudio}) => (
  <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
    <ShaderBackground />
    <Stage />
    <CrtLine />
    <Subtitles />
    <Scanlines />
    <Vignette />
    <TopBar />
    <FlashLayer />
    <Grain />
    {withAudio ? <Soundtrack /> : null}
  </AbsoluteFill>
);
