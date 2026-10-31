"""Synthesize the score and every sound effect with numpy. No samples, no downloads.

Usage: python3 -I scripts/synth_audio.py [--bpm 75] [--bars 28] [--fps 30]
Writes public/music/score.wav, public/sfx/*.wav and public/sfx/manifest.json
(peak offset of every file, in frames, for peak-aligned placement).
"""
import argparse
import json
import os

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(1926)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")


# ---------- helpers ----------

def t_axis(seconds):
    return np.arange(int(seconds * SR)) / SR


def lowpass(x, hz, order=2):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x, axis=0)


def highpass(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x, axis=0)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)


def env_ad(n, attack, decay):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / decay)


def stereo(x, width=0.0):
    if x.ndim == 2:
        return x
    if width <= 0:
        return np.stack([x, x], axis=1)
    d = int(width * SR / 1000)
    r = np.concatenate([np.zeros(d), x[: len(x) - d]])
    return np.stack([x, 0.85 * x + 0.15 * r], axis=1)


def reverb_ir(rt60=2.2, seconds=3.0, damp=4500):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    decay = np.exp(-6.91 * t / rt60)
    ir = rng.standard_normal((n, 2)) * decay[:, None]
    ir = lowpass(ir, damp)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(axis=0, keepdims=True))


def add_reverb(x, wet=0.25, rt60=2.2):
    x2 = stereo(x)
    ir = reverb_ir(rt60)
    w = np.stack([fftconvolve(x2[:, c], ir[:, c])[: len(x2)] for c in range(2)], axis=1)
    return (1 - wet) * x2 + wet * w


def norm_peak(x, dbfs=-1.0):
    p = np.max(np.abs(x))
    return x if p == 0 else x * (10 ** (dbfs / 20) / p)


def write(path, x):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    x = np.clip(x, -1, 1)
    wavfile.write(path, SR, (x * 32767).astype(np.int16))


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------- instruments ----------

PIANO_DIR = os.path.join(ROOT, "assets", "piano_src")
# Salamander Grand Piano V3 (Alexander Holm, CC BY 3.0) is sampled in minor thirds.
SAMPLE_NOTES = {"C": 0, "D#": 3, "F#": 6, "A": 9}
_sample_cache = {}


def _load_sample(name):
    if name not in _sample_cache:
        sr, x = wavfile.read(os.path.join(PIANO_DIR, f"{name}.wav"))
        assert sr == SR, f"{name}: expected {SR} Hz"
        _sample_cache[name] = x.astype(np.float64) / 32768.0
    return _sample_cache[name]


def _nearest_sample(midi):
    best = None
    for octave in range(2, 6):
        for letter, offset in SAMPLE_NOTES.items():
            m = 12 * (octave + 1) + offset
            if best is None or abs(m - midi) < abs(best[1] - midi):
                best = (f"{letter}{octave}", m)
    return best


def piano(midi, dur, vel=0.7):
    """Sampled grand piano: nearest Salamander sample, resampled by at most 1.5 semitones,
    damper release after the held duration."""
    base, base_midi = _nearest_sample(midi)
    layer = "v11" if vel >= 0.6 else "v7"
    x = _load_sample(base + layer)
    ratio = 2 ** ((midi - base_midi) / 12)
    n_out = int(min(len(x) / ratio, (dur + 3.0) * SR))
    src_pos = np.arange(n_out) * ratio
    i0 = np.floor(src_pos).astype(int)
    frac = (src_pos - i0)[:, None]
    i1 = np.minimum(i0 + 1, len(x) - 1)
    y = x[i0] * (1 - frac) + x[i1] * frac
    rel = np.ones(n_out)
    r0 = min(n_out, int(dur * SR))
    rel[r0:] = np.exp(-np.arange(n_out - r0) / SR / 0.3)
    return y * rel[:, None] * (0.55 + 0.6 * vel)


