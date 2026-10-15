# -*- coding: utf-8 -*-
"""代码合成乐器与音效（numpy）。全部 48kHz，float32，立体声 (N,2)。"""
import math
import numpy as np
from scipy import signal

SR = 48000
RNG = np.random.default_rng(2024)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12.0)


NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
        'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n2m(name):
    """'D3' -> midi"""
    if name[1:2] in ('#', 'b'):
        p, o = name[:2], int(name[2:])
    else:
        p, o = name[:1], int(name[1:])
    return 12 * (o + 1) + NOTE[p]


def env_adsr(n, a, d, s, r, sr=SR):
    """线性/指数混合包络，长度 n 样本；a,d,r 秒；s 维持电平。"""
    t = np.arange(n) / sr
    e = np.empty(n, np.float32)
    a = max(a, 1e-3); r = max(r, 1e-3)
    rel_start = max(0.0, n / sr - r)
    e[:] = s
    m = t < a
    e[m] = (t[m] / a) ** 1.5
    m = (t >= a) & (t < a + d)
    e[m] = 1 - (1 - s) * ((t[m] - a) / max(d, 1e-3))
    m = t >= rel_start
    e[m] *= np.clip(1 - (t[m] - rel_start) / r, 0, 1) ** 2
    return e


def pan(x, p):
    """等功率声像，p ∈ [-1,1]"""
    a = (p + 1) * math.pi / 4
    return np.stack([x * math.cos(a), x * math.sin(a)], -1)


def lowpass(x, fc, order=2):
    b, a = signal.butter(order, min(fc / (SR / 2), 0.99), 'low')
    return signal.lfilter(b, a, x, axis=0).astype(np.float32)


def highpass(x, fc, order=2):
    b, a = signal.butter(order, max(fc / (SR / 2), 1e-4), 'high')
    return signal.lfilter(b, a, x, axis=0).astype(np.float32)


def bandpass(x, f1, f2, order=2):
    b, a = signal.butter(order, [f1 / (SR / 2), min(f2 / (SR / 2), 0.99)], 'band')
    return signal.lfilter(b, a, x, axis=0).astype(np.float32)


# ------------------------------------------------------------------ 乐器
def pad(notes, dur, amp=0.12, attack=3.0, release=4.0, bright=0.5, detune=0.07, vib=0.15, seed=0):
    """温暖的弦乐/合成垫音：每个音由带失谐的加法合成锯齿波（高次谐波衰减）。"""
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    out = np.zeros((n, 2), np.float32)
    rng = np.random.default_rng(seed)
    nh = 10
    for k, m in enumerate(notes):
        f0 = midi(m)
        for v in range(3):
            det = (v - 1) * detune
            f = f0 * 2 ** (det / 12)
            ph = rng.uniform(0, 6.28, nh)
            lfo = 1 + 0.0025 * np.sin(2 * math.pi * (vib + 0.03 * v) * t + rng.uniform(0, 6.28))
            sig = np.zeros(n, np.float32)
            for h in range(1, nh + 1):
                if f * h > 9000:
                    break
                w = (1.0 / h) * math.exp(-(h - 1) * (1.1 - bright))
                sig += w * np.sin(2 * math.pi * f * h * t * lfo + ph[h - 1]).astype(np.float32)
            p = ((k + v) % 3 - 1) * 0.55
            out += pan(sig, p)
    e = env_adsr(n, attack, 0.5, 1.0, release)
    # 缓慢呼吸的音量
    br = 1 + 0.12 * np.sin(2 * math.pi * 0.07 * t + seed)
    out *= (e * br)[:, None]
    out = lowpass(out, 1800 + 3000 * bright)
    return out * (amp / max(1, len(notes)) * 1.6)


def bass(m, dur, amp=0.25, attack=0.8, release=2.0):
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    f = midi(m)
    sig = np.sin(2 * math.pi * f * t) + 0.35 * np.sin(2 * math.pi * 2 * f * t) + 0.12 * np.sin(2 * math.pi * 3 * f * t)
    sig *= env_adsr(n, attack, 0.3, 0.9, release)
    return pan(sig.astype(np.float32) * amp * 0.55, 0)


