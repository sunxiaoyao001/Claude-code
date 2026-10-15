# 配音

- 音色：Kokoro v1.1 第 57 号中文女声（低、暖），本地 CPU 合成，模型为 Apache-2.0 授权。
- 语速：多数句子 1.28 倍，金句和结尾放慢到 1.12–1.16 倍（`speeds_voice57.json` + `vo_build.py` 里的覆盖项）。
- 每句都用 Paraformer 中文识别回读校对；“它/他”“忘/望”这类同音字不算错。

```bash
bash tts/setup.sh                                   # 下载模型到 /home/user/tts
cd /home/user/tts && cp <项目>/tts/*.py .
python3 vo_build.py 1.25 <项目>/tts/speeds_voice57.json   # 输出 vo/line_XX.wav 与 vo/timing.json
python3 <项目>/tts/make_final.py /home/user/tts/vo        # 生成 assets/vo.wav 与 engine/final.js
```
