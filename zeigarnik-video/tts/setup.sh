#!/usr/bin/env bash
# 下载本地配音与校对模型到 /home/user/tts（脚本里的路径默认指向这里）
set -e
mkdir -p /home/user/tts && cd /home/user/tts
pip install sherpa-onnx soundfile numpy
# 配音：Kokoro v1.1 多语种（含 100 个中文音色，Apache-2.0）
curl -L -o kokoro.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_1.tar.bz2 && tar xjf kokoro.tar.bz2
# 校对：Paraformer 中文识别（检查每句是否念对）
curl -L -o asr.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-paraformer-zh-small-2024-03-09.tar.bz2 && tar xjf asr.tar.bz2
# 补充一字多音的变调（一句/一张/一封/一次/一股/一买单）和“聊天框”
cd kokoro-multi-lang-v1_1
cat >> lexicon-zh.txt <<'LEX'
一张 ㄧ 4 ㄓ ㄤ 1
一股 ㄧ 4 ㄍ ㄨ 3
一封 ㄧ 4 ㄈ ㄥ 1
一句 ㄧ 2 ㄐ ㄩ 4
一次 ㄧ 2 ㄘ ㄭ 4
一买单 ㄧ 4 ㄇ ㄞ 3 ㄉ ㄢ 1
聊天框 ㄌ 要 2 ㄊ 言 1 ㄎ 王 4
LEX
printf '一买单 200 v\n聊天框 200 n\n' >> dict/jieba.dict.utf8
echo done
