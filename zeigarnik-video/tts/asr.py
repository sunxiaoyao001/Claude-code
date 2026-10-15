# 用 Paraformer 中文识别检查配音是否念对：python3 asr.py a.wav b.wav ...
import sys, sherpa_onnx, soundfile as sf, numpy as np
D = '/home/user/tts/sherpa-onnx-paraformer-zh-small-2024-03-09/'
rec = sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=D + 'model.int8.onnx', tokens=D + 'tokens.txt', num_threads=4)
def text(path):
    x, sr = sf.read(path, dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    s = rec.create_stream(); s.accept_waveform(sr, x); rec.decode_stream(s); return s.result.text
def cer(ref, hyp):
    import re
    r = re.sub(r'[^一-鿿]', '', ref); h = re.sub(r'[^一-鿿]', '', hyp)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (r[i - 1] != h[j - 1]))
    return d[len(h)] / max(1, len(r))
if __name__ == '__main__':
    ref = '没完成的事，会在心里留下一股张力。它一直悬着，拉着你，想回去把它做完。'
    for p in sys.argv[1:]:
        h = text(p); print(p, round(cer(ref, h), 3), h)
