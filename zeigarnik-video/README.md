# 《你忘不掉的不是那个人，是那个没写完的结局》代码级视频方案

62 秒 · 1080×1920 · 30fps · 22 个镜头。完整导演手册（分镜、人物、提示词等）见 Claude 发布的同名页面。

## 它做什么

`engine/` 是一个确定性的 Canvas 渲染引擎：任何时间点 t 都能画出同一帧。

- 程序层负责：光环母题、粒子、发光、心里的城市、聊天框、转场、镜头运动、字幕、胶片质感、按卡点合成的临时音轨。
- 拟真人物镜头由 AI 生成（提示词在导演手册第 12 节），放进 `assets/` 后自动铺进对应镜头，动效叠在上面。
- 没有素材时，人物镜头显示“AI 拟真素材位”取景框，整片仍可完整预演。

## 用法

```bash
# 预览（需要本地 http 服务，直接双击 html 会因为跨域读不到字体和素材）
npx serve .            # 然后打开 http://localhost:3000/index.html

# 导出成片（含临时音轨，响度归一到约 -16 LUFS）→ out/zeigarnik_preview.mp4
node render/render.mjs

# 半分辨率快速版 → out/zeigarnik_preview_small.mp4
node render/render.mjs --scale 0.5

# 只导出动效+字幕的透明层（ProRes 4444 带 Alpha）→ out/overlay_4444.mov
node render/render.mjs --overlay

# 导出指定秒数的静帧 → out/stills/
node render/render.mjs --stills 3.4,15.1,48

# 由 timeline.js 重新生成 subtitles.srt 和 voiceover.txt
node render/export-text.mjs

# 重新下载字体子集（改了画面里的文字后运行）
node render/fetch-fonts.mjs
```

依赖：Node 18+、`playwright`（带 Chromium）、`ffmpeg`。

## 放入 AI 素材

1. 按导演手册生成素材，命名为镜头号：`SH01.mp4`、`SH06.png`、回忆照片 `SH03-1.jpg` … `SH03-5.jpg`、半张照片里的画面 `SH04.mp4`。
2. 放进 `assets/`，复制 `assets/manifest.example.json` 为 `assets/manifest.json` 并只保留已有的文件。
3. 重新运行 `node render/render.mjs`。视频素材会逐帧精确对齐镜头时间。

构图约定（让叠加动效对准人物）：SH01 TA 的倒影在画面约 (65%, 44%)；SH06 服务员头部在 (50%, 45%)；SH10 手腕在 (40%, 62%)、巷口在 (70%, 32%)；SH18 台灯在 (73%, 40%)。

## 改节奏

所有时间都在 `engine/timeline.js`：`SHOTS`（镜头起止与转场）、`LINES`（旁白/字幕与高亮词）、`CUES`（卡点音效）。改完刷新预览即可，音轨会按新卡点重新合成。

## 文件

| 路径 | 内容 |
| --- | --- |
| `engine/timeline.js` | 镜头、旁白、卡点（单一数据源） |
| `engine/core.js` | 光环、发光、粒子、字幕排版、胶片颗粒、占位取景框 |
| `engine/city.js` | 心里的城市，窗灯随全局时间连续变化 |
| `engine/scenes1-3.js` | 22 个镜头的动效与镜头运动 |
| `engine/compose.js` | 转场、AI 素材贴入、字幕安全区、透明层模式 |
| `engine/audio.js` | Web Audio 合成的临时配乐与音效 |
| `render/render.mjs` | Playwright 逐帧截取 → ffmpeg |
| `artifact/` | 导演手册页面源码 |
| `subtitles.srt` / `voiceover.txt` | 字幕与配音稿 |

字体：思源宋体 / 思源黑体（Noto Serif SC / Noto Sans SC，SIL OFL 1.1）按本片用字裁剪的子集。临时音轨全部为程序合成，正式发布请替换为商用曲库音乐和真人或 TTS 旁白。
