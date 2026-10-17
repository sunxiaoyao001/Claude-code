#!/usr/bin/env python3
"""music.py — picture-locked score for the Nikon century film.

Reads out/edl.json (shot onsets + events), synthesises drums, bass, pads, mallets, plucks and
per-chapter foley accents, places one accent on every shot onset, then glues, normalises to
-14 LUFS with a true-peak ceiling of -1 dBTP and writes out/score.wav + out/onsets.txt.
"""
import json, math, os, sys
import numpy as np
from scipy.signal import butter, sosfilt, lfilter, resample_poly
from scipy.ndimage import minimum_filter1d, uniform_filter1d

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'out')
EDL = json.load(open(os.path.join(OUT, 'edl.json')))
SR = 48000
BEAT = EDL['beat']
DUR = EDL['duration']
N = int(round(DUR * SR))
rng = np.random.default_rng(1917)

STEMS = {k: np.zeros((2, N)) for k in ['drums', 'bass', 'music', 'accent', 'fx']}
ONSET_PROBE = np.zeros(N)  # transient part of each shot accent, for the onset report


def bt(b):
    return b * BEAT


def place(stem, t, sig, gain=1.0, pan=0.0, probe=False):
    i = int(round(t * SR))
    if i >= N or len(sig) == 0:
        return
    j0 = max(0, i)
    s = sig[j0 - i:]
    j1 = min(N, j0 + len(s))
    s = s[: j1 - j0] * gain
    l, r = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
    STEMS[stem][0, j0:j1] += s * l * 1.4142
    STEMS[stem][1, j0:j1] += s * r * 1.4142
    if probe:
        ONSET_PROBE[j0:j1] += s


def tvec(d):
    return np.arange(int(d * SR)) / SR


def env_exp(d, tau, attack=0.002):
    t = tvec(d)
    e = np.exp(-t / tau)
    a = int(attack * SR)
    if a > 0:
        e[:a] *= np.linspace(0, 1, a)
    return e


def noise(d):
    return rng.standard_normal(int(d * SR))


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'highpass', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'lowpass', fs=SR, output='sos'), x)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def nm(s):
    name, octv = s[:-1], int(s[-1])
    return 12 * (octv + 1) + NOTE[name]


# ---------------- voices ----------------
def kick(big=False):
    d = 0.9 if big else 0.45
    t = tvec(d)
    f = 46 + 110 * np.exp(-t / 0.045)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / (0.32 if big else 0.18))
    skin = lp(noise(d), 900) * np.exp(-t / 0.03) * 0.5
    click = hp(noise(d), 3000) * np.exp(-t / 0.003) * 0.3
    return np.tanh(1.6 * (body + skin + click)) * 0.9


def taiko():
    d = 1.4
    t = tvec(d)
    f = 38 + 60 * np.exp(-t / 0.08)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    skin = bp(noise(d), 80, 600) * np.exp(-t / 0.09) * 0.8
    return np.tanh(1.3 * (body + skin)) * 0.85


def rim():
    d = 0.08
    t = tvec(d)
    return (bp(noise(d), 1700, 4200) * np.exp(-t / 0.012) * 0.7 + np.sin(2 * np.pi * 820 * t) * np.exp(-t / 0.01) * 0.5)


def clap():
    d = 0.3
    t = tvec(d)
    e = np.zeros_like(t)
    for k, o in enumerate([0, 0.011, 0.022, 0.034]):
        e += (t >= o) * np.exp(-np.maximum(t - o, 0) / (0.012 if k < 3 else 0.11))
    return bp(noise(d), 900, 2600) * e * 0.6


def shaker(acc=1.0):
    d = 0.07
    t = tvec(d)
    e = np.minimum(t / 0.012, 1) * np.exp(-t / 0.025)
    return hp(noise(d), 6500) * e * 0.25 * acc


def hat():
    d = 0.06
    t = tvec(d)
    return hp(noise(d), 8000, 4) * np.exp(-t / 0.018) * 0.3


def snare(v=1.0):
    d = 0.25
    t = tvec(d)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)
    return (bp(noise(d), 1500, 7000) * np.exp(-t / 0.07) * 0.7 + tone * 0.5) * v


