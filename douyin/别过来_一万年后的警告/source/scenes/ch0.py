# -*- coding: utf-8 -*-
"""冷开场 + 片名"""
import math, sys
import numpy as np
import skia
sys.path.insert(0, '/tmp/claude-0/proj')
from engine.core import *
from scenes.common import *


def _a(ctx, sh, lid):
    """某句旁白相对镜头开始的时间。"""
    return ctx.ls(lid) - sh.start


def typewriter(c, text, x, y, name, size, color, t, cps=18, alpha=1.0, align='l', cursor=True, tracking=0.0):
    n = int(clamp(t * cps, 0, len(text)))
    shown = text[:n]
    items, w = layout(text, name, size, tracking)
    x0 = x - w / 2 if align == 'c' else x
    draw_text(c, shown, x0, y, name, size, color, alpha, align='l', tracking=tracking)
    if cursor and alpha > 0:
        cx = x0 + (items[n][2] if n < len(items) else w + size * 0.08)
        blink = 1.0 if (n < len(text) and t > 0) else (0.5 + 0.5 * math.cos(t * 6.0))
        rect(c, cx + 2, y - size * 0.78, max(1.5, size * 0.045), size * 0.95, 'ember', alpha * blink * 0.9)
    return n >= len(text)


def opening(c, lt, dur, ctx, sh):
    bg(c, 'ink')
    light_beam(c, 260, -80, 58, 1500, 820, 'ember', 0.06 * smooth(remap(lt, 0, 3)))
    cam_push(c, lt, dur, 1.0, 1.07)
    e1 = 'This place is not a place of honor.'
    a_out = 1 - smooth(remap(lt, dur - 1.0, dur))
    typewriter(c, e1, LW / 2, 470, 'corm-li', 70, 'bone', lt - 0.8, cps=17, alpha=a_out, align='c',
               cursor=lt < _a(ctx, sh, 'L02') + 0.3, tracking=0.01)
    t2 = lt - _a(ctx, sh, 'L02')
    draw_text(c, 'No highly esteemed deed is commemorated here.', LW / 2, 566, 'corm-l', 36, 'ash',
              a_out, t=t2, stagger=0.012, dur=0.9, rise=0.2)
    draw_text(c, 'Nothing valued is here.', LW / 2, 616, 'corm-l', 36, 'ash', a_out,
              t=t2 - 2.2, stagger=0.02, dur=0.9, rise=0.2)
    c.restore()
    dust(c, lt, n=170, seed=3, alpha=0.45)


def letter(c, lt, dur, ctx, sh):
    """1993 → 一万年后：一条时间线。"""
    bg(c, 'ink')
    stars(c, lt, n=500, seed=11, alpha=0.35 * smooth(remap(lt, 0, 2)))
    t4 = _a(ctx, sh, 'L04')
    # 时间线横向推进：相机沿线平移
    pan = ease_in_out_cubic(remap(lt, t4 + 0.6, dur - 0.2))
    x_start = 420
    x_end = 420 + 2600
    off = -pan * (x_end - x_start - 1080)
    y = 560
    c.save()
    c.translate(off, 0)
    # 主线
    pin = ease_out_expo(remap(lt, 0.2, 1.6))
    line(c, x_start - 600, y, x_start, y, 'dim', 1.2, 0.8 * pin)
    pl = ease_in_out_cubic(remap(lt, t4 - 0.4, dur - 0.6))
    line(c, x_start, y, x_end + 600, y, 'ash', 1.4, 0.9, p=clamp(pl * 1.05))
    # 刻度
    for k in range(0, 41):
        xx = x_start + k * (x_end - x_start) / 40
        if xx > x_start + (x_end + 600 - x_start) * pl:
            break
        hh = 14 if k % 10 == 0 else 6
        line(c, xx, y - hh, xx, y + hh, 'ash', 1.0, 0.55)
    # 起点
    a1 = smooth(remap(lt, 0.4, 1.4))
    dot(c, x_start, y, 7, 'ember', a1)
    glow(c, x_start, y, 70, 'ember', 0.35 * a1)
    draw_text(c, '1993', x_start, y - 48, 'inter-l', 58, 'bone', a1, t=lt - 0.4)
    draw_text(c, '写信的人', x_start, y + 62, 'serif', 26, 'ash', a1, t=lt - 0.7, tracking=0.2)
    # 行进中的光点（信）
    if pl > 0:
        xx = x_start + (x_end - x_start) * clamp(pl)
        glow(c, xx, y, 46, 'bone', 0.5)
        dot(c, xx, y, 4, 'bone', 1)
        year = 1993 + 10000 * ease_in_cubic(clamp(pl))
        draw_text(c, fmt_int(year).replace(',', ''), xx, y - 40, 'mono', 22, 'bone', 0.9 * smooth(remap(pl, 0, 0.05)))
    # 终点
    a2 = smooth(remap(pl, 0.92, 1.0))
    dot(c, x_end, y, 7, 'bone', a2)
    glow(c, x_end, y, 90, 'bone', 0.25 * a2)
    draw_text(c, '11993+', x_end, y - 48, 'inter-l', 58, 'bone', a2, t=(pl - 0.92) * 12)
    draw_text(c, '收信的人 · 尚未出生', x_end, y + 62, 'serif', 26, 'ash', a2, t=(pl - 0.92) * 12, tracking=0.2)
    c.restore()
    # 跨度标注
    span_a = window(lt, t4 + 1.0, dur, 0.8, 0.6)
    draw_text(c, '10,000 YEARS', LW / 2, 300, 'mono', 18, 'ash', span_a, tracking=0.6)
    dust(c, lt, n=80, seed=12, alpha=0.3)


