# -*- coding: utf-8 -*-
"""把受影响帧所在的关键帧区间重渲，并无损替换进成片。"""
import sys, os, json, glob, subprocess, time
sys.path.insert(0, '/tmp/claude-0/proj')
P = '/tmp/claude-0/proj'
D = P + '/final4k'
src = D + '/video_only.mp4'
bad = sorted(sum([json.load(open(f)) for f in glob.glob(P + '/trim_*.json')], []))
# 关键帧位置
r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=flags',
                    '-of', 'csv=p=0', src], capture_output=True, text=True)
flags = r.stdout.split()
N = len(flags)
keys = [i for i, f in enumerate(flags) if 'K' in f]
print('frames', N, 'keyframes', len(keys))
ranges = []
for b in bad:
    k0 = max(k for k in keys if k <= b)
    nxt = [k for k in keys if k > b]
    k1 = nxt[0] if nxt else N
    if (k0, k1) not in ranges:
        ranges.append((k0, k1))
print('ranges', ranges)
os.makedirs(D + '/fix', exist_ok=True)
# 重渲
running = []
pending = list(ranges)
while pending or running:
    while pending and len(running) < 4:
        a, b = pending.pop(0)
        out = D + '/fix/seg_%06d.mp4' % a
        code = ("import sys; sys.path.insert(0,'/tmp/claude-0/proj'); import render; "
                "render.worker(0,%d,%d,3840,2160,60,%r,'final')" % (a, b, out))
        running.append(subprocess.Popen([sys.executable, '-c', code]))
    time.sleep(2)
    running = [p for p in running if p.poll() is None]
# 按关键帧切开原片
cuts = sorted(set([a for a, b in ranges] + [b for a, b in ranges if b < N]))
segdir = D + '/segs'
os.makedirs(segdir, exist_ok=True)
for f in glob.glob(segdir + '/*.mp4'):
    os.remove(f)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-map', '0:v', '-c', 'copy', '-f', 'segment',
                '-segment_frames', ','.join(map(str, cuts)), '-reset_timestamps', '1', segdir + '/s%04d.mp4'],
               check=True)
segs = sorted(glob.glob(segdir + '/s*.mp4'))
bounds = [0] + cuts + [N]
assert len(segs) == len(bounds) - 1, (len(segs), len(bounds))
lst = []
for i, sp in enumerate(segs):
    a, b = bounds[i], bounds[i + 1]
    if (a, b) in ranges:
        lst.append(D + '/fix/seg_%06d.mp4' % a)
    else:
        lst.append(sp)
with open(D + '/list_fixed.txt', 'w') as f:
    for x in lst:
        f.write("file '%s'\n" % x)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', D + '/list_fixed.txt', '-c', 'copy',
                D + '/video_fixed.mp4'], check=True)
r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries',
                    'stream=nb_read_packets', '-of', 'csv=p=0', D + '/video_fixed.mp4'], capture_output=True, text=True)
print('fixed frames', r.stdout.strip(), 'expected', N)