def crash():
    d = 2.2
    t = tvec(d)
    n = hp(noise(d), 3500) * np.exp(-t / 0.75)
    metal = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f in [3172, 4311, 5527, 6901, 8130]) * 0.05 * np.exp(-t / 0.5)
    return (n * 0.45 + metal) * np.minimum(t / 0.002, 1)


def tick(acc=1.0):
    d = 0.03
    t = tvec(d)
    return (np.sin(2 * np.pi * 3200 * t) * 0.4 + hp(noise(d), 5000) * 0.3) * np.exp(-t / 0.004) * acc


def saw(f, d, detune_c=0.0):
    t = tvec(d)
    ff = f * 2 ** (detune_c / 1200)
    ph = (ff * t + rng.uniform()) % 1.0
    return 2 * ph - 1


def bass_note(m, d):
    t = tvec(d)
    f = mtof(m)
    x = lp(saw(f, d) * 0.6 + saw(f, d, 7) * 0.4, 520) + np.sin(2 * np.pi * f / 2 * t) * 0.0 + np.sin(2 * np.pi * f * t) * 0.7
    e = np.minimum(t / 0.004, 1) * (0.55 + 0.45 * np.exp(-t / 0.08))
    rel = int(0.03 * SR)
    e[-rel:] *= np.linspace(1, 0, rel)
    return np.tanh(1.4 * x * e) * 0.55


def stab(chord, d=0.2):
    t = tvec(d)
    x = sum(saw(mtof(m), d, c) for m in chord for c in (-9, 0, 9)) / (3 * len(chord))
    e = np.minimum(t / 0.003, 1) * np.exp(-t / 0.07)
    return lp(x, 2600) * e * 1.1


def marimba(m, d=0.7):
    t = tvec(d)
    f = mtof(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.32) + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.05) + 0.08 * np.sin(2 * np.pi * f * 9.9 * t) * np.exp(-t / 0.01)
    return x * np.minimum(t / 0.001, 1) * 0.35


def pluck(m, d=1.4, bend=0.0, bright=0.5):
    """Karplus-Strong, vectorised per period; optional upward bend (semitones) settling over 90 ms."""
    f = mtof(m)
    P = max(2, int(round(SR / f)))
    n = int(d * SR)
    y = np.zeros(n + P + 1)
    y[:P] = lp(rng.uniform(-1, 1, P * 4), 2000 + 6000 * bright)[:P]
    k = 0.996
    for s in range(P, n + P, P):
        e = min(s + P, n + P)
        prev = y[s - P:e - P]
        prev1 = y[s - P - 1:e - P - 1] if s - P - 1 >= 0 else np.concatenate([[0], y[s - P:e - P - 1]])
        y[s:e] = k * 0.5 * (prev + prev1[: len(prev)])
    y = y[P:n + P]
    if bend:
        t = np.arange(n) / SR
        rate = 2 ** ((bend * np.exp(-t / 0.09)) / 12)
        pos = np.cumsum(rate)
        pos = pos[pos < n - 1]
        y = np.interp(pos, np.arange(n), y)
    t = np.arange(len(y)) / SR
    return y * np.minimum(t / 0.002, 1) * 0.6


def pad(chord, d, cutoff=900, gain=0.18):
    t = tvec(d)
    x = sum(saw(mtof(m), d, c) for m in chord for c in (-12, -4, 5, 11)) / (4 * len(chord))
    x = lp(x, cutoff, 2)
    a = min(0.5, d * 0.3)
    e = np.minimum(t / a, 1) * np.minimum((d - t) / 0.4, 1)
    return x * np.clip(e, 0, 1) * gain


def drone(d, m=26):
    t = tvec(d)
    f = mtof(m)
    lfo = 1 + 0.15 * np.sin(2 * np.pi * 0.25 * t)
    x = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t) + 0.25 * np.sin(2 * np.pi * f * 2 * t)) * lfo
    return x * np.minimum(t / 1.2, 1) * np.minimum((d - t) / 0.6, 1) * 0.22


def riser(d):
    t = tvec(d)
    f = 200 * (2 ** (3.5 * t / d))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15
    n = hp(noise(d), 1200) * (t / d) ** 2 * 0.5
    return (tone + n) * (t / d) ** 1.5


