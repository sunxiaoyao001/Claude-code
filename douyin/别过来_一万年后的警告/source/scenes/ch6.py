# -*- coding: utf-8 -*-
"""第六章 另一个答案：遗忘"""
import math, sys, functools
import numpy as np
import skia
sys.path.insert(0, '/tmp/claude-0/proj')
from engine.core import *
from scenes.common import *
from scenes import fx
from scenes.desert import _fbm, ridge


def A(ctx, sh, lid):
    return ctx.ls(lid) - sh.start


def pine(c, x, y, h, col, a=1.0):
    """松树剪影：底部 (x,y)，高 h。"""
    if a <= 0.003:
        return
    path = skia.Path()
    w = h * 0.36
    tiers = 5
    path.moveTo(x, y - h)
    for k in range(tiers):
        ty = y - h + (k + 1) * h * 0.82 / tiers
        tw = w * (0.35 + 0.65 * (k + 1) / tiers)
        path.lineTo(x + tw, ty)
        path.lineTo(x + tw * 0.45, ty - h * 0.03)
    for k in range(tiers - 1, -1, -1):
        ty = y - h + (k + 1) * h * 0.82 / tiers
        tw = w * (0.35 + 0.65 * (k + 1) / tiers)
        path.lineTo(x - tw * 0.45, ty - h * 0.03)
        path.lineTo(x - tw, ty)
    path.close()
    c.drawPath(path, paint(col, a))
    rect(c, x - h * 0.02, y - h * 0.18, h * 0.04, h * 0.18, col, a)


def forest(c, y, seed, n, hmin, hmax, col, a=1.0, x0=-50, x1=LW + 50, grow=1.0, pan=0.0):
    rng = np.random.default_rng(seed)
    xs = np.sort(rng.uniform(x0, x1, n))
    hs = rng.uniform(hmin, hmax, n)
    order = rng.random(n)
    for x, h, o in zip(xs, hs, order):
        g = clamp((grow - o * 0.7) / 0.3)
        if g <= 0:
            continue
        pine(c, float(x + pan), y + 2, float(h * ease_out_cubic(g)), col, a)


def snow(c, t, n=260, seed=7, alpha=0.6, speed=40):
    R = rand_field(n, seed)
    xs = (R[:, 0] * LW + np.sin(t * 0.6 + R[:, 3] * 6.28) * 30 + t * 12) % LW
    ys = (R[:, 1] * LH + t * speed * (0.5 + R[:, 2])) % LH
    for lo, hi, r in ((0, 0.6, 1.2), (0.6, 0.9, 1.9), (0.9, 1.01, 2.8)):
        m = (R[:, 2] >= lo) & (R[:, 2] < hi)
        points(c, np.stack([xs[m], ys[m]], -1), r, 'ice', alpha * (0.5 + hi * 0.5))


def nordic(c, lt, dur, ctx, sh):
    out = 1 - smooth(remap(lt, dur - 0.6, dur))
    vgrad(c, 0, 0, LW, LH, [0xFF1A2430, 0xFF4E6070, 0xFFB6C2C6])
    glow(c, 1300, 520, 600, 0xFFF4E6D0, 0.35)
    dot(c, 1300, 520, 26, 0xFFF8EEDF, 0.9)
    pan = -lt * 6
    vgrad(c, 0, 600, LW, LH - 600, [0xFF8C9AA2, 0xFFDDE5E8])
    forest(c, 640, 1, 90, 40, 90, 0xFF4A5A66, 0.8, pan=pan * 0.3)
    forest(c, 700, 2, 60, 90, 170, 0xFF2C3842, 0.95, pan=pan * 0.6)
    forest(c, 800, 3, 30, 200, 320, 0xFF141C22, 1.0, pan=pan)
    vgrad(c, 0, 790, LW, 300, [0xFFC7D2D6, 0xFFE9EEF0])
    snow(c, lt, alpha=0.7)
    ta = smooth(remap(lt, 0.4, 1.4)) * out
    draw_text(c, '芬兰 · 奥尔基洛托岛', 140, 180, 'serif-sb', 44, 'bone', ta, align='l', t=lt - 0.4, tracking=0.15)
    draw_text(c, 'OLKILUOTO  ·  EURAJOKI  ·  FINLAND', 144, 224, 'mono', 14, 'ice', ta, align='l', tracking=0.3)


