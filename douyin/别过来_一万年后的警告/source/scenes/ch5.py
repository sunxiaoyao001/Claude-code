# -*- coding: utf-8 -*-
"""第五章 那封信"""
import math, sys, functools
import numpy as np
import skia
sys.path.insert(0, '/tmp/claude-0/proj')
from engine.core import *
from scenes.common import *
from scenes import fx
from scenes.desert import _fbm


def A(ctx, sh, lid):
    return ctx.ls(lid) - sh.start


@functools.lru_cache(maxsize=8)
def pil_text(text, fontfile, size, rgb=(237, 230, 216)):
    """用 Pillow(raqm) 排版复杂文字（阿拉伯文等），返回 skia.Image 与逻辑宽高（size 为设备像素）。"""
    from PIL import Image, ImageDraw, ImageFont
    f = ImageFont.truetype(FD + fontfile, size, layout_engine=ImageFont.Layout.RAQM)
    l, t, r, b = f.getbbox(text)
    W, H = r - l + 8, b - t + 8
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.text((4 - l, 4 - t), text, font=f, fill=rgb + (255,))
    arr = np.array(im)
    # 预乘 alpha
    a = arr[..., 3:4].astype(np.float32) / 255
    arr[..., :3] = (arr[..., :3] * a).astype(np.uint8)
    img = skia.Image.fromarray(np.ascontiguousarray(arr), colorType=skia.kRGBA_8888_ColorType,
                               alphaType=skia.kPremul_AlphaType)
    return img, W, H


def draw_pil(c, text, fontfile, size_logical, x, y, alpha=1.0, align='c', rgb=(237, 230, 216)):
    S = max(1.0, cur_s())
    img, W, H = pil_text(text, fontfile, int(size_logical * S * 1.0), rgb)
    w, h = W / S, H / S
    x0 = x - w / 2 if align == 'c' else (x - w if align == 'r' else x)
    p = skia.Paint(AntiAlias=True)
    p.setAlphaf(clamp(alpha))
    c.drawImageRect(img, skia.Rect.MakeXYWH(x0, y - h * 0.78, w, h), skia.SamplingOptions(skia.FilterMode.kLinear), p)


# ---------------------------------------------------------------- 花岗岩背景
def _granite_builder(W, H):
    n1 = _fbm(H, W, 501, 6, (6, 10))
    n2 = _fbm(H, W, 502, 4, (40, 70))
    rng = np.random.default_rng(503)
    speck = rng.random((H, W)).astype(np.float32)
    v = 15 + 10 * n1 + 6 * n2 + (speck > 0.985) * 18 + (speck < 0.01) * -6
    rgb = np.stack([v * 1.0, v * 0.97, v * 0.95], -1)
    rgb *= np_vignette(W, H, 0.6)[..., None]
    return np_finish(rgb)


def granite(c, alpha=1.0):
    S = cur_s()
    W, H = int(round(LW * S)), int(round(LH * S))
    img = cached_image('granite', W, H, _granite_builder)
    draw_device_image(c, img, alpha)
    from scenes.common import fog, _T
    fog(c, _T[0], 0xFFB08A6A, 0.09 * alpha, seed=31)


def written(c, lt, dur, ctx, sh):
    """最后，他们还是写下了那封信。—— 一块花岗岩碑面，光线扫过。"""
    granite(c)
    out = 1 - smooth(remap(lt, dur - 0.6, dur))
    sweep = remap(lt, 0.2, dur)
    x = lerp(-300, LW + 300, ease_in_out_sine(sweep))
    hgrad(c, x - 500, 0, 1000, LH, [CI('ember', 0), CI('ember', 0.10), CI('ember', 0)])
    rect(c, LW / 2 - 330, 170, 660, 660, 'ash', 0.35 * out, stroke=1.0)
    rect(c, LW / 2 - 314, 186, 628, 628, 'ash', 0.2 * out, stroke=1.0)
    for k in range(9):
        w = 520 - (k % 3) * 70
        line(c, LW / 2 - w / 2, 290 + k * 52, LW / 2 + w / 2, 290 + k * 52, 'ash', 3.0,
             0.22 * out * smooth(remap(lt, 0.4 + k * 0.18, 0.9 + k * 0.18)), p=ease_out_cubic(remap(lt, 0.4 + k * 0.18, 1.2 + k * 0.18)))
    dust(c, lt, n=80, seed=650, alpha=0.3)