# ---------------- per-chapter foley accents (transient lands exactly on the onset) ----------------
def glass_ting(f0=1568.0, v=1.0):
    d = 1.6
    t = tvec(d)
    x = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / dcy) for r, a, dcy in [(1, 1, 0.9), (2.76, 0.5, 0.35), (5.4, 0.25, 0.15), (8.93, 0.12, 0.08)])
    return x * np.minimum(t / 0.0015, 1) * 0.28 * v


def mech_shutter():
    d = 0.25
    t = tvec(d)
    slap = np.sin(2 * np.pi * 120 * t) * np.exp(-t / 0.02) * 0.6
    c1 = hp(noise(d), 2000) * np.exp(-t / 0.004)
    c2 = np.zeros_like(t)
    o = int(0.045 * SR)
    c2[o:] = (hp(noise(d), 2500) * np.exp(-t / 0.006))[: len(t) - o] * 0.8
    ring = bp(noise(d), 2800, 3600) * np.exp(-t / 0.03) * 0.25
    return (slap + c1 + c2 + ring) * 0.55


def af_beep():
    d = 0.32
    t = tvec(d)
    x = np.zeros_like(t)
    for o in (0.0, 0.09):
        m = (t >= o) & (t < o + 0.05)
        x[m] = np.sin(2 * np.pi * 2730 * (t[m] - o)) * np.minimum((t[m] - o) / 0.002, 1)
    return x * 0.22


def e_tick():
    d = 0.4
    t = tvec(d)
    c = hp(noise(d), 6000) * np.exp(-t / 0.0025) * 0.9
    sub = np.sin(2 * np.pi * 52 * t) * np.exp(-t / 0.12) * 0.5 * np.minimum(t / 0.003, 1)
    return c + sub


def whoosh_pre(d=0.3):
    t = tvec(d)
    n = noise(d)
    e = (t / d) ** 2.5
    return (bp(n, 500, 2500) * 0.6 + hp(n, 3000) * 0.4) * e * 0.5


def soft_click():
    d = 0.05
    t = tvec(d)
    return hp(noise(d), 3000) * np.exp(-t / 0.004) * 0.7


def boom():
    d = 1.5
    t = tvec(d)
    x = np.sin(2 * np.pi * 36 * t) * np.exp(-t / 0.6) + hp(noise(d), 2500) * np.exp(-t / 0.003) * 0.3
    return x * 0.7


# ---------------- harmony ----------------
CH = {
    'Dm': [62, 65, 69], 'Bb': [58, 62, 65], 'F': [60, 65, 69], 'C': [60, 64, 67], 'Gm': [55, 58, 62],
    'D': [62, 66, 69], 'G': [59, 62, 67], 'A': [61, 64, 69], 'Asus': [62, 64, 69],
}
ROOT_OF = {'Dm': 38, 'Bb': 34, 'F': 41, 'C': 36, 'Gm': 43, 'D': 38, 'G': 43, 'A': 45, 'Asus': 45}
BARS = (['-', 'Dm', 'Dm'] + ['Dm', 'Bb', 'F', 'C'] + ['Dm', 'Bb', 'F', 'C', 'Dm'] + ['Dm', 'Bb', 'F', 'C']
        + ['Dm', 'Bb', 'C', 'Dm', 'Bb', 'C'] + ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb'] + ['C', 'A']
        + ['D', 'Bb', 'G', 'Asus'] + ['D', 'D'])
assert len(BARS) == 36, len(BARS)

STRIP = [(e['b0'], e['b1']) for e in EDL['events'] if e['kind'] == 'strip']
GAP = [(e['b0'], e['b1']) for e in EDL['events'] if e['kind'] == 'gap']


def muted(b):
    return any(a <= b < c for a, c in STRIP + GAP)


def section(bar):
    if bar <= 1: return 'intro'
    if bar <= 6: return 'A'
    if bar <= 16: return 'B'
    if bar == 17: return 'strip'
    if bar <= 21: return 'C'
    if bar <= 27: return 'D'
    if bar == 28: return 'C'
    if bar == 29: return 'build'
    if bar <= 33: return 'end'
    return 'out'