def pad(midis, dur, bright=1400):
    n = int((dur + 2.5) * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for m in midis:
        f = midi_hz(m)
        for side, det in ((0, -4), (1, 5)):
            ff = f * 2 ** (det / 1200)
            lfo = 1 + 0.002 * np.sin(2 * np.pi * 0.17 * t + side)
            # soft saw from 6 harmonics
            s = sum(np.sin(2 * np.pi * ff * h * lfo * t) / h for h in range(1, 7))
            out[:, side] += s
    out = lowpass(out, bright, order=2)
    a = np.clip(t / 1.4, 0, 1) ** 2
    r = np.ones(n)
    r0 = int(dur * SR)
    r[r0:] = np.exp(-np.arange(n - r0) / SR / 0.9)
    return out * (a * r)[:, None] / (len(midis) * 3)


def bass(midi, dur):
    n = int((dur + 1.0) * SR)
    t = np.arange(n) / SR
    f = midi_hz(midi)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    e = np.clip(t / 0.02, 0, 1) * np.exp(-t / 2.2)
    r = np.ones(n)
    r[int(dur * SR):] = np.exp(-np.arange(n - int(dur * SR)) / SR / 0.2)
    return s * e * r


def brush(vel=0.5):
    n = int(0.22 * SR)
    x = bandpass(rng.standard_normal(n), 1800, 9000) * env_ad(n, 0.012, 0.06)
    return x * vel


def tick(vel=0.5):
    n = int(0.05 * SR)
    x = highpass(rng.standard_normal(n), 5000) * env_ad(n, 0.0005, 0.006)
    return x * vel


def pulse(vel=0.6):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 52 * np.exp(-t / 0.08) + 40
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(n, 0.003, 0.16) * vel


# ---------- score ----------

CHORDS = {  # midi chord tones (pad voicing) per chord symbol
    "Am": [57, 60, 64], "F": [53, 57, 60], "E": [52, 56, 59], "Dm": [50, 53, 57],
    "C": [48, 55, 64], "G": [55, 59, 62],
}
ROOTS = {"Am": 45, "F": 41, "E": 40, "Dm": 38, "C": 36, "G": 43}
ARP = {  # piano arpeggio tones per chord
    "Am": [57, 64, 69, 72], "F": [53, 60, 65, 69], "E": [52, 59, 64, 68], "Dm": [50, 57, 62, 65],
    "C": [48, 55, 64, 67], "G": [43, 55, 62, 67],
}
PROGRESSION = [
    "Am", "F", "E",                 # P1 1-3   cover, bet, title: pad only
    "Am", "F", "Dm", "E",           # P2 4-7   reveal on bar 4: piano enters
    "Am", "C", "F", "E",            # P3 8-11  the widow's ghost develops
    "Am", "Dm", "F", "E",           # P4 12-15 ghost appears on bar 12; trial, darkroom
    "Am", "F", "Dm", "F", "E",      # P5 16-20 Grant, the question, then silence
    "Am", "F", "C", "E",            # P6 21-24 twist
    "F", "Am", "Dm", "Am",          # P7 25-28 centenary, golden line (bar 26), credits, loop
]
GOLDEN_BAR = 26  # the golden line lands on its first beat (frame 2400)
GOLDEN_CHORDS = [[57, 64, 69, 72], [53, 60, 65, 69]]  # Am on beat 1, F on beat 3
GOLDEN_MELODY = [76, 74, 72, 69, 71, 72, 74, 76]  # one note per character, each on an eighth note


def build_score(bpm, bars, fps, silence_frames):
    beat = 60 / bpm
    bar = 4 * beat
    total = bars * bar
    n = int((total + 6) * SR)
    mix = {k: np.zeros((n, 2)) for k in ("pad", "piano", "bass", "perc")}

    def place(track, sig, at, gain=1.0, pan=0.0):
        i = int(at * SR)
        s = stereo(sig) if sig.ndim == 1 else sig
        s = s * np.array([1 - max(0, pan), 1 + min(0, pan)])
        end = min(n, i + len(s))
        mix[track][i:end] += gain * s[: end - i]

    for b in range(bars):
        ch = PROGRESSION[b % len(PROGRESSION)]
        t0 = b * bar
        bar_no = b + 1
        bright = 900 if bar_no <= 3 else (2200 if bar_no == GOLDEN_BAR else 1500)
        place("pad", pad(CHORDS[ch], bar, bright), t0, 0.42 if bar_no <= 3 else 0.45)
        # downbeat accents: the reveal (bar 4) and the ghost (bar 12), kept below the twist
        if bar_no in (4, 12):
            g = 0.7 if bar_no == 4 else 0.8
            place("piano", piano(ROOTS[ch], 3.0, 0.95), t0, 0.9 * g, -0.1)
            place("piano", piano(ROOTS[ch] + 12, 3.0, 0.9), t0, 0.7 * g, 0.1)
            for m in CHORDS[ch]:
                place("piano", piano(m + 12, 2.5, 0.75), t0, 0.35 * g)
        if 4 <= bar_no <= 20:
            pattern = [0, 1, 3, 4, 6] if bar_no < 12 else [0, 1, 2, 3, 4, 5, 6, 7]
            tones = ARP[ch]
            for k in pattern:
                m = tones[k % len(tones)]
                v = 0.42 if k % 2 else 0.5
                place("piano", piano(m, beat * 0.45, v), t0 + k * beat / 2, 0.45, 0.15 * ((k % 3) - 1))
        if 21 <= bar_no <= 24:
            # twist: low octaves, one per half bar
            place("piano", piano(ROOTS[ch], bar * 0.48, 0.8), t0, 0.6)
            place("piano", piano(ROOTS[ch] + 12, bar * 0.45, 0.55), t0 + 2 * beat, 0.45)
        if bar_no == GOLDEN_BAR - 1:
            # centenary: one held octave while the dates are typed
            place("piano", piano(ROOTS[ch] + 12, bar * 0.9, 0.6), t0, 0.5)
        if bar_no == GOLDEN_BAR:
            for k, chord in enumerate(GOLDEN_CHORDS):
                for m in chord:
                    place("piano", piano(m, beat * 1.9, 0.6), t0 + 2 * k * beat, 0.4, 0.1)
            # one clear note per character on every eighth (v11 layer), and a held chord under the
            # last character, 信; an octave above the chords opens the top of the line.
            for k, m in enumerate(GOLDEN_MELODY):
                place("piano", piano(m, beat * 0.9, 0.8), t0 + k * beat / 2, 0.75, -0.1)
            for m in GOLDEN_CHORDS[0]:
                place("piano", piano(m + 12, beat * 1.5, 0.55), t0, 0.25, 0.15)
            for m in GOLDEN_CHORDS[0]:
                place("piano", piano(m, beat * 3.0, 0.6), t0 + 3.5 * beat, 0.4, 0.05)
        if bar_no == GOLDEN_BAR + 1:
            for k in (0, 2, 4, 6):
                place("piano", piano(ARP[ch][k % 4], beat * 0.9, 0.42), t0 + k * beat / 2, 0.4)
        if 13 <= bar_no <= GOLDEN_BAR + 1:
            place("bass", bass(ROOTS[ch] - 12, bar * 0.95), t0, 0.5)
        if 8 <= bar_no <= 20:
            for q in (0, 2):
                place("perc", pulse(0.5), t0 + q * beat, 0.5)
        if 13 <= bar_no <= 20 or bar_no == GOLDEN_BAR:
            for q in (1, 3):
                place("perc", brush(0.5), t0 + q * beat, 0.35, 0.2)
            for e in range(8):
                place("perc", tick(0.3 if e % 2 else 0.45), t0 + e * beat / 2, 0.12, -0.3)

    out = (mix["pad"] * 0.9 + mix["piano"] * 2.4 + mix["bass"] * 0.35 + mix["perc"] * 0.45)
    out = add_reverb(out, wet=0.28, rt60=2.4)
    # Seamless loop: whatever rings past the last bar (pad, reverb tail) is folded onto the start,
    # so frame 0 already carries the sound of the last frame.
    end = int(total * SR)
    wrap = min(int(3.0 * SR), len(out) - end)
    out[:wrap] += out[end:end + wrap]
    out = out[:end].copy()
    # Lows in mono (below 120 Hz) for phone speakers and mono fold-down.
    lows = lowpass(out, 120)
    out = out - lows + lows.mean(axis=1, keepdims=True)
    # hard silence before the twist (after reverb, so no tail leaks through)
    s0, s1 = (int(f / fps * SR) for f in silence_frames)
    fade = int(0.02 * SR)
    out[s0 - fade:s0] *= np.linspace(1, 0, fade)[:, None]
    out[s0:s1] = 0
    return norm_peak(out, -3.0)


# ---------- sound effects ----------

def sfx_paper_tick(semitone):
    n = int(0.09 * SR)
    x = bandpass(rng.standard_normal(n), 1500 * 2 ** (semitone / 12), 7000) * env_ad(n, 0.0008, 0.012)
    body = np.sin(2 * np.pi * 420 * 2 ** (semitone / 12) * np.arange(n) / SR) * env_ad(n, 0.0005, 0.008)
    return norm_peak(x + 0.3 * body, -3)


def sfx_typewriter(semitone):
    n = int(0.14 * SR)
    t = np.arange(n) / SR
    click = highpass(rng.standard_normal(n), 3000) * env_ad(n, 0.0003, 0.004)
    thump = np.sin(2 * np.pi * 180 * 2 ** (semitone / 12) * t) * env_ad(n, 0.001, 0.025)
    clack = bandpass(rng.standard_normal(n), 900, 2600) * env_ad(n, 0.0005, 0.015)
    x = click + 0.6 * thump + 0.5 * np.roll(clack, int(0.006 * SR))
    return norm_peak(x, -3)


def sfx_stamp():
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    # A rubber stamp pressed into paper on a wooden desk: an unpitched body knock, the slap of
    # the rubber, a short squish of ink. No sine sweep: the film keeps its one low hit for the twist.
    knock = bandpass(rng.standard_normal(n), 120, 600) * env_ad(n, 0.002, 0.05)
    slap = bandpass(rng.standard_normal(n), 400, 3500) * env_ad(n, 0.0008, 0.02)
    squish = lowpass(rng.standard_normal(n), 900) * env_ad(n, 0.02, 0.08) * 0.3
    return norm_peak(add_reverb(0.8 * knock + 0.6 * slap + squish, 0.1, 0.5), -3)


def sfx_shutter():
    n = int(0.35 * SR)
    x = np.zeros(n)
    for at, g in ((0.0, 1.0), (0.055, 0.7)):
        i = int(at * SR)
        m = int(0.06 * SR)
        c = highpass(rng.standard_normal(m), 2200) * env_ad(m, 0.0004, 0.006)
        r = bandpass(rng.standard_normal(m), 700, 3000) * env_ad(m, 0.001, 0.02)
        x[i:i + m] += g * (c + 0.4 * r)
    return norm_peak(add_reverb(x, 0.1, 0.4), -3)


def sfx_paper_slide(seconds=0.55):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    x = bandpass(rng.standard_normal(n), 700, 6000)
    grain = 1 + 0.5 * np.sin(2 * np.pi * 37 * t + rng.uniform(0, 6))
    e = np.sin(np.pi * np.clip(t / seconds, 0, 1)) ** 1.5
    return norm_peak(x * grain * e, -4)


def sfx_page_turn():
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    sweep = np.array([bandpass(x[i:i + 2400], 600 + 5000 * (i / n), 7000 + 4000 * (i / n)) for i in range(0, n, 2400)], dtype=object)
    y = np.concatenate(sweep)[:n]
    e = np.exp(-((t - 0.28) / 0.13) ** 2) + 0.4 * np.exp(-((t - 0.45) / 0.05) ** 2)
    return norm_peak(y * e, -4)


def sfx_loupe():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    slide = bandpass(rng.standard_normal(n), 2000, 8000) * np.sin(np.pi * np.clip(t / 0.22, 0, 1)) * 0.3
    click = np.zeros(n)
    i = int(0.22 * SR)
    m = int(0.03 * SR)
    click[i:i + m] = highpass(rng.standard_normal(m), 2500) * env_ad(m, 0.0003, 0.004)
    return norm_peak(slide + click, -5)


def sfx_projector_click():
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    clack = bandpass(rng.standard_normal(n), 500, 4000) * env_ad(n, 0.0006, 0.03)
    motor = (np.sin(2 * np.pi * 110 * t) + 0.4 * np.sin(2 * np.pi * 220 * t)) * np.clip(t / 0.15, 0, 1) * np.exp(-t / 0.5) * 0.25
    flutter = bandpass(rng.standard_normal(n), 200, 1200) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 24 * t))) * np.exp(-t / 0.4) * 0.15
    return norm_peak(clack + motor + flutter, -3)