LEVELS = [
    ('I', '这里有人造的东西', 'RUDIMENTARY', 0.0),
    ('II', '这里很危险', 'CAUTIONARY', 0.24),
    ('III', '危险是什么 · 在哪里 · 何时 · 由谁', 'BASIC INFORMATION', 0.48),
    ('IV', '留给未来考古学家的完整档案', 'COMPLEX INFORMATION', 0.78),
]


def levels(c, lt, dur, ctx, sh):
    granite(c)
    out = 1 - smooth(remap(lt, dur - 0.7, dur))
    t66 = A(ctx, sh, 'L66'); d = ctx.le('L66') - ctx.ls('L66')
    y0 = 270
    for i, (num, cn, en, frac) in enumerate(LEVELS):
        ta = lt - (t66 + d * frac)
        a = smooth(remap(ta, 0, 0.6)) * out
        w = 760 + i * 180
        y = y0 + i * 150
        x0 = LW / 2 - w / 2
        cur = window(ta, 0, (LEVELS[i + 1][3] - frac) * d if i < 3 else 99, 0.3, 0.4)
        rect(c, x0, y, w * ease_out_expo(remap(ta, 0, 0.9)), 110, mixc(0xFF26231F, 0xFF3A2C22, cur), a * 0.9)
        rect(c, x0, y, w, 110, 'ember' if cur > 0.5 else 'ash', a * (0.35 + 0.5 * cur), stroke=1.2)
        draw_text(c, num, x0 + 50, y + 72, 'corm-sb', 46, 'ember', a, align='l')
        draw_text(c, cn, x0 + 150, y + 66, 'serif-sb', 34, 'bone', a, align='l', t=ta - 0.1, tracking=0.12)
        draw_text(c, en, x0 + w - 40, y + 66, 'mono', 14, 'ash', a, align='r', tracking=0.35)
    draw_text(c, '四个信息层级', LW / 2, 200, 'serif', 26, 'ash', out * smooth(remap(lt, 0.2, 1.0)), tracking=0.4)


def herald(c, lt, dur, ctx, sh):
    """而其中最著名的，是这样一段话。"""
    granite(c, 0.6 + 0.4 * (1 - smooth(remap(lt, 0, dur))))
    out = 1 - smooth(remap(lt, dur - 0.6, dur))
    w = 400 * ease_in_out_cubic(remap(lt, 0.4, 2.0))
    line(c, LW / 2 - w, LH / 2, LW / 2 + w, LH / 2, 'ember', 1.2, out)
    glow(c, LW / 2, LH / 2, 300, 'ember', 0.1 * out)


MSG = [
    ('L72', ['This place is a message... and part of a system of messages...', 'pay attention to it!'],
     ['这个地方，是一条信息，也是一个信息系统的一部分。', '请注意它。'], []),
    ('L73', ['Sending this message was important to us.', 'We considered ourselves to be a powerful culture.'],
     ['发出这条信息，对我们很重要。', '我们曾认为，自己是一个强大的文明。'], []),
    ('L74', ['This place is not a place of honor...', 'no highly esteemed deed is commemorated here...',
             'nothing valued is here.'],
     ['这里不是一个荣耀之地。这里没有纪念任何伟大的事迹。', '这里没有任何有价值的东西。'], [0]),
    ('L75', ['What is here was dangerous and repulsive to us.'],
     ['这里的东西，对我们来说，是危险的，令人厌恶的。'], [0]),
    ('L76', ['The danger is in a particular location...', 'it increases towards a center...',
             'the center of danger is here... and below us.'],
     ['危险在一个特定的位置，越靠近中心，越强烈。', '危险的中心，就在这里，就在我们的下方。'], []),
    ('L77', ['The danger is still present, in your time, as it was in ours.'],
     ['危险在你的时代依然存在，就像在我们的时代一样。'], []),
    ('L78', ['The danger is to the body, and it can kill.'],
     ['这种危险，针对的是身体。它会致命。'], [0]),
    ('L79', ['The danger is unleashed only if you substantially', 'disturb this place physically.'],
     ['只有当你大规模地挖掘、破坏这个地方，危险才会被释放出来。'], []),
    ('L80', ['This place is best shunned and left uninhabited.'],
     ['这个地方，最好被避开，无人居住。'], [0]),
]


