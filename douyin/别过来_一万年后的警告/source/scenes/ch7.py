# -*- coding: utf-8 -*-
"""尾声 + 片尾"""
import math, sys, functools
import numpy as np
import skia
sys.path.insert(0, '/tmp/claude-0/proj')
from engine.core import *
from scenes.common import *
from scenes import desert as D
from scenes.desert import _fbm
from scenes import icons as I


def A(ctx, sh, lid):
    return ctx.ls(lid) - sh.start


def _milkyway_builder(W, H):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u = xx / W; v = yy / H
    # 斜向银河带
    d = (v - (0.95 - 0.75 * u)) / 0.16
    band = np.exp(-d * d)
    n1 = _fbm(H, W, 701, 6, (4, 7))
    n2 = _fbm(H, W, 702, 5, (14, 24))
    dust_l = np.clip((n2 - 0.45) * 3, 0, 1)
    glowv = band * (0.55 + 0.6 * n1) * (1 - 0.65 * dust_l * band)
    sky_top = np.array([5, 6, 12], np.float32)
    sky_bot = np.array([22, 20, 32], np.float32)
    rgb = sky_top[None, None, :] * (1 - v[..., None]) + sky_bot[None, None, :] * v[..., None]
    rgb += glowv[..., None] * np.array([70, 62, 74], np.float32)
    rgb += (glowv ** 3)[..., None] * np.array([60, 48, 36], np.float32)
    rng = np.random.default_rng(703)
    st = rng.random((H, W)).astype(np.float32)
    dens = 0.9965 - 0.004 * band
    stars = (st > dens) * (st - dens) / (1 - dens)
    rgb += (stars ** 0.6)[..., None] * 230
    rgb += np.random.default_rng(704).normal(0, 1.6, (H, W, 1)).astype(np.float32)
    return np_finish(rgb)


def milkyway(c, alpha=1.0):
    S = cur_s()
    W, H = int(round(LW * S)), int(round(LH * S))
    img = cached_image('milkyway', W, H, _milkyway_builder)
    draw_device_image(c, img, alpha)


def culture(c, lt, dur, ctx, sh):
    """回到黄昏的沙漠：We considered ourselves to be a powerful culture."""
    T = {k: A(ctx, sh, k) for k in ['L95', 'L96']}
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    night = smooth(remap(lt, 0, dur)) * 0.7
    D.dusk_sky(c, 660, sun=(1180, 640 + lt * 4), night=night)
    stars(c, lt, n=600, seed=801, alpha=night * 0.8, box=(0, 0, LW, 640))
    D.dune_layers(c, lt, horizon=640, pan=lt * 0.01, palette='dusk', n=5)
    c.drawRect(skia.Rect.MakeWH(LW, LH), paint(0xFF05040A, 0.35 * night))
    d95 = ctx.le('L95') - ctx.ls('L95')
    ta = smooth(remap(lt, T['L95'] + d95 * 0.35, T['L95'] + d95 * 0.35 + 1.0)) * out
    draw_text(c, 'We considered ourselves to be a powerful culture.', LW / 2, 330, 'corm-i', 56, 'bone', ta,
              t=lt - T['L95'] - d95 * 0.35, stagger=0.015, blur_in=6)
    ha = smooth(remap(lt, T['L96'], T['L96'] + 1.0)) * out
    draw_text(c, '最诚实的一句', LW / 2, 410, 'serif', 30, 'ember', ha, t=lt - T['L96'], tracking=0.4)


