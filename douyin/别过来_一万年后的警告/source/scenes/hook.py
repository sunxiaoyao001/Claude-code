# -*- coding: utf-8 -*-
"""V2 前置高光钩子：数字冲击 + 地下发光的核废料 + 高光快剪 → 片名。"""
import math, sys
import numpy as np
import skia
sys.path.insert(0, '/tmp/claude-0/proj')
from engine.core import *
from scenes.common import *
from scenes import desert as D


def A(ctx, sh, lid):
    return ctx.ls(lid) - sh.start


GLYPHS = ['𐘀', '𐘁', '𐘃', '𐘅', '𐘈', '甲', '骨', '文', 'Hwæt', 'ð', 'þ', '日', '月', '山', '水', '𐘊', '𐘍', '𐘑',
          'A', 'Ω', 'א', '人', '火', '𐘕', '𐘙', '𐘜']


def glyph_ribbon(c, t, y, alpha, speed=60, size=46, seed=3, color='ash'):
    rng = np.random.default_rng(seed)
    n = 40
    xs = np.arange(n) * 120.0
    off = (t * speed) % 120.0
    for i in range(n):
        g = GLYPHS[int(rng.integers(0, len(GLYPHS)))]
        x = xs[i] - off - 60
        if x < -100 or x > LW + 100:
            continue
        fn = 'lina' if ord(g[0]) > 0x10000 else ('corm-i' if g[0].isascii() or g[0] in 'ðþΩא' else 'serif')
        a = alpha * (0.35 + 0.65 * (0.5 + 0.5 * math.sin(i * 1.7 + t)))
        draw_text(c, g, x, y + 10 * math.sin(i * 0.9), fn, size, color, a)


def hook1(c, lt, dur, ctx, sh):
    """人类有文字的历史，只有五千多年。"""
    bg(c, 'warm')
    out = 1 - smooth(remap(lt, dur - 0.25, dur))
    glow(c, LW / 2, LH / 2, 900, 'ember', 0.14 * smooth(remap(lt, 0, 0.6)))
    glyph_ribbon(c, lt, 300, 0.5 * out, speed=90, seed=5)
    glyph_ribbon(c, lt + 3, 820, 0.35 * out, speed=-70, seed=9, size=38)
    p = ease_out_expo(remap(lt, 0.2, 1.6))
    v = 5000 * p
    zoom = 1.0 + 0.05 * ease_out_cubic(remap(lt, 0, dur))
    c.save(); c.translate(LW / 2, LH / 2); c.scale(zoom, zoom); c.translate(-LW / 2, -LH / 2)
    draw_text(c, fmt_int(v), LW / 2 - 40, LH / 2 + 110, 'inter-xl', 300, 'bone', out, t=lt, stagger=0.0, dur=0.3,
              blur_in=14)
    w = text_width(fmt_int(5000), 'inter-xl', 300)
    draw_text(c, '+', LW / 2 - 40 + w / 2 + 30, LH / 2 + 20, 'inter-l', 90, 'ember', out * smooth(remap(lt, 1.4, 1.8)))
    draw_text(c, '年', LW / 2 - 40 + w / 2 + 70, LH / 2 + 104, 'serif-sb', 72, 'bone', out * smooth(remap(lt, 1.2, 1.7)),
              align='l')
    draw_text(c, '人类有文字的全部历史', LW / 2, LH / 2 + 200, 'serif', 38, 'paper', out, t=lt - 0.5, tracking=0.2)
    c.restore()


