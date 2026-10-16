# Vibe知识大赏 · 第 5 集 · 猜平均数的 2/3

系列第 5 集，接第四集片尾的“下期拆解：猜平均数的 2/3”。整个项目用 Remotion 写成，复制下来就能渲染。

**成片**：[`out/vibe-guess-two-thirds-1080x1920.mp4`](out/vibe-guess-two-thirds-1080x1920.mp4)（1080×1920 · 30fps · 1 分 55 秒 · H.264 + AAC）
**分镜脚本**：[`SCRIPT.md`](SCRIPT.md)

> 从 0 到 100 选一个数，谁最接近所有人平均数的 2/3，谁就赢。
> 一层层想下去，答案是 0——可选 0 的人，全输了。

## 快速开始

```bash
npm install
npm run dev        # 打开 Remotion Studio 实时预览、拖时间轴
npm run render     # 渲染成片到 out/vibe-guess-two-thirds-1080x1920.mp4
npm run finalize   # 后期：转标准色彩范围 yuv420p + 响度标准化到 -16 LUFS + faststart
```

封面建议用 [`out/cover.jpg`](out/cover.jpg)（第 4.3 秒，钩子三行字全部出现、“全输了”印章砸下的那一帧）。

- 需要 Node.js 18 以上。首次渲染时 Remotion 会自动下载 Chrome Headless Shell；如果机器上已经装了，可以加 `--browser-executable=<路径>` 直接用。
- 没有 GPU 的服务器用 `swangle`（软件 WebGL）渲染，已经在 `remotion.config.ts` 里设好。有 GPU 的话改成 `angle` 会快很多。
- 字体（裁过的思源宋体 / 思源黑体 / Oswald / JetBrains Mono）和全部音频已经放在 `public/` 里，渲染时不需要联网。

### 其它命令

| 命令 | 作用 |
|---|---|
| `npm run math` | 校验层级数列、规则举例、纳什均衡，以及示意数据的平均数 / 中位数 / 泊松分布 |
| `npm run audio` | 重新合成全部音效和配乐（纯 DSP，无采样素材） |
| `npm run fonts -- --src <ttf目录>` | 改了字幕之后重新裁剪中文字体，避免出现缺字方块 |
| `npm run finalize` | 成片后期处理（色彩范围、响度、faststart） |
| `node scripts/preview-stills.mjs 120 900 2680` | 只打包一次，批量导出关键帧截图到 `out/stills/` |
| `npm run render -- --props='{"withAudio":false}'` | 渲染无声版本 |

## 项目结构

```
src/
  timeline.ts            ★ 导演台本：场景、字幕、重击、情绪色、音效、配乐闪避
  GuessTwoThirds.tsx     图层合成 + 场景镜头
  theme.ts               配色（金 = 目标 2/3，蓝 = 别人，青 = 赢家，红 = 输，白 = 0，紫 = 凯恩斯）与字体
  math/guess.ts          层级推理、纳什均衡检验、文献数据、示意样本
  lib/                   动画工具、镜头、富文本解析、字体加载
  components/
    ShaderBackground.tsx GLSL 烟雾 + 顶部聚光 + Three.js 三维浮尘
    NumberLine.tsx       0～100 数轴、平均数 / 目标标记、点状直方图
    Mind.tsx             Droste 套娃思维（“我想他想我想……”）
    Newspaper.tsx        风格化报纸卡片
    Faces.tsx            凯恩斯选美的抽象头像墙
    Props.tsx            打勾、叉
    Token.tsx            单字徽章、印章、互动图标
    Subtitles.tsx        全局字幕轨
    Post.tsx             闪白、颗粒、暗角、章节进度条
    Soundtrack.tsx       配乐与音效编排
  scenes/
    Opening.tsx          钩子 / 规则
    Reason.tsx           层级推理 / 纳什均衡
    Evidence.tsx         纳格尔实验 / 报纸大赛
    Insight.tsx          错在哪 / 凯恩斯选美与泡沫
    Ending.tsx           启示 / 片尾
scripts/                 音频合成、字体裁剪、数学校验、截图预览、成片后期
public/fonts, public/audio
```

## 怎么改成别的选题

1. 在 `timeline.ts` 里改 `SUBTITLES`（字幕）和 `SCENES`（场景时长），总时长会自动跟着变。
2. 重击（`IMPACTS`）、情绪色（`MOODS`）、音效（`SFX`）、配乐闪避（`MUSIC_DUCK`）都是关键帧列表，改帧号就能重新编排。
3. 颜色在 `theme.ts`，数据在 `math/guess.ts`；把 `P` 改成 1/2 就是“猜平均数的一半”，层级数列和套娃里的数字会一起变。
4. 字幕里出现了新的汉字，记得运行一次 `npm run fonts`。
5. 运行 `npm run audio`，音效和配乐会按新的时间轴重新生成。

## 授权

- 代码：随本仓库。
- 字体：Noto Serif SC / Noto Sans SC / Oswald / JetBrains Mono，均为 SIL Open Font License 1.1。
- 音频：由 `scripts/gen-audio.ts` 程序合成，不含任何第三方素材。