def sfx_liquid():
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    # Developer rocked in a tray: low-passed water noise with two soft surges, no pitched bubbles.
    surge = np.sin(np.pi * t / 1.4) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * t / 0.7))
    wash = bandpass(rng.standard_normal(n), 150, 1800) * surge
    return norm_peak(lowpass(wash, 1500), -6)


def sfx_pen():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    x = bandpass(rng.standard_normal(n), 2500, 9000)
    mod = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 9 * t))
    e = np.clip(t / 0.03, 0, 1) * np.clip((0.45 - t) / 0.08, 0, 1)
    return norm_peak(x * mod * e, -6)


def sfx_tag_drop():
    n = int(0.3 * SR)
    slap = bandpass(rng.standard_normal(n), 300, 2500) * env_ad(n, 0.001, 0.025)
    body = np.sin(2 * np.pi * 140 * np.arange(n) / SR) * env_ad(n, 0.001, 0.03) * 0.5
    return norm_peak(slap + body, -4)


def sfx_sub_hit(seconds=2.2, low=False):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    f = (70 if not low else 60) * np.exp(-t / 0.35) + 32
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(n, 0.004, 0.7)
    air = lowpass(rng.standard_normal(n), 400) * env_ad(n, 0.003, 0.08) * 0.15
    return norm_peak(s + air, -1)


