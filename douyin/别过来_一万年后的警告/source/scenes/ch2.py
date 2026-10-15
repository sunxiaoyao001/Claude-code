# -*- coding: utf-8 -*-
"""第二章 文字会死"""
import math, sys, functools
import numpy as np
import skia
sys.path.insert(0, '/tmp/claude-0/proj')
from engine.core import *
from scenes.common import *
from scenes import fx
from scenes.desert import ridge, _fbm


def A(ctx, sh, lid):
    return ctx.ls(lid) - sh.start


def write(c, lt, dur, ctx, sh):
    bg(c, 'warm')
    light_beam(c, 1500, -100, 118, 1400, 900, 'ember', 0.05)
    t25 = A(ctx, sh, 'L25')
    txt = '此地危险  切勿靠近'
    dt = lt - (t25 + 0.6)
    if dt < 0:
        draw_text(c, txt, LW / 2, LH / 2 + 30, 'serif-b', 108, 'bone', 1.0, t=lt - 0.3, stagger=0.16, dur=1.1,
                  blur_in=14, rise=0.08, tracking=0.12)
    else:
        fx.dissolve_text(c, txt, LW / 2, LH / 2 + 30, 'serif-b', 108, dt, color='bone', tracking=0.12,
                         dur=3.4, spread=520, step=2.0, seed=24, r=1.15)
    la = window(lt, 1.0, t25 + 0.4, 0.8, 0.6)
    draw_text(c, '最直接的办法：写下来', LW / 2, LH / 2 - 120, 'mono', 16, 'ash', la, tracking=0.4)
    dust(c, lt, n=110, seed=241, alpha=0.35, color='sand')


OE = ['Hwæt! We Gardena in geardagum,', 'þeodcyninga, þrym gefrunon,', 'hu ða æþelingas ellen fremedon.']


def beowulf(c, lt, dur, ctx, sh):
    bg(c, 'ink')
    out = 1 - smooth(remap(lt, dur - 0.7, dur))
    cam_push(c, lt, dur, 1.0, 1.05)
    for i, s in enumerate(OE):
        ta = lt - 0.2 - i * 0.7
        # 字母轻微“剥落”：随机字母暗下去
        def pc(k, ch, i=i):
            h = hash01(i, k)
            fade = 0.25 + 0.75 * (0.5 + 0.5 * math.sin(lt * 0.8 + h * 20))
            return (fade if h < 0.35 else 1.0, 0, 0, None)
        draw_text(c, s, LW / 2, 400 + i * 78, 'corm-i', 60, 'bone', out, t=ta, stagger=0.018, dur=0.9,
                  rise=0.15, blur_in=6, per_char=pc)
    a = smooth(remap(lt, 2.0, 3.0)) * out
    line(c, LW / 2 - 50, 640, LW / 2 + 50, 640, 'ember', 1.2, a)
    draw_text(c, '《贝奥武甫》· 古英语 · 约一千年前', LW / 2, 700, 'serif', 26, 'bone', a, t=lt - 2.0, tracking=0.14)
    draw_text(c, 'BEOWULF  ·  OLD ENGLISH  ·  c. 1000 AD', LW / 2, 742, 'mono', 14, 'ash', a, tracking=0.35)
    c.restore()
    dust(c, lt, n=80, seed=242, alpha=0.3)


