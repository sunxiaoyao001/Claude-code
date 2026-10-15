# 生成最终旁白：逐句合成 → 去首尾静音 → 识别校对 → 按设计停顿排版 → 输出时间数据
import sys, json, re, numpy as np, soundfile as sf
sys.path.insert(0, '/home/user/tts')
import tts, lines
SID, SPEED = 57, float(sys.argv[1]) if len(sys.argv) > 1 else 1.1
CHOICE = {int(k): v['speed'] for k, v in json.load(open(sys.argv[2])).items()} if len(sys.argv) > 2 else {}
CHOICE[17] = 1.22; CHOICE[25] = 1.16; CHOICE[20] = 1.12; CHOICE[21] = 1.12
SR = 24000
# 每句之前的停顿（秒）：段落之间更长，钩子更紧
GAP_BEFORE = {0: 0.25, 1: 0.18, 2: 0.4, 3: 0.2, 4: 0.5, 5: 0.22, 6: 0.25, 7: 0.55, 8: 0.5, 9: 0.25,
              10: 0.5, 11: 0.3, 12: 0.22, 13: 0.22, 14: 0.25, 15: 0.5, 16: 0.45, 17: 0.75, 18: 0.3,
              19: 0.3, 20: 0.85, 21: 0.4, 22: 0.75, 23: 0.25, 24: 0.45, 25: 0.22}
TAIL = 1.0
def trim(x, thr=0.006, pre=0.03, post=0.16):
    env = np.convolve(np.abs(x), np.ones(240) / 240, 'same')
    idx = np.where(env > thr)[0]
    a, b = max(0, idx[0] - int(pre * SR)), min(len(x), idx[-1] + int(post * SR))
    y = x[a:b].copy(); f = min(len(y), int(0.03 * SR)); y[-f:] *= np.linspace(1, 0, f)  # 尾部 30ms 淡出，避免爆音
    return y
def segments(x, gap=0.07, thr=0.01):
    env = np.convolve(np.abs(x), np.ones(240) / 240, 'same') > thr
    segs, on, start, quiet = [], False, 0, 0
    for i, v in enumerate(env):
        if v and not on: on, start = True, i
        if not v and on:
            quiet += 1
            if quiet > gap * SR: segs.append((start / SR, (i - quiet) / SR)); on, quiet = False, 0
        elif v: quiet = 0
    if on: segs.append((start / SR, len(x) / SR))
    return segs
def char_times(text, x):
    # 按标点切成短语，对齐到检测到的语音段；短语内按字数均分
    phrases = [p for p in re.split(r'[，。：？、]', text) if p]
    segs = segments(x)
    if len(segs) != len(phrases):  # 对不上就整体按字数均分
        segs = [(0, len(x) / SR)]; phrases = [''.join(phrases)]
    out = []
    for (a, b), ph in zip(segs, phrases):
        n = len(ph)
        for k, ch in enumerate(ph): out.append((ch, a + (b - a) * k / n, a + (b - a) * (k + 1) / n))
    return out
L = lines.load(); cursor, timing = 0.0, []
for i, l in enumerate(L):
    text = l['text'].replace('TA', '他')
    tts.say(f'vo/raw_{i:02d}.wav', SID, CHOICE.get(i, SPEED), text)
    x, _ = sf.read(f'vo/raw_{i:02d}.wav', dtype='float32'); x = trim(x)
    sf.write(f'vo/line_{i:02d}.wav', x, SR, subtype='PCM_16')
    cursor += GAP_BEFORE.get(i, 0.25)
    d = len(x) / SR
    timing.append({'i': i, 'text': l['text'], 'oldT0': l['t0'], 'oldT1': l['t1'], 't0': round(cursor, 3), 't1': round(cursor + d, 3),
                   'chars': [(c, round(cursor + a, 3), round(cursor + b, 3)) for c, a, b in char_times(text, x)]})
    cursor += d
json.dump({'speed': {i: CHOICE.get(i, SPEED) for i in range(len(L))}, 'sid': SID, 'duration': round(cursor + TAIL, 2), 'lines': timing}, open('vo/timing.json', 'w'), ensure_ascii=False, indent=1)
print('total', round(cursor + TAIL, 2))