def sfx_flip():
    a = sfx_paper_slide(0.35)
    b = sfx_tag_drop()
    out = np.zeros(int(0.6 * SR))
    out[: len(a)] += a
    i = int(0.28 * SR)
    out[i:i + len(b)] += 0.6 * b[: len(out) - i]
    return norm_peak(out, -4)


def room_tone(seconds):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    # Air of a quiet room (150 Hz – 8 kHz) plus a faint projector-fan rumble; audible on a phone.
    air = bandpass(rng.standard_normal((n, 2)), 150, 8000)
    air = air / np.max(np.abs(air))
    brown = np.cumsum(rng.standard_normal((n, 2)), axis=0)
    brown = lowpass(highpass(brown, 60), 300)
    brown = 0.35 * brown / np.max(np.abs(brown))
    drips = np.zeros((n, 2))
    for at in np.arange(7.3, seconds, 11.7):
        # A darkroom drip: a short, soft, unpitched tick (low-passed noise), not a sine chirp.
        i = int(at * SR)
        m = int(0.06 * SR)
        d = lowpass(rng.standard_normal(m), 2500) * env_ad(m, 0.001, 0.012)
        drips[i:i + m, :] += 0.3 * d[:, None]
    # Full level from the first sample: the film loops, so the room never fades in.
    x = 0.6 * air + brown + drips
    return norm_peak(add_reverb(x, 0.2, 1.2), -6)