@functools.lru_cache(maxsize=2)
def _bedrock_builder_factory(warm):
    def b(W, H):
        n1 = _fbm(H, W, 601 + warm, 5, (4, 7))
        n2 = _fbm(H, W, 602 + warm, 3, (120, 200))
        rng = np.random.default_rng(603 + warm)
        sp = rng.random((H, W)).astype(np.float32)
        if warm:
            base = np.array([66, 58, 52], np.float32)
            tint = np.array([16, 8, 2], np.float32)
        else:
            base = np.array([44, 50, 56], np.float32)
            tint = np.array([14, 6, 8], np.float32)
        v = (0.86 + 0.28 * n1)[..., None] * base + (n2 > 0.6)[..., None] * tint * 0.8 + (sp > 0.93)[..., None] * 12 - (sp < 0.06)[..., None] * 10
        # 岩脉
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        vein = np.abs(np.sin((xx * 0.004 + yy * 0.009 + n1 * 3.0) * 3.0))
        v += (vein < 0.03)[..., None] * 26
        v *= np_vignette(W, H, 0.45)[..., None]
        return np_finish(v)
    return b


def bedrock(c, alpha=1.0, warm=0, zoom=False):
    S = cur_s()
    W, H = int(round(LW * S)), int(round(LH * S))
    img = cached_image('bedrock%d' % warm, W, H, _bedrock_builder_factory(warm))
    if zoom:
        draw_full(c, img, alpha)
    else:
        draw_device_image(c, img, alpha)


def repository(c, lt, dur, ctx, sh):
    T = {k: A(ctx, sh, k) for k in ['L85', 'L86', 'L87']}
    out = 1 - smooth(remap(lt, dur - 0.7, dur))
    # 镜头：先全景剖面，L86 推近处置孔
    z = ease_in_out_cubic(remap(lt, T['L86'] - 0.2, T['L86'] + 2.4))
    gy = 210
    tun_y = gy + 430 * 1.15
    hx = 1180
    c.save()
    sc = lerp(1.0, 2.6, z)
    fx_, fy_ = lerp(LW / 2, hx, z), lerp(LH / 2, tun_y + 80, z)
    c.translate(LW / 2, LH / 2); c.scale(sc, sc); c.translate(-fx_, -fy_)
    bedrock(c, zoom=True)
    # 地表
    vgrad(c, -400, -400, LW + 800, gy + 400, [0xFF1A2430, 0xFF6A7C88])
    forest(c, gy, 11, 80, 26, 60, 0xFF141C22, 1.0)
    line(c, -400, gy, LW + 400, gy, 'ice', 1.2, 0.6)
    # 螺旋坡道
    rp = ease_in_out_cubic(remap(lt, 0.3, 3.0))
    ramp = skia.Path()
    ramp.moveTo(560, gy)
    yy = gy
    k = 0
    while yy < tun_y - 10:
        ramp.lineTo(760 if k % 2 == 0 else 560, yy + 34)
        yy += 34; k += 1
    stroke_path(c, ramp, 'ice', 2.0, 0.7 * out, p=rp)
    line(c, 860, gy, 860, tun_y, 'ice', 3.0, 0.7 * out, p=rp)
    # 处置巷道
    tp = ease_out_cubic(remap(lt, 2.0, 3.6))
    rect(c, 560, tun_y - 12, 1100 * tp, 24, 0xFF0B0F12, out)
    rect(c, 560, tun_y - 12, 1100 * tp, 24, 'ice', 0.5 * out, stroke=1.0)
    # 处置孔 + 铜罐 + 膨润土
    for j in range(8):
        x = 700 + j * 120
        a = smooth(remap(lt, 3.0 + j * 0.12, 3.6 + j * 0.12)) * out
        rect(c, x - 18, tun_y + 12, 36, 92, 0xFFCDBB94, a)            # 膨润土
        rect(c, x - 11, tun_y + 20, 22, 76, 'copper', a, r=3)         # 铜罐
        rect(c, x - 11, tun_y + 20, 6, 76, 0xFFFFD2A0, a * 0.35, r=3)
    c.restore()
    # 标注
    la = window(lt, 0.6, T['L86'] + 0.2, 0.8, 0.6) * out
    draw_text(c, '安卡罗处置库', 140, 160, 'serif-sb', 46, 'bone', la, align='l', t=lt - 0.6, tracking=0.15)
    draw_text(c, 'ONKALO  ·  芬兰语“洞穴”', 144, 204, 'mono', 14, 'ice', la, align='l', tracking=0.3)
    draw_text(c, '-430 m', 1700, tun_y + 8, 'mono', 18, 'ice', la, align='r')
    draw_text(c, '19 亿年历史的基岩', 1700, 760, 'serif', 24, 'ice', la, align='r', tracking=0.12)
    za = window(lt, T['L86'] + 1.6, T['L87'] - 0.2, 0.6, 0.6) * out
    draw_text(c, '铜罐', 1330, 420, 'serif-sb', 34, 'copper', za, align='l', tracking=0.2)
    draw_text(c, 'COPPER CANISTER', 1334, 456, 'mono', 13, 'ash', za, align='l', tracking=0.3)
    draw_text(c, '膨润土缓冲层', 1330, 560, 'serif-sb', 30, 0xFFE0D2B0, za, align='l', tracking=0.15)
    draw_text(c, 'BENTONITE CLAY', 1334, 594, 'mono', 13, 'ash', za, align='l', tracking=0.3)
    ya = smooth(remap(lt, T['L87'], T['L87'] + 0.8)) * out
    if ya > 0:
        c.drawRect(skia.Rect.MakeWH(LW, LH), paint(0xFF05080A, 0.55 * ya))
        draw_text(c, '100,000', LW / 2, LH / 2 + 30, 'inter-xl', 200, 'ice', ya, t=lt - T['L87'], stagger=0.06,
                  blur_in=10)
        draw_text(c, '年 · 无需任何人照看', LW / 2, LH / 2 + 110, 'serif', 32, 'bone', ya, t=lt - T['L87'] - 0.5,
                  tracking=0.2)