# ---------------- arrangement ----------------
for bar in range(36):
    b0 = bar * 4
    sec = section(bar)
    chord = BARS[bar]
    # pads
    if chord != '-' and sec not in ('intro',):
        g = 0.13 if sec == 'strip' else 0.2 if sec == 'end' else 0.12
        place('music', bt(b0), pad(CH[chord], bt(4) + 0.3, 1400 if sec == 'end' else 900, g), 1.0, 0.0)
        place('music', bt(b0), pad([m - 12 for m in CH[chord]], bt(4) + 0.3, 600, g * 0.7), 1.0, 0.0)
    # bass (8ths, octave on the and-of-2)
    if sec in ('A', 'B', 'C', 'D', 'build', 'end') and chord != '-':
        r = ROOT_OF[chord]
        steps = range(8) if sec != 'end' else [0, 3, 4, 6]
        for k in steps:
            b = b0 + k * 0.5
            if muted(b): continue
            m = r + (12 if k in (3, 7) and sec != 'end' else 0)
            place('bass', bt(b), bass_note(m, bt(0.5) * (0.92 if sec != 'end' else 1.8)), 0.9)
    # drums
    for k in range(16):
        b = b0 + k * 0.25
        if muted(b): continue
        beat_i, sub = k // 4, k % 4
        if sec in ('A', 'B'):
            if sub == 0 and beat_i in (0, 2): place('drums', bt(b), kick(), 0.9)
            if sec == 'B' and k == 9: place('drums', bt(b), kick(), 0.5)
            if sub == 0 and beat_i in (1, 3):
                place('drums', bt(b), rim(), 0.5, -0.3)
                if sec == 'B': place('drums', bt(b), clap(), 0.55, 0.1)
            place('drums', bt(b), shaker(1.0 if sub == 2 else 0.55), 1.0, 0.45)
        elif sec == 'C':
            if sub == 0: place('drums', bt(b), kick(), 0.85)
            if sub == 0 and beat_i in (1, 3): place('drums', bt(b), clap(), 0.65, 0.1)
            if sub == 2: place('drums', bt(b), hat(), 0.8, 0.35)
            place('drums', bt(b), shaker(0.5), 0.8, -0.4)
        elif sec == 'D':
            if k in (0, 6, 8): place('drums', bt(b), kick(), 0.9)
            if sub == 0 and beat_i in (1, 3): place('drums', bt(b), snare(0.8), 0.7, 0.05); place('drums', bt(b), clap(), 0.4)
            place('drums', bt(b), hat(), 0.7 if sub % 2 == 0 else 0.4, 0.3)
            if bar % 2 == 1 and k >= 13: place('drums', bt(b), taiko(), 0.35, -0.2)
        elif sec == 'build':
            if sub == 0: place('drums', bt(b), kick(), 0.8)
            v = 0.15 + 0.8 * (k / 15) ** 2
            place('drums', bt(b), snare(v), 0.6, 0.0)
            if b >= b0 + 2: place('drums', bt(b + 0.125), snare(v * 0.7), 0.5, 0.0)
        elif sec == 'end':
            if k == 0: place('drums', bt(b), kick(big=True), 1.0)
            if k == 8: place('drums', bt(b), clap(), 0.6); place('drums', bt(b), snare(0.5), 0.4)
            if k == 10 and bar % 2: place('drums', bt(b), kick(), 0.6)
            if sub == 2: place('drums', bt(b), shaker(0.6), 0.8, 0.4)
    # marimba arps (chapters 1 and 3) and saw stabs (chapters 4 and 5)
    if sec in ('A',) or (12 <= bar <= 15):
        tones = CH[chord] + [m + 12 for m in CH[chord]]
        for k in range(8):
            b = b0 + k * 0.5
            m = tones[(k * 2 + bar) % len(tones)] + 12
            place('music', bt(b), marimba(m), 0.8 if k % 2 == 0 else 0.55, -0.5 + (k % 4) * 0.33)
    if sec in ('C', 'D'):
        for k in range(4):
            b = b0 + k + 0.5
            if muted(b): continue
            place('music', bt(b), stab(CH[chord]), 0.5, 0.0)
    # pluck motif (chapter 1, title, end)
    if bar in (2, 3, 5) or sec == 'end':
        tones = CH[chord]
        pat = [(0, 2, 0.6), (1, 1, 0), (1.5, 0, 0), (2, 2, 0), (3, 1, 0)] if sec != 'end' else [(0, 2, 1.0), (1, 1, 0), (2, 0, 0), (2.5, 1, 0), (3, 2, 0.6)]
        for o, idx, bend in pat:
            place('music', bt(b0 + o), pluck(tones[idx] + 12, 1.6, bend=-bend if bend else 0.0, bright=0.6), 0.55, -0.15)

