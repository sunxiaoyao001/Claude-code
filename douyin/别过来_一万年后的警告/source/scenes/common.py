# -*- coding: utf-8 -*-
"""场景共用：背景、粒子、星空、章节卡、标注。"""
import math, sys
import numpy as np
import skia
sys.path.insert(0, '/tmp/claude-0/proj')
from engine.core import *

_BG = {
    # name: (渐变 stops, 暗角, 颗粒)
    'ink': ([(0, (14, 14, 17)), (0.55, (10, 10, 12)), (1, (6, 6, 7))], 0.55, 2.2),
    'warm': ([(0, (24, 18, 16)), (0.6, (14, 11, 10)), (1, (8, 7, 7))], 0.6, 2.4),
    'cold': ([(0, (14, 20, 26)), (0.6, (9, 13, 17)), (1, (5, 7, 9))], 0.6, 2.2),
    'paper': ([(0, (228, 220, 204)), (1, (214, 205, 188))], 0.35, 3.2),
    'stone': ([(0, (30, 29, 30)), (1, (17, 16, 17))], 0.55, 3.0),
}


def _build_bg(name):
    stops, vig, gr = _BG[name]

    def b(W, H):
        rgb = np_vgrad(W, H, stops)
        rgb *= np_vignette(W, H, vig)[..., None]
        rgb += np_grain(W, H, gr, seed=hash(name) & 0xFFFF)
        return np_finish(rgb)
    return b


_T = [0.0]


def set_time(t):
    _T[0] = t


def bg(c, name='ink', alpha=1.0, fog_a=None):
    S = cur_s()
    W, H = int(round(LW * S)), int(round(LH * S))
    img = cached_image('bg_' + name, W, H, _build_bg(name))
    draw_device_image(c, img, alpha)
    fa = (0.075 if name in ('ink', 'warm', 'stone') else 0.06) if fog_a is None else fog_a
    if name != 'paper':
        fog(c, _T[0], _FOG_TINT.get(name, 0xFFB08A6A), fa * 1.3 * alpha, seed=31)


def rand_field(n, seed):
    rng = np.random.default_rng(seed)
    return rng.random((n, 6))


def dust(c, t, n=140, seed=1, color='bone', alpha=0.5, box=(0, 0, LW, LH), speed=8.0, size=(0.6, 2.2), drift=(0.3, -1.0)):
    """缓慢漂浮的尘埃，纯时间函数。"""
    R = rand_field(n, seed)
    x0, y0, w, h = box
    xs = (R[:, 0] * w + t * speed * drift[0] * (0.5 + R[:, 2]) + 25 * np.sin(t * 0.3 + R[:, 3] * 6.28)) % w + x0
    ys = (R[:, 1] * h + t * speed * drift[1] * (0.5 + R[:, 2]) + 18 * np.cos(t * 0.23 + R[:, 4] * 6.28)) % h + y0
    tw = 0.5 + 0.5 * np.sin(t * (0.6 + R[:, 5]) + R[:, 3] * 9)
    r = size[0] + (size[1] - size[0]) * R[:, 2] ** 2
    # 分 3 档尺寸批量画
    for lo, hi in ((0, 0.4), (0.4, 0.75), (0.75, 1.01)):
        m = (R[:, 2] >= lo) & (R[:, 2] < hi)
        if not m.any():
            continue
        rr = float(np.mean(r[m]))
        aa = alpha * float(np.mean(tw[m])) * (0.5 + hi * 0.5)
        points(c, np.stack([xs[m], ys[m]], -1), rr, color, aa)


def stars(c, t, n=900, seed=5, alpha=1.0, box=(0, 0, LW, LH), twinkle=True, color='bone', scale=1.0):
    R = rand_field(n, seed)
    x0, y0, w, h = box
    xs = x0 + R[:, 0] * w
    ys = y0 + R[:, 1] * h
    mag = R[:, 2] ** 3
    tw = 0.65 + 0.35 * np.sin(t * (1.0 + 2 * R[:, 4]) + R[:, 5] * 30) if twinkle else 1.0
    a = (0.25 + 0.75 * mag) * tw
    for lo, hi, r in ((0, 0.5, 0.7), (0.5, 0.85, 1.05), (0.85, 0.97, 1.5), (0.97, 1.01, 2.2)):
        m = (R[:, 2] >= lo) & (R[:, 2] < hi)
        if not m.any():
            continue
        points(c, np.stack([xs[m], ys[m]], -1), r * scale, color, alpha * float(np.mean(a[m])))
    # 最亮的几颗加光晕
    m = R[:, 2] > 0.985
    for x, y in zip(xs[m], ys[m]):
        glow(c, float(x), float(y), 14 * scale, 'bone', alpha * 0.25)