def piano(m, dur=5.0, vel=0.6, p=0.0):
    """钢琴近似：非谐泛音 + 指数衰减 + 柔和锤击。"""
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    f = midi(m)
    B = 0.0004
    sig = np.zeros(n, np.float32)
    for h in range(1, 13):
        fh = f * h * math.sqrt(1 + B * h * h)
        if fh > 12000:
            break
        a = (vel ** (0.6 + 0.12 * h)) / (h ** 1.15)
        dec = 1.2 + 6.0 / (1 + f / 220) * (1.0 / h ** 0.5) * 2.2
        tau = dec / (1 + 0.35 * h)
        sig += a * np.exp(-t / tau) * np.sin(2 * math.pi * fh * t + h)
    # 双弦失谐的拍频
    sig *= 1 + 0.15 * np.sin(2 * math.pi * 0.6 * t)
    att = np.clip(t / 0.004, 0, 1)
    ham = RNG.normal(0, 1, n).astype(np.float32) * np.exp(-t / 0.01) * 0.04 * vel
    sig = sig * att + lowpass(ham, 3000)
    rel = np.clip((dur - t) / 0.3, 0, 1)
    sig *= rel
    return pan(sig * 0.18 * vel, p)


def bell(m, dur=6.0, amp=0.1, p=0.0):
    """玻璃般的钟声（FM）。"""
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    f = midi(m)
    idx = 2.2 * np.exp(-t / 1.2)
    sig = np.sin(2 * math.pi * f * t + idx * np.sin(2 * math.pi * f * 3.5 * t))
    sig += 0.3 * np.sin(2 * math.pi * f * 2.0 * t) * np.exp(-t / 0.8)
    sig *= np.exp(-t / (dur * 0.35)) * np.clip(t / 0.003, 0, 1)
    return pan(sig.astype(np.float32) * amp, p)


FORMANTS = {'a': [(800, 80, 1.0), (1150, 90, 0.5), (2900, 120, 0.25), (3900, 130, 0.12)],
            'o': [(450, 70, 1.0), (800, 80, 0.35), (2830, 100, 0.12), (3800, 120, 0.06)],
            'u': [(325, 50, 1.0), (700, 60, 0.2), (2530, 170, 0.05)]}


def choir(notes, dur, amp=0.08, vowel='o', attack=3.0, release=4.0, seed=1):
    """人声合唱 'ooh/aah'：锯齿声源 + 共振峰滤波 + 颤音，多声部失谐。"""
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    rng = np.random.default_rng(seed)
    src = np.zeros((n, 2), np.float32)
    for k, m in enumerate(notes):
        for v in range(4):
            f = midi(m) * 2 ** (rng.normal(0, 0.08) / 12)
            vib = 1 + 0.006 * np.sin(2 * math.pi * rng.uniform(4.6, 5.6) * t + rng.uniform(0, 6))
            ph = np.cumsum(f * vib) / SR
            saw = 2 * (ph % 1.0) - 1
            saw = saw.astype(np.float32)
            src += pan(saw, rng.uniform(-0.8, 0.8))
    out = np.zeros_like(src)
    for fc, bw, g in FORMANTS[vowel]:
        out += g * bandpass(src, fc - bw, fc + bw, order=2)
    out = lowpass(out, 4000)
    out *= env_adsr(n, attack, 0.5, 1.0, release)[:, None]
    return out * amp / max(1, len(notes))


def thump(amp=0.5, f0=55, dur=2.5):
    """低沉的鼓/冲击：下滑正弦 + 噪声。"""
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    f = f0 * (1 + 1.5 * np.exp(-t / 0.05))
    ph = 2 * math.pi * np.cumsum(f) / SR
    sig = np.sin(ph) * np.exp(-t / 0.55)
    nz = lowpass(RNG.normal(0, 1, n).astype(np.float32), 900) * np.exp(-t / 0.08) * 0.25
    return pan((sig + nz).astype(np.float32) * amp, 0)


def boom(amp=0.8, dur=6.0):
    """片名重击：次低频下滑 + 宽频噪声 + 金属余韵。"""
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    f = 32 + 60 * np.exp(-t / 0.15)
    sub = np.sin(2 * math.pi * np.cumsum(f) / SR) * np.exp(-t / 1.6)
    nz = RNG.normal(0, 1, (n, 2)).astype(np.float32)
    nz = lowpass(nz, 2500) * (np.exp(-t / 0.25) * 0.35)[:, None]
    metal = np.zeros(n, np.float32)
    for fr in (110, 164.8, 233, 311):
        metal += np.sin(2 * math.pi * fr * t + fr) * np.exp(-t / 2.5) * 0.05
    out = pan(sub.astype(np.float32), 0) + nz + pan(metal, 0.2)
    return out * amp


