# 由逐句配音生成：assets/vo.wav（整条旁白，48kHz）+ engine/final.js（成片时间映射与字幕时间）
# 用法：python3 make_final.py <vo目录（含 timing.json 与 line_XX.wav）>
import sys, json, subprocess, numpy as np, soundfile as sf, os
VO = sys.argv[1]; ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lines as L0
T = json.load(open(os.path.join(VO, 'timing.json'), encoding='utf8')); old = L0.load(); SR = 24000
lines = T['lines']; dur = T['duration']
# 1) 整条旁白
track = np.zeros(int(dur * SR) + SR, dtype=np.float32)
for l in lines:
    x, _ = sf.read(os.path.join(VO, f"line_{l['i']:02d}.wav"), dtype='float32'); a = int(l['t0'] * SR); track[a:a + len(x)] += x
tmp = os.path.join(VO, 'vo_raw.wav'); sf.write(tmp, track[:int(dur * SR)], SR, subtype='PCM_16')
# 人声润色：去低频、暖一点、提清晰度、轻压缩、极轻的房间感
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af',
  'highpass=f=85,equalizer=f=220:t=q:w=1.0:g=1.5,equalizer=f=3200:t=q:w=1.2:g=2.0,acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=2,aecho=0.85:0.6:45|75:0.07|0.05,aresample=48000',
  '-ac', '1', os.path.join(ROOT, 'assets', 'vo.wav')], check=True)
# 2) 时间锚点：每句起止 + 关键字卡点
def ch(i, c, which='start'):
    for cc, a, b in lines[i]['chars']:
        if cc == c: return a if which == 'start' else b
    return None
pairs = [(0.0, 0.0)]
for i, l in enumerate(lines): pairs += [(old[i]['t0'], l['t0']), (old[i]['t1'], l['t1'])]
words = [(3.35, ch(1, '结')), (15.1, (ch(6, '买') or 0) + 0.12), (24.35, ch(9, '拉')), (48.0, (ch(19, '号', 'end') or 0) + 0.1), (61.05, (ch(25, '账') or 0) + 0.08)]
pairs += [(o, n) for o, n in words if n]
pairs.append((ZG_OLD_END := 62.0, dur))
pairs.sort()
clean = [pairs[0]]
for o, n in pairs[1:]:
    if o > clean[-1][0] + 1e-3 and n > clean[-1][1] + 1e-3: clean.append((o, n))
# 3) 字幕时间：比人声早 0.06 秒出现，说完 0.25 秒后收；金句第一行一直留到第二行说完
lt = []
for i, l in enumerate(lines):
    nxt = lines[i + 1]['t0'] if i + 1 < len(lines) else dur
    lt.append([round(l['t0'] - 0.06, 3), round(min(l['t1'] + 0.25, nxt - 0.08), 3)])
lt[20][1] = round(lines[21]['t1'] + 0.3, 3)
out = {'duration': dur, 'vo': 'assets/vo.wav', 'voice': f"Kokoro v1.1 speaker {T['sid']}", 'map': {'old': [round(o, 3) for o, _ in clean], 'new': [round(n, 3) for _, n in clean]}, 'lineTimes': lt}
open(os.path.join(ROOT, 'engine', 'final.js'), 'w', encoding='utf8').write('// 自动生成（tts/make_final.py）：成片时长、设计时间→成片时间的映射、字幕时间\nwindow.ZG = window.ZG || {};\nZG.FINAL = ' + json.dumps(out, ensure_ascii=False) + ';\n')
print('duration', dur, 'anchors', len(clean))
