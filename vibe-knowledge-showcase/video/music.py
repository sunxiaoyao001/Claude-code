"""Synthesize the lo-fi backing track + sound effects for the video.

Reads out/cues.json (exported from index.html by `node render.js cues`) and
writes out/music.wav. Everything is generated procedurally, so there is no
third-party audio and no licensing question.
"""
import json
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
OUT = Path(__file__).parent / "out"
BPM = 100
BEAT = 60 / BPM          # 0.6 s
BAR = BEAT * 4           # 2.4 s
rng = np.random.default_rng(7)

cfg = json.loads((OUT / "cues.json").read_text())
DUR = cfg["dur"]
N = int(DUR * SR)


def buf():
    return np.zeros((N, 2))


def t_(d):
    return np.arange(int(d * SR)) / SR


def place(dst, sig, at, gain=1.0, pan=0.0):
    """Mix mono `sig` into stereo `dst` at time `at` (s) with equal-power pan."""
    i = int(at * SR)
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    s = sig[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    dst[i:i + len(s), 0] += s * gain * l * 1.414
    dst[i:i + len(s), 1] += s * gain * r * 1.414


def filt(x, kind, f, order=2):
    sos = butter(order, f, btype=kind, fs=SR, output="sos")
    return sosfilt(sos, x, axis=0)


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


def mix(*sigs):
    """Sum signals of different lengths (zero-padded)."""
    out = np.zeros(max(len(x) for x in sigs))
    for x in sigs:
        out[: len(x)] += x
    return out


def noise(d):
    return rng.uniform(-1, 1, int(d * SR))


# ---------------------------------------------------------------- instruments
def kick():
    t = t_(.4)
    f = 45 + 85 * np.exp(-t / .045)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .16)


def snare():
    t = t_(.25)
    n = filt(noise(.25), "band", [1200, 6000]) * np.exp(-t / .07)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t / .05)
    return n * .8 + tone * .5


def hat(open_=False):
    d = .18 if open_ else .05
    t = t_(d)
    return filt(noise(d), "high", 7500) * np.exp(-t / (d / 3))


def rhodes(m, d=2.2):
    t = t_(d)
    f = midi(m)
    trem = 1 + .12 * np.sin(2 * np.pi * 4.5 * t)
    s = (np.sin(2 * np.pi * f * t) + .25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / .3)
         + .08 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / .15))
    env = np.minimum(1, t / .008) * np.exp(-t / 1.4)
    return s * env * trem


def bass(m, d=.55):
    t = t_(d)
    s = np.sin(2 * np.pi * midi(m) * t)
    s = np.tanh(s * 1.8)
    env = np.minimum(1, t / .01) * np.exp(-t / .35)
    return filt(s * env, "low", 400)


def pluck(m):
    t = t_(.6)
    f = midi(m)
    s = np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * 2 * f * t)
    return s * np.exp(-t / .18) * np.minimum(1, t / .004)


# ---------------------------------------------------------------- arrangement
CHORDS = [  # Fmaj7, Em7, Dm7, Cmaj7  (midi)
    ([53, 57, 60, 64], 41),
    ([52, 55, 59, 62], 40),
    ([50, 53, 57, 60], 38),
    ([48, 52, 55, 59], 36),
]
PENTA = [72, 74, 76, 79, 81, 84]

DROP = 8.4          # full beat comes in with the first card
BREAK_A = 60.0      # BUILD FAILED → drums cut
BREAK_B = 64.8      # rollback succeeds → drums back
OUTRO = 74.4        # CTA: drums thin out