def hook2(c, lt, dur, ctx, sh):
    """可我们埋在地下的一些东西，要危险十万年。"""
    out = 1 - smooth(remap(lt, dur - 0.2, dur))
    c.drawRect(skia.Rect.MakeWH(LW, LH), paint(0xFF090808))
    # 剖面：从地表快速下沉到盐层处置室
    dive = ease_in_out_cubic(remap(lt, 0.0, 1.4))
    scale = 0.9
    y0 = lerp(560, 170, dive)
    c.save()
    zc = lerp(1.0, 1.25, ease_in_out_sine(remap(lt, 0.6, dur)))
    c.translate(LW / 2, LH / 2); c.scale(zc, zc); c.translate(-LW / 2, -LH / 2)
    D.cross_section(c, lt, y0=y0, scale=scale, alpha=1.0, reveal=1.0, rooms=remap(lt, 0.4, 1.4), label_a=0.0)
    yd = y0 + 655 * scale
    pulse = 0.5 + 0.5 * math.sin(lt * 7)
    glow(c, LW / 2, yd, 700, 'vermilion', (0.18 + 0.12 * pulse) * smooth(remap(lt, 0.8, 1.6)))
    glow(c, LW / 2, yd, 260, 'ember', 0.3 * smooth(remap(lt, 0.8, 1.6)))
    c.restore()
    c.drawRect(skia.Rect.MakeWH(LW, LH), paint(0xFF000000, 0.25))
    p = ease_out_expo(remap(lt, 1.0, 2.8))
    v = 100000 * p
    a = smooth(remap(lt, 0.9, 1.3)) * out
    shake = 3 * math.sin(lt * 50) * (1 - smooth(remap(lt, 1.0, 1.8)))
    draw_text(c, fmt_int(v), LW / 2 + shake, 360, 'inter-xl', 230, 'vermilion', a, glow='vermilion', glow_alpha=0.35)
    draw_text(c, '年', LW / 2 + text_width(fmt_int(100000), 'inter-xl', 230) / 2 + 50, 356, 'serif-sb', 64, 'bone',
              a, align='l')
    draw_text(c, '仍然危险', LW / 2, 450, 'serif-sb', 40, 'bone', a * smooth(remap(lt, 2.2, 2.8)), tracking=0.5)


# 快剪素材：(镜头名, 取哪一刻(相对该镜头开始的时间或锚点), 缓慢推进速度)
MONTAGE = [
    ('thorns', ('L59', 3.2)),
    ('iso', ('L44', -0.3)),
    ('raycat', ('L57', 0.3)),
    ('blocks', (None, 2.6)),
    ('hunger', ('L33', 0.8)),
    ('blackhole', (None, 3.0)),
    ('message', ('L78', 1.6)),
    ('letter_final', (None, 0.6)),
]


def hook3(c, lt, dur, ctx, sh):
    """高光快剪：每 ~0.6 秒一切，末尾压黑等片名。"""
    shots = {s.name: s for s in ctx.shots}
    n = len(MONTAGE)
    seg = (dur - 0.25) / n
    k = int(clamp(lt / seg, 0, n - 1))
    name, (lid, off) = MONTAGE[k]
    tgt = shots.get(name)
    local = lt - k * seg
    if tgt is not None:
        base = (ctx.ls(lid) - tgt.start + off) if lid else off
        tl_ = base + local * 0.8
        z = 1.0 + 0.06 * ease_out_cubic(local / seg)
        c.save()
        c.translate(LW / 2, LH / 2); c.scale(z, z); c.translate(-LW / 2, -LH / 2)
        tgt.fn(c, tl_, tgt.end - tgt.start, ctx, tgt)
        c.restore()
    # 每次切换时的白闪
    fl = 1 - smooth(remap(local, 0.0, 0.12))
    if fl > 0 and k > 0:
        c.drawRect(skia.Rect.MakeWH(LW, LH), paint(0xFFFFF4E6, 0.35 * fl))
    # 胶片边缘暗角 + 末尾压黑
    c.drawRect(skia.Rect.MakeWH(LW, LH), paint(0xFF000000, smooth(remap(lt, dur - 0.3, dur))))


def plan_hook(tl, L, CH):
    return [
        ('hook1', 0.0, hook1, 'cut'),
        ('hook2', L('H2', -0.15), hook2, 'cut'),
        ('hook3', L('H3', -0.1), hook3, 'cut'),
    ]
