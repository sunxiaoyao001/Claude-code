# AI 根本不会“说话”，它只会猜下一个字

用 [Remotion](https://www.remotion.dev/) 做的科普视频：1920×1080、30fps，总长约 3 分 45 秒，一共 8 个镜头，画面全部由代码生成。

| # | 镜头 | 内容 |
| --- | --- | --- |
| 0 | 开场 | AI 写诗到一半定格，打出“它只会猜下一个字” |
| 1 | 猜字游戏 | 床前明月＿ / 今天天气真＿ 的候选字概率；token 是什么 |
| 2 | 一个字接一个字 | “天空为什么是蓝的”，逐字预测、接到句尾、再猜下一个 |
| 3 | 它是怎么学会的 | 海量文本喂进模型 → 遮字猜 → 拧旋钮 → 几千亿参数 → 助手课 |
| 4 | 猜字凭什么变聪明 | 侦探小说“凶手就是——”，冰山：语法 / 常识 / 推理 |
| 5 | 为什么每次回答不一样 | 按概率抽签的转盘，温度 T 对分布的影响（真实的 softmax 计算） |
| 6 | 一本正经地胡说八道 | 编出来的书名被盖“查无此书”章；联网搜索与自行核实 |
| 7 | 结尾 | 满屏都是猜测，留下问题“算不算真的懂” |

## 常用命令

```bash
npm install
npm run dev            # 打开 Remotion Studio 实时预览（Scenes 文件夹里可以单看每个镜头）
npm run render         # 渲染带字幕的成片 → out/ai-video.mp4
npm run render:nosubs  # 渲染无字幕版本 → out/ai-video-nosubs.mp4（适合自己在剪映里加字幕）
npm run srt            # 导出 out/subtitles.srt 和录音稿 out/narration.txt
npm run typecheck
```

## 改文案、对配音

所有口播文案都在 `src/script.ts`，一行就是一句字幕。

- **时长按字数自动算**，默认语速 `CHARS_PER_SECOND = 4.4`（约 260 字/分钟），画面会跟着文案一起移动。
- 句子上的 `cue` 是画面节拍，比如 `{text: '猜错了', cue: 'wrong'}`，镜头里通过 `cues.wrong` 拿到这句开始的帧。改文案时保留 `cue`，画面就不会对不上。

推荐的配音流程：

1. 运行 `npm run srt`，照着 `out/narration.txt` 录音（里面标了每个镜头的开始时间）。
2. 如果录出来整体偏快或偏慢，调整 `CHARS_PER_SECOND`。个别句子对不上，就给那一句加 `sec: 实际秒数`。
3. 把录音放到 `public/voiceover.mp3`，再在 `src/Video.tsx` 的 `<Background />` 下面加一行
   `<Audio src={staticFile('voiceover.mp3')} />`（从 `remotion` 引入 `Audio` 和 `staticFile`），然后重新渲染。

   也可以直接把 `render:nosubs` 的成片拖进剪辑软件，在那里配音、加 BGM 和字幕。

## 目录

```
src/
  script.ts          口播文案 + 时间轴（改文案只改这里）
  Video.tsx          把 8 个镜头串起来
  Root.tsx           注册成片 / 无字幕版 / 单镜头预览
  theme.ts           颜色与字体
  anim.ts            动画小工具（淡入、弹出、打字机…）
  components/        对话框、概率柱、填空框、旋钮、字幕、背景
  scenes/S1~S8       8 个镜头
scripts/export-srt.ts
public/fonts/        思源黑体 / 思源宋体（Noto Sans/Serif SC）与 JetBrains Mono，均为 SIL OFL 授权
```

## 说明

- 视频里的概率数字都是示意值，画面上已经标注。
- “李明远教授”和他的书名都是编的，用来演示 AI 幻觉，画面上同样有标注。
- 训练数据量“十几万亿 token”参考的是主流开源模型公开的训练规模；“读几万年”按每分钟 250 词、不眠不休估算，只取数量级。