keys, drums, low, mel = buf(), buf(), buf(), buf()
kick_times = []
GRID = -1.2          # shift the bar grid so the drop (8.4 s) lands on a downbeat
nbars = int(np.ceil((DUR - GRID) / BAR))
for b in range(nbars):
    t0 = GRID + b * BAR
    notes, root = CHORDS[b % 4]
    for k, m in enumerate(notes):
        place(keys, rhodes(m), t0 + k * .012, .16, pan=-.3 + .2 * k)
        place(keys, rhodes(m + 12, 1.0), t0 + BEAT * 2.5 + k * .01, .05, pan=.3 - .2 * k)
    if t0 >= DROP - .01 and not (BREAK_A <= t0 < BREAK_B) and t0 < DUR - 2:
        place(low, bass(root), t0, .5)
        place(low, bass(root, .3), t0 + BEAT * 2.5, .35)
        place(low, bass(root + 7, .3), t0 + BEAT * 3.5, .3)
    for beat in range(4):
        tb = t0 + beat * BEAT
        if DROP <= tb < OUTRO and not (BREAK_A <= tb < BREAK_B):
            if beat in (0, 2):
                place(drums, kick(), tb, .9); kick_times.append(tb)
            if beat == 1 and b % 2 == 1:
                place(drums, kick(), tb + BEAT / 2, .45); kick_times.append(tb + BEAT / 2)
            if beat in (1, 3):
                place(drums, snare(), tb + .01, .42, pan=.05)
        hats_on = (4.8 <= tb < DUR - 1.5) and not (BREAK_A <= tb < BREAK_B)
        if hats_on:
            place(drums, hat(), tb, .22, pan=.35)
            place(drums, hat(beat == 3 and b % 2 == 0), tb + BEAT / 2 + .06, .14, pan=-.35)  # swung offbeat
        # sparse melody over the cards
        if DROP <= tb < BREAK_A or BREAK_B <= tb < OUTRO:
            if rng.random() < .45:
                m = PENTA[int(rng.integers(0, len(PENTA)))]
                place(mel, pluck(m), tb + (BEAT / 2 if rng.random() < .4 else 0), .07, pan=float(rng.uniform(-.5, .5)))

place(low, bass(CHORDS[3][1]), BREAK_B, .5)   # bass re-enters with the rollback
place(drums, kick(), BREAK_B, .9); kick_times.append(BREAK_B)

# intro / break: low-pass the keys, open up on the drop
keys_lp = filt(keys, "low", 900)
tt = np.arange(N) / SR
open_ = np.clip((tt - 4.8) / 3.6, 0, 1)
open_ = np.where((tt > BREAK_A) & (tt < BREAK_B), 0.0, open_)
open_ = np.convolve(open_, np.ones(2000) / 2000, mode="same")
keys = keys_lp * (1 - open_[:, None]) + keys * open_[:, None]

# sidechain duck on kicks
duck = np.ones(N)
for k in kick_times:
    i = int(k * SR)
    seg = np.arange(min(int(.3 * SR), N - i)) / SR
    duck[i:i + len(seg)] = np.minimum(duck[i:i + len(seg)], 1 - .45 * np.exp(-seg / .09))
music = (keys + low) * duck[:, None] + drums + mel

# vinyl crackle
crackle = np.zeros(N)
idx = rng.integers(0, N, int(DUR * 25))
crackle[idx] = rng.uniform(-1, 1, len(idx)) * rng.uniform(.2, 1, len(idx))
crackle = filt(crackle, "high", 2000) * .25 + filt(noise(DUR)[:N], "low", 3000) * .012
music += np.stack([crackle, np.roll(crackle, 37)], axis=1)

music = filt(music, "low", 11000)        # lo-fi top end
fade = np.clip((DUR - tt) / 2.5, 0, 1) * np.clip(tt / .3, 0, 1)
music *= fade[:, None]


# ---------------------------------------------------------------- sound effects
def sfx_type(d):
    out = np.zeros(int((d + .1) * SR))
    t = 0
    while t < d:
        c = filt(noise(.012), "band", [2000, 9000]) * np.exp(-t_(.012) / .003)
        c += np.sin(2 * np.pi * 1800 * t_(.012)) * np.exp(-t_(.012) / .002) * .4
        i = int(t * SR)
        out[i:i + len(c)] += c * rng.uniform(.5, 1)
        t += rng.uniform(.05, .1)
    return out


def tone(f, d, tau, f2=None):
    t = t_(d)
    fr = f if f2 is None else f * (f2 / f) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(fr, t.shape)) / SR) * np.exp(-t / tau) * np.minimum(1, t / .003)


