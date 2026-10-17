"""Soundtrack for the showreel: 120 BPM, 60 beats, 15 bars of 2 s, loops seamlessly.

Everything is synthesised here from sine waves and noise, and every sound effect is
placed at the same time as the visual event it belongs to (see src/scenes).
Writes public/music.wav and src/envelope.json (peak level per 1/120 s, used by the WAVE bar).
"""
import json
import os

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
DUR = 30.0
N = int(SR * DUR)
TAIL = int(SR * 2.5)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(7)

L = np.zeros(N + TAIL)
R = np.zeros(N + TAIL)


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(round(t0 * SR))
    j = min(i + len(sig), len(L))
    if j <= i:
        return
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt(0.5 * (1 - pan))
    R[i:j] += s * np.sqrt(0.5 * (1 + pan))


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def env(t, a, d):
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


# ---------------------------------------------------------------- instruments
def kick(weight=1.0):
    t = tt(0.5)
    f = 44 + 120 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env(t, 0.002, 0.16 + 0.06 * weight)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.003) * 0.25
    return np.tanh((body + click) * 1.6) * 0.9


def slap(bright=1.0):
    """Paper slap / clap: three tight noise bursts."""
    t = tt(0.35)
    n = rng.standard_normal(len(t))
    e = np.zeros_like(t)
    for k, off in enumerate([0, 0.011, 0.021]):
        m = t >= off
        e[m] += np.exp(-(t[m] - off) / (0.012 if k < 2 else 0.09))
    return bp(n, 900, 4200 * bright) * e * 0.55


def scratch(dur=0.07):
    """Pencil stroke: band-passed noise with a grainy amplitude."""
    t = tt(dur)
    n = rng.standard_normal(len(t))
    grain = 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 180 * t + rng.uniform(0, 6)))
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7
    return bp(n, 2500, 7500) * e * grain * 0.22


def hat(dec=0.025):
    t = tt(0.12)
    return hp(rng.standard_normal(len(t)), 7500) * np.exp(-t / dec) * 0.22


def tick(f=3200, dec=0.004, g=0.35):
    t = tt(0.03)
    return (np.sin(2 * np.pi * f * t) + 0.5 * bp(rng.standard_normal(len(t)), 2000, 9000)) * np.exp(-t / dec) * g


def clank():
    t = tt(0.25)
    s = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d)
            for f, a, d in [(1180, 0.5, 0.05), (2710, 0.35, 0.03), (4130, 0.25, 0.02), (310, 0.6, 0.04)])
    return s * 0.35


def wood(f=900):
    t = tt(0.12)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.025) * 0.45


def bass(f, dur, cutoff=420, g=0.42):
    t = tt(dur + 0.08)
    ph = 2 * np.pi * f * t
    saw = 2 * ((f * t) % 1) - 1
    s = 0.75 * np.sin(ph) + 0.35 * lp(saw, cutoff)
    e = np.minimum(1, t / 0.004) * np.where(t < dur, np.exp(-t / (dur * 1.4)), np.exp(-dur / (dur * 1.4)) * np.exp(-(t - dur) / 0.015))
    return np.tanh(s * e * 1.3) * g


def pluck(f, g=0.16):
    t = tt(0.45)
    idx = 2.2 * np.exp(-t / 0.05)
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * 2 * f * t))
    return s * env(t, 0.002, 0.11) * g


def pad(freqs, dur, cutoff=900, g=0.05):
    t = tt(dur)
    s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.12):
            ff = f * (1 + det / 100)
            s += 2 * ((ff * t + rng.uniform()) % 1) - 1
    s = lp(s, cutoff, 2)
    e = np.minimum(1, t / 0.06) * np.minimum(1, (dur - t) / 0.06)
    return s * e * g / len(freqs)


def whoosh(dur, f0, f1, g=0.3):
    t = tt(dur)
    n = rng.standard_normal(len(t))
    out = np.zeros_like(t)
    hop = 512
    for i in range(0, len(t), hop):
        p = i / len(t)
        fc = f0 * (f1 / f0) ** p
        seg = n[max(0, i - 2048): i + hop]
        y = bp(seg, max(40, fc * 0.7), min(SR / 2 - 100, fc * 1.4))[-min(hop, len(t) - i):]
        out[i: i + len(y)] = y
    e = (t / dur) ** 2
    return out * e * g


