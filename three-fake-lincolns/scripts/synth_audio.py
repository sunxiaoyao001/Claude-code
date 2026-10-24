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

def piano(midi, dur, vel=0.7):
    """Additive piano: inharmonic partials, per-partial decay, hammer noise, 3 detuned strings."""
    f0 = midi_hz(midi)
    n = int((dur + 4.0) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    B = 0.00035 * (1 + max(0, midi - 60) / 30)
    base_decay = np.interp(midi, [36, 60, 96], [7.0, 4.0, 1.2])
    for k in range(1, 18):
        fk = k * f0 * np.sqrt(1 + B * k * k)
        if fk > SR / 2 - 1000:
            break
        amp = (1 / k ** 1.15) * (0.6 + 0.4 * vel) ** (k * 0.35)
        if fk > 2500:  # felt hammers: keep the top end dark
            amp *= np.exp(-(fk - 2500) / 1800)
        dk = base_decay / (1 + 0.55 * (k - 1))
        for cents in (-0.6, 0.0, 0.7):
            ph = rng.uniform(0, 2 * np.pi)
            out += amp / 3 * np.sin(2 * np.pi * fk * 2 ** (cents / 1200) * t + ph) * np.exp(-t / dk)
    # damper release after the held duration
    rel = np.ones(n)
    r0 = int(dur * SR)
    rel[r0:] = np.exp(-np.arange(n - r0) / SR / 0.35)
    out *= rel
    hammer = bandpass(rng.standard_normal(int(0.03 * SR)), 800, min(9000, 6 * f0 + 2000)) * env_ad(int(0.03 * SR), 0.001, 0.008)
    out[: len(hammer)] += hammer * 0.08 * vel
    out[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return out * vel


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
    "Am", "Am", "F", "E",           # P1 1-4   pad only
    "Am", "F", "Dm", "E",           # P2 5-8   piano enters
    "Am", "C", "F", "E",            # P3 9-12
    "Dm", "Am", "F", "E",           # P4 13-16 + bass, brush
    "Am", "F", "Dm", "E",           # P5 17-20 then silence
    "Am", "F", "C", "G", "E",       # P6 21-25 twist (5-bar phrase)
    "Am", "F", "Am",                # P7 26-28 golden line, outro
]
GOLDEN = [69, 72, 76, 74, 72, 71, 69, 64]  # one note per character, on eighths


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
        # pad everywhere; darker in the hook, brighter at the golden line
        bright = 900 if bar_no <= 4 else (2200 if bar_no == 26 else 1500)
        place("pad", pad(CHORDS[ch], bar, bright), t0, 0.55 if bar_no <= 4 else 0.45)
        if 5 <= bar_no <= 20 or bar_no >= 26:
            # first heavy downbeat of the film = bar 5
            if bar_no in (5, 26):
                place("piano", piano(ROOTS[ch] - 12 + 12, 3.0, 0.9), t0, 0.7, -0.1)
            pattern = [0, 1, 3, 4, 6] if bar_no < 13 else [0, 1, 2, 3, 4, 5, 6, 7]
            tones = ARP[ch]
            if bar_no == 26:
                for k, m in enumerate(GOLDEN):
                    place("piano", piano(m, beat * 0.9, 0.62), t0 + k * beat / 2, 0.55, 0.1)
            elif bar_no <= 20:
                for k in pattern:
                    m = tones[k % len(tones)]
                    v = 0.42 if k % 2 else 0.5
                    place("piano", piano(m, beat * 0.45, v), t0 + k * beat / 2, 0.45, 0.15 * ((k % 3) - 1))
        if 21 <= bar_no <= 25:
            # twist: low octaves, one per half bar
            place("piano", piano(ROOTS[ch], bar * 0.48, 0.8), t0, 0.6)
            place("piano", piano(ROOTS[ch] + 12, bar * 0.45, 0.55), t0 + 2 * beat, 0.45)
        if 13 <= bar_no <= 20 or 22 <= bar_no <= 26:
            place("bass", bass(ROOTS[ch] - 12, bar * 0.95), t0, 0.5)
        if 9 <= bar_no <= 20:
            for q in (0, 2):
                place("perc", pulse(0.5), t0 + q * beat, 0.5)
        if 13 <= bar_no <= 20 or bar_no == 26:
            for q in (1, 3):
                place("perc", brush(0.5), t0 + q * beat, 0.35, 0.2)
            for e in range(8):
                place("perc", tick(0.3 if e % 2 else 0.45), t0 + e * beat / 2, 0.12, -0.3)

    out = (mix["pad"] * 0.9 + mix["piano"] * 1.0 + mix["bass"] * 0.8 + mix["perc"] * 0.7)
    out = add_reverb(out, wet=0.28, rt60=2.4)
    out = out[: int(total * SR)]
    # hard silence before the twist (after reverb, so no tail leaks through)
    s0, s1 = (int(f / fps * SR) for f in silence_frames)
    fade = int(0.02 * SR)
    out[s0 - fade:s0] *= np.linspace(1, 0, fade)[:, None]
    out[s0:s1] = 0
    # loop: tail fades to the opening level
    out[-int(1.5 * SR):] *= np.linspace(1, 0.35, int(1.5 * SR))[:, None]
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
    f = 95 * np.exp(-t / 0.05) + 55
    thud = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(n, 0.002, 0.09)
    slap = bandpass(rng.standard_normal(n), 400, 3500) * env_ad(n, 0.0008, 0.02)
    squish = lowpass(rng.standard_normal(n), 900) * env_ad(n, 0.02, 0.08) * 0.3
    return norm_peak(add_reverb(thud + 0.5 * slap + squish, 0.12, 0.6), -2)


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
    base = lowpass(rng.standard_normal(n), 700) * (0.4 + 0.6 * np.sin(np.pi * t / 1.4)) * 0.4
    bubbles = np.zeros(n)
    for _ in range(9):
        i = int(rng.uniform(0.05, 1.2) * SR)
        m = int(0.05 * SR)
        f = rng.uniform(500, 1400)
        tt = np.arange(m) / SR
        bubbles[i:i + m] += np.sin(2 * np.pi * f * (1 + 3 * tt) * tt) * env_ad(m, 0.002, 0.012)
    return norm_peak(base + 0.5 * bubbles, -6)


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
    brown = np.cumsum(rng.standard_normal((n, 2)), axis=0)
    brown = highpass(brown, 30)
    brown = lowpass(brown, 600) / np.max(np.abs(brown))
    hum = (np.sin(2 * np.pi * 60 * t) + 0.3 * np.sin(2 * np.pi * 120 * t))[:, None] * 0.05
    drips = np.zeros((n, 2))
    for at in np.arange(7.3, seconds, 11.7):
        i = int(at * SR)
        m = int(0.08 * SR)
        f = rng.uniform(900, 1300)
        tt = np.arange(m) / SR
        d = np.sin(2 * np.pi * f * (1 + 2 * tt) * tt) * env_ad(m, 0.001, 0.015)
        drips[i:i + m, :] += 0.25 * d[:, None]
    x = brown * 0.8 + hum + drips
    x[: int(0.5 * SR)] *= np.linspace(0, 1, int(0.5 * SR))[:, None]
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