def glacier(c, lt, dur, ctx, sh):
    out = 1 - smooth(remap(lt, dur - 0.6, dur))
    vgrad(c, 0, 0, LW, LH, [0xFF0E141A, 0xFF22303A])
    gy = 640
    bedrock(c, 1.0)
    vgrad(c, 0, 0, LW, gy, [0xFF0E141A, 0xFF3A4C58])
    p = remap(lt, 0.3, dur - 0.5)
    adv = ease_in_out_sine(clamp(p / 0.55))
    ret = ease_in_out_sine(clamp((p - 0.6) / 0.4))
    front = lerp(-200, LW + 600, adv) - ret * (LW + 900)
    # 森林（被冰盖覆盖时隐去）
    forest(c, gy, 21, 70, 20, 46, 0xFF0B1014, 1.0)
    # 冰盖剖面：前缘陡、内部厚
    xs = np.linspace(-800, LW + 800, 160)
    d = front - xs
    hgt = np.where(d > 0, 380 * np.sqrt(np.clip(d / 1200, 0, 1)), 0)
    path = skia.Path()
    path.moveTo(-800, gy)
    for x, h in zip(xs, hgt):
        path.lineTo(float(x), float(gy - h))
    path.lineTo(LW + 800, gy)
    path.close()
    sh_ = skia.GradientShader.MakeLinear([skia.Point(0, gy - 520), skia.Point(0, gy)], [0xFFF2F8FA, 0xFFB8D4DE, 0xFF7FA6B6])
    c.drawPath(path, skia.Paint(AntiAlias=True, Shader=sh_))
    for k in range(1, 12):
        hh = hgt * (k / 12)
        pts = [(float(x), float(gy - h)) for x, h in zip(xs, hh) if h > 0]
        if len(pts) > 2:
            c.drawPath(poly_path(pts, False), paint(0xFF6F98AA, 0.25, stroke=1.0))
    # 处置库
    rect(c, 760, gy + 150, 420, 14, 'copper', 0.9 * out)
    glow(c, 970, gy + 157, 220, 'copper', 0.2 * out)
    draw_text(c, '处置库 -430 m', 970, gy + 205, 'mono', 15, 'ice', out)
    yrs = 100000 * clamp(p)
    draw_text(c, '+' + fmt_int(yrs) + ' 年', LW - 140, 180, 'inter-l', 64, 'bone', out * smooth(remap(lt, 0.2, 1.0)), align='r')
    ia = smooth(remap(adv, 0.35, 0.6)) * (1 - ret) * out
    draw_text(c, '冰盖 · 可能厚达数千米', 140, 150, 'serif-sb', 40, 'bone', ia, align='l', tracking=0.12)
    draw_text(c, 'FUTURE GLACIATION', 144, 192, 'mono', 14, 'ice', ia, align='l', tracking=0.3)


