# ffprobe 报告

```
codec_name=h264
width=1080
height=1920
pix_fmt=yuv420p
r_frame_rate=30/1
nb_frames=2688
duration=89.600000
size=81956358
bit_rate=7317531
codec_name=aac
sample_rate=48000
channels=2
bit_rate=313522
```

要求：9:16 1080×1920，30 fps，89.6 秒（用户指定 75–90 秒）。

| 检查 | 结果 | 实测 | 标准 |
|---|---|---|---|
| 画幅 | PASS | 1080×1920 | 9:16 |
| 帧率 | PASS | 30 fps | 30 fps |
| 时长 | PASS | 89.600 s | 89.6 s ±1 帧 |
| 编码 | PASS | h264 / aac | H.264 + AAC |
| 响度 | PASS | -14.1 LUFS | −14 ±1 LUFS（成片） |
| 真峰值 | PASS | -1.9 dBTP | ≤ −1 dBTP |
| 静默 1905–1920 | PASS | -39.4 dBFS（前 1.4 秒 -11.7） | 只剩底噪：≤ −32 dBFS，且比前段低 ≥ 12 dB |
| 循环接缝 | PASS | 首尾帧平均差 1.05 / 255（含逐帧胶片颗粒） | < 4 |
| 朱砂占比 | PASS | 最高 1.14%（第 2487 帧） | 单帧 ≤ 5% |
| 静止画面 | PASS | 最长 69 帧（从第 1346 帧起） | ≤ 2.5 秒（75 帧） |
| 帧数 | PASS | 2688 帧 | 与时长一致 |
