#!/bin/bash
# 用法: finalize.sh PARTS_DIR OUT.mp4
# 拼接视频分段（无损）+ 响度标准化后的混音（AAC 320k）
set -e
PARTS=$1
OUT=$2
P=/tmp/claude-0/proj
cd "$PARTS"
ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt -c copy video_only.mp4
# 两遍 loudnorm：-14 LUFS / -1 dBTP
if [ ! -f $P/audio/out/mix_norm.wav ] || [ $P/audio/out/mix.wav -nt $P/audio/out/mix_norm.wav ]; then
  J=$(ffmpeg -hide_banner -i $P/audio/out/mix.wav -af loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  II=$(echo "$J" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['input_i'])")
  TP=$(echo "$J" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['input_tp'])")
  LRA=$(echo "$J" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['input_lra'])")
  TH=$(echo "$J" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['input_thresh'])")
  OFF=$(echo "$J" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['target_offset'])")
  ffmpeg -y -loglevel error -i $P/audio/out/mix.wav -af "loudnorm=I=-14:TP=-1.0:LRA=11:measured_I=$II:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$TH:offset=$OFF:linear=true" -ar 48000 -c:a pcm_s24le $P/audio/out/mix_norm.wav
fi
ffmpeg -y -loglevel error -i video_only.mp4 -i $P/audio/out/mix_norm.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart \
  -metadata title="别过来：如何给一万年后的人类写一封信" "$OUT"
ffprobe -v error -show_entries format=duration,size,bit_rate -show_entries stream=codec_name,width,height,r_frame_rate -of compact "$OUT"
