# Vibe知识大赏 · 第 3 集 · 美元拍卖

系列第 3 集，接第二集片尾的“下期拆解：美元拍卖的陷阱”。整个项目用 Remotion 写成，复制下来就能渲染。

**成片**：[`out/vibe-dollar-auction-1080x1920.mp4`](out/vibe-dollar-auction-1080x1920.mp4)（1080×1920 · 30fps · 1 分 56 秒 · H.264 + AAC）
**分镜脚本**：[`SCRIPT.md`](SCRIPT.md)

> 拍卖一张 100 元，第二名也要付钱。
> 每一步都很理性，价格却冲破了 100，停不下来。

## 快速开始

```bash
npm install
npm run dev        # 打开 Remotion Studio 实时预览、拖时间轴
npm run render     # 渲染成片到 out/vibe-dollar-auction-1080x1920.mp4
npm run finalize   # 后期：转标准色彩范围 yuv420p + 响度标准化到 -16 LUFS + faststart
```

封面建议用 [`out/cover.jpg`](out/cover.jpg)（第 4.3 秒，钩子三行字全部出现、报价器已经冲破 100 的那一帧）。

- 需要 Node.js 18 以上。首次渲染时 Remotion 会自动下载 Chrome Headless Shell；如果机器上已经装了，可以加 `--browser-executable=<路径>` 直接用。
- 没有 GPU 的服务器用 `swangle`（软件 WebGL）渲染，已经在 `remotion.config.ts` 里设好。有 GPU 的话改成 `angle` 会快很多。
- 字体（裁过的思源宋体 / 思源黑体 / Oswald / JetBrains Mono）和全部音频已经放在 `public/` 里，渲染时不需要联网。

### 其它命令

| 命令 | 作用 |
|---|---|
| `npm run math` | 校验视频里的出价、“放弃 vs 加价”的收益比较，以及最终三方结算 |
| `npm run audio` | 重新合成全部音效和配乐（纯 DSP，无采样素材） |
| `npm run fonts -- --src <ttf目录>` | 改了字幕之后重新裁剪中文字体，避免出现缺字方块 |
| `npm run finalize` | 成片后期处理（色彩范围、响度、faststart） |
| `node scripts/preview-stills.mjs 120 860 1470` | 只打包一次，批量导出关键帧截图到 `out/stills/` |
| `npm run render -- --props='{"withAudio":false}'` | 渲染无声版本 |

## 项目结构

```
src/
  timeline.ts            ★ 导演台本：场景、字幕、竞价进程（每一口出价的帧）、重击、情绪色、音效
  DollarAuction.tsx      图层合成 + 场景镜头
  theme.ts               配色（金 = 你，蓝 = 他，青 = 面值，红 = 亏损，琥珀 = 拍卖师）与字体
  math/auction.ts        出价序列、放弃与加价的收益、最终结算
  lib/                   动画工具、镜头、富文本解析、字体加载
  components/
    ShaderBackground.tsx GLSL 烟雾 + 顶部聚光 + 拍卖台光斑 + Three.js 三维浮尘
    Props.tsx            拍品钞票、号码牌、拍卖槌、报价器
    Token.tsx            单字徽章、印章、互动图标
    Subtitles.tsx        全局字幕轨
    Post.tsx             闪白、颗粒、暗角、章节进度条
    Soundtrack.tsx       配乐与音效编排
  scenes/
    Hook / Rules / Cheap / Trap / Sold / Lab / Why / World / How
scripts/                 音频合成（含 Shepard 无限上升音）、字体裁剪、数学校验、截图预览、成片后期
public/fonts, public/audio
```

## 怎么改成别的选题

1. 在 `timeline.ts` 里改 `SUBTITLES`（字幕）和 `SCENES`（场景时长），总时长会自动跟着变。
2. 竞价节奏由 `timeline.ts` 的 `BID_AT`（每一口出价出现的帧）决定；重击（`IMPACTS`）、情绪色（`MOODS`）、音效（`SFX`）都是关键帧列表，改帧号就能重新编排。
3. 颜色在 `theme.ts`，拍品面值、加价幅度在 `timeline.ts`（`FACE` / `STEP`），收益计算在 `math/auction.ts`。
4. 字幕里出现了新的汉字，记得运行一次 `npm run fonts`。
5. 运行 `npm run audio`，音效会按新的时间轴重新生成。

## 授权

- 代码：随本仓库。
- 字体：Noto Serif SC / Noto Sans SC / Oswald / JetBrains Mono，均为 SIL Open Font License 1.1。
- 音频：由 `scripts/gen-audio.ts` 程序合成，不含任何第三方素材。
