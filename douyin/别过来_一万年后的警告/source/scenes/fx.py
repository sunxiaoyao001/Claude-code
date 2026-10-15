# -*- coding: utf-8 -*-
"""特效：文字粒子化、扫描线、数字滚动等。"""
import math, sys, functools
import numpy as np
import skia
sys.path.insert(0, '/tmp/claude-0/proj')
from engine.core import *


@functools.lru_cache(maxsize=64)
def text_points(text, name, size, tracking=0.0, step=2.0, seed=0):
    """把一行文字栅格化，返回文字像素点（逻辑坐标，以文字中心为原点）Nx2 以及随机量 Nx4。"""
    items, w = layout(text, name, size, tracking)
    pad = int(size * 0.5)
    sc = 1.0 / step
    W = int((w + pad * 2) * sc) + 2
    H = int(size * 1.6 * sc) + 2
    surf = skia.Surface(W, H)
    c = surf.getCanvas()
    c.clear(skia.Color4f(0, 0, 0, 0))
    c.scale(sc, sc)
    p = skia.Paint(AntiAlias=True, Color=0xFFFFFFFF)
    for ch, fn, cx in items:
        c.drawString(ch, pad + cx, size * 1.15, font(fn, size), p)
    a = surf.makeImageSnapshot().toarray()[..., 3]
    ys, xs = np.nonzero(a > 110)
    P = np.stack([xs / sc - pad - w / 2, ys / sc - size * 1.15 + size * 0.36], -1).astype(np.float64)
    rng = np.random.default_rng(seed)
    R = rng.random((len(P), 4))
    return P, R


def dissolve_text(c, text, x, y, name, size, t, color='bone', alpha=1.0, tracking=0.0, wind=(1.0, -0.35),
                  spread=260, step=2.2, dur=2.4, seed=1, r=1.1, direction='lr'):
    """t<0: 完整文字；0..dur: 从左到右被风吹散成沙；>dur: 消失。"""
    if alpha <= 0.003:
        return
    if t <= 0:
        draw_text(c, text, x, y, name, size, color, alpha, tracking=tracking)
        return
    P, R = text_points(text, name, size, tracking, step, seed)
    if len(P) == 0:
        return
    xs = P[:, 0]
    span = xs.max() - xs.min() + 1
    order = (xs - xs.min()) / span if direction == 'lr' else 1 - (xs - xs.min()) / span
    start = order * dur * 0.6 + R[:, 0] * 0.25
    k = np.clip((t - start) / (dur * 0.55), 0, 1)
    e = k * k
    ang = R[:, 1] * 6.28
    dx = (wind[0] * spread * (0.4 + R[:, 2]) + 30 * np.cos(ang)) * e
    dy = (wind[1] * spread * (0.4 + R[:, 3]) + 30 * np.sin(ang)) * e - 40 * e * e
    px = x + P[:, 0] + dx
    py = y + P[:, 1] + dy
    a = 1 - k
    # 未开始的点画成小方点（密集即文字）
    for lo, hi in ((0.0, 0.001), (0.001, 0.35), (0.35, 0.7), (0.7, 1.0)):
        m = (k >= lo) & (k < hi) if hi < 1 else (k >= lo) & (k < 0.999)
        if not m.any():
            continue
        aa = alpha * float(np.mean(a[m]))
        rr = r * (1.25 if lo == 0 else 1.0)
        points(c, np.stack([px[m], py[m]], -1), rr, color, aa)


def assemble_text(c, text, x, y, name, size, t, color='bone', alpha=1.0, tracking=0.0, dur=1.6, seed=2, step=2.2,
                  spread=420, r=1.1):
    """粒子从四周汇聚成文字，t>=dur 时画实体文字。"""
    if t >= dur:
        draw_text(c, text, x, y, name, size, color, alpha, tracking=tracking)
        return
    P, R = text_points(text, name, size, tracking, step, seed)
    k = np.clip((t - R[:, 0] * dur * 0.35) / (dur * 0.65), 0, 1)
    e = 1 - (1 - k) ** 3
    ang = R[:, 1] * 6.28
    dist = spread * (0.3 + R[:, 2])
    px = x + P[:, 0] + np.cos(ang) * dist * (1 - e)
    py = y + P[:, 1] + np.sin(ang) * dist * (1 - e)
    points(c, np.stack([px, py], -1), r, color, alpha * min(1.0, t / dur * 2))
    fa = smooth(remap(t, dur * 0.75, dur))
    if fa > 0:
        draw_text(c, text, x, y, name, size, color, alpha * fa, tracking=tracking)


def scan_beam(c, x, y0, y1, color='ember', alpha=0.6, width=60):
    hgrad(c, x - width, y0, width * 2, y1 - y0, [CI(color, 0), CI(color, alpha * 0.25), CI(color, 0)])
    line(c, x, y0, x, y1, color, 1.5, alpha)


def count(v0, v1, p):
    return v0 + (v1 - v0) * p