def legacy(c, lt, dur, ctx, sh):
    """夜幕：人类留给未来的东西 —— 金字塔、长城、诗，还有我们不敢触碰的东西。"""
    T = {k: A(ctx, sh, k) for k in ['L97', 'L98']}
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    milkyway(c, 0.55)
    gy = 760
    vgrad(c, 0, gy, LW, LH - gy, [0xFF0E0D12, 0xFF050507])
    line(c, 0, gy, LW, gy, 'ash', 1.0, 0.4)
    d98 = ctx.le('L98') - ctx.ls('L98')
    items = [('金字塔', 0.18), ('长城', 0.3), ('诗歌', 0.42), ('', 0.6)]
    # 金字塔
    a1 = smooth(remap(lt, T['L98'] + d98 * 0.18, T['L98'] + d98 * 0.18 + 0.8)) * out
    pyr = poly_path([(260, gy), (440, gy - 190), (620, gy)], False)
    stroke_path(c, pyr, 'sand', 1.8, a1, p=ease_out_cubic(remap(lt, T['L98'] + d98 * 0.18, T['L98'] + d98 * 0.18 + 1.2)))
    draw_text(c, '金字塔', 440, gy + 60, 'serif', 24, 'ash', a1, tracking=0.2)
    # 长城：山脊上的城墙折线 + 垛口
    a2 = smooth(remap(lt, T['L98'] + d98 * 0.3, T['L98'] + d98 * 0.3 + 0.8)) * out
    xs = np.linspace(700, 1120, 40)
    ys = gy - 60 - 50 * np.sin((xs - 700) / 420 * math.pi) + 10 * np.sin(xs * 0.05)
    wall = poly_path(list(zip(xs, ys)), False)
    stroke_path(c, wall, 'sand', 2.4, a2, p=ease_out_cubic(remap(lt, T['L98'] + d98 * 0.3, T['L98'] + d98 * 0.3 + 1.4)))
    for k in range(0, 40, 6):
        rect(c, xs[k] - 8, ys[k] - 26, 16, 26, 'sand', a2 * 0.8, stroke=1.4)
    draw_text(c, '长城', 910, gy + 60, 'serif', 24, 'ash', a2, tracking=0.2)
    # 诗：陈子昂《登幽州台歌》竖排
    a3 = smooth(remap(lt, T['L98'] + d98 * 0.42, T['L98'] + d98 * 0.42 + 0.8)) * out
    poem = ['前不见古人', '后不见来者', '念天地之悠悠', '独怆然而涕下']
    for i, col in enumerate(poem):
        for j, ch in enumerate(col):
            draw_text(c, ch, 1360 - i * 44, gy - 290 + j * 40, 'serif', 30, 'bone', a3 * 0.85,
                      t=lt - T['L98'] - d98 * 0.42 - i * 0.25 - j * 0.04, dur=0.5)
    draw_text(c, '诗歌', 1300, gy + 60, 'serif', 24, 'ash', a3, tracking=0.2)
    # 不敢触碰的东西：发光的桶
    a4 = smooth(remap(lt, T['L98'] + d98 * 0.62, T['L98'] + d98 * 0.62 + 0.8)) * out
    glow(c, 1640, gy - 50, 220, 'vermilion', 0.35 * a4)
    for k in range(3):
        bx = 1580 + k * 44
        rect(c, bx, gy - 90, 36, 90, 0xFF2A1A16, a4, r=4)
        rect(c, bx, gy - 90, 36, 90, 'vermilion', a4 * 0.9, stroke=1.6, r=4)
        line(c, bx, gy - 60, bx + 36, gy - 60, 'vermilion', 1.0, a4 * 0.6)
        line(c, bx, gy - 30, bx + 36, gy - 30, 'vermilion', 1.0, a4 * 0.6)
    I.trefoil(c, 1646, gy - 140, 9, 'vermilion', a4)
    # 标题句
    ha = window(lt, T['L97'] + 0.3, T['L98'] + d98 * 0.15, 0.8, 0.8) * out
    draw_text(c, '第一代，需要为一万年以后负责的人类', LW / 2, 300, 'serif-sb', 46, 'bone', ha, t=lt - T['L97'] - 0.3,
              tracking=0.16, blur_in=8)


def letter_final(c, lt, dur, ctx, sh):
    """银河下的一块石碑。写给陌生人的牵挂。"""
    T = {k: A(ctx, sh, k) for k in ['L99', 'L100', 'L101']}
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    zoom = lerp(1.0, 1.06, ease_in_out_sine(lt / max(dur, 1)))
    c.save()
    c.translate(LW / 2, LH / 2); c.scale(zoom, zoom); c.translate(-LW / 2, -LH / 2)
    milkyway(c)
    gy = 820
    xs = np.linspace(-40, LW + 40, 120)
    ys = gy + D.ridge(xs, 901, 14, 0.004)
    c.drawPath(poly_path([(xs[0], LH + 40)] + list(zip(xs, ys)) + [(xs[-1], LH + 40)]), paint(0xFF07070A))
    # 石碑剪影 + 微光
    mx = LW / 2 + 220
    rect(c, mx - 26, gy - 230, 52, 240, 0xFF0B0B0F, 1.0)
    rect(c, mx - 26, gy - 230, 4, 240, 'ember', 0.25)
    glow(c, mx, gy - 120, 300, 'ember', 0.08 + 0.04 * math.sin(lt * 1.2))
    c.restore()
    ka = smooth(remap(lt, T['L99'] + 1.0, T['L99'] + 2.2)) * out * (1 - smooth(remap(lt, T['L101'] - 0.5, T['L101'] + 0.5)))
    draw_text(c, '牵 挂', LW / 2, 360, 'serif-sb', 88, 'bone', ka, t=lt - T['L99'] - 1.0, stagger=0.2, blur_in=12,
              glow='ember', glow_alpha=0.25)
    sa = smooth(remap(lt, T['L100'] + 0.4, T['L100'] + 1.4)) * out * (1 - smooth(remap(lt, T['L101'] - 0.5, T['L101'] + 0.5)))
    draw_text(c, 'TO WHOEVER FINDS THIS', LW / 2, 430, 'mono', 16, 'ash', sa, tracking=0.6)
    dust(c, lt, n=60, seed=902, alpha=0.25)


