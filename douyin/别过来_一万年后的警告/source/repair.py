# -*- coding: utf-8 -*-
"""检查每个分段的实际帧数，补渲缺失的帧区间，重写 list.txt。
用法: python3 repair.py WIDTH FPS OUTDIR NCHUNKS NWORKERS"""
import sys, os, json, math, subprocess, time
sys.path.insert(0, '/tmp/claude-0/proj')
W = int(sys.argv[1]); fps = int(sys.argv[2]); outdir = sys.argv[3]; nchunks = int(sys.argv[4]); nw = int(sys.argv[5])
tl = json.load(open('/tmp/claude-0/proj/audio/timeline.json'))
nf = int(math.floor(tl['total'] * fps))
g = fps * 2
per = int(math.ceil(nf / nchunks / g)) * g
jobs = []
i = 0
while i * per < nf:
    jobs.append((i, i * per, min(nf, (i + 1) * per)))
    i += 1


def nframes(path):
    if not os.path.exists(path) or os.path.getsize(path) < 1000:
        return 0
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries',
                        'stream=nb_read_packets', '-of', 'csv=p=0', path], capture_output=True, text=True)
    try:
        return int(r.stdout.strip())
    except ValueError:
        return 0


entries = []   # (order, filename)
todo = []
for idx, f0, f1 in jobs:
    p = os.path.join(outdir, 'part%02d.mp4' % idx)
    n = nframes(p)
    if n > 0:
        entries.append(('part%02d.mp4' % idx))
    if n < f1 - f0:
        # 已有的帧保留（若不足一帧则整体重渲）
        start = f0 + n
        sub = 'part%02d_r.mp4' % idx
        todo.append((sub, start, f1))
        entries.append(sub)
        print('chunk %d: %d/%d frames, re-render %d..%d -> %s' % (idx, n, f1 - f0, start, f1, sub), flush=True)
running = []
pending = list(todo)
while pending or running:
    while pending and len(running) < nw:
        sub, a, b = pending.pop(0)
        subp = os.path.join(outdir, sub)
        if nframes(subp) == b - a:
            continue
        code = ("import sys; sys.path.insert(0,'/tmp/claude-0/proj'); import render; "
                "render.worker(0,%d,%d,%d,%d,%d,%r,'final')" % (a, b, W, W * 9 // 16, fps, subp))
        running.append(subprocess.Popen([sys.executable, '-c', code]))
    time.sleep(2)
    running = [p for p in running if p.poll() is None]
with open(os.path.join(outdir, 'list.txt'), 'w') as f:
    for e in entries:
        f.write("file '%s'\n" % e)
tot = sum(nframes(os.path.join(outdir, e)) for e in entries)
print('repair done; total frames %d / expected %d' % (tot, nf))