def riser(dur=3.0, amp=0.25):
    """反向镲片式上扬：噪声带通扫频 + 音量渐强，结尾截止。"""
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    nz = RNG.normal(0, 1, (n, 2)).astype(np.float32)
    out = np.zeros_like(nz)
    seg = 12
    for k in range(seg):
        a, b = int(n * k / seg), int(n * (k + 1) / seg)
        fc = 400 * (16 ** (k / seg))
        out[a:b] = bandpass(nz[a:b], fc * 0.7, min(fc * 1.6, 20000), 1)
    e = (t / dur) ** 2.4
    return out * e[:, None] * amp


def whoosh(dur=1.6, amp=0.15):
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    nz = RNG.normal(0, 1, (n, 2)).astype(np.float32)
    nz = bandpass(nz, 300, 4000, 1)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return nz * e[:, None] * amp


def click(amp=0.12, tone=2500, dur=0.05, p=0.0):
    """打字机/盖革计数器单击。"""
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    nz = RNG.normal(0, 1, n).astype(np.float32)
    sig = bandpass(nz, tone * 0.5, min(tone * 2, 20000), 1) * np.exp(-t / 0.006)
    sig += 0.4 * np.sin(2 * math.pi * 180 * t) * np.exp(-t / 0.01)
    return pan(sig * amp, p)


def ping(m=86, amp=0.12, dur=2.5, p=0.0):
    """雷达/声呐 ping。"""
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    f = midi(m)
    sig = np.sin(2 * math.pi * f * t) * np.exp(-t / 0.5) * np.clip(t / 0.002, 0, 1)
    return pan(sig.astype(np.float32) * amp, p)


def wind(dur, amp=0.06, seed=3):
    n = int(dur * SR)
    rng = np.random.default_rng(seed)
    nz = rng.normal(0, 1, (n, 2)).astype(np.float32)
    # 缓慢变化的带通中心频率：分段滤波后拼接
    out = np.zeros_like(nz)
    seg = max(1, int(dur / 0.5))
    t = np.arange(n) / SR
    for k in range(seg):
        a, b = int(n * k / seg), int(n * (k + 1) / seg)
        fc = 380 + 260 * math.sin(k * 0.37) + 120 * math.sin(k * 0.13 + 1)
        out[a:b] = bandpass(nz[a:b], fc * 0.6, fc * 1.8, 1)
    gust = 0.6 + 0.4 * np.sin(2 * math.pi * 0.05 * t + seed) * np.sin(2 * math.pi * 0.11 * t)
    out *= gust[:, None].astype(np.float32)
    out = lowpass(out, 1500)
    return out * amp * env_adsr(n, 2.0, 0.1, 1.0, 2.0)[:, None]


def water(dur, amp=0.05, seed=4):
    n = int(dur * SR)
    rng = np.random.default_rng(seed)
    nz = rng.normal(0, 1, (n, 2)).astype(np.float32)
    out = bandpass(nz, 200, 1600, 1)
    t = np.arange(n) / SR
    mod = 0.6 + 0.4 * np.abs(np.sin(2 * math.pi * 0.3 * t)) * (0.7 + 0.3 * np.sin(2 * math.pi * 1.7 * t))
    return out * (mod[:, None] * amp * env_adsr(n, 1.5, 0.1, 1.0, 1.5)[:, None]).astype(np.float32)


def heartbeat(amp=0.35):
    a = thump(amp, 48, 0.6)
    b = thump(amp * 0.7, 44, 0.6)
    out = np.zeros((int(0.9 * SR), 2), np.float32)
    out[:len(a)] += a
    o = int(0.28 * SR)
    out[o:o + len(b)] += b[:len(out) - o]
    return out


# ------------------------------------------------------------------ 混响
def make_ir(dur=3.6, predelay=0.02, damp=4500, seed=9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    ir = rng.normal(0, 1, (n, 2)).astype(np.float32)
    ir *= np.exp(-t * 6.9 / dur)[:, None].astype(np.float32)
    ir = lowpass(ir, damp)
    pd = int(predelay * SR)
    ir = np.vstack([np.zeros((pd, 2), np.float32), ir])
    ir /= np.sqrt((ir ** 2).sum(0, keepdims=True))
    return ir


def reverb(x, ir, wet=0.35):
    y = np.stack([signal.oaconvolve(x[:, ch], ir[:, ch])[:len(x)] for ch in range(2)], -1).astype(np.float32)
    return x * (1 - wet) + y * wet * 2.2


class Track:
    def __init__(self, dur):
        self.n = int(dur * SR) + SR * 8
        self.buf = np.zeros((self.n, 2), np.float32)

    def add(self, t, x, gain=1.0):
        i = int(t * SR)
        if i < 0:
            x = x[-i:]; i = 0
        j = min(self.n, i + len(x))
        if j > i:
            self.buf[i:j] += x[:j - i] * gain
