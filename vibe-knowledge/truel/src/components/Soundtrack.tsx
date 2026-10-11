/**
 * 声音设计：程序化合成的环境配乐 + 音效（scripts/gen-audio.ts 生成，无版权风险）
 * 位置全部来自 timeline.ts 的 SFX / MUSIC_DUCK，与画面逐帧同步。
 */
import React from 'react';
import {Html5Audio, interpolate, Sequence, staticFile} from 'remotion';
import {MUSIC_DUCK, SFX} from '../timeline';

/** 音效总线增益：多个音效叠加时留出余量，避免削波 */
const SFX_MASTER = 0.78;

export const Soundtrack: React.FC = () => (
  <>
    <Html5Audio
      src={staticFile('audio/score.mp3')}
      volume={(f) =>
        interpolate(
          f,
          MUSIC_DUCK.map((k) => k.f),
          MUSIC_DUCK.map((k) => k.v),
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
        )
      }
    />
    {SFX.map((s, i) => (
      <Sequence key={i} from={s.f} name={`sfx:${s.name}`} layout="none">
        <Html5Audio src={staticFile(`audio/${s.name}.wav`)} volume={(s.vol ?? 1) * SFX_MASTER} />
      </Sequence>
    ))}
  </>
);
