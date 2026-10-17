# 百年，为看见 — Nikon 品牌短片（Pictogram Motion）

90 秒、16:9、24 fps，只有音乐与字卡。分镜、色板、史实核查与节拍表见 [TREATMENT.md](TREATMENT.md)。

**成片**：[dist/nikon-century.mp4](dist/nikon-century.mp4)（高画质，70 MB）· [dist/nikon-century-small.mp4](dist/nikon-century-small.mp4)（压缩版，24 MB）· [字幕 .srt](dist/nikon-century.srt) · [缩略图](dist/contact-sheet.png) · [音画对位报告](dist/onsets.txt)

## 构建

```sh
npm install            # @napi-rs/canvas
pip install numpy scipy
./fetch-fonts.sh       # Noto Sans CJK SC, Inter, DM Mono（均为 OFL）
npm run build          # → out/nikon-century.mp4 + .srt + onsets.txt
SECOND=zh npm run build   # 第二行改为中文说明（纯中文版）→ out/nikon-century-zh.mp4
```

`npm run stills` 输出逐镜头缩略图 `out/contact-sheet.png`；`npm run poses -- LAKE polish raise` 输出动作样张。

## 结构

| 文件 | 作用 |
|---|---|
| `src/engine.js` | 色板（5 阶色调）、网格图案与纹样库、象形人物（IK）、蒙版文字、缓动 |
| `src/poses.js` | 每个条目一个动作（按拍定义，关键动作落在整拍） |
| `src/stage.js` | 日盘 + 人物层 |
| `src/edl.js` | 剪辑表（以拍为单位）——画面、配乐、字幕的唯一数据源 |
| `src/scenes.js` | 卡片版式、HUD、组装角标、网格转场、动态模糊 |
| `src/render.js` / `src/build.js` | 并行渲染 → 拼接 → 配乐 → 封装时加颗粒 |
| `music/music.py` | 读剪辑表定位重音的配乐；输出 −14 LUFS、对位报告 |

品牌说明：片中不使用尼康官方标志与官方口号；"尼康 / NIKON"以片中字体排版，相机为几何象形图。若公开商用投放，品牌使用需获得授权。