def sweep_tone(dur, f0, f1, g=0.12):
    t = tt(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / dur) ** 1.5 * g


# ---------------------------------------------------------------- harmony
A1, C2, D2, E2, F1, G1, B1 = 55.0, 65.41, 73.42, 82.41, 43.65, 49.0, 61.74
CHORDS = {
    "Am": (A1, [220.0, 261.63, 329.63]),
    "F": (F1, [174.61, 220.0, 261.63]),
    "C": (C2, [261.63, 329.63, 392.0]),
    "G": (G1, [196.0, 246.94, 293.66]),
}
PROG = ["Am", "F", "C", "G"] * 3 + ["Am", "F", "G"]


def section(bar):
    if bar <= 4:
        return "paper"
    if bar <= 8:
        return "blue"
    if bar <= 13:
        return "holo"
    return "end"


# ---------------------------------------------------------------- arrangement
for bar in range(15):
    t0 = bar * 2.0
    sec = section(bar)
    root, tones = CHORDS[PROG[bar]]
    for beat in range(4):
        b = t0 + beat * 0.5
        add(kick(1.0 if sec != "paper" else 0.7), b, 0.95 if sec != "paper" else 0.8)
        if beat in (1, 3) and not (bar == 0 and beat == 1):
            add(slap(1.0 if sec != "holo" else 1.3), b, 0.8)
        for e8 in (0.25,):
            if sec in ("paper", "end"):
                if bar >= 1 or sec == "end":
                    add(scratch(0.06), b + e8, 1.0, pan=0.3 * (1 if beat % 2 else -1))
            else:
                add(hat(0.02), b + e8, 1.0, pan=0.25)
        if sec in ("blue", "holo"):
            for s16 in (0.125, 0.375):
                add(hat(0.008), b + s16, 0.45, pan=-0.3)
        # bass
        if (sec == "paper" and bar >= 3) or sec == "end":
            add(bass(root, 0.42, 300), b, 0.85)
        elif sec == "blue":
            add(bass(root, 0.2, 380), b)
            add(bass(root * (2 if beat % 2 else 1), 0.18, 500), b + 0.25, 0.8)
        elif sec == "holo":
            add(bass(root, 0.2, 600), b)
            add(bass(root * 2, 0.18, 900), b + 0.25, 0.75)
    if sec == "holo":
        seq = tones + [tones[1] * 2]
        for i in range(16):
            f = seq[i % 4] * (2 if (i // 4) % 2 else 1)
            add(pluck(f), t0 + i * 0.125, 1.0, pan=0.45 * (1 if i % 2 else -1))
    if sec in ("blue", "holo"):
        add(pad(tones, 2.0, 700 if sec == "blue" else 1400), t0, 1.0)

# ---------------------------------------------------------------- events synced to picture
# bar 1: un-type clicks, mascot steps, rail press, ruler ticks, dimension
for i in range(17):
    add(tick(2600 + 300 * (i % 3), 0.003, 0.18), 0.02 * i, 1.0, pan=0.4)
for i, s in enumerate([0.08, 0.2, 0.3, 0.38]):
    add(wood(420 + 40 * i), s, 0.35, pan=0.5 + 0.1 * i)
add(whoosh(0.14, 600, 3000, 0.25), 0.36)
add(kick(1.3), 0.5, 0.6)
add(slap(0.7), 0.5, 0.9)
for i in range(0, 41, 2):
    add(tick(4200, 0.002, 0.12), 1.05 + i * 0.008, 1.0, pan=-0.6 + i * 0.03)
add(wood(1300), 1.5, 0.4)
# bar 2: words
for i in range(11):
    add(tick(1800 + 120 * i, 0.004, 0.12), 1.95 + 0.03 * i, 1.0)
add(whoosh(0.2, 300, 5000, 0.4), 2.3)
add(slap(1.2), 3.0, 0.6)
for i in range(8):
    add(tick(3000, 0.003, 0.1), 3.25 + 0.02 * i, 1.0, pan=-0.8 if i < 4 else 0.8)
for i in range(6):
    add(wood(700 + 90 * i), 3.52 + 0.05 * i, 0.9, pan=-0.5 + 0.2 * i)
add(slap(0.6), 4.02, 0.9)
# bar 3-5: curves, morphs, tiling
for s in (4.1, 4.5):
    add(tick(1500, 0.01, 0.3), s)
for i in range(7):
    add(wood(500 + 70 * i), 7.98 + 0.03 * i, 0.4, pan=-0.6 + 0.2 * i)
for i in range(12):
    add(wood(800 + 40 * i), 8.48 + 0.02 * i, 0.3, pan=-0.6 + 0.1 * i)
for i in range(30):
    add(scratch(0.04), 8.95 + i * 0.016, 0.5, pan=-0.7 + 0.05 * i)
# flood
add(whoosh(0.45, 200, 6000, 0.5), 9.55)
add(sweep_tone(0.45, 110, 880, 0.08), 9.55)
add(kick(1.4), 10.0, 0.7)
# bar 7: gear train steps on every eighth
for k in range(5):
    add(clank(), 12.25 + 0.25 * k, 0.9, pan=-0.2 + 0.1 * k)
add(tick(900, 0.02, 0.3), 12.5)
add(tick(1100, 0.02, 0.3), 13.0)
# bar 8: unfold, counters
for i in range(5):
    add(wood(600 + 100 * i), 14.0 + 0.04 * i, 0.4)
for i in range(20):
    add(tick(3500, 0.002, 0.1), 15.45 + i * 0.02, 1.0, pan=-0.5)
# bar 9: cursor clicks, scan line
for s in (16.5, 17.0):
    add(tick(2000, 0.012, 0.45), s)
add(whoosh(0.55, 8000, 400, 0.45), 17.45)
add(sweep_tone(0.55, 1760, 220, 0.07), 17.45)
add(kick(1.4), 18.0, 0.6)
# bar 13: reels lock
for i in range(6):
    add(tick(1400 + 150 * i, 0.006, 0.4), 25.5 + 0.05 * i, 1.0, pan=-0.5 + 0.2 * i)
    add(wood(300 + 30 * i), 25.5 + 0.05 * i, 0.4)
# bar 14-15: mascot run, scan back to paper, typing
for i in range(5):
    add(wood(380 + 30 * (i % 2)), 27.55 + i * 0.1667, 0.3, pan=-0.6 + 0.25 * i)
add(whoosh(0.55, 8000, 400, 0.45), 27.95)
add(sweep_tone(0.55, 1760, 220, 0.07), 27.95)
for start, n in ((28.45, 11), (28.95, 16), (29.45, 17)):
    for i in range(n):
        add(tick(2400 + 250 * (i % 3), 0.003, 0.16), start + 0.02 * i, 1.0, pan=0.3)

# ---------------------------------------------------------------- loop + master
L[:TAIL] += L[N:]
R[:TAIL] += R[N:]
L, R = L[:N], R[:N]
mix = np.stack([L, R], 1)
mix = hp(mix.T, 25).T
peak = np.max(np.abs(mix))
mix = np.tanh(mix / peak * 1.25) / np.tanh(1.25) * 0.89

os.makedirs(os.path.join(ROOT, "public"), exist_ok=True)
pcm = (mix * 32767).astype("<i2")
path = os.path.join(ROOT, "public", "music.wav")
with open(path, "wb") as f:
    data = pcm.tobytes()
    f.write(b"RIFF" + (36 + len(data)).to_bytes(4, "little") + b"WAVEfmt ")
    f.write((16).to_bytes(4, "little") + (1).to_bytes(2, "little") + (2).to_bytes(2, "little"))
    f.write(SR.to_bytes(4, "little") + (SR * 4).to_bytes(4, "little") + (4).to_bytes(2, "little") + (16).to_bytes(2, "little"))
    f.write(b"data" + len(data).to_bytes(4, "little") + data)

mono = np.abs(mix).max(1)
hopn = SR // 120
envl = [float(mono[i: i + hopn].max()) for i in range(0, N, hopn)]
m = max(envl)
with open(os.path.join(ROOT, "src", "envelope.json"), "w") as f:
    json.dump([round(v / m, 3) for v in envl], f)
print("wrote", path, len(envl), "envelope points")
