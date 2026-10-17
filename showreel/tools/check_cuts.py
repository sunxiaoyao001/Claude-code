"""Find pops in a render: frame-to-frame change that spikes far above its neighbours.

usage: python3 tools/check_cuts.py out/showreel.mp4
"""
import subprocess
import sys

import numpy as np

path = sys.argv[1]
w, h = 480, 270
raw = subprocess.run(
    ["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"],
    capture_output=True,
    check=True,
).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
n = len(frames)
d = np.abs(np.diff(frames, axis=0)).mean(axis=(1, 2))
print(f"{n} frames, mean change {d.mean():.2f}, max {d.max():.2f}")
loop = np.abs(frames[-1] - frames[0]).mean()
print(f"last -> first frame change {loop:.2f} (loop seam)")
win = 6
flagged = []
for i in range(len(d)):
    lo, hi = max(0, i - win), min(len(d), i + win + 1)
    neigh = np.median(np.concatenate([d[lo:i], d[i + 1:hi]]))
    if d[i] > 6 and d[i] > 3.5 * max(neigh, 0.5):
        flagged.append((i, d[i], neigh))
print("possible pops (frame -> frame+1, change, neighbour median):")
for i, v, m in flagged:
    print(f"  {i:5d} t={i / 60:6.3f}s  {v:6.2f}  {m:6.2f}")