ROLES = [('科学家', 'SCIENTISTS'), ('语言学家', 'LINGUISTS'), ('人类学家', 'ANTHROPOLOGISTS'), ('艺术家', 'ARTISTS')]


def team(c, lt, dur, ctx, sh):
    bg(c, 'ink')
    t7 = _a(ctx, sh, 'L07')
    gather = ease_in_out_cubic(remap(lt, t7 - 1.2, t7 + 0.4))
    # 四个身份
    for i, (cn, en) in enumerate(ROLES):
        x = LW / 2 + (i - 1.5) * 380
        ta = lt - 0.5 - i * 0.55
        a = (1 - gather)
        y = 520 - gather * 60
        draw_text(c, cn, x, y, 'serif-sb', 46, 'bone', a, t=ta, tracking=0.12, blur_in=6)
        draw_text(c, en, x, y + 44, 'mono', 14, 'ash', a, t=ta - 0.2, tracking=0.35, stagger=0.01)
        line(c, x - 40, y - 74, x + 40, y - 74, 'ember', 1.2, a * smooth(remap(ta, 0.2, 0.9)))
    # 报告封面
    pa = smooth(remap(lt, t7 - 0.6, t7 + 0.6))
    if pa > 0.01:
        cw, chh = 600, 780
        sc = lerp(0.92, 1.0, ease_out_cubic(pa))
        c.save()
        c.translate(LW / 2, LH / 2 + 10)
        c.scale(sc, sc)
        c.rotate(-1.2 * (1 - pa))
        c.translate(-cw / 2, -chh / 2)
        # 阴影 + 纸
        rect(c, 10, 18, cw, chh, 0xFF000000, 0.45 * pa)
        c.drawRect(skia.Rect.MakeWH(cw, chh), skia.Paint(AntiAlias=True, Color4f=C(0xFFE8E1D2, pa)))
        rect(c, 0, 0, cw, chh, 0xFFB9AE98, pa, stroke=1.0)
        tt = lt - t7 + 0.4
        lines = ['EXPERT JUDGMENT ON MARKERS', 'TO DETER INADVERTENT HUMAN', 'INTRUSION INTO THE WASTE',
                 'ISOLATION PILOT PLANT']
        for k, s in enumerate(lines):
            typewriter(c, s, 60, 170 + k * 46, 'mono-m', 25, 0xFF1C1A17, tt - k * 1.1, cps=26, alpha=pa,
                       cursor=False)
        typewriter(c, 'SAND92-1382', 60, 420, 'mono', 18, 0xFF5B544A, tt - 4.8, cps=22, alpha=pa, cursor=False)
        typewriter(c, 'NOVEMBER 1993', 60, 450, 'mono', 18, 0xFF5B544A, tt - 5.4, cps=22, alpha=pa, cursor=False)
        # 强调“阻止无意闯入”
        hl = ease_out_expo(remap(tt, 5.8, 7.0))
        line(c, 60, 222, 60 + 420 * hl, 222, 'vermilion', 3.0, pa)
        line(c, 60, 268, 60 + 380 * hl, 268, 'vermilion', 3.0, pa)
        line(c, 60, 700, 540, 700, 0xFF9C927F, 1.0, pa)
        draw_text(c, 'WIPP · CARLSBAD, NEW MEXICO', 60, 734, 'mono', 14, 0xFF7A715F, pa, align='l', tracking=0.2)
        c.restore()
    dust(c, lt, n=90, seed=21, alpha=0.3)