def first(c, lt, dur, ctx, sh):
    bg(c, 'cold')
    out = 1 - smooth(remap(lt, dur - 0.7, dur))
    draw_text(c, '2026', LW / 2, 460, 'inter-xl', 220, 'bone', out, t=lt - 0.2, stagger=0.1, blur_in=12)
    draw_text(c, '按计划年底前 · 开始放入第一批乏燃料', LW / 2, 560, 'serif', 30, 'ice', out, t=lt - 0.9, tracking=0.12)
    w = 560 * ease_out_expo(remap(lt, 1.6, 3.0))
    line(c, LW / 2 - w / 2, 620, LW / 2 + w / 2, 620, 'ice', 1.2, out * 0.7)
    draw_text(c, '世界首座投入使用的乏燃料永久处置库', LW / 2, 690, 'serif-sb', 40, 'bone', out, t=lt - 2.2, tracking=0.16,
              blur_in=6)
    # 下降的铜罐
    yy = lerp(-120, 300, ease_in_out_cubic(remap(lt, 0.5, dur)))
    rect(c, 1700, yy, 40, 120, 'copper', 0.8 * out, r=4)
    line(c, 1720, 0, 1720, yy, 'ice', 1.0, 0.5 * out)
    snow(c, lt, n=120, alpha=0.3)


def forget(c, lt, dur, ctx, sh):
    T = {k: A(ctx, sh, k) for k in ['L90', 'L91', 'L92']}
    out = 1 - smooth(remap(lt, dur - 0.7, dur))
    vgrad(c, 0, 0, LW, LH, [0xFF1B2530, 0xFF55687A, 0xFFAAB8BE])
    glow(c, 600, 560, 500, 0xFFEDE3D3, 0.25)
    vgrad(c, 0, 640, LW, LH - 640, [0xFF9EAEB6, 0xFFE2E8EA])
    forest(c, 650, 31, 80, 30, 70, 0xFF4E5E6A, 0.8)
    # 隧道口：门关上，然后被雪与森林覆盖
    close = ease_in_out_cubic(remap(lt, T['L91'], T['L91'] + 2.0))
    grow = remap(lt, T['L91'] + 1.5, T['L92'] + 3.0)
    pa = 1 - smooth(remap(grow, 0.3, 0.8))
    cx, cy = LW / 2, 760
    arch = skia.Path()
    arch.addRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(cx - 160, cy - 200, cx + 160, cy + 10), 160, 160))
    c.drawPath(arch, paint(0xFF6E7A82, pa * out))
    inner = skia.Path()
    inner.addRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(cx - 120, cy - 160, cx + 120, cy + 10), 120, 120))
    c.drawPath(inner, paint(0xFF0A0E11, pa * out))
    if close > 0:
        c.save()
        c.clipPath(inner, skia.ClipOp.kIntersect, True)
        rect(c, cx - 120, cy - 160, 240, 170 * close, 0xFF8A969C, pa * out)
        c.restore()
    vgrad(c, 0, cy - 30, LW, LH - cy + 30, [CI(0xFFE2E8EA, smooth(grow)), CI(0xFFEEF2F3, smooth(grow))])
    forest(c, 830, 32, 46, 120, 260, 0xFF1E2830, 1.0, grow=grow)
    forest(c, 980, 33, 22, 260, 420, 0xFF10161B, 1.0, grow=remap(lt, T['L91'] + 2.2, T['L92'] + 3.5))
    snow(c, lt, n=300, alpha=0.75)
    ta = window(lt, T['L90'] + (ctx.le('L90') - ctx.ls('L90')) * 0.7, T['L91'] + 0.5, 0.6, 0.8) * out
    draw_text(c, '什么都不留。', LW / 2, 300, 'serif-sb', 64, 0xFF0F151A, ta, t=lt - T['L90'] - (ctx.le('L90') - ctx.ls('L90')) * 0.7,
              stagger=0.08, tracking=0.2, blur_in=8)