def chapter_card(c, lt, dur, idx, cn, en, theme='ink', accent='ember'):
    bg(c, theme)
    # 中心暖光
    glow(c, LW / 2, LH / 2 + 30, 900, accent, 0.10 * smooth(remap(lt, 0, 1.2)))
    out = remap(lt, dur - 0.9, dur + 0.2)
    k = 1 - ease_in_out_cubic(out)
    # 装饰：缓慢旋转的文字环 + 虚线圆
    ra = smooth(remap(lt, 0.1, 1.4)) * k
    ring_text(c, LW / 2, LH / 2, 330, size=13, color='ash', alpha=0.4 * ra, rot=lt * 0.05 + idx,
              reveal=ease_out_cubic(remap(lt, 0.0, 1.6)))
    pth = skia.Path(); pth.addCircle(LW / 2, LH / 2, 300)
    stroke_path(c, pth, accent, 1.0, 0.25 * ra, p=ease_in_out_cubic(remap(lt, 0.2, 1.8)), dash=[2, 7])
    # 数字
    zoom = 1 + 0.03 * lt / max(dur, 1)
    c.save()
    c.translate(LW / 2, LH / 2)
    c.scale(zoom, zoom)
    c.translate(-LW / 2, -LH / 2)
    draw_text(c, '%02d' % idx, LW / 2, LH / 2 - 92, 'inter-xl', 96, 'ash', 0.9 * k, t=lt - 0.1, dur=0.9,
              stagger=0.12, rise=0.25, blur_in=8)
    # 横线
    lw = 220 * ease_out_expo(remap(lt, 0.35, 1.4))
    line(c, LW / 2 - lw / 2, LH / 2 - 52, LW / 2 + lw / 2, LH / 2 - 52, accent, 1.4, 0.9 * k)
    # 中文标题
    draw_text(c, cn, LW / 2, LH / 2 + 46, 'serif-sb', 78, 'bone', k, tracking=0.18, t=lt - 0.45,
              dur=0.9, stagger=0.09, rise=0.3, blur_in=10)
    # 英文
    draw_text(c, en, LW / 2, LH / 2 + 108, 'mono', 17, 'ash', 0.9 * k, tracking=0.42, t=lt - 0.9,
              dur=0.8, stagger=0.012, rise=0.2)
    c.restore()
    dust(c, lt, n=60, seed=idx * 7, alpha=0.25)


def label(c, x, y, title, sub=None, a=1.0, align='l', color='bone', sub_color='ash', size=26, sub_size=15,
          t=None, title_font='serif-sb', sub_font='mono', tracking=0.06):
    draw_text(c, title, x, y, title_font, size, color, a, align=align, tracking=tracking, t=t)
    if sub:
        draw_text(c, sub, x, y + sub_size + 14, sub_font, sub_size, sub_color, a * 0.9, align=align,
                  tracking=0.2, t=None if t is None else t - 0.15, stagger=0.01)


def leader(c, x1, y1, x2, y2, a=1.0, p=1.0, color='ash'):
    """标注引线：一端圆点。"""
    dot(c, x1, y1, 3.2, color, a * smooth(remap(p, 0, 0.2)))
    line(c, x1, y1, x2, y2, color, 1.2, a * 0.85, p=p)


def fmt_int(n):
    return '{:,}'.format(int(round(n)))


def cam_push(c, lt, dur, z0=1.0, z1=1.06, cx=LW / 2, cy=LH / 2, dx=0, dy=0):
    """镜头缓推。需与 c.restore() 配对。"""
    p = ease_in_out_sine(clamp(lt / max(dur, 0.01)))
    z = lerp(z0, z1, p)
    c.save()
    c.translate(cx + dx * p, cy + dy * p)
    c.scale(z, z)
    c.translate(-cx, -cy)


def light_beam(c, x, y, ang, length, width, color='ember', alpha=0.15):
    """斜射光束（线性渐变三角/梯形）。"""
    a = math.radians(ang)
    dx, dy = math.cos(a), math.sin(a)
    nx, ny = -dy, dx
    p0 = (x + nx * width * 0.08, y + ny * width * 0.08)
    p1 = (x - nx * width * 0.08, y - ny * width * 0.08)
    p2 = (x + dx * length - nx * width / 2, y + dy * length - ny * width / 2)
    p3 = (x + dx * length + nx * width / 2, y + dy * length + ny * width / 2)
    path = poly_path([p0, p1, p2, p3])
    sh = skia.GradientShader.MakeLinear([skia.Point(x, y), skia.Point(x + dx * length, y + dy * length)],
                                        [CI(color, alpha), CI(color, alpha * 0.4), CI(color, 0)], [0, 0.5, 1])
    c.drawPath(path, skia.Paint(AntiAlias=True, Shader=sh))


RING_TXT = 'THIS PLACE IS A MESSAGE · AND PART OF A SYSTEM OF MESSAGES · PAY ATTENTION TO IT · ' \
           'THIS PLACE IS NOT A PLACE OF HONOR · NOTHING VALUED IS HERE · '


