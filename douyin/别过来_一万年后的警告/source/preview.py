# -*- coding: utf-8 -*-
"""预览：渲染指定时间点的静帧 / 镜头接触表。
用法: python3 preview.py stills 960 out/x.png t1 t2 ...
      python3 preview.py shot 960 out/sheet.png shotname [n]
      python3 preview.py clip 960 out/clip.mp4 t0 t1 [fps]
"""
import sys, time, subprocess
sys.path.insert(0, '/tmp/claude-0/proj')
import numpy as np
from PIL import Image
from engine.core import Frame
from engine import timeline as TL
from engine import film
from scenes import shots as SH

mode, width, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
args = sys.argv[4:]
W, H = width, width * 9 // 16
tl = TL.load()
shots, ctx = SH.build(tl)
subs = film.build_subs(tl)
fr = Frame(W, H)


def still(t):
    t0 = time.time()
    a = film.render_frame(fr, t, shots, subs, ctx).copy()
    return a[..., :3], time.time() - t0


if mode == 'stills':
    ims = []
    for t in map(float, args):
        a, dt = still(t)
        print('t=%.2f %.2fs' % (t, dt))
        ims.append(a)
    cols = min(3, len(ims))
    rows = (len(ims) + cols - 1) // cols
    sheet = np.zeros((rows * H, cols * W, 3), np.uint8)
    for i, a in enumerate(ims):
        r, cc = divmod(i, cols)
        sheet[r * H:(r + 1) * H, cc * W:(cc + 1) * W] = a
    Image.fromarray(sheet).save(out)
elif mode == 'shot':
    name = args[0]
    n = int(args[1]) if len(args) > 1 else 6
    sh = [s for s in shots if s.name == name][0]
    ts = np.linspace(sh.start + 0.05, sh.end - 0.05, n)
    ims = []
    for t in ts:
        a, dt = still(float(t))
        print('t=%.2f %.2fs' % (t, dt))
        ims.append(a)
    cols = 3
    rows = (len(ims) + cols - 1) // cols
    sheet = np.zeros((rows * H, cols * W, 3), np.uint8)
    for i, a in enumerate(ims):
        r, cc = divmod(i, cols)
        sheet[r * H:(r + 1) * H, cc * W:(cc + 1) * W] = a
    Image.fromarray(sheet).save(out)
elif mode == 'clip':
    t0, t1 = float(args[0]), float(args[1])
    fps = int(args[2]) if len(args) > 2 else 30
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '%dx%d' % (W, H),
                          '-r', str(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
                          '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
    n = int((t1 - t0) * fps)
    st = time.time()
    for i in range(n):
        a = film.render_frame(fr, t0 + i / fps, shots, subs, ctx)
        p.stdin.write(a.tobytes())
    p.stdin.close(); p.wait()
    print('frames', n, 'avg %.3fs' % ((time.time() - st) / max(n, 1)))
elif mode == 'list':
    for s in shots:
        print('%-14s %7.2f %7.2f %6.2f %s' % (s.name, s.start, s.end, s.end - s.start, s.trans))
