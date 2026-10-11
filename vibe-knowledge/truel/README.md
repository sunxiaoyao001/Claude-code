# Vibe知识大赏 · 三人决斗（枪手博弈）

一条可以直接发抖音的竖屏知识短视频，整个项目用 Remotion 写成，复制下来就能渲染。

**成片**：[`out/vibe-truel-1080x1920.mp4`](out/vibe-truel-1080x1920.mp4)（1080×1920 · 30fps · 1 分 54 秒 · H.264 + AAC）
**分镜脚本**：[`SCRIPT.md`](SCRIPT.md)

> 三个枪手决斗，枪法最烂的那个，活下来的概率最大。
> 他做对的唯一一件事：朝天开枪。

## 快速开始

```bash
npm install
npm run dev        # 打开 Remotion Studio 实时预览、拖时间轴
npm run render     # 渲染成片到 out/vibe-truel-1080x1920.mp4
npm run finalize   # 后期：转标准色彩范围 yuv420p + 响度标准化到 -16 LUFS + faststart
```

封面建议用 [`out/cover.jpg`](out/cover.jpg)（第 4.2 秒，钩子三行字全部出现的那一帧）。

- 需要 Node.js 18 以上。首次渲染时 Remotion 会自动下载 Chrome Headless Shell；如果机器上已经装了，可以加 `--browser-executable=<路径>` 直接用。
- 没有 GPU 的服务器用 `swangle`（软件 WebGL）渲染，已经在 `remotion.config.ts` 里设好。有 GPU 的话改成 `angle` 会快很多。
- 字体（裁过的思源宋体 / 思源黑体 / Oswald / JetBrains Mono）和全部音频已经放在 `public/` 里，渲染时不需要联网。

### 其它命令

| 命令 | 作用 |
|---|---|
| `npm run math` | 打印并校验视频里出现的所有概率（精确解 + 一万场蒙特卡洛） |
| `npm run audio` | 重新合成全部音效和配乐（纯 DSP，无采样素材） |
| `npm run fonts -- --src <ttf目录>` | 改了字幕之后重新裁剪中文字体，避免出现缺字方块 |
| `npm run finalize` | 成片后期处理（色彩范围、响度、faststart） |
| `node scripts/preview-stills.mjs 120 860 1470` | 只打包一次，批量导出关键帧截图到 `out/stills/` |
| `npm run render -- --props='{"withAudio":false}'` | 渲染无声版本 |

## 项目结构

```
src/
  timeline.ts            ★ 导演台本：场景、字幕、开枪、瞄准、镜头、情绪色、音效，全部在这一个文件里
  Truel.tsx              图层合成
  theme.ts               色彩 / 字体 / 决斗场几何
  math/truel.ts          精确概率 + 固定种子的蒙特卡洛
  lib/                   动画工具、世界状态推导、富文本解析、字体加载
  components/
    ShaderBackground.tsx GLSL 烟雾体积光 + Three.js 三维浮尘
    World.tsx            决斗场世界层（挂在摄像机下运镜）
    Arena.tsx            罗盘地面、对峙红线、开枪顺序箭头、威胁光束
    Medal.tsx            枪手徽章（子弹环 = 命中率，中弹后裂开坠落）
    Combat.tsx           准星、轮次指示、曳光弹、冲击波、先手印章
    Subtitles.tsx        全局字幕轨
    Post.tsx             闪白、倒带、颗粒、暗角、章节进度条
    Soundtrack.tsx       配乐与音效编排
  scenes/
    Overlays.tsx         钩子 / 登场 / 抛问题 / 直觉陷阱 / 反转 / 拆解 / 边界
    Proof.tsx            一万场模拟点阵 → 柱状图 → 斜率图 → 策略对比
    Outro.tsx            升华与片尾互动
scripts/                 音频合成、字体裁剪、数学校验、截图预览
public/fonts, public/audio
```

## 怎么改成别的选题

1. 在 `timeline.ts` 里改 `SUBTITLES`（字幕）和 `SCENES`（场景时长），总时长会自动跟着变。
2. 开枪、瞄准、镜头都是关键帧列表（`SHOTS` / `AIMS` / `CAMERA`），改帧号就能重新编排。
3. 颜色和人物设定在 `theme.ts`，概率模型在 `math/truel.ts`。
4. 字幕里出现了新的汉字，记得运行一次 `npm run fonts`。
5. 运行 `npm run audio`，音效会按新的时间轴重新生成。

## 授权

- 代码：随本仓库。
- 字体：Noto Serif SC / Noto Sans SC / Oswald / JetBrains Mono，均为 SIL Open Font License 1.1。
- 音频：由 `scripts/gen-audio.ts` 程序合成，不含任何第三方素材。