def ring_text(c, cx, cy, r, text=RING_TXT, size=13, color='ash', alpha=0.2, rot=0.0, name='mono', reveal=1.0):
    """沿圆周排列的文字（缓慢旋转的装饰环）。"""
    if alpha <= 0.003:
        return
    items, w = layout(text, name, size, 0.25)
    circ = 2 * math.pi * r
    sc = circ / w
    p = skia.Paint(AntiAlias=True, Color4f=C(color, alpha))
    n = len(items)
    for i, (ch, fn, x) in enumerate(items):
        if i > n * reveal:
            break
        ang = (x * sc) / r + rot
        c.save()
        c.translate(cx + math.cos(ang) * r, cy + math.sin(ang) * r)
        c.rotate(math.degrees(ang) + 90)
        c.drawString(ch, 0, 0, font(fn, size), p)
        c.restore()


def sun_rays(c, x, y, alpha=0.12, n=14, length=1600, seed=3, t=0.0, color=0xFFFFD39A):
    """从光源发散的柔和光束（体积光的近似）。"""
    if alpha <= 0.003:
        return
    rng = np.random.default_rng(seed)
    for k in range(n):
        ang = rng.uniform(0, 2 * math.pi) + 0.02 * math.sin(t * 0.3 + k)
        wid = rng.uniform(0.02, 0.07)
        a = alpha * rng.uniform(0.3, 1.0) * (0.75 + 0.25 * math.sin(t * 0.5 + k * 1.7))
        p0 = (x, y)
        p1 = (x + math.cos(ang - wid) * length, y + math.sin(ang - wid) * length)
        p2 = (x + math.cos(ang + wid) * length, y + math.sin(ang + wid) * length)
        sh = skia.GradientShader.MakeRadial(skia.Point(x, y), length, [CI(color, a), CI(color, a * 0.25), CI(color, 0)],
                                            [0, 0.35, 1])
        c.drawPath(poly_path([p0, p1, p2]), skia.Paint(AntiAlias=True, Shader=sh))


def _fog_builder(seed):
    def b(W, H):
        from scenes.desert import _fbm
        n = _fbm(H, W, seed, 5, (2, 4))
        n2 = _fbm(H, W, seed + 1, 4, (5, 9))
        a = np.clip((n * 0.7 + n2 * 0.3 - 0.42) * 2.4, 0, 1) ** 1.6
        out = np.zeros((H, W, 4), np.uint8)
        av = (a * 255).astype(np.uint8)
        out[..., 0] = av; out[..., 1] = av; out[..., 2] = av; out[..., 3] = av
        return out
    return b


_FOG_TINT = {'ink': 0xFFB08A6A, 'warm': 0xFFC08A5A, 'cold': 0xFF8FB0C4, 'stone': 0xFFA09080, 'paper': 0xFFFFFFFF}


def _fog_strip_builder(seed, tint, alpha):
    def b(W2, H):
        from PIL import Image
        W = W2 // 2
        small = _fog_builder(seed)(384, 216)[..., 3]
        big = np.asarray(Image.fromarray(small).resize((W, H), Image.BILINEAR), np.float32) / 255.0
        strip = np.concatenate([big, big[:, ::-1]], 1)
        a = strip * alpha
        r, g, bl = [((tint >> sh) & 255) for sh in (16, 8, 0)]
        out = np.empty((H, W2, 4), np.uint8)
        out[..., 0] = np.clip(r * a + 0.5, 0, 255)
        out[..., 1] = np.clip(g * a + 0.5, 0, 255)
        out[..., 2] = np.clip(bl * a + 0.5, 0, 255)
        out[..., 3] = np.clip(255 * a + 0.5, 0, 255)
        return out
    return b


def fog(c, t, tint=0xFFB08A6A, alpha=0.06, seed=31, speed=(6.0, -2.0), scale=1.25):
    """缓慢流动的雾光层：预先放大到设备分辨率的镜像拼接长条，逐帧整像素平移贴图（快）。"""
    if alpha <= 0.003:
        return
    S = cur_s()
    W = int(round(LW * S * 1.1)); H = int(round(LH * S * 1.1))
    REF = 0.16
    img = cached_image(('fogstrip', seed, tint), W * 2, H, _fog_strip_builder(seed, tint, REF))
    pa = skia.Paint()
    pa.setAlphaf(min(1.0, alpha / REF))
    period = W * 2
    ox = int(round(t * speed[0] * S)) % period
    oy = int(round(math.sin(t * 0.05 + seed) * 0.04 * LH * S)) - int(0.05 * LH * S)
    c.save()
    c.resetMatrix()
    c.drawImage(img, -ox, oy, skia.SamplingOptions(), pa)
    if period - ox < LW * S:
        c.drawImage(img, period - ox, oy, skia.SamplingOptions(), pa)
    c.restore()
