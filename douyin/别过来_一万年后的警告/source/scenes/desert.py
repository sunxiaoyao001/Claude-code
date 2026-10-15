# -*- coding: utf-8 -*-
"""新墨西哥沙漠（2D 分层沙丘）与地层剖面。"""
import math, sys
import numpy as np
import skia
sys.path.insert(0, '/tmp/claude-0/proj')
from engine.core import *


def ridge(x, seed, amp, freq):
    """平滑山脊线 y 偏移。"""
    y = np.zeros_like(x)
    rng = np.random.default_rng(seed)
    for k in range(5):
        f = freq * (1.7 ** k)
        ph = rng.uniform(0, 6.28)
        y += amp / (1.8 ** k) * np.sin(x * f + ph)
    return y


def dune_layers(c, t, horizon=640, pan=0.0, palette='dusk', alpha=1.0, n=5):
    """多层沙丘剪影，越近越暗，视差平移。"""
    if palette == 'dusk':
        cols = [0xFF8C5A45, 0xFF6E4337, 0xFF52322B, 0xFF3A2420, 0xFF241714]
    elif palette == 'night':
        cols = [0xFF2A2A3A, 0xFF22222F, 0xFF1A1A24, 0xFF13131A, 0xFF0C0C11]
    else:
        cols = [0xFFC9A27C, 0xFFB08560, 0xFF8E6748, 0xFF6C4C36, 0xFF4A3426]
    xs = np.linspace(-40, LW + 40, 160)
    for i in range(n):
        depth = i / (n - 1)
        par = 0.15 + depth * 0.85
        base = horizon + depth ** 1.6 * (LH - horizon) * 0.9 + 6
        amp = 10 + depth * 46
        ys = base + ridge(xs + pan * par * 400 + i * 300, 100 + i, amp, 0.004 + 0.002 * (1 - depth))
        pts = [(xs[0], LH + 10)] + list(zip(xs, ys)) + [(xs[-1], LH + 10)]
        path = poly_path(pts)
        col = cols[min(i, len(cols) - 1)]
        # 顶部亮边 → 底部暗
        top = float(ys.min())
        sh = skia.GradientShader.MakeLinear([skia.Point(0, top), skia.Point(0, LH)],
                                            [CI(mixc(col, 0xFFE2A060, 0.25 * (1 - depth)), alpha), CI(col, alpha),
                                             CI(mixc(col, 0xFF000000, 0.4), alpha)], [0, 0.25, 1])
        c.drawPath(path, skia.Paint(AntiAlias=True, Shader=sh))
        # 山脊高光
        rp = poly_path(list(zip(xs, ys)), closed=False)
        c.drawPath(rp, paint(0xFFF0B070, alpha * 0.18 * (1 - depth), stroke=1.2))


def dusk_sky(c, horizon=640, sun=(1180, 560), alpha=1.0, night=0.0):
    top = mixc(0xFF1B1D2E, 0xFF07080D, night)
    mid = mixc(0xFF5C3E4E, 0xFF15182A, night)
    hor = mixc(0xFFE89A5C, 0xFF3A2E3A, night)
    sh = skia.GradientShader.MakeLinear([skia.Point(0, 0), skia.Point(0, horizon + 40)],
                                        [CI(top, alpha), CI(mid, alpha), CI(hor, alpha)], [0, 0.6, 1])
    c.drawRect(skia.Rect.MakeLTRB(-50, -50, LW + 50, horizon + 60), skia.Paint(Shader=sh))
    if sun is not None and night < 0.95:
        sa = alpha * (1 - night)
        glow(c, sun[0], sun[1], 700, 0xFFFFC07A, 0.45 * sa)
        glow(c, sun[0], sun[1], 160, 0xFFFFE0B0, 0.7 * sa)
        dot(c, sun[0], sun[1], 24, 0xFFFFF0D6, sa)


STRATA = [
    # (深度m, 名称, 颜色)
    (0, '沙漠表层', 0xFF5E4231),
    (40, '砂岩', 0xFF4C3628),
    (170, '粉砂岩 · 泥岩', 0xFF3A2B24),
    (300, '硬石膏', 0xFF3B3434),
    (400, '萨拉多盐层 · 约 2.5 亿年', 0xFF5A4E4C),
    (860, '盐层底部', 0xFF2E2826),
    (1400, '', 0xFF201C1B),
]


