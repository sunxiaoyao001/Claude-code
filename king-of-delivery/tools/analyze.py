import sys, wave, numpy as np
p = sys.argv[1]
w = wave.open(p); sr = w.getframerate(); n = w.getnframes(); ch = w.getnchannels()
x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32).reshape(-1, ch) / 32768
m = x.mean(axis=1)
print(f'duration {n/sr:.2f}s  peak {20*np.log10(np.abs(x).max()+1e-9):.2f} dBFS  clipped samples {(np.abs(x)>0.999).sum()}')
win = int(sr * 1.6)
rows = []
for i in range(0, len(m) - win + 1, win):
    seg = m[i:i+win]
    rows.append(20*np.log10(np.sqrt((seg**2).mean())+1e-9))
print('RMS per bar (1.6s):')
for k in range(0, len(rows), 10):
    print(f'  {k*1.6:6.1f}s: ' + ' '.join(f'{v:6.1f}' for v in rows[k:k+10]))
# stereo width & low-end share
L, R = x[:,0], x[:,1]
print(f'L/R correlation {np.corrcoef(L, R)[0,1]:.3f}')
spec = np.abs(np.fft.rfft(m[:sr*60] * np.hanning(sr*60)))
f = np.fft.rfftfreq(sr*60, 1/sr)
tot = (spec**2).sum()
for lo, hi in [(20,120),(120,500),(500,2000),(2000,6000),(6000,20000)]:
    b = (spec[(f>=lo)&(f<hi)]**2).sum()/tot
    print(f'  band {lo}-{hi}Hz: {100*b:5.1f}%')