@functools.lru_cache(maxsize=1)
def plastron():
    """龟甲腹甲轮廓 + 盾片缝 + 灼裂纹（逻辑坐标，中心 0,0）。"""
    outline = skia.Path()
    w, h = 230, 330
    outline.moveTo(0, -h)
    outline.cubicTo(w * 0.55, -h, w * 0.9, -h * 0.82, w * 0.86, -h * 0.5)
    outline.cubicTo(w * 1.05, -h * 0.35, w * 1.08, -h * 0.05, w * 0.98, h * 0.1)
    outline.cubicTo(w * 1.0, h * 0.4, w * 0.85, h * 0.8, w * 0.42, h * 0.96)
    outline.lineTo(w * 0.18, h * 0.86)
    outline.lineTo(0, h * 0.98)
    outline.lineTo(-w * 0.18, h * 0.86)
    outline.lineTo(-w * 0.42, h * 0.96)
    outline.cubicTo(-w * 0.85, h * 0.8, -w * 1.0, h * 0.4, -w * 0.98, h * 0.1)
    outline.cubicTo(-w * 1.08, -h * 0.05, -w * 1.05, -h * 0.35, -w * 0.86, -h * 0.5)
    outline.cubicTo(-w * 0.9, -h * 0.82, -w * 0.55, -h, 0, -h)
    outline.close()
    seams = []
    seams.append([(0, -h * 0.98), (0, h * 0.97)])
    for yy, ww in ((-0.62, 0.78), (-0.25, 0.98), (0.12, 1.0), (0.45, 0.92), (0.75, 0.66)):
        seams.append([(-w * ww, h * yy + 18), (-w * ww * 0.4, h * yy - 6), (0, h * yy), (w * ww * 0.4, h * yy - 6),
                      (w * ww, h * yy + 18)])
    rng = np.random.default_rng(27)
    cracks = []
    for k in range(16):
        x = rng.uniform(-w * 0.75, w * 0.75)
        y = rng.uniform(-h * 0.75, h * 0.75)
        L = rng.uniform(26, 50)
        side = 1 if x < 0 else -1
        cracks.append([(x, y - L / 2), (x + rng.normal(0, 2), y + L / 2)])
        cracks.append([(x + rng.normal(0, 1), y - L * 0.1), (x + side * L * 0.55, y - L * 0.32)])
        # 钻凿坑
    pits = [(rng.uniform(-w * 0.7, w * 0.7), rng.uniform(-h * 0.7, h * 0.7)) for _ in range(10)]
    return outline, seams, cracks, pits


