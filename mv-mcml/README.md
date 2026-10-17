# 《一个条件换来的曲子》MV 工程

配乐：坂本龙一《Merry Christmas Mr. Lawrence》（音频由使用者自备，不包含在工程里）。
画面全部由代码绘制：没有视频生成模型、没有实拍素材、没有电影截图。

## 目录

| 路径 | 内容 |
|---|---|
| `index.html` + `src/main.js` | 页面入口，`window.render(t)` 画出第 t 秒的那一帧 |
| `src/story.js` | 时间线：段落、字幕、音符起音点（`cues.json` 存在时用真实起音点覆盖） |
| `src/shots.js` | 镜头调度和转场（竖条展开、横条展开、墨晕、胶片过片、蒙版） |
| `src/scenes/*.js` | 七幕：钩子、剧本、读剧本、条件、小岛、作曲之夜、1946 牢房、四十年、NHK 509 与尾声 |
| `src/comp.js` | 纸面合成器（WebGL2）：纸纹、墨的晕染与积边、三种色调 |
| `src/ink.js` | 水墨笔刷引擎（笔毫、飞白、湿墨块） |
| `src/figures.js`、`src/mono.js` | 人物剪影、背影、侧影；黑白段落的人物和三角钢琴 |
| `src/geo.js` | 五线谱、琴键、胶片画框 |
| `src/text.js`、`src/seal.js` | 字幕（逐字从遮罩里升起）、朱红白文印 |
| `tools/` | 渲染（`render.mjs`）、静帧（`still.mjs`）、联系表（`sheet.py`）、阅读时长检查（`readcheck.mjs`）、音频分析（`analyze.py`） |

## 用法

需要 Node.js、Chromium（Playwright）、ffmpeg、Python 3 + numpy。

```sh
# 1. 用自己的音频生成真实起音点和剪好的配乐（out/music_edit.wav + cues.json）
python3 tools/analyze.py 你的音频.mp3
#    或者从原曲某一秒开始连续取（方便发抖音时用音乐库对齐）：
python3 tools/analyze.py 你的音频.mp3 --start 95

# 2. 检查
node tools/still.mjs 3 30 60 --out check      # 抽几帧看
node tools/readcheck.mjs                        # 每句字幕的阅读时长

# 3. 渲染（1080×1920，60 fps；--mb 3 在镜头快的帧上做运动模糊）
node tools/render.mjs --fps 60 --workers 3 --out out/video.mp4

# 4. 合成音画
ffmpeg -i out/video.mp4 -i out/music_edit.wav -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart out/mv.mp4
```

## 借用的开源代码

- `src/ink.js`、`src/lib.js`、`src/comp.js`（改编）、`tools/page.mjs`、`tools/render.mjs`、`tools/sheet.py`、`tools/readcheck.mjs` 的规则：来自 [lemo-opuscar](https://github.com/gandongdexingfu/lemo-opuscar)（MIT，见 `LICENSE-lemo-opuscar.txt`）。
- 确定性渲染（每帧只由 t 决定、`hash` 代替随机数）和分镜写法参考了 [PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) 的 ANIMATION_GUIDE / STORYBOARD。
- 提示词结构（方向、禁用清单、按节拍的分镜、验收）参考了 [awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos) 和 [opus-video-prompts](https://github.com/joeseesun/opus-video-prompts)。

素材授权见 `CREDITS`。