def title(c, lt, dur, ctx, sh):
    """“这句警告，其实只有三个字。” → 别过来"""
    bg(c, 'ink')
    T0 = ctx.tl['title'][0] - sh.start   # 标题砸下时刻
    # 前半段：一道竖光
    pre = window(lt, 0, T0 + 0.2, 0.8, 0.3)
    if pre > 0:
        bw = 3 + 40 * smooth(remap(lt, T0 - 1.2, T0))
        hgrad(c, LW / 2 - bw * 6, 0, bw * 12, LH, [CI('ember', 0), CI('ember', 0.10 * pre), CI('ember', 0)])
        line(c, LW / 2, 0, LW / 2, LH, 'bone', 1.2, 0.35 * pre)
    tt = lt - T0
    if tt > -0.1:
        # 冲击波
        for k in range(2):
            rr = 80 + 1400 * ease_out_expo(remap(tt - k * 0.12, 0, 2.2))
            aa = (1 - remap(tt - k * 0.12, 0, 2.0)) * 0.5
            c.drawCircle(LW / 2, LH / 2 - 20, rr, paint('vermilion' if k == 0 else 'bone', aa, stroke=2.2 - k))
        glow(c, LW / 2, LH / 2 - 30, 900, 'vermilion', 0.22 * smooth(remap(tt, 0, 0.4)) * (1 - 0.5 * smooth(remap(tt, 1, 5))))
        ring_text(c, LW / 2, LH / 2 - 20, 470, size=14, color='ash', alpha=0.32 * smooth(remap(tt, 0.6, 2.0)),
                  rot=tt * 0.04, reveal=ease_out_cubic(remap(tt, 0.4, 2.4)))
        # 震动
        shake = 10 * math.exp(-tt * 7) * math.sin(tt * 70) if tt > 0 else 0
        c.save()
        c.translate(shake, shake * 0.4)
        chars = '别过来'
        size = 230
        items, w = layout(chars, 'serif-k', size, 0.22)
        x0 = LW / 2 - w / 2
        for i, (ch, fn, cx) in enumerate(items):
            ti = tt - i * 0.16
            if ti < 0:
                continue
            e = ease_out_expo(remap(ti, 0, 0.45))
            s = lerp(1.6, 1.0, e)
            a = smooth(remap(ti, 0, 0.18))
            blur = (1 - e) * 18
            cx0 = x0 + cx + size * 0.5
            cy0 = LH / 2 + 40
            c.save()
            c.translate(cx0, cy0 - size * 0.35)
            c.scale(s, s)
            c.translate(-cx0, -(cy0 - size * 0.35))
            p = skia.Paint(AntiAlias=True, Color4f=C('bone', a))
            if blur > 0.3:
                p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, blur))
            c.drawString(ch, x0 + cx, cy0, font(fn, size), p)
            c.restore()
        c.restore()
        # 副标题
        a3 = smooth(remap(tt, 1.2, 2.2))
        draw_text(c, '如何给一万年后的人类，写一封信', LW / 2, LH / 2 + 160, 'serif', 36, 'bone', a3,
                  t=tt - 1.2, tracking=0.16, stagger=0.04)
        draw_text(c, 'A MESSAGE TO TEN THOUSAND YEARS FROM NOW', LW / 2, LH / 2 + 214, 'mono', 15, 'ash', a3,
                  t=tt - 1.6, tracking=0.5, stagger=0.01)
        line(c, LW / 2 - 60, LH / 2 + 248, LW / 2 + 60, LH / 2 + 248, 'vermilion', 1.5, a3 * 0.9)
    dust(c, lt, n=120, seed=31, alpha=0.35)
