# Vibe 知识大赏 · 视频工程

每一期是一个 80 秒的竖屏动画（1080×1920，30fps）。画面全部用代码画，音乐和音效用程序合成。

| 期数 | 内容 | 成片 |
|---|---|---|
| ep01 | Vibe Coding 黑话大赏 | `../vibe-coding-jargon.mp4` |
| ep02 | 你的大脑在骗你：认知偏差大赏 | `../cognitive-bias.mp4` |

## 结构

- `engine/`：所有期共用的部分，包括样式、动画工具、卡片模板、字幕、进度条和逐帧定位（`seek(t)`）。
- `epNN.html`：每期的外壳，在这里改配色。
- `episodes/epNN.js`：每期的内容，包括镜头、文案、字幕、音效时间点，以及 `CONFIG.music` 里的音乐段落。
- `render.js`：逐帧截图，再交给 ffmpeg 编码。
- `music.py`：按 `CONFIG.music` 合成 Lo-fi 配乐，并按动画里登记的时间点放音效。

## 常用命令

```bash
npm install
export NODE_PATH=$(npm root -g)          # 用全局安装的 playwright
./build.sh ep02                          # 一键出片，大约 5 分钟
node render.js ep02 stills 13.2,25.2     # 只出几张静帧，检查排版
open ep02.html?t=60                      # 在浏览器里从第 60 秒实时预览
```

## 做新的一期

1. 复制 `ep02.html` 为 `ep03.html`，改标题和配色，把里面引用的脚本改成 `episodes/ep03.js`。
2. 写 `episodes/ep03.js`：钩子 `scene(0, 4.8)`、标题 `scene(4.8, 8.4)`、10 张 `card(i, {...})`、收尾和互动两个 scene，最后调用 `finalize()`。
3. 如果要换和弦，在 `music.py` 的 `CHORD_SETS` 里加一套。