def ending(c, lt, dur, ctx, sh):
    """而最好的结局是 —— 永远没有人，需要读到这封信。"""
    T = {k: A(ctx, sh, k) for k in ['L102', 'L103']}
    milkyway(c, 0.35 * (1 - smooth(remap(lt, T['L103'], T['L103'] + 3))))
    a1 = window(lt, T['L102'], T['L103'] - 0.1, 0.6, 0.4)
    draw_text(c, '而最好的结局是——', LW / 2, LH / 2, 'serif', 40, 'ash', a1, t=lt - T['L102'], tracking=0.2)
    a2 = smooth(remap(lt, T['L103'], T['L103'] + 0.8))
    tend = ctx.ch['end'][0] - sh.start
    a2 *= 1 - smooth(remap(lt, tend - 0.2, tend + 0.8))
    draw_text(c, '永远没有人，需要读到这封信。', LW / 2, LH / 2 + 20, 'serif-sb', 62, 'bone', a2, t=lt - T['L103'],
              stagger=0.07, tracking=0.16, blur_in=10)
    # 片尾：互动提问 + 片名 + 参考资料
    te = lt - tend
    if te > 0:
        fa = smooth(remap(te, 0.3, 1.2))
        ring_text(c, LW / 2, 420, 440, size=13, color='ash', alpha=0.3 * fa, rot=te * 0.05,
                  reveal=ease_out_cubic(remap(te, 0.2, 2.0)))
        draw_text(c, '如果让你给一万年后的人', LW / 2, 360, 'serif-sb', 50, 'bone', fa, t=te - 0.3, stagger=0.05,
                  tracking=0.14, blur_in=8)
        draw_text(c, '留一句话，你会写什么？', LW / 2, 440, 'serif-sb', 50, 0xFFF2B45A, fa, t=te - 0.9, stagger=0.05,
                  tracking=0.14, blur_in=8)
        ca = smooth(remap(te, 2.2, 3.0))
        bob = 6 * math.sin(te * 3)
        draw_text(c, '评论区见', LW / 2, 530 + bob * 0.3, 'sans-m', 26, 'ember', ca, tracking=0.5)
        line(c, LW / 2, 552 + bob, LW / 2, 576 + bob, 'ember', 1.6, ca)
        line(c, LW / 2 - 7, 569 + bob, LW / 2, 576 + bob, 'ember', 1.6, ca)
        line(c, LW / 2 + 7, 569 + bob, LW / 2, 576 + bob, 'ember', 1.6, ca)
        ra = smooth(remap(te, 4.0, 5.0))
        draw_text(c, '别过来 · 如何给一万年后的人类，写一封信', LW / 2, 700, 'serif', 22, 'ash', ra, tracking=0.16)
        refs = ['Sandia National Laboratories · SAND92-1382 (1993)  ·  U.S. DOE · WIPP Permanent Markers',
                'IAEA / ISO 21482 (2007)  ·  Posiva Oy · Onkalo  ·  Bastide & Fabbri (1984)  ·  Sebeok (1984)']
        for k, s_ in enumerate(refs):
            draw_text(c, s_, LW / 2, 760 + k * 30, 'mono', 14, 'dim', ra, tracking=0.12)
        draw_text(c, '画面与配乐由代码逐帧生成 · AI 配音', LW / 2, 850, 'sans', 15, 'dim', ra, tracking=0.25)
        fo = smooth(remap(lt, dur - 1.2, dur))
        if fo > 0:
            c.drawRect(skia.Rect.MakeWH(LW, LH), paint(0xFF000000, fo))
    dust(c, lt, n=60, seed=903, alpha=0.2)


def epi_card(c, lt, dur, ctx, sh):
    bg(c, 'ink')
    out = 1 - smooth(remap(lt, dur - 0.8, dur + 0.3))
    draw_text(c, '尾声', LW / 2, LH / 2 + 20, 'serif-sb', 72, 'bone', out, t=lt - 0.2, stagger=0.15, blur_in=10,
              tracking=0.4)
    draw_text(c, 'EPILOGUE', LW / 2, LH / 2 + 80, 'mono', 16, 'ash', out, t=lt - 0.6, tracking=0.6)
    dust(c, lt, n=60, seed=800, alpha=0.25)


def plan(tl, L, CH, card):
    return [
        ('card7', CH('c7', -0.2), epi_card, 'black'),
        ('culture', L('L95', -0.6), culture, 'fade'),
        ('legacy', L('L97', -0.4), legacy, 'fade'),
        ('letter_final', L('L99', -0.4), letter_final, 'fade'),
        ('ending', L('L102', -0.5), ending, 'fade'),
    ]