def message(c, lt, dur, ctx, sh):
    granite(c)
    out = 1 - smooth(remap(lt, dur - 1.0, dur))
    # 掠射光
    lx = LW * 0.5 + math.sin(lt * 0.12) * 600
    glow(c, lx, -200, 1300, 'ember', 0.07)
    # 背景：缓慢旋转的“信息系统”文字环（双层，反向）
    ra = smooth(remap(lt, 0.3, 2.5)) * out
    ring_text(c, LW / 2, 470, 560, size=15, color='ash', alpha=0.13 * ra, rot=lt * 0.025)
    ring_text(c, LW / 2, 470, 610, text='这里不是一个荣耀之地 · 这里没有任何有价值的东西 · 危险依然存在 · ',
              size=16, color='ash', alpha=0.10 * ra, rot=-lt * 0.018, name='serif')
    for i, (lid, en, cn, hl) in enumerate(MSG):
        s, e = ctx.lines[lid]
        ts = s - sh.start
        nxt = ctx.lines[MSG[i + 1][0]][0] - sh.start if i + 1 < len(MSG) else dur + 5
        ta = lt - ts + 0.05
        if ta < 0 or lt > nxt + 0.8:
            continue
        a_in = smooth(remap(ta, 0, 0.7))
        a_out = 1 - smooth(remap(lt, nxt - 0.65, nxt - 0.02))
        a = a_in * a_out * out
        rise = (1 - a_out) * -30
        n_en = len(en)
        y0 = 460 - (n_en - 1) * 36 + rise
        for k, s_ in enumerate(en):
            col = 'vermilion' if k in hl else 'bone'
            draw_text(c, s_, LW / 2, y0 + k * 72, 'corm-i', 54, col, a, t=ta - k * 0.35, stagger=0.012, dur=0.8,
                      rise=0.12, blur_in=5)
        yc = y0 + n_en * 72 + 56
        for k, s_ in enumerate(cn):
            draw_text(c, s_, LW / 2, yc + k * 58, 'serif', 36, 'paper', a * 0.92, t=ta - 0.6 - k * 0.3, stagger=0.02,
                      tracking=0.1)
        if lid == 'L76':
            # 指向下方中心的同心圆
            for r_ in range(6):
                ph = (lt * 0.5 + r_ / 6) % 1.0
                rr = 600 * (1 - ph)
                c.drawOval(skia.Rect.MakeLTRB(LW / 2 - rr * 1.6, 900 - rr * 0.35, LW / 2 + rr * 1.6, 900 + rr * 0.35),
                           paint('vermilion', a * 0.35 * ph, stroke=1.4))
            glow(c, LW / 2, 900, 160, 'vermilion', 0.3 * a)
        if lid == 'L78':
            glow(c, LW / 2, 470, 700, 'vermilion', 0.08 * a)
        if lid == 'L75':
            from scenes import icons as _I
            _I.skull(c, LW / 2, 760, 70, 'vermilion', 0.22 * a, bones=False, bg_col=0xFF161514)
        if lid == 'L79':
            for k_ in range(3):
                yy_ = 760 + ((lt * 60 + k_ * 40) % 120)
                line(c, LW / 2 - 60 + k_ * 60, yy_ - 40, LW / 2 - 60 + k_ * 60, yy_, 'vermilion', 2.0, 0.5 * a)
        if lid == 'L80':
            w_ = 900 * ease_in_out_cubic(remap(ta, 0.3, 2.0))
            line(c, LW / 2 - w_ / 2, 800, LW / 2 + w_ / 2, 800, 'ash', 1.2, 0.6 * a)
    dust(c, lt, n=90, seed=651, alpha=0.3)