# intro: drone, clock ticks on the hairline beats, glass tings for the opening cell
place('music', 0.0, drone(bt(8) + 0.4), 1.0)
for k in range(8):
    place('accent', bt(k * 0.5), tick(1.0 if k % 2 == 0 else 0.5), 0.35, 0.2)
for k, f in zip((5, 6, 7), (1760.0, 1975.5, 2349.3)):
    place('accent', bt(k), glass_ting(f, 0.7), 0.7, 0.3 - 0.3 * (k - 5))

# stripped bar under the 0→55 count: a clock tick on every 8th, rising
for a, c in STRIP:
    k = 0
    b = a
    while b < c - 1e-9:
        place('accent', bt(b), tick(1.0 if k % 2 == 0 else 0.6), 0.55 + 0.4 * (b - a) / (c - a), 0.0)
        b += 0.5; k += 1
    place('music', bt(a), drone(bt(c - a) + 0.2, 26), 0.9)

for e in EDL['events']:
    if e['kind'] == 'riser':
        d = bt(e['b1'] - e['b0'])
        place('fx', bt(e['b0']), riser(d), 0.6)
    if e['kind'] == 'slam':
        place('drums', bt(e['b']), kick(big=True), 1.0)
        place('drums', bt(e['b']), taiko(), 0.6)
        place('drums', bt(e['b']), crash(), 0.55, 0.2)

# out: HUD ticks blink out one by one (one per quarter beat from b136), final shutter at b142
for i in range(14):
    place('accent', bt(136 + i * 0.25), tick(0.8), 0.3, -0.3 + 0.6 * i / 13)
place('accent', bt(142), mech_shutter(), 0.9)
place('music', bt(136), pad(CH['D'] + [74], bt(8), 1100, 0.2), 1.0)

# ---------------- shot accents (one per onset, family by chapter) ----------------
FAM = {
    'drone': lambda: boom(),
    'glass': lambda: glass_ting(1568.0),
    'mech': lambda: mech_shutter(),
    'beep': lambda: af_beep(),
    'etick': lambda: e_tick(),
    'whoosh': lambda: soft_click(),
    'hit': lambda: kick(big=True) * 0.8,
    'pluck': lambda: pluck(nm('D5'), 2.2, bright=0.7),
}
for s in EDL['shots']:
    t = s['t0']
    fam = s['fam']
    sig = FAM[fam]()
    gain = {'drone': 0.9, 'glass': 0.9, 'mech': 0.85, 'beep': 0.8, 'etick': 0.8, 'whoosh': 0.7, 'hit': 1.0, 'pluck': 0.8}[fam]
    place('accent', t, sig, gain, 0.0, probe=True)
    if fam == 'whoosh':
        pre = whoosh_pre(0.3)
        place('fx', t - len(pre) / SR, pre, 0.6, 0.0)
    if s['type'] in ('item', 'spec') and fam in ('beep',):
        place('accent', t + 0.2, soft_click(), 0.5)
    if s['crash']:
        place('drums', t, crash(), 0.5, -0.2)
        place('drums', t, taiko(), 0.5)
    if fam == 'hit':
        place('drums', t, crash(), 0.6, 0.2)
        place('drums', t, taiko(), 0.8)
        place('music', t, stab(CH['D'] + [74], 0.6), 0.6)

# ---------------- mix ----------------
G = {'drums': 0.85, 'bass': 0.7, 'music': 0.8, 'accent': 0.9, 'fx': 0.5}
mix = sum(STEMS[k] * g for k, g in G.items())

# silence gate: half a beat of nothing before the end card
for a, c in GAP:
    i0, i1 = int(bt(a) * SR), int(bt(c) * SR)
    f = int(0.006 * SR)
    g = np.ones(N)
    g[i0:i1] = 0
    g[i0 - f:i0] = np.linspace(1, 0, f)
    mix[:, i0:i1] *= 0  # hard silence (tails included)
    mix[:, i0 - f:i0] *= np.linspace(1, 0, f)