def sfx_whoosh():
    d = .4
    t = t_(d)
    env = np.sin(np.pi * t / d) ** 2
    return filt(noise(d), "band", [600, 5000]) * env


def sfx_pop():
    return tone(300, .14, .05, 900)


def sfx_tick():
    return tone(1600, .05, .015)


def sfx_ding():
    return tone(1318, .8, .25) + .4 * tone(2637, .8, .12)


def sfx_stamp():
    return mix(tone(110, .25, .07, 50), filt(noise(.08), "low", 2500) * np.exp(-t_(.08) / .02) * .6)


def sfx_error():
    a = np.sign(np.sin(2 * np.pi * 233 * t_(.13))) * .5
    b = np.sign(np.sin(2 * np.pi * 185 * t_(.2))) * .5
    s = np.concatenate([a, np.zeros(int(.03 * SR)), b])
    return filt(s, "low", 2500) * .7


def sfx_glitch():
    d = .45
    s = noise(d)
    s = np.round(s * 4) / 4                          # bit crush
    gate = (np.floor(t_(d) * 40) % 3 != 0).astype(float)
    return filt(s * gate, "band", [300, 6000]) * .5


def sfx_boom():
    return mix(tone(70, 1.4, .45, 28) * 1.2, filt(noise(1.0), "low", 400) * np.exp(-t_(1.0) / .3) * .5)


def arp(notes, step, d=.35):
    out = np.zeros(int((step * len(notes) + d) * SR))
    for k, m in enumerate(notes):
        s = tone(midi(m), d, .12) + .3 * tone(midi(m) * 2, d, .06)
        i = int(k * step * SR)
        out[i:i + len(s)] += s
    return out


def sfx_click():
    s = filt(noise(.03), "band", [1500, 6000]) * np.exp(-t_(.03) / .004)
    return s + np.roll(s, int(.035 * SR)) * .6


def sfx_plug():
    return np.concatenate([sfx_click()[: int(.02 * SR)], tone(220, .15, .05)])


def sfx_drop():
    return tone(700, .3, .12, 180) * .6


def sfx_riser():
    d = 2.0
    t = t_(d)
    s = tone(200, d, 99, 1600) * (t / d) ** 2 * .4 + filt(noise(d), "high", 3000) * (t / d) ** 3 * .5
    return s


def sfx_rewind():
    d = 1.1
    out = np.zeros(int(d * SR))
    step = .07
    for k in range(int(d / step)):
        c = tone(400 + 60 * k, step, .03, 1400 + 80 * k) * .5
        i = int(k * step * SR)
        out[i:i + len(c)] += c[: len(out) - i]
    return out + filt(noise(d), "band", [1000, 4000]) * .15


GEN = {
    "type": (lambda c: sfx_type(c["dur"]), .32),
    "whoosh": (lambda c: sfx_whoosh(), .35),
    "pop": (lambda c: sfx_pop(), .35),
    "tick": (lambda c: sfx_tick(), .22),
    "ding": (lambda c: sfx_ding(), .45),
    "stamp": (lambda c: sfx_stamp(), .55),
    "error": (lambda c: sfx_error(), .4),
    "glitch": (lambda c: sfx_glitch(), .45),
    "boom": (lambda c: sfx_boom(), .7),
    "success": (lambda c: arp([84, 88, 91], .06), .28),
    "levelup": (lambda c: arp([72, 76, 79, 84, 88], .07), .35),
    "click": (lambda c: sfx_click(), .5),
    "plug": (lambda c: sfx_plug(), .45),
    "drop": (lambda c: sfx_drop(), .35),
    "riser": (lambda c: sfx_riser(), .4),
    "rewind": (lambda c: sfx_rewind(), .45),
}
fx = buf()
for c in cfg["cues"]:
    fn, g = GEN[c["type"]]
    place(fx, fn(c), c["t"], g, pan=float(rng.uniform(-.15, .15)))

mix = music * .8 + fx
mix /= np.max(np.abs(mix)) / .89
pcm = (mix * 32767).astype(np.int16)
with wave.open(str(OUT / "music.wav"), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {OUT / 'music.wav'}  ({DUR}s, {len(cfg['cues'])} sfx cues)")