LANGS = [('English', 'corm', None), ('Español', 'corm', None), ('Русский', 'corm', None), ('Français', 'corm', None),
         ('中文', 'serif-sb', None), ('العربية', None, 'NotoSansArabic_400Regular.ttf'), ('Diné Bizaad', 'corm', None)]


def langs(c, lt, dur, ctx, sh):
    granite(c)
    out = 1 - smooth(remap(lt, dur - 0.7, dur))
    draw_text(c, '7 种语言', LW / 2, 230, 'serif-sb', 40, 'bone', out * smooth(remap(lt, 0.2, 1.0)), tracking=0.3)
    n = len(LANGS)
    for i, (name, fn, pil) in enumerate(LANGS):
        x = LW / 2 + (i - (n - 1) / 2) * 240
        y = 520
        ta = lt - 0.5 - i * 0.18
        a = smooth(remap(ta, 0, 0.6)) * out
        is_cn = name == '中文'
        hl = smooth(remap(lt, 0.5 + 0.18 * 7 + 0.8, 0.5 + 0.18 * 7 + 1.6))
        col = mixc(PAL['bone'], PAL['ember'], hl) if is_cn else 'bone'
        aa = a * (1 - 0.55 * hl) if not is_cn else a
        if pil:
            draw_pil(c, name, pil, 40, x, y, aa)
        else:
            draw_text(c, name, x, y, fn, 44 if not is_cn else 52, col, aa, t=ta)
        line(c, x, y + 40, x, y + 40 + 60 * ease_out_cubic(remap(ta, 0.2, 0.9)), 'ash', 1.0, aa * 0.6)
        if is_cn and hl > 0:
            glow(c, x, y - 14, 160, 'ember', 0.25 * hl * out)
    la = smooth(remap(lt, 2.4, 3.2)) * out
    draw_text(c, '联合国六种官方语言 + 当地的纳瓦霍语', LW / 2, 720, 'sans', 22, 'ash', la, tracking=0.15)