def peak_offset_frames(x, fps):
    mono = np.abs(x if x.ndim == 1 else x.mean(axis=1))
    return round(int(np.argmax(mono)) / SR * fps, 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bpm", type=float, default=75)
    ap.add_argument("--bars", type=int, default=28)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--silence", type=int, nargs=2, default=[1905, 1920])
    a = ap.parse_args()

    score = build_score(a.bpm, a.bars, a.fps, a.silence)
    write(os.path.join(PUBLIC, "music", "score.wav"), score)

    sfx = {
        "stamp": sfx_stamp(),
        "shutter": sfx_shutter(),
        "paper_slide": sfx_paper_slide(),
        "page_turn": sfx_page_turn(),
        "loupe": sfx_loupe(),
        "projector_click": sfx_projector_click(),
        "liquid": sfx_liquid(),
        "pen": sfx_pen(),
        "tag_drop": sfx_tag_drop(),
        "sub_hit": sfx_sub_hit(),
        "sub_hit_low": sfx_sub_hit(1.6, low=True),
        "flip": sfx_flip(),
    }
    for k, st in enumerate((-1, -0.5, 0, 0.5, 1)):
        sfx[f"paper_tick_{k}"] = sfx_paper_tick(st)
        sfx[f"typewriter_{k}"] = sfx_typewriter(st)
    sfx["room_tone"] = room_tone(a.bars * 4 * 60 / a.bpm + 1)

    manifest = {}
    for name, x in sfx.items():
        write(os.path.join(PUBLIC, "sfx", f"{name}.wav"), x)
        manifest[name] = {
            "file": f"sfx/{name}.wav",
            "durationSec": round(len(x) / SR, 3),
            "peakOffsetFrames": peak_offset_frames(x, a.fps),
        }
    manifest["_score"] = {"file": "music/score.wav", "bpm": a.bpm, "bars": a.bars,
                          "durationSec": round(len(score) / SR, 3)}
    with open(os.path.join(PUBLIC, "sfx", "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print(json.dumps({k: v.get("peakOffsetFrames") for k, v in manifest.items()}, indent=0))


if __name__ == "__main__":
    main()
