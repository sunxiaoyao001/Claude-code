# Vibe知识大赏 · 第 2 集 · 阿克塞尔罗德大赛（重复囚徒困境）

系列第 2 集，接第一集片尾的“下期拆解：囚徒困境”。整个项目用 Remotion 写成，复制下来就能渲染。

**成片**：[`out/vibe-axelrod-1080x1920.mp4`](out/vibe-axelrod-1080x1920.mp4)（1080×1920 · 30fps · 1 分 56 秒 · H.264 + AAC）
**分镜脚本**：[`SCRIPT.md`](SCRIPT.md)

> 一场比谁更会算计的大赛，冠军只有 4 行代码。
> 而且，它一局都没赢过。

## 快速开始

```bash
npm install
npm run dev        # 打开 Remotion Studio 实时预览、拖时间轴
npm run render     # 渲染成片到 out/vibe-axelrod-1080x1920.mp4
npm run finalize   # 后期：转标准色彩范围 yuv420p + 响度标准化到 -16 LUFS + faststart
```

封面建议用 [`out/cover.jpg`](out/cover.jpg)（第 4.3 秒，钩子三行字和两枚印章都已出现的那一帧）。

- 需要 Node.js 18 以上。首次渲染时 Remotion 会自动下载 Chrome Headless Shell；如果机器上已经装了，可以加 `--browser-executable=<路径>` 直接用。
- 没有 GPU 的服务器用 `swangle`（软件 WebGL）渲染，已经在 `remotion.config.ts` 里设好。有 GPU 的话改成 `angle` 会快很多。
- 字体（裁过的思源宋体 / 思源黑体 / Oswald / JetBrains Mono）和全部音频已经放在 `public/` 里，渲染时不需要联网。

### 其它命令

| 命令 | 作用 |
|---|---|
| `npm run math` | 校验视频里的对局比分、“最多只输 5 分”定理（2 万个随机对手）和 1000 代演化结果 |
| `npm run audio` | 重新合成全部音效和配乐（纯 DSP，无采样素材） |
| `npm run fonts -- --src <ttf目录>` | 改了字幕之后重新裁剪中文字体，避免出现缺字方块 |
| `npm run finalize` | 成片后期处理（色彩范围、响度、faststart） |
| `node scripts/preview-stills.mjs 120 860 1470` | 只打包一次，批量导出关键帧截图到 `out/stills/` |
| `npm run render -- --props='{"withAudio":false}'` | 渲染无声版本 |

## 项目结构

```
src/
  timeline.ts            ★ 导演台本：场景、字幕、重击、情绪色、音效，全部在这一个文件里
  Axelrod.tsx            图层合成 + 场景镜头 + CRT 换台转场
  theme.ts               配色（青 = 合作，红 = 背叛，金 = 以牙还牙）与字体
  math/ipd.ts            收益矩阵、5 种策略、对局模拟、演化（复制者动态）、第一届原始成绩
  lib/                   动画工具、镜头、富文本解析、字体加载
  components/
    ShaderBackground.tsx GLSL 烟雾体积光 + 透视网格地面 + Three.js 三维浮尘
    Terminal.tsx         CRT 终端（开机、打字、行高亮）
    Beads.tsx            出招珠串（照抄箭头、手滑 / 原谅标记、实时计分）
    Token.tsx            单字徽章、印章、互动图标
    Subtitles.tsx        全局字幕轨
    Post.tsx             闪白、扫描线、颗粒、暗角、章节进度条
    Soundtrack.tsx       配乐与音效编排
  scenes/
    Hook / Dilemma / Tourney / Board / Tft / Paradox / Evolve / Caveat / Outro
scripts/                 音频合成、字体裁剪、数学校验、截图预览、成片后期
public/fonts, public/audio
```

## 怎么改成别的选题

1. 在 `timeline.ts` 里改 `SUBTITLES`（字幕）和 `SCENES`（场景时长），总时长会自动跟着变。
2. 重击（`IMPACTS`）、情绪色（`MOODS`）、音效（`SFX`）都是关键帧列表，改帧号就能重新编排；各场景的动画时间点写在对应的 `scenes/*.tsx` 顶部。
3. 颜色在 `theme.ts`，博弈模型和史实数据在 `math/ipd.ts`。
4. 字幕里出现了新的汉字，记得运行一次 `npm run fonts`。
5. 运行 `npm run audio`，音效会按新的时间轴重新生成。

## 授权

- 代码：随本仓库。
- 字体：Noto Serif SC / Noto Sans SC / Oswald / JetBrains Mono，均为 SIL Open Font License 1.1。
- 音频：由 `scripts/gen-audio.ts` 程序合成，不含任何第三方素材。
