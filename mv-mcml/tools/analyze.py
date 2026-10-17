"""音频分析：python3 tools/analyze.py <song.mp3> [--start 秒] [--edit 剪辑点秒] [--climax 原曲高潮秒] [--out cues.json]

只依赖 numpy + ffmpeg。做三件事：
1. 解码成单声道 22050 Hz，算响度包络（RMS）和起音点（频谱通量的峰）。
2. 找"高潮"：响度包络在一段安静之后的最大跃升（可用 --climax 手动指定原曲里的秒数）。
3. 把原曲排进 MV 的时间线：开头的动机从原曲开头取，到剪辑点（--edit，默认自动找开头 20–30 s 里最安静的一拍）
   之后跳到原曲里"高潮前一段"，让原曲的高潮正好落在 MV 的 T.climax。剪辑点前后做 1.5 s 的交叉淡化。
   输出 out/music_edit.wav（给视频用的配乐）和 cues.json（真实起音点，覆盖 story.js 里的占位时间）。
用 --start 可以改成"从原曲第几秒开始连续取"，不剪辑（这样发抖音时可以直接用音乐库对齐）。
"""
import json, subprocess, sys, os
import numpy as np

SR, HOP, NFFT = 22050, 256, 2048
MV = {'climax': 60.4, 'dur': 92.4, 'hook_end': 7.6, 'motif_end': 7.6}

def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()

def features(x):
    n = 1 + (len(x) - NFFT) // HOP
    win = np.hanning(NFFT).astype(np.float32)
    frames = np.lib.stride_tricks.as_strided(x, shape=(n, NFFT), strides=(x.strides[0] * HOP, x.strides[0]))
    mag = np.abs(np.fft.rfft(frames * win, axis=1))
    logm = np.log1p(mag * 10)
    flux = np.maximum(0, np.diff(logm, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    rms = np.sqrt((frames ** 2).mean(axis=1))
    t = (np.arange(n) * HOP + NFFT * .8) / SR       # 帧的时间取在窗口靠后的位置：起音在窗口末端刚进来时通量最大
    return t, flux, rms

def smooth(v, k):
    k = max(1, int(k)); w = np.ones(k) / k
    return np.convolve(v, w, mode='same')

def onsets(t, flux, min_gap=.09, k=1.4):
    env = flux - smooth(flux, 40)
    thr = k * np.std(env)
    out, last = [], -1
    for i in range(1, len(env) - 1):
        if env[i] > thr and env[i] >= env[i - 1] and env[i] >= env[i + 1] and t[i] - last >= min_gap:
            out.append(float(t[i])); last = t[i]
    return out

def strength_at(t, flux, times):
    return [float(flux[min(len(flux) - 1, int(x * SR / HOP))]) for x in times]

def main():
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(2)
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    path, out = a[0], opt('--out', 'cues.json')
    x = decode(path)
    t, flux, rms = features(x)
    rs = smooth(rms, SR / HOP * 1.0)
    dur = len(x) / SR
    # 高潮：1 秒平滑后的响度，从 4 秒前到现在的最大增量
    if opt('--climax'):
        climax = float(opt('--climax'))
    else:
        lag = int(4 * SR / HOP)
        gain = np.zeros_like(rs); gain[lag:] = rs[lag:] - rs[:-lag]
        i = int(np.argmax(gain)); climax = float(t[i])
        # 往回找到这次跃升的起点附近最强的起音
        ons = onsets(t, flux)
        near = [o for o in ons if climax - 3 <= o <= climax + .5]
        if near: climax = max(near, key=lambda o: strength_at(t, flux, [o])[0])
    print(f'原曲时长 {dur:.1f}s，高潮在 {climax:.2f}s')
    if opt('--start') is not None:
        s0 = float(opt('--start')); segs = [(s0, s0 + MV['dur'])]; edit = None
    else:
        # 剪辑点：开头 20–30 s 里最安静的位置
        if opt('--edit'): edit = float(opt('--edit'))
        else:
            lo, hi = int(20 * SR / HOP), int(min(30, climax - 10) * SR / HOP)
            edit = float(t[lo + int(np.argmin(rs[lo:hi]))]) if hi > lo else 24.0
        jump = climax - (MV['climax'] - edit)          # 剪辑点之后从原曲这里接上
        if jump < edit:                                # 高潮来得早，不用剪
            s0 = climax - MV['climax']; segs = [(max(0, s0), max(0, s0) + MV['dur'])]; edit = None
        else:
            segs = [(0, edit), (jump, jump + MV['dur'] - edit)]
    print('取原曲片段:', ', '.join(f'{a:.2f}–{b:.2f}s' for a, b in segs))
    # 拼出配乐
    os.makedirs('out', exist_ok=True)
    if len(segs) == 1:
        s0, s1 = segs[0]
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{s0}', '-t', f'{s1 - s0}', '-i', path, '-af', 'afade=t=out:st=%.2f:d=2.5' % (s1 - s0 - 2.5), 'out/music_edit.wav'], check=True)
        mv2orig = lambda m: m + s0
    else:
        (a0, a1), (b0, b1) = segs; xf = 1.5
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', path, '-i', path, '-filter_complex',
            f'[0:a]atrim={a0}:{a1 + xf / 2},asetpts=N/SR/TB[a];[1:a]atrim={b0 - xf / 2}:{b1},asetpts=N/SR/TB[b];[a][b]acrossfade=d={xf}:c1=tri:c2=tri,afade=t=out:st={MV["dur"] - 2.5}:d=2.5[o]',
            '-map', '[o]', 'out/music_edit.wav'], check=True)
        mv2orig = lambda m: m if m < a1 else m - a1 + b0
    # MV 时间线上的起音点
    ons = onsets(t, flux)
    orig2mv = []
    for o in ons:
        if len(segs) == 1:
            m = o - segs[0][0]
            if 0 <= m <= MV['dur']: orig2mv.append(m)
        else:
            (a0, a1), (b0, b1) = segs
            if o < a1: orig2mv.append(o)
            elif b0 <= o <= b1: orig2mv.append(o - b0 + a1)
    st = strength_at(t, flux, [mv2orig(m) for m in orig2mv])
    med = float(np.median(st)) if st else 1
    cue = {
        'motif': [round(m, 3) for m in orig2mv if m < MV['hook_end']],
        'melody': [round(m, 3) for m in orig2mv if MV['hook_end'] <= m],
        'chords': [round(m, 3) for m, s in zip(orig2mv, st) if MV['climax'] - .05 <= m <= MV['climax'] + 7 and s > med * 1.6][:8],
    }
    if not cue['chords'] or abs(cue['chords'][0] - MV['climax']) > .3: cue['chords'] = [MV['climax']] + cue['chords']
    json.dump({'dur': MV['dur'], 'cue': cue, 'source': {'file': os.path.basename(path), 'segments': segs, 'climax_in_original': climax}}, open(out, 'w'), indent=1, ensure_ascii=False)
    print(f'写出 {out}：动机 {len(cue["motif"])} 个音，旋律 {len(cue["melody"])} 个音，重和弦 {len(cue["chords"])} 个；配乐 out/music_edit.wav')
    if len(segs) == 1: print(f'抖音配乐起点：原曲 {segs[0][0]:.1f} 秒')

if __name__ == '__main__':
    main()