def cross_section(c, t, y0=330, scale=0.62, alpha=1.0, reveal=1.0, rooms=1.0, x0=0, w=LW, label_a=1.0,
                  depth_mark=655):
    """地层剖面。y0 为地表屏幕 y，scale 为 屏幕像素/米。"""
    if reveal > 0.003:
        draw_section(c, y0, alpha * reveal)
    for i, (d, name, col) in enumerate(STRATA[:-1]):
        d2 = STRATA[i + 1][0]
        ya = y0 + d * scale
        if name and label_a > 0:
            draw_text(c, name, x0 + 70, ya + 34, 'sans', 17, 'paper', alpha * reveal * label_a * 0.85, align='l',
                      tracking=0.1)
            draw_text(c, '-%d m' % d if d else '0 m', x0 + w - 70, ya + 30, 'mono', 14, 'paper',
                      alpha * reveal * label_a * 0.6, align='r')
    for i, (d, name, col) in enumerate([] and STRATA[:-1]):
        d2 = STRATA[i + 1][0]
        ya = y0 + d * scale
        yb = y0 + d2 * scale
        if ya > LH + 50:
            break
        xs = np.linspace(x0 - 20, x0 + w + 20, 120)
        wav_a = ridge(xs, 400 + i, 4, 0.006)
        wav_b = ridge(xs, 401 + i, 4, 0.006)
        top = list(zip(xs, ya + wav_a))
        bot = list(zip(xs[::-1], (yb + wav_b)[::-1]))
        path = poly_path(top + bot)
        sh = skia.GradientShader.MakeLinear([skia.Point(0, ya), skia.Point(0, yb)],
                                            [CI(mixc(col, 0xFFFFFFFF, 0.06), alpha * reveal), CI(col, alpha * reveal)])
        c.drawPath(path, skia.Paint(AntiAlias=True, Shader=sh))
        c.drawPath(poly_path(top, False), paint(0xFF000000, 0.35 * alpha * reveal, stroke=1.2))
        c.drawPath(poly_path(top, False), paint(0xFFFFE0C0, 0.08 * alpha * reveal, stroke=0.8))
        nl = int((yb - ya) / 14)
        for j in range(1, nl):
            yy = ya + (yb - ya) * j / nl + ridge(xs, 900 + i * 31 + j, 2.5, 0.01)
            c.drawPath(poly_path(list(zip(xs, yy)), False),
                       paint(0xFFFFFFFF if j % 3 else 0xFF000000, 0.035 * alpha * reveal, stroke=0.8))
        if name and label_a > 0:
            draw_text(c, name, x0 + 70, ya + 34, 'sans', 17, 'paper', alpha * reveal * label_a * 0.85, align='l',
                      tracking=0.1)
            draw_text(c, '-%d m' % d if d else '0 m', x0 + w - 70, ya + 30, 'mono', 14, 'paper',
                      alpha * reveal * label_a * 0.6, align='r')
    # 盐层里的处置室
    if rooms > 0:
        yd = y0 + depth_mark * scale
        rw, rh = 120, 22
        n = 7
        tot = n * rw + (n - 1) * 26
        xs0 = x0 + w / 2 - tot / 2
        for k in range(n):
            a = alpha * smooth(remap(rooms, k / n * 0.6, k / n * 0.6 + 0.4))
            rx = xs0 + k * (rw + 26)
            rect(c, rx, yd - rh / 2, rw, rh, 0xFF1A1716, a)
            # 桶
            for j in range(9):
                bx = rx + 7 + j * 12.4
                rect(c, bx, yd - rh / 2 + 5, 9, 12, 'ember', a * 0.85, r=1.5)
            rect(c, rx, yd - rh / 2, rw, rh, 'ember', a * 0.6, stroke=1.0)
        # 竖井
        sx = x0 + w / 2 + tot / 2 + 60
        line(c, sx, y0, sx, yd, 'paper', 2.0, alpha * smooth(remap(rooms, 0, 0.3)))
        line(c, xs0 - 20, yd + rh / 2 + 6, sx, yd + rh / 2 + 6, 'paper', 1.0, alpha * 0.5 * smooth(remap(rooms, 0.3, 0.6)))


# ---------------------------------------------------------------- 纹理化地层（缓存图）
SEC_SCALE = 0.9   # 像素/米
SEC_DEPTH = 1500