def oracle(c, lt, dur, ctx, sh):
    bg(c, 'warm')
    out = 1 - smooth(remap(lt, dur - 0.7, dur))
    # 左：龟甲
    outline, seams, cracks, pits = plastron()
    c.save()
    c.translate(520, 500)
    c.scale(0.86, 0.86)
    pa = ease_in_out_cubic(remap(lt, 0.0, 2.2))
    fill = skia.GradientShader.MakeRadial(skia.Point(0, -60), 420, [CI(0xFF8F7A5C, 0.35 * pa * out), CI(0xFF4E4033, 0.25 * pa * out)])
    c.drawPath(outline, skia.Paint(AntiAlias=True, Shader=fill))
    stroke_path(c, outline, 'sand', 1.6, out, p=pa)
    for s in seams:
        stroke_path(c, poly_path(s, False), 'sand', 1.0, 0.55 * out, p=ease_in_out_cubic(remap(lt, 0.8, 2.4)))
    for k in range(0, len(cracks), 2):
        ca = smooth(remap(lt, 1.6 + k * 0.05, 2.2 + k * 0.05)) * out
        stroke_path(c, poly_path(cracks[k], False), 0xFF1C140F, 2.2, ca)
        stroke_path(c, poly_path(cracks[k + 1], False), 0xFF1C140F, 1.6, ca, p=smooth(remap(lt, 2.0 + k * 0.05, 2.6 + k * 0.05)))
    for (x, y) in pits:
        c.drawOval(skia.Rect.MakeXYWH(x - 7, y - 11, 14, 22), paint(0xFF2A1F17, 0.6 * out * pa))
    c.restore()
    draw_text(c, '甲骨文', 520, 860, 'serif-sb', 32, 'bone', out * smooth(remap(lt, 1.0, 2.0)), tracking=0.3)
    draw_text(c, 'ORACLE BONE SCRIPT  ·  ~3,200 YEARS AGO', 520, 896, 'mono', 13, 'ash',
              out * smooth(remap(lt, 1.2, 2.2)), tracking=0.3)
    # 右：单字点阵（示意：数千个字，约三分之一已释读）
    cols, rows = 72, 50
    gx, gy, sp = 980, 300, 10.5
    n = cols * rows
    rng = np.random.default_rng(1500)
    known = rng.random(n) < 1 / 3
    idx = np.arange(n)
    xs = gx + (idx % cols) * sp
    ys = gy + (idx // cols) * sp
    sweep = (lt - 1.0) * 1.6 - (idx // cols) / rows - (idx % cols) / cols * 0.4
    vis = sweep > 0
    lit = known & ((lt - 3.0) * 1.2 - (idx % cols) / cols > 0)
    m = vis & ~lit
    if m.any():
        points(c, np.stack([xs[m], ys[m]], -1), 2.1, 'dim', 0.9 * out)
    if lit.any():
        points(c, np.stack([xs[lit], ys[lit]], -1), 2.4, 'ember', out)
    la = smooth(remap(lt, 3.4, 4.4)) * out
    draw_text(c, '已确认释读  约 1/3', gx, gy - 40, 'serif-sb', 26, 'ember', la, align='l', tracking=0.1,
              t=lt - 3.4)
    draw_text(c, '已发现的单字  数千个', gx + cols * sp, gy - 40, 'serif', 22, 'ash',
              smooth(remap(lt, 1.6, 2.6)) * out, align='r', tracking=0.1)
    dust(c, lt, n=70, seed=243, alpha=0.25, color='sand')


LINA = [0x10600 + i for i in (0, 1, 3, 5, 8, 10, 13, 17, 21, 25, 28, 31, 36, 40, 45, 52, 57, 60, 66, 70, 77, 81, 86,
                              92, 99, 104, 112, 120, 133, 140, 150, 160)]


def indus_sign(c, kind, x, y, s, col, a):
    p = paint(col, a, stroke=s * 0.08)
    if kind == 'fish':
        path = skia.Path()
        path.moveTo(x - s * 0.45, y)
        path.quadTo(x, y - s * 0.42, x + s * 0.32, y)
        path.quadTo(x, y + s * 0.42, x - s * 0.45, y)
        path.moveTo(x + s * 0.32, y); path.lineTo(x + s * 0.5, y - s * 0.18)
        path.moveTo(x + s * 0.32, y); path.lineTo(x + s * 0.5, y + s * 0.18)
        c.drawPath(path, p)
    elif kind == 'jar':
        path = skia.Path()
        path.moveTo(x - s * 0.22, y - s * 0.45)
        path.lineTo(x - s * 0.28, y + s * 0.35); path.quadTo(x, y + s * 0.5, x + s * 0.28, y + s * 0.35)
        path.lineTo(x + s * 0.22, y - s * 0.45)
        path.moveTo(x - s * 0.36, y - s * 0.3); path.lineTo(x - s * 0.24, y - s * 0.2)
        path.moveTo(x + s * 0.36, y - s * 0.3); path.lineTo(x + s * 0.24, y - s * 0.2)
        c.drawPath(path, p)
    elif kind == 'man':
        c.drawCircle(x, y - s * 0.32, s * 0.1, p)
        c.drawLine(x, y - s * 0.22, x, y + s * 0.15, p)
        c.drawLine(x - s * 0.25, y - s * 0.05, x + s * 0.25, y - s * 0.05, p)
        c.drawLine(x, y + s * 0.15, x - s * 0.18, y + s * 0.45, p)
        c.drawLine(x, y + s * 0.15, x + s * 0.18, y + s * 0.45, p)
    elif kind == 'strokes':
        for k in range(3):
            c.drawLine(x - s * 0.2 + k * s * 0.2, y - s * 0.35, x - s * 0.2 + k * s * 0.2, y + s * 0.35, p)
    elif kind == 'arrow':
        c.drawLine(x, y + s * 0.45, x, y - s * 0.4, p)
        c.drawLine(x, y - s * 0.4, x - s * 0.22, y - s * 0.12, p)
        c.drawLine(x, y - s * 0.4, x + s * 0.22, y - s * 0.12, p)
    elif kind == 'wheel':
        c.drawCircle(x, y, s * 0.36, p)
        c.drawLine(x - s * 0.36, y, x + s * 0.36, y, p)
        c.drawLine(x, y - s * 0.36, x, y + s * 0.36, p)


def scripts(c, lt, dur, ctx, sh):
    bg(c, 'ink')
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    t29 = A(ctx, sh, 'L29')
    erode = smooth(remap(lt, t29 + 0.5, dur - 0.6))
    # 左：线形文字A 泥板
    a1 = smooth(remap(lt, 0.2, 1.2)) * out
    x0, y0, w, h = 250, 270, 620, 470
    rect(c, x0, y0, w, h, 0xFF2A2420, a1, r=26)
    rect(c, x0, y0, w, h, 'sand', a1 * 0.5, stroke=1.2, r=26)
    for r_ in range(4):
        line(c, x0 + 40, y0 + 120 + r_ * 92, x0 + w - 40, y0 + 120 + r_ * 92, 'sand', 0.8, a1 * 0.25)
        for k in range(7):
            i = r_ * 7 + k
            ch = chr(LINA[i % len(LINA)])
            ta = lt - 0.6 - i * 0.06
            h_ = hash01(i, 3)
            ea = (1 - erode * (0.3 + 0.7 * h_))
            draw_text(c, ch, x0 + 75 + k * 80, y0 + 104 + r_ * 92, 'lina', 52, 'sand', a1 * ea, t=ta, dur=0.6,
                      rise=0.1)
    draw_text(c, '线形文字A', x0, y0 + h + 66, 'serif-sb', 30, 'bone', a1, align='l', tracking=0.15)
    draw_text(c, 'LINEAR A  ·  CRETE  ·  c.1800–1450 BC', x0, y0 + h + 104, 'mono', 13, 'ash', a1, align='l',
              tracking=0.3)
    draw_text(c, '未破译', x0 + w, y0 + h + 66, 'sans-m', 20, 'vermilion', a1, align='r', tracking=0.3)
    # 右：印度河印章
    a2 = smooth(remap(lt, 1.0, 2.0)) * out
    x1, y1, s1 = 1100, 270, 470
    rect(c, x1, y1, s1, s1, 0xFF2A2622, a2, r=30)
    rect(c, x1, y1, s1, s1, 'sand', a2 * 0.5, stroke=1.2, r=30)
    rect(c, x1 + 22, y1 + 22, s1 - 44, s1 - 44, 'sand', a2 * 0.25, stroke=1.0, r=20)
    kinds = ['fish', 'jar', 'man', 'strokes', 'arrow', 'wheel', 'fish', 'jar']
    for k, kd in enumerate(kinds):
        ta = smooth(remap(lt, 1.4 + k * 0.12, 1.9 + k * 0.12))
        ea = (1 - erode * (0.3 + 0.7 * hash01(k, 9)))
        xx = x1 + 70 + (k % 4) * 110
        yy = y1 + 150 + (k // 4) * 180
        indus_sign(c, kd, xx, yy, 92, 'sand', a2 * ta * ea)
    draw_text(c, '印度河文字', x1, y1 + s1 + 66, 'serif-sb', 30, 'bone', a2, align='l', tracking=0.15)
    draw_text(c, 'INDUS SCRIPT  ·  c.2600–1900 BC  ·  示意', x1, y1 + s1 + 104, 'mono', 13, 'ash', a2, align='l',
              tracking=0.3)
    draw_text(c, '未破译', x1 + s1, y1 + s1 + 66, 'sans-m', 20, 'vermilion', a2, align='r', tracking=0.3)
    dust(c, lt, n=90, seed=244, alpha=0.3)


# ---------------------------------------------------------------- 饥饿石
def stone_path(cx, cy, w, h):
    rng = np.random.default_rng(1616)
    pts = []
    n = 14
    for k in range(n):
        a = math.pi + k / (n - 1) * math.pi
        rx = w / 2 * (1 + rng.normal(0, 0.05)); ry = h * (1 + rng.normal(0, 0.06))
        pts.append((cx + rx * math.cos(a), cy + ry * math.sin(a) * 0.95))
    pts.append((cx + w / 2 + 30, cy + 40)); pts.append((cx - w / 2 - 30, cy + 40))
    path = skia.Path()
    path.moveTo(*pts[0])
    for i in range(1, len(pts)):
        path.lineTo(*pts[i])
    path.close()
    return path


def hunger(c, lt, dur, ctx, sh):
    T = {k: A(ctx, sh, k) for k in ['L31', 'L32', 'L33', 'L34', 'L35']}
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    # 天空/背景
    vgrad(c, 0, 0, LW, LH, [0xFF1A1F22, 0xFF2B2E2C, 0xFF17191A])
    glow(c, 1450, 260, 700, 0xFFE8C9A0, 0.12)
    # 水位：平时高 → 大旱时下降
    lvl1 = ease_in_out_cubic(remap(lt, T['L31'] + 2.5, T['L31'] + 6.0))
    lvl2 = ease_in_out_cubic(remap(lt, T['L34'] + 0.2, T['L34'] + 2.6))
    lvl_back = ease_in_out_cubic(remap(lt, T['L33'] + 0.6, T['L34'] - 0.1)) * 0.85
    lvl = clamp(lvl1 - lvl_back + lvl2 * 0.85)
    wy = lerp(400, 800, lvl)
    bed = 840
    cx, cy = 960, 820
    # 河床
    xs = np.linspace(-20, LW + 20, 90)
    bedy = bed + ridge(xs, 33, 14, 0.004)
    path = poly_path([(xs[0], LH + 20)] + list(zip(xs, bedy)) + [(xs[-1], LH + 20)])
    c.drawPath(path, paint(0xFF2E2620))
    # 石头
    sp = stone_path(cx, cy, 760, 330)
    sh_ = skia.GradientShader.MakeLinear([skia.Point(0, cy - 330), skia.Point(0, cy + 40)],
                                         [0xFF8A8072, 0xFF5E564C, 0xFF3A342E], [0, 0.5, 1])
    c.drawPath(sp, skia.Paint(AntiAlias=True, Shader=sh_))
    c.drawPath(sp, paint(0xFF000000, 0.35, stroke=2))
    # 刻字（凹刻效果：暗字 + 下沿亮边）
    ins = 'WENN DU MICH SIEHST,'
    ins2 = 'DANN WEINE'
    for k, s in enumerate([ins, ins2]):
        y = cy - 210 + k * 62
        draw_text(c, s, cx, y + 1.5, 'corm-sb', 38, 0xFFB8AC98, 0.5, tracking=0.1)
        draw_text(c, s, cx, y, 'corm-sb', 38, 0xFF231E1A, 0.9, tracking=0.1)
    hl = smooth(remap(lt, T['L33'], T['L33'] + 0.8))
    draw_text(c, '1616', cx - 170, cy - 60 + 1.5, 'corm-sb', 44, 0xFFB8AC98, 0.5)
    draw_text(c, '1616', cx - 170, cy - 60, 'corm-sb', 44, mixc(0xFF231E1A, PAL['ember'], hl), 0.95)
    if hl > 0:
        glow(c, cx - 170, cy - 75, 120, 'ember', 0.25 * hl * (1 - smooth(remap(lt, T['L34'], T['L34'] + 1))))
    for k, yr in enumerate(['17··', '18··', '18··', '19··']):
        draw_text(c, yr, cx + 40 + k * 70, cy - 60 + (k % 2) * 34, 'corm', 30, 0xFF2C2620, 0.55)
    # 水体（半透明，覆盖石头下部）
    water = skia.Path()
    wxs = np.linspace(-20, LW + 20, 120)
    wys = wy + 4 * np.sin(wxs * 0.012 + lt * 1.4) + 2.5 * np.sin(wxs * 0.031 - lt * 2.1)
    water.moveTo(-20, LH + 20)
    for x, y in zip(wxs, wys):
        water.lineTo(float(x), float(y))
    water.lineTo(LW + 20, LH + 20)
    water.close()
    wsh = skia.GradientShader.MakeLinear([skia.Point(0, wy), skia.Point(0, LH)],
                                         [CI(0xFF35505A, 0.72), CI(0xFF14242A, 0.92)])
    c.drawPath(water, skia.Paint(AntiAlias=True, Shader=wsh))
    c.drawPath(poly_path(list(zip(wxs, wys)), False), paint(0xFFCFE3E8, 0.55, stroke=1.6))
    for j in range(5):
        yy = wy + 30 + j * 26
        xs2 = np.linspace(0, LW, 60)
        ys2 = yy + 3 * np.sin(xs2 * 0.02 + lt * 0.9 + j)
        c.drawPath(poly_path(list(zip(xs2, ys2)), False), paint(0xFFCFE3E8, 0.06, stroke=1.0))
    # 标注
    la = window(lt, 0.3, T['L32'] - 0.2, 0.8, 0.6) * out
    draw_text(c, '易北河 · 捷克 杰钦', 140, 170, 'serif-sb', 36, 'bone', la, align='l', t=lt - 0.3, tracking=0.12)
    draw_text(c, 'ELBE RIVER  ·  DĚČÍN, CZECHIA', 140, 212, 'mono', 14, 'ash', la, align='l', tracking=0.3)
    draw_text(c, '饥 饿 石', 140, 262, 'sans', 20, 'ember', la, align='l', tracking=0.3)
    ta = window(lt, T['L32'], T['L33'] + 0.2, 0.8, 0.6) * out
    draw_text(c, '“如果你看见我，就哭吧。”', LW / 2, 230, 'serif-sb', 46, 'bone', ta, t=lt - T['L32'] - 0.3,
              tracking=0.1, blur_in=6)
    draw_text(c, 'WENN DU MICH SIEHST, DANN WEINE', LW / 2, 280, 'mono', 14, 'ash', ta, tracking=0.4)
    ya = window(lt, T['L33'], T['L34'] - 0.2, 0.6, 0.5) * out
    draw_text(c, '能辨认的最早年份', 140, 200, 'serif', 26, 'ash', ya, align='l', tracking=0.15)
    draw_text(c, '1616', 140, 300, 'inter-xl', 110, 'ember', ya, align='l', t=lt - T['L33'])
    ya2 = window(lt, T['L34'], dur, 0.6, 0.8) * out
    draw_text(c, '2018 · 2022', 140, 260, 'inter-l', 72, 'bone', ya2, align='l', t=lt - T['L34'])
    draw_text(c, '欧洲大旱 · 再次露出水面', 140, 310, 'serif', 24, 'ash', ya2, align='l', tracking=0.14)
    dust(c, lt, n=50, seed=245, alpha=0.15)


# ---------------------------------------------------------------- 海啸石（等高线地图）
@functools.lru_cache(maxsize=1)
def topo():
    from skimage import measure
    H, W = 270, 480
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    n = _fbm(H, W, 311, 5, (3, 5))
    # 山体：上方高，向下（海）降低，加一道山谷
    h = (1 - yy / H) * 260 + (n - 0.5) * 140 - 40
    h -= 50 * np.exp(-((xx - 300) / 60) ** 2) * (1 - yy / H)
    h += 25 * np.sin(xx / 47.0) * (1 - yy / H)
    levels = list(range(0, 260, 10))
    cs = []
    for lv in levels:
        for ct in measure.find_contours(h, lv):
            if len(ct) < 8:
                continue
            pts = np.stack([ct[:, 1] * (LW / (W - 1)), ct[:, 0] * (LH / (H - 1))], -1)
            cs.append((lv, pts[::2]))
    return h, cs


@functools.lru_cache(maxsize=1)
def stone_xy():
    h, cs = topo()
    H, W = h.shape
    best = None
    for yy in range(95, 165):
        for xx in range(200, 320):
            d = abs(h[yy, xx] - 160) + abs(xx - 270) * 0.05
            if best is None or d < best[0]:
                best = (d, xx, yy)
    _, xx, yy = best
    return xx * LW / (W - 1), yy * LH / (H - 1)


def tsunami(c, lt, dur, ctx, sh):
    T = {k: A(ctx, sh, k) for k in ['L36', 'L37', 'L38']}
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    h, cs = topo()
    vgrad(c, 0, 0, LW, LH, [0xFF15171A, 0xFF101215])
    # 镜头：L38 时拉远
    z = ease_in_out_cubic(remap(lt, T['L38'] - 0.2, T['L38'] + 2.5))
    sc = lerp(1.0, 0.42, z)
    c.save()
    c.translate(LW / 2, LH / 2)
    c.scale(sc, sc)
    c.translate(-LW / 2, -LH / 2)
    # 海啸淹没高度
    flood = 70 * ease_out_cubic(remap(lt, T['L37'] + 0.3, T['L37'] + 3.5))
    stone_lv = 160
    draw_p = ease_in_out_cubic(remap(lt, 0.0, 3.0))
    for lv, pts in cs:
        major = lv % 50 == 0
        col = 'sand' if lv > 0 else 0xFF6F95A8
        a = (0.55 if major else 0.25) * out
        if lv <= flood and lv > 0:
            col = 0xFF8CC8DC
            a = 0.85 * out
        stroke_path(c, poly_path(pts, False), col, 1.6 if major else 1.0, a, p=draw_p)
    # 海面
    hy = LH * 0.84
    vgrad(c, -1400, hy, LW + 2800, LH * 1.6, [CI(0xFF1D3440, 0.0), CI(0xFF1D3440, 0.85)])
    for j in range(8):
        yy = hy + 30 + j * 22
        xs = np.linspace(-1400, LW + 1400, 120)
        ys = yy + 4 * np.sin(xs * 0.01 + lt * (0.6 + 0.1 * j) + j)
        c.drawPath(poly_path(list(zip(xs, ys)), False), paint(0xFF7FB3C8, 0.12 * out, stroke=1.0))
    # 石碑位置（等高线 stone_lv 上的一个点）
    sx, sy = stone_xy()
    sa = smooth(remap(lt, T['L36'] + 0.5, T['L36'] + 1.4)) * out
    glow(c, sx, sy, 90, 'vermilion', 0.4 * sa)
    rect(c, sx - 7, sy - 22, 14, 34, 'vermilion', sa, r=2)
    # 竖排碑文
    jp = '此処より下に家を建てるな'
    for k, ch in enumerate(jp):
        draw_text(c, ch, sx + 70, sy - 140 + k * 38, 'serif-sb', 30, 'bone', sa * (1 - z),
                  t=lt - T['L36'] - 1.0 - k * 0.06, dur=0.5)
    draw_text(c, '“此处以下，勿建房屋”', sx + 120, sy - 40, 'serif', 26, 'ash', sa * (1 - z), align='l',
              t=lt - T['L36'] - 2.0, tracking=0.1)
    draw_text(c, '日本 · 岩手县 · 姉吉', sx + 120, sy + 2, 'mono', 14, 'ash', sa * (1 - z), align='l', tracking=0.25)
    # 房屋（石碑上方）
    rng = np.random.default_rng(11)
    for k in range(11):
        hx = sx - 220 + rng.uniform(0, 440); hyy = sy - 60 - rng.uniform(0, 120)
        ha = smooth(remap(lt, T['L36'] + 1.5 + k * 0.05, T['L36'] + 2.0 + k * 0.05)) * out
        rect(c, hx, hyy, 12, 9, 'bone', ha * 0.9)
    # 海啸标注
    fa = window(lt, T['L37'] + 2.2, T['L38'], 0.6, 0.5) * out
    if fa > 0:
        line(c, sx, sy + 14, sx, sy + 150, 'bone', 1.2, fa, dash=[6, 6])
        draw_text(c, '约 90 米', sx - 16, sy + 90, 'sans-m', 22, 'bone', fa, align='r')
        draw_text(c, '2011.3.11  海啸最高点', sx - 16, sy + 176, 'mono', 15, 0xFF9FD0E0, fa, align='r', tracking=0.2)
    c.restore()
    # 拉远后：海岸线上的数百块石碑
    if z > 0.01:
        rng = np.random.default_rng(400)
        n = 320
        xs = np.linspace(80, LW - 80, n) + rng.normal(0, 6, n)
        base = LH * 0.5 + 0.84 * LH * 0.42 - LH * 0.42 * 0.5
        ys = LH * 0.5 + (LH * 0.84 - LH / 2) * sc + ridge(xs, 77, 18, 0.01) - 6
        remembered = rng.random(n) < 0.08
        fade = smooth(remap(lt, T['L38'] + 2.5, T['L38'] + 4.5))
        for k in range(n):
            a = z * out * (1.0 if remembered[k] else (1 - 0.82 * fade))
            col = 'vermilion' if remembered[k] else 'bone'
            dot(c, float(xs[k]), float(ys[k]), 2.4 if remembered[k] else 1.8, col, a)
        draw_text(c, '日本沿海 · 数百块海啸石', LW / 2, 250, 'serif-sb', 34, 'bone', z * out, tracking=0.15)
        draw_text(c, '大多数已被遗忘', LW / 2, 300, 'sans', 20, 'ash', z * out * fade, tracking=0.2)


def bars(c, lt, dur, ctx, sh):
    bg(c, 'ink')
    out = 1 - smooth(remap(lt, dur - 0.7, dur))
    pan = ease_in_out_cubic(remap(lt, 2.2, dur - 0.6))
    c.save()
    c.translate(-pan * 2600, 0)
    x0 = 300
    p1 = ease_out_expo(remap(lt, 0.2, 1.4))
    rect(c, x0, 440, 104 * p1, 26, 'bone', out)
    draw_text(c, '几百年', x0, 410, 'serif-sb', 30, 'bone', out, align='l', tracking=0.15, t=lt - 0.2)
    draw_text(c, 'HUNGER STONE  ·  TSUNAMI STONE', x0, 510, 'mono', 13, 'ash', out, align='l', tracking=0.3)
    p2 = ease_in_out_cubic(remap(lt, 1.6, dur - 0.4))
    L2 = 2600 + 1000
    rect(c, x0, 600, L2 * p2, 26, 'vermilion', out)
    draw_text(c, '一万年', x0, 570, 'serif-sb', 30, 'vermilion', out, align='l', tracking=0.15, t=lt - 1.6)
    for k in range(1, 25):
        xx = x0 + k * 150
        if xx > x0 + L2 * p2:
            break
        line(c, xx, 640, xx, 652, 'ash', 1.0, out * 0.6)
        if k % 5 == 0:
            draw_text(c, '%d' % (k * 400), xx, 680, 'mono', 13, 'ash', out * 0.7)
    c.restore()
    dust(c, lt, n=60, seed=246, alpha=0.25)


def plan(tl, L, CH, card):
    return [
        ('card2', CH('c2', -0.2), card(2, '文字会死', 'WORDS DIE'), 'black'),
        ('write', L('L24', -0.5), write, 'fade'),
        ('beowulf', L('L26', -0.4), beowulf, 'fade'),
        ('oracle', L('L27', -0.4), oracle, 'fade'),
        ('scripts', L('L28', -0.4), scripts, 'fade'),
        ('hunger', L('L30', -0.4), hunger, 'fade'),
        ('tsunami', L('L36', -0.4), tsunami, 'fade'),
        ('bars', L('L39', -0.3), bars, 'fade'),
    ]