# end of film: fade the last 0.6 s to silence
f = int(0.6 * SR)
mix[:, -f:] *= np.linspace(1, 0, f) ** 2

# glue compressor (stereo-linked, RMS 30 ms, 2:1 above -16 dBFS)
def glue(x, thr_db=-16.0, ratio=2.0, tau=0.03):
    p = (x ** 2).mean(axis=0)
    a = math.exp(-1 / (tau * SR))
    env = lfilter([1 - a], [1, -a], p)
    lvl = 10 * np.log10(env + 1e-12)
    over = np.maximum(0, lvl - thr_db)
    gr = -over * (1 - 1 / ratio)
    g = 10 ** (gr / 20)
    return x * g


mix = glue(mix)


# ---------------- loudness (BS.1770-4) and true peak ----------------
def k_weight(x):
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=1), axis=1)


def lufs(x):
    y = k_weight(x)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    ms = np.array([(y[:, i:i + blk] ** 2).mean(axis=1).sum() for i in range(0, y.shape[1] - blk, hop)])
    L = -0.691 + 10 * np.log10(ms + 1e-12)
    ms = ms[L > -70]
    rel = -0.691 + 10 * np.log10(ms.mean()) - 10
    ms = ms[(-0.691 + 10 * np.log10(ms + 1e-12)) > rel]
    return -0.691 + 10 * np.log10(ms.mean())


def true_peak(x):
    up = resample_poly(x, 4, 1, axis=1)
    return 20 * np.log10(np.abs(up).max() + 1e-12)


def limit(x, ceiling_db=-2.4, look=0.004):
    up = np.abs(resample_poly(x, 4, 1, axis=1)).max(axis=0)
    pk = up.reshape(-1, 4).max(axis=1)[: x.shape[1]]
    c = 10 ** (ceiling_db / 20)
    g = np.minimum(1.0, c / (pk + 1e-12))
    w = int(look * SR)
    g = minimum_filter1d(g, 2 * w + 1)
    g = uniform_filter1d(g, w)
    g = minimum_filter1d(g, w)  # keep the smoothed curve at or below the required gain
    return x * g


TARGET = -14.0
for it in range(6):
    L = lufs(mix)
    mix = mix * 10 ** ((TARGET - L) / 20)
    mix = limit(mix)
    if abs(lufs(mix) - TARGET) < 0.15 and true_peak(mix) <= -2.0:
        break
L, TP = lufs(mix), true_peak(mix)
if TP > -2.0:
    mix *= 10 ** ((-2.05 - TP) / 20)
    L, TP = lufs(mix), true_peak(mix)

# ---------------- write ----------------
def write_wav(path, x):
    import wave
    y = np.clip(x.T, -1, 1)
    pcm = (y * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


write_wav(os.path.join(OUT, 'score.wav'), mix)

# ---------------- onset report ----------------
env = uniform_filter1d(np.abs(ONSET_PROBE), int(0.0005 * SR))
lines, worst = [], 0.0
for s in EDL['shots']:
    t = s['t0']
    i0, i1 = max(0, int((t - 0.05) * SR)), min(N, int((t + 0.1) * SR))
    seg = env[i0:i1]
    thr = 0.25 * seg.max()
    k = int(np.argmax(seg >= thr))
    meas = (i0 + k) / SR
    d = (meas - t) * 1000
    worst = max(worst, abs(d))
    lines.append(f"shot {s['idx']:2d} {s['type']:8s} {s['fam']:7s} picture {t:8.3f} s  audio {meas:8.3f} s  Δ {d:+6.1f} ms  {'OK' if abs(d) <= 15 else 'FAIL'}")
summary = f"onsets: {len(lines)}  worst |Δ| = {worst:.1f} ms  ({'all within ±15 ms' if worst <= 15 else 'OUT OF TOLERANCE'})\nloudness: {L:.2f} LUFS integrated, true peak {TP:.2f} dBTP"
open(os.path.join(OUT, 'onsets.txt'), 'w').write('\n'.join(lines) + '\n\n' + summary + '\n')
print(summary)