def _fbm(H, W, seed, octaves=5, base=(8, 32)):
    """分形噪声（低分辨率随机网格双线性放大叠加）。"""
    rng = np.random.default_rng(seed)
    out = np.zeros((H, W), np.float32)
    amp = 1.0
    gh, gw = base
    tot = 0
    for o in range(octaves):
        g = rng.random((gh + 2, gw + 2)).astype(np.float32)
        ys = np.linspace(0, gh, H, dtype=np.float32)
        xs = np.linspace(0, gw, W, dtype=np.float32)
        y0 = ys.astype(int); x0 = xs.astype(int)
        fy = (ys - y0)[:, None]; fx = (xs - x0)[None, :]
        fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
        a = g[y0][:, x0]; b = g[y0][:, x0 + 1]; cc = g[y0 + 1][:, x0]; d = g[y0 + 1][:, x0 + 1]
        out += amp * ((a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy)
        tot += amp
        amp *= 0.5; gh *= 2; gw *= 2
    return out / tot


def section_builder(S):
    def b(W, H):
        # W,H 为设备像素：宽 LW*S，高 (SEC_DEPTH*SEC_SCALE+40)*S
        ys_m = (np.arange(H, dtype=np.float32) / S) / SEC_SCALE   # 每行对应深度（米）
        xs = np.arange(W, dtype=np.float32) / S
        rgb = np.zeros((H, W, 3), np.float32)
        n1 = _fbm(H, W, 11, 5, (6, 40))
        n2 = _fbm(H, W, 12, 4, (60, 12))
        warp = (n1 - 0.5) * 18.0  # 层界起伏（米）
        dm = ys_m[:, None] + warp
        stops = [s[0] for s in STRATA]
        cols = np.array([[((s[2] >> 16) & 255), ((s[2] >> 8) & 255), (s[2] & 255)] for s in STRATA], np.float32)
        idx = np.clip(np.searchsorted(stops, dm, side='right') - 1, 0, len(STRATA) - 1)
        rgb = cols[idx]
        # 层内渐变：越深越暗一点
        frac = np.zeros_like(dm)
        for i in range(len(STRATA) - 1):
            m = idx == i
            frac[m] = (dm[m] - stops[i]) / (stops[i + 1] - stops[i])
        rgb *= (1.08 - 0.22 * frac)[..., None]
        # 沉积纹理：细横纹
        band = np.sin(dm * 1.9 + n2 * 9.0) * 0.5 + 0.5
        rgb *= (0.93 + 0.1 * band)[..., None]
        # 盐层：晶体颗粒
        rng = np.random.default_rng(5)
        salt = (idx == 4)
        speck = rng.random((H, W)).astype(np.float32)
        rgb[salt] *= (0.9 + 0.22 * speck[salt])[:, None]
        rgb[salt] += np.array([18, 8, 4], np.float32) * n1[salt][:, None]
        # 层界暗线
        edge = np.zeros_like(dm, bool)
        for s0 in stops[1:]:
            edge |= np.abs(dm - s0) < 1.1 / S / SEC_SCALE * 2
        rgb[edge] *= 0.55
        rgb += (np.random.default_rng(9).normal(0, 2.0, (H, W, 1))).astype(np.float32)
        return np_finish(rgb)
    return b


def section_image(c):
    S = cur_s()
    W = int(round(LW * S)); H = int(round((SEC_DEPTH * SEC_SCALE + 40) * S))
    return cached_image('section', W, H, section_builder(S)), S


def draw_section(c, y0, alpha=1.0):
    """把缓存的纹理地层画在地表 y0 下方。若当前变换只是平移+基础缩放，则按设备整像素直贴（快）。"""
    img, S = section_image(c)
    p = skia.Paint(AntiAlias=True)
    p.setAlphaf(alpha)
    m = c.getTotalMatrix()
    if abs(m.getScaleX() - S) < 1e-4 and abs(m.getScaleY() - S) < 1e-4 and abs(m.getSkewX()) < 1e-6:
        pt = m.mapXY(0, y0)
        c.save(); c.resetMatrix()
        c.drawImage(img, round(pt.x()), round(pt.y()), skia.SamplingOptions(), p)
        c.restore()
    else:
        c.drawImageRect(img, skia.Rect.MakeXYWH(0, y0, LW, SEC_DEPTH * SEC_SCALE + 40),
                        skia.SamplingOptions(skia.FilterMode.kLinear), p)
