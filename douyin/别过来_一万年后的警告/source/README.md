# 《别过来》生成工程

整部片子的画面、配乐、音效都由这里的代码逐帧生成，没有任何生成式视频或图片素材。

| 文件 | 作用 |
|---|---|
| `script.py` | 旁白文案（94 句）与字幕修正表 |
| `gen_tts.py` / `check_vo.py` | 离线 TTS 逐句配音（Kokoro v1.1-zh，088 号男声），并用 SenseVoice 回检读音 |
| `engine/timeline.py` | 由配音时长 + 停顿 + 章节卡生成全片时间轴 |
| `engine/core.py` | 渲染核心：缓动、配色、字体、排版、图形 |
| `engine/three.py` | 软件 3D：透视、平面着色、雾、地面阴影 |
| `engine/film.py` | 镜头编排、转场、字幕、章节角标 |
| `scenes/ch0.py`~`ch7.py` | 8 个段落共 46 个镜头 |
| `audio/synth.py` / `audio/score.py` | 代码合成乐器与音效、按时间轴编曲、混音 |
| `render.py` | 多进程逐帧渲染 → x264 |
| `finalize.sh` | 拼接视频分段 + 响度标准化（-14 LUFS）+ 封装 |
| `cover.py` | 抖音封面 |

依赖：Python 3.13、skia-python、numpy、scipy、soundfile、scikit-image、sherpa-onnx、pypinyin、ffmpeg；字体为思源宋体/黑体（Noto Serif/Sans SC）、Cormorant Garamond、IBM Plex Mono、Inter、Noto Sans Linear A/Arabic。

```bash
python3 gen_tts.py            # 生成配音（需下载 Kokoro 模型）
python3 -c "..."              # 见 engine/timeline.py：由 audio/vo/durs.json 生成 audio/timeline.json
python3 audio/score.py        # 配乐 + 混音 → audio/out/mix.wav
NCHUNKS=12 python3 render.py 3840 60 out4k 4 final
bash finalize.sh out4k 别过来_4K60.mp4
```
