# 林肯的 3 张假像 · Three Fake Lincolns

Remotion 短片项目：9:16，1080×1920，30 fps，89.6 秒（75 BPM × 28 小节）。风格是「暗房档案 Darkroom Archive」，用真实档案图片当证据，字幕承担全部叙事，零配音。

## 环境

- Node ≥ 22、Python 3（numpy、scipy、matplotlib、opencv-python、Pillow）、ffmpeg / ffprobe
- `npm install`

## 预览

```bash
npx remotion studio
```

主合成是 `Main`。在右侧 props 面板里可以改 `durationSec`、`watermark`，以及 `motionBlur`（运动模糊，预览时建议关闭）。`Dev` 文件夹里是组件和调色的测试合成，不属于成片。

## 渲染

```bash
# 草稿：半尺寸，不开运动模糊
npm run render:draft                   # → out/draft.mp4

# 定稿：全尺寸，CRF 16，快速运动的帧开运动模糊（8 采样，快门 180°）
npm run render:final                   # → out/final_raw.mp4
scripts/loudnorm.sh out/final_raw.mp4 out/final.mp4   # 母带 + loudnorm 两遍：−14 LUFS / −1.5 dBTP

# 质检、字幕、封面
python3 -I scripts/qa.py out/final.mp4  # 画幅、帧率、时长、响度、静默段、循环接缝、朱砂占比、静止段
npm run srt                            # → out/three-fake-lincolns.zh.srt / .en.srt（serializeSrt）
npx remotion still Main out/cover.jpg --frame=0
```

定稿用 `scripts/chrome-wrapper.sh` 启动无头 Chrome，把 WebGL 上下文上限调到 256。运动模糊会把每张调色相纸在一帧里渲染多次，默认上限 16 不够用。

## 改时长（只改一个 prop）

画面、字幕和音效都由 `src/timeline.ts` 的单一时间轴驱动。帧号按 89.6 秒的基准写，`durationSec` 改了以后，`useTime()` 会把所有帧号等比换算，所以只需要：

```bash
npx remotion render Main out/final_75s.mp4 --props='{"durationSec":75,"motionBlur":true}' --browser-executable=scripts/chrome-wrapper.sh
```

配乐是按 75 BPM、28 小节合成的。换时长时要按同一比例重新合成配乐和静默段，否则节拍不对位：

```bash
# 例：75 秒 → BPM = 75 × 89.6 / 75 = 89.6；静默段帧号同样按 75 / 89.6 缩放
python3 -I scripts/synth_audio.py --bpm 89.6 --silence 1595 1607
```

字幕停留时长在原片里刚好达标。缩短到 80 秒以下时，先跑 `python3 -I ../research/script_data.py ../research/script.md` 检查停留时长。

## 结构

| 路径 | 内容 |
|---|---|
| `src/timeline.ts` | 唯一的时间轴：字幕、金句、场景边界、档案签、打字文本、音效事件、运动模糊窗口 |
| `src/theme.ts` | 色板、字体、字号、安全区、缓动（只用 bezier 和无回弹 spring）、调色参数 |
| `src/grade.ts` | 统一银盐调色：grayscale → vignette → 颗粒 → levels（显影）→ 分离色调 LUT |
| `src/scenes/` | 12 个场景组件 |
| `src/components/` | PhotoPrint（相纸，内置 1.5× 分辨率硬校验）、Breath / Dolly（镜头呼吸与推镜，缩放永远 ≤ 1）、Transitions（扫下桌、叶片快门、幻灯片换片）、Subtitle、SeriesChrome、Props、Desk、Soundtrack |
| `scripts/prepare_images.py` | 原图只缩不放地转成 public/images，并配准两张版画、计算差异图 |
| `scripts/synth_audio.py` | 用 numpy 合成配乐和全部音效；钢琴用 Salamander 采样；写出音效峰值偏移 manifest |
| `scripts/subset_fonts.py` | 按片中用到的字裁出中文字体子集 |
| `scripts/qa.py`、`scripts/review_package.py` | 自动质检、评审包（联系表、手机尺寸预览、音频波形 / 频谱 / 对齐表、响度报告） |

图片来源、许可和事实核查分别在 `../research/credits.draft.json` 和 `../research/facts.json`。