def markers(c, lt, dur, ctx, sh):
    """标记系统剖面：花岗岩碑、土堤、地下房间、随机埋下的圆盘；风沙抹平后，仪器扫描让大地“开口”。"""
    T = {k: A(ctx, sh, k) for k in ['L82', 'L83']}
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    d83 = ctx.le('L83') - ctx.ls('L83')
    vgrad(c, 0, 0, LW, LH, [0xFF1C1A20, 0xFF3A2C28, 0xFF7A5038])
    gy = 560
    # 地下
    vgrad(c, 0, gy, LW, LH - gy, [0xFF4A3528, 0xFF2A1E18, 0xFF140F0D])
    erase = smooth(remap(lt, T['L83'] + d83 * 0.3, T['L83'] + d83 * 0.55))
    scan = remap(lt, T['L83'] + d83 * 0.6, T['L83'] + d83 * 0.98)
    # 土堤
    ba = smooth(remap(lt, T['L82'] + 0.4, T['L82'] + 1.4)) * (1 - erase)
    berm = poly_path([(260, gy), (380, gy - 70), (1540, gy - 70), (1660, gy)])
    c.drawPath(berm, paint(0xFF6A4A36, ba * out))
    # 花岗岩碑
    for k in range(9):
        x = 470 + k * 122
        h = 150 + (k % 3) * 18
        a = smooth(remap(lt, T['L82'] + 0.2 + k * 0.08, T['L82'] + 0.8 + k * 0.08)) * (1 - erase) * out
        rect(c, x - 13, gy - 70 - h, 26, h, 0xFFB7AEA2, a)
        rect(c, x - 13, gy - 70 - h, 8, h, 0xFFFFFFFF, a * 0.25)
    # 地下房间
    ra = smooth(remap(lt, T['L82'] + 1.2, T['L82'] + 2.0)) * out
    for (x, y) in ((620, 700), (1240, 760)):
        rect(c, x - 70, y - 30, 140, 60, 0xFF2A221E, ra)
        rect(c, x - 70, y - 30, 140, 60, 'sand', ra * 0.7, stroke=1.2)
        for j in range(3):
            line(c, x - 50, y - 12 + j * 12, x + 50, y - 12 + j * 12, 'sand', 1.0, ra * 0.4)
    # 小圆盘（随机埋设）+ 磁铁/反射物
    rng = np.random.default_rng(83)
    discs = np.stack([rng.uniform(300, 1620, 60), rng.uniform(gy + 25, 980, 60)], -1)
    mags = np.stack([rng.uniform(400, 1500, 14), np.full(14, gy - 30) + rng.uniform(-20, 20, 14)], -1)
    da = smooth(remap(lt, T['L82'] + 1.8, T['L82'] + 2.8)) * out
    # 扫描线
    sx = lerp(-100, LW + 100, scan)
    for (x, y) in discs:
        lit = 1.0 if (scan > 0 and x < sx) else 0.0
        a = da * (0.55 + 0.45 * lit)
        col = mixc(PAL['sand'], PAL['ember'], lit)
        c.drawCircle(float(x), float(y), 5, paint(col, a))
        if lit and sx - x < 160:
            glow(c, float(x), float(y), 40, 'ember', 0.5 * (1 - (sx - x) / 160) * out)
    ma = smooth(remap(lt, T['L83'] + 0.2, T['L83'] + 1.2)) * out
    for (x, y) in mags:
        lit = 1.0 if (scan > 0 and x < sx) else 0.0
        rect(c, float(x) - 6, float(y) - 6, 12, 12, mixc(0xFF8FB0C0, PAL['vermilion'], lit), ma)
    # 风沙抹平：地表一条平直沙线
    if erase > 0:
        vgrad(c, 0, gy - 90, LW, 90, [CI(0xFF7A5038, 0), CI(0xFF7A5038, erase)])
        line(c, 0, gy, LW, gy, 'sand', 1.2, erase * out)
    if 0 < scan < 1:
        fx.scan_beam(c, sx, 120, 1000, 'ember', 0.6 * out)
    line(c, 0, gy, LW, gy, 'sand', 1.0, 0.5 * out)
    # 标注
    la = window(lt, T['L82'] + 0.4, T['L83'] + d83 * 0.3, 0.6, 0.6) * out
    draw_text(c, '花岗岩碑', 470, 270, 'serif', 24, 'bone', la, align='l', tracking=0.12)
    draw_text(c, '土堤', 1600, 470, 'serif', 24, 'bone', la, align='l', tracking=0.12)
    draw_text(c, '地下信息室', 620, 790, 'serif', 22, 'bone', la * ra, tracking=0.12)
    draw_text(c, '随机埋下的刻字圆盘', 1240, 860, 'serif', 22, 'bone', la * da, tracking=0.12)
    ma2 = window(lt, T['L83'] + 0.2, T['L83'] + d83 * 0.55, 0.6, 0.6) * out
    draw_text(c, '磁铁 · 金属反射物', 960, 420, 'serif', 24, 0xFFB9D2DE, ma2, tracking=0.12)
    sa = smooth(remap(lt, T['L83'] + d83 * 0.62, T['L83'] + d83 * 0.75)) * out
    draw_text(c, '大地依然会发出警告', LW / 2, 230, 'serif-sb', 46, 'bone', sa, t=lt - T['L83'] - d83 * 0.62,
              tracking=0.2, blur_in=8)


def plan(tl, L, CH, card):
    return [
        ('card5', CH('c5', -0.2), card(5, '那封信', 'THE MESSAGE'), 'black'),
        ('written', L('L65', -0.4), written, 'fade'),
        ('levels', L('L66', -0.3), levels, 'fade'),
        ('herald', L('L71', -0.3), herald, 'fade'),
        ('message', L('L72', -0.6), message, 'fade'),
        ('langs', L('L81', -0.4), langs, 'fade'),
        ('markers', L('L82', -0.4), markers, 'fade'),
    ]