def well(c, lt, dur, ctx, sh):
    out = 1 - smooth(remap(lt, dur - 0.7, dur))
    gy = 260
    bedrock(c)
    vgrad(c, 0, 0, LW, gy, [0xFF1A2430, 0xFF6A7C88])
    forest(c, gy, 41, 70, 30, 70, 0xFF141C22, 1.0)
    line(c, 0, gy, LW, gy, 'ice', 1.2, 0.6)
    ty = gy + 430 * 1.15
    rect(c, 300, ty - 12, 1320, 24, 0xFF0B0F12, 0.9)
    for j in range(10):
        x = 380 + j * 125
        rect(c, x - 11, ty + 20, 22, 76, 'copper', 0.9, r=3)
    # 钻机
    dx = 1100
    ra = smooth(remap(lt, 0.4, 1.2)) * out
    rig = poly_path([(dx - 60, gy), (dx, gy - 170), (dx + 60, gy)], False)
    stroke_path(c, rig, 'bone', 2.4, ra)
    line(c, dx - 36, gy - 60, dx + 36, gy - 60, 'bone', 2.0, ra)
    dp = ease_in_out_sine(remap(lt, 1.2, dur - 0.8))
    depth = 400 * dp
    yb = gy + depth * 1.15
    line(c, dx, gy, dx, yb, 'vermilion', 3.0, out)
    glow(c, dx, yb, 60, 'vermilion', 0.6 * out)
    draw_text(c, '-%d m' % depth, dx + 40, yb + 8, 'mono', 20, 'vermilion', out, align='l')
    pulse = 0.5 + 0.5 * math.sin(lt * 6)
    if dp > 0.9:
        glow(c, dx, ty, 260, 'vermilion', 0.25 * pulse * out)


def beishan(c, lt, dur, ctx, sh):
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    gy = 240
    bedrock(c, warm=1)
    vgrad(c, 0, 0, LW, gy, [0xFF20242C, 0xFFA88866])
    xs = np.linspace(-20, LW + 20, 100)
    ys = gy - 10 - np.maximum(0, ridge(xs, 94, 30, 0.003) + 20)
    c.drawPath(poly_path([(xs[0], gy + 2)] + list(zip(xs, ys)) + [(xs[-1], gy + 2)]), paint(0xFF6E5A48))
    line(c, 0, gy, LW, gy, 'sand', 1.2, 0.6)
    sc = 1.15
    for k, d in enumerate((280, 560)):
        a = smooth(remap(lt, 0.8 + k * 0.6, 1.6 + k * 0.6)) * out
        y = gy + d * sc * 0.75
        p = ease_out_cubic(remap(lt, 0.8 + k * 0.6, 2.4 + k * 0.6))
        rect(c, 560, y - 10, 900 * p, 20, 0xFF0E0B09, a)
        rect(c, 560, y - 10, 900 * p, 20, 'ember', a * 0.6, stroke=1.0)
        draw_text(c, '-%d m' % d, 1500, y + 7, 'mono', 18, 'ember', a, align='l')
    line(c, 600, gy, 600, gy + 560 * sc * 0.75, 'sand', 2.0, out * smooth(remap(lt, 0.4, 1.4)))
    ta = smooth(remap(lt, 0.3, 1.3)) * out
    draw_text(c, '中国 · 甘肃北山', 140, 150, 'serif-sb', 46, 'bone', ta, align='l', t=lt - 0.3, tracking=0.15)
    draw_text(c, 'BEISHAN UNDERGROUND RESEARCH LABORATORY  ·  GRANITE', 144, 194, 'mono', 14, 'sand', ta, align='l',
              tracking=0.25)
    qa = smooth(remap(lt, dur * 0.55, dur * 0.55 + 1.2)) * out
    draw_text(c, '?', 1700, 820, 'corm-l', 220, 'bone', qa * 0.85, blur_in=16, t=lt - dur * 0.55)


def plan(tl, L, CH, card):
    return [
        ('card6', CH('c6', -0.2), card(6, '另一个答案', 'TO BE FORGOTTEN', theme='cold', accent='glacier'), 'black'),
        ('nordic', L('L84', -0.5), nordic, 'fade'),
        ('repository', L('L85', -0.4), repository, 'fade'),
        ('glacier', L('L88', -0.4), glacier, 'fade'),
        ('first', L('L89', -0.3), first, 'fade'),
        ('forget', L('L90', -0.3), forget, 'fade'),
        ('well', L('L93', -0.4), well, 'fade'),
        ('beishan', L('L94', -0.4), beishan, 'fade'),
    ]
