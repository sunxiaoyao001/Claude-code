# -*- coding: utf-8 -*-
"""第一章 一万年有多远"""
import math, sys
import numpy as np
import skia
sys.path.insert(0, '/tmp/claude-0/proj')
from engine.core import *
from scenes.common import *
from scenes import desert as D
from scenes import fx


def A(ctx, sh, lid):
    return ctx.ls(lid) - sh.start


def wipp(c, lt, dur, ctx, sh):
    """沙漠黄昏 → 镜头下摇进入地层剖面 → 六百多米深的盐层处置室。"""
    t10 = A(ctx, sh, 'L10'); t11 = A(ctx, sh, 'L11')
    tilt = ease_in_out_cubic(remap(lt, t10 + 0.4, t10 + 5.4))
    scale = 0.9
    horizon = 640
    cam_y = -tilt * 760  # 世界整体上移
    c.drawRect(skia.Rect.MakeWH(LW, LH), paint(0xFF0B0A0A))
    c.save()
    c.translate(0, cam_y)
    D.dusk_sky(c, horizon, sun=(1240, 585 - lt * 2.0))
    # 远景沙丘：在剖面出现时变成剖面顶部的地表
    D.dune_layers(c, lt, horizon=horizon - 30, pan=lt * 0.01, alpha=1.0, n=3)
    xs_a = smooth(remap(tilt, 0.05, 0.45))
    D.cross_section(c, lt, y0=horizon + 34, scale=scale, alpha=1.0, reveal=xs_a,
                    rooms=remap(lt, t10 + 4.0, t10 + 7.0), label_a=smooth(remap(tilt, 0.5, 0.9)) * (1 - smooth(remap(lt, t11 - 0.6, t11 + 0.2))))
    # 处置室的光
    ra = smooth(remap(lt, t10 + 4.5, t10 + 7.5))
    if ra > 0:
        glow(c, LW / 2, horizon + 34 + 655 * scale, 620, 'ember', 0.16 * ra)
    # 近景沙丘在下摇时淡出
    D.dune_layers(c, lt, horizon=horizon + 40, pan=lt * 0.02, alpha=1 - xs_a, n=5)
    c.restore()
    # 深度计
    ga = smooth(remap(tilt, 0.55, 0.9)) * (1 - smooth(remap(lt, dur - 0.8, dur)))
    if ga > 0:
        depth = 655 * ease_out_cubic(remap(lt, t10 + 3.6, t10 + 6.6))
        draw_text(c, '%d' % depth, 1650, 300, 'inter-xl', 96, 'bone', ga, align='r')
        draw_text(c, 'METERS BELOW', 1650, 340, 'mono', 14, 'ash', ga, align='r', tracking=0.4)
    # 标题
    la = window(lt, 0.4, t10 + 2.5, 1.0, 0.8)
    draw_text(c, '美国 · 新墨西哥州', 160, 200, 'serif-sb', 40, 'bone', la, align='l', t=lt - 0.4, tracking=0.15)
    draw_text(c, 'CARLSBAD, NEW MEXICO  ·  32.37°N  103.79°W', 160, 246, 'mono', 15, 'paper', la * 0.8,
              align='l', t=lt - 0.8, tracking=0.25, stagger=0.008)
    wa = smooth(remap(lt, t11 - 0.2, t11 + 0.8)) * (1 - smooth(remap(lt, dur - 0.8, dur)))
    draw_text(c, '废物隔离试验工厂', 160, 170, 'serif-sb', 46, 'bone', wa, align='l', t=lt - t11 + 0.2, tracking=0.12,
              blur_in=6)
    draw_text(c, 'WIPP  ·  WASTE ISOLATION PILOT PLANT', 160, 218, 'mono', 15, 'ember', wa, align='l',
              t=lt - t11 - 0.3, tracking=0.3, stagger=0.008)
    draw_text(c, '1999 年开始接收核废料', 160, 260, 'sans', 18, 'ash', wa, align='l', t=lt - t11 - 0.8, tracking=0.1)


def halflife(c, lt, dur, ctx, sh):
    bg(c, 'warm')
    t12 = A(ctx, sh, 'L12')
    t13 = t12 + (ctx.le('L12') - ctx.ls('L12')) * 0.66
    out = 1 - smooth(remap(lt, dur - 0.7, dur))
    # 左：元素卡
    ea = smooth(remap(lt, 0.2, 1.0)) * out
    bx, by = 190, 330
    rect(c, bx, by, 300, 300, 'ember', ea * 0.9, stroke=1.4)
    draw_text(c, '94', bx + 22, by + 44, 'mono', 22, 'ash', ea, align='l')
    draw_text(c, 'Pu', bx + 150, by + 190, 'inter-l', 132, 'bone', ea, t=lt - 0.3)
    draw_text(c, '钚-239', bx + 150, by + 262, 'serif', 26, 'ember', ea, t=lt - 0.6, tracking=0.12)
    draw_text(c, 'PLUTONIUM', bx + 150, by + 360, 'mono', 14, 'ash', ea, tracking=0.5)
    hl = smooth(remap(lt, t12 + 2.2, t12 + 3.2)) * out
    draw_text(c, '半衰期', bx, by + 450, 'serif', 24, 'ash', hl, align='l', tracking=0.2)
    draw_text(c, '24,100', bx, by + 530, 'inter-l', 76, 'bone', hl, align='l', t=lt - t12 - 2.2)
    draw_text(c, '年', bx + text_width('24,100', 'inter-l', 76) + 14, by + 528, 'serif', 30, 'bone', hl, align='l')
    # 右：原子核点阵，随时间衰变
    cols, rows = 30, 18
    gx, gy, sp = 700, 300, 34
    rng = np.random.default_rng(239)
    order = rng.permutation(cols * rows)
    years = 24100 * ease_in_out_cubic(remap(lt, t13 - 0.2, t13 + 3.4))
    # 衰变比例
    frac_dead = 1 - 0.5 ** (years / 24100)
    n_dead = int(frac_dead * cols * rows)
    dead = np.zeros(cols * rows, bool)
    dead[order[:n_dead]] = True
    ga = smooth(remap(lt, 0.6, 1.8)) * out
    idx = np.arange(cols * rows)
    xs = gx + (idx % cols) * sp
    ys = gy + (idx // cols) * sp
    live = ~dead
    # 出现动画：按距离扩散
    appear = np.clip((lt - 0.6 - (idx % cols) * 0.02 - (idx // cols) * 0.02) / 0.6, 0, 1)
    m = live & (appear > 0.99)
    if m.any():
        points(c, np.stack([xs[m], ys[m]], -1), 5.0, 'ember', ga)
        for x, y in zip(xs[m][::7], ys[m][::7]):
            pass
    m2 = live & (appear <= 0.99) & (appear > 0)
    if m2.any():
        points(c, np.stack([xs[m2], ys[m2]], -1), 4.0, 'ember', ga * 0.5)
    m3 = dead & (appear > 0.99)
    if m3.any():
        points(c, np.stack([xs[m3], ys[m3]], -1), 1.6, 'dim', ga * 0.8)
    # 刚刚衰变的闪光
    if n_dead > 0:
        recent = order[max(0, n_dead - 6):n_dead]
        for j in recent:
            glow(c, float(xs[j]), float(ys[j]), 26, 'bone', 0.35 * ga)
    # 计数
    ca = smooth(remap(lt, t13 - 0.4, t13 + 0.2)) * out
    draw_text(c, fmt_int(years) + ' 年', gx + cols * sp - sp, gy - 60, 'mono', 26, 'bone', ca, align='r')
    remain = 100 * (1 - frac_dead)
    draw_text(c, '剩余 %d%%' % round(remain), gx - 8, gy - 60, 'sans', 22, 'ember', ca, align='l', tracking=0.1)
    dust(c, lt, n=60, seed=41, alpha=0.25, color='ember')


def rule(c, lt, dur, ctx, sh):
    bg(c, 'ink')
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    # 背景：一个被方框围住的点（场址），方框缓慢扩大
    g = ease_out_expo(remap(lt, 0.2, 2.5))
    s = 120 + 900 * g
    for k in range(4):
        ss = s * (0.25 + k * 0.25)
        rect(c, LW / 2 - ss / 2, LH / 2 - ss / 2 + 20, ss, ss, 'dim', 0.35 * out * (1 - k * 0.18), stroke=1.0)
    draw_text(c, '10,000', LW / 2, LH / 2 + 70, 'inter-xl', 230, 'bone', out, t=lt - 0.3, stagger=0.07, dur=0.9,
              blur_in=12, tracking=-0.01)
    draw_text(c, 'YEARS', LW / 2, LH / 2 + 130, 'mono', 20, 'ember', out, t=lt - 0.9, tracking=0.9)
    draw_text(c, '美国环保署 · 40 CFR 191', LW / 2, LH / 2 - 190, 'mono', 16, 'ash', out, t=lt - 1.2, tracking=0.25,
              stagger=0.01)
    draw_text(c, '至少一万年，阻止任何无意的闯入', LW / 2, LH / 2 + 210, 'serif', 30, 'bone', out * 0.9,
              t=lt - 1.6, tracking=0.18)
    dust(c, lt, n=80, seed=51, alpha=0.3)


# ---------------------------------------------------------------- 深时间轴
PAST = [  # (年数, 中文, 英文/注, 出现的旁白)
    (10000, '农业起源', '冰期结束 · ~10,000 BP', 'L16'),
    (5200, '最早的文字', '楔形文字 · ~5,200 BP', 'L17'),
    (4560, '吉萨大金字塔', '~4,500 BP', 'L18'),
    (3200, '甲骨文', '~3,200 BP', 'L19'),
]


def deeptime(c, lt, dur, ctx, sh):
    bg(c, 'ink')
    stars(c, lt, n=420, seed=61, alpha=0.25)
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    T = {k: A(ctx, sh, k) for k in ['L15', 'L16', 'L17', 'L18', 'L19', 'L20', 'L21', 'L22']}
    cx, cy = LW / 2, 560
    # 比例尺：1 万年 = 720px → 10 万年 = 720px
    z = ease_in_out_cubic(remap(lt, T['L21'] - 0.3, T['L21'] + 2.4))
    span = lerp(10000, 100000, z)
    px_per_year = 720 / span
    X = lambda yrs: cx + yrs * px_per_year   # 负为过去，正为未来
    axa = smooth(remap(lt, 0.0, 1.0)) * out
    line(c, 60, cy, LW - 60, cy, 'dim', 1.2, axa)
    # 刻度：每千年 / 每万年
    for k in range(-100, 101):
        yrs = k * 1000
        x = X(yrs)
        if x < 60 or x > LW - 60:
            continue
        major = (k % 10 == 0)
        a = axa * (0.8 if major else 0.35 * (1 - z))
        if a < 0.01:
            continue
        hh = 12 if major else 5
        line(c, x, cy - hh, x, cy + hh, 'ash', 1.0, a)
    # 现在
    dot(c, cx, cy, 7, 'bone', axa)
    glow(c, cx, cy, 60, 'bone', 0.3 * axa)
    draw_text(c, '今天', cx, cy + 48, 'serif-sb', 24, 'bone', axa, tracking=0.2)
    draw_text(c, 'PAST', 90, cy - 22, 'mono', 13, 'ash', axa * 0.7, align='l', tracking=0.5)
    draw_text(c, 'FUTURE', LW - 90, cy - 22, 'mono', 13, 'ash', axa * 0.7, align='r', tracking=0.5)
    # 未来一万年（WIPP）
    fa = smooth(remap(lt, T['L15'] - 0.2, T['L15'] + 1.2)) * out
    if fa > 0:
        p = ease_out_cubic(remap(lt, T['L15'], T['L15'] + 1.4))
        x1 = X(10000 * p)
        rect(c, cx, cy - 6, x1 - cx, 12, 'vermilion', fa * 0.85)
        lab_x = (cx + X(10000)) / 2
        draw_text(c, '未来一万年', lab_x, cy - 46, 'serif-sb', 28, 'vermilion', fa * (1 - smooth(remap(z, 0, 0.5))), t=lt - T['L15'] - 0.4,
                  tracking=0.15)
        draw_text(c, 'WIPP 的警告必须持续的时间', lab_x, cy - 86, 'sans', 16, 'ash', fa * (1 - z), tracking=0.1)
    # 过去的事件
    for i, (yrs, cn, en, lid) in enumerate(PAST):
        ta = lt - T[lid]
        a = smooth(remap(ta, 0, 0.8)) * out
        if a <= 0:
            continue
        x = X(-yrs)
        stem = 120 + i * 62 if z < 0.5 else 120 + i * 62
        yl = cy + 60 + i * 0 if False else cy - 60 - i * 70
        lp = ease_out_cubic(remap(ta, 0, 0.6))
        line(c, x, cy, x, cy - (cy - yl - 10) * lp, 'bone', 1.0, a * 0.7)
        dot(c, x, cy, 5, 'ember', a)
        la = a * (1 - smooth(remap(z, 0.0, 0.5)))
        draw_text(c, cn, x + 12, yl, 'serif-sb', 26 - 6 * z, 'bone', la, align='l', t=ta - 0.1, tracking=0.08)
        draw_text(c, en, x + 12, yl + 28, 'mono', 13, 'ash', la * 0.9, align='l', tracking=0.15)
    # 有文字的历史 vs 一万年
    ha = smooth(remap(lt, T['L20'], T['L20'] + 1.0)) * out * (1 - z)
    if ha > 0:
        p = ease_out_cubic(remap(lt, T['L20'], T['L20'] + 1.6))
        y2 = cy + 110
        x0 = X(-5200)
        line(c, cx, y2, cx - (cx - x0) * p, y2, 'bone', 2.0, ha)
        line(c, x0, y2 - 8, x0, y2 + 8, 'bone', 1.5, ha * smooth(remap(p, 0.9, 1)))
        line(c, cx, y2 - 8, cx, y2 + 8, 'bone', 1.5, ha)
        draw_text(c, '人类有文字的全部历史', (x0 + cx) / 2, y2 + 46, 'serif', 22, 'bone', ha, t=lt - T['L20'] - 0.6,
                  tracking=0.12)
        y3 = cy + 110
        x3 = X(10000)
        line(c, cx, y3, cx + (x3 - cx) * p, y3, 'vermilion', 2.0, ha)
        line(c, x3, y3 - 8, x3, y3 + 8, 'vermilion', 1.5, ha * smooth(remap(p, 0.9, 1)))
        draw_text(c, '× 2', (x3 + cx) / 2, y3 + 46, 'inter-l', 30, 'vermilion', ha, t=lt - T['L20'] - 1.2)
    # 十万年（安卡罗）
    oa = smooth(remap(lt, T['L21'] + 1.0, T['L21'] + 2.4)) * out
    if oa > 0:
        p = ease_out_cubic(remap(lt, T['L21'] + 1.2, T['L21'] + 3.0))
        x1 = X(100000 * p)
        rect(c, X(10000), cy - 4, x1 - X(10000), 8, 'glacier', oa * 0.8)
        draw_text(c, '芬兰 · 安卡罗处置库', (cx + X(100000)) / 2 + 60, cy - 60, 'serif-sb', 28, 'glacier', oa,
                  t=lt - T['L21'] - 1.2, tracking=0.12)
        draw_text(c, '设计寿命 100,000 年', (cx + X(100000)) / 2 + 60, cy - 24, 'mono', 15, 'ash', oa,
                  t=lt - T['L21'] - 1.6, tracking=0.2)
    # 十万年前：多种人类
    ha2 = smooth(remap(lt, T['L22'], T['L22'] + 1.0)) * out
    if ha2 > 0:
        x = X(-100000)
        line(c, x, cy, x, cy + 70, 'bone', 1.0, ha2 * 0.7)
        dot(c, x, cy, 6, 'bone', ha2)
        draw_text(c, '十万年前', x + 14, cy + 60, 'serif-sb', 26, 'bone', ha2, align='l', tracking=0.12)
        species = [('智人', 'Homo sapiens'), ('尼安德特人', 'H. neanderthalensis'), ('丹尼索瓦人', 'Denisovans'),
                   ('弗洛勒斯人', 'H. floresiensis'), ('吕宋人', 'H. luzonensis')]
        for i, (cn, la) in enumerate(species):
            ta = lt - T['L22'] - 0.5 - i * 0.35
            a = smooth(remap(ta, 0, 0.6)) * out
            yy = cy + 120 + i * 50
            col = 'ember' if i == 0 else 'ash'
            hi = smooth(remap(lt, ctx.ls('L22') - sh.start + 2.8, ctx.ls('L22') - sh.start + 3.6))
            dot(c, x + 22, yy - 8, 4, col, a)
            draw_text(c, cn, x + 40, yy, 'serif', 22, 'bone' if i == 0 else 'ash', a, align='l', tracking=0.1)
            draw_text(c, la, x + 40 + text_width(cn, 'serif', 22, 0.1) + 14, yy, 'corm-i', 20, 'ash', a * 0.8,
                      align='l')
            if i == 0 and hi > 0:
                draw_text(c, '← 我们', x + 300, yy, 'sans-m', 20, 'ember', a * hi, align='l')
    dust(c, lt, n=60, seed=62, alpha=0.25)


WORDS = [('危险', 'serif-sb'), ('DANGER', 'inter-m'), ('PELIGRO', 'inter-m'), ('ОПАСНОСТЬ', 'inter-m'),
         ('GEFAHR', 'inter-m'), ('危険', 'serif-sb'), ('PERICOLO', 'inter-m'), ('DANGER', 'corm-sb'), ('PERIGO', 'inter-m')]


def question(c, lt, dur, ctx, sh):
    bg(c, 'ink')
    out = 1 - smooth(remap(lt, dur - 0.6, dur))
    # 九个“危险”在网格中依次出现，然后被吹散；最后剩一个问号
    for i, (w, fn) in enumerate(WORDS):
        r, k = divmod(i, 3)
        x = LW / 2 + (k - 1) * 520
        y = 330 + r * 200
        size = 72 if i != 0 else 84
        ta = lt - 0.2 - i * 0.22
        a = smooth(remap(ta, 0, 0.5))
        dt = lt - (dur * 0.42 + i * 0.18)
        col = 'vermilion' if i == 0 else 'bone'
        if dt < 0:
            draw_text(c, w, x, y, fn, size, col, a * out * (1 if i == 0 else 0.75), t=ta, tracking=0.08, stagger=0.03)
        else:
            fx.dissolve_text(c, w, x, y, fn, size, dt, color=col, alpha=out * (1 if i == 0 else 0.75), tracking=0.08,
                             dur=2.4, seed=i + 3, spread=300)
    qa = smooth(remap(lt, dur * 0.42 + 2.2, dur * 0.42 + 3.2)) * out
    draw_text(c, '?', LW / 2, LH / 2 + 60, 'corm-l', 260, 'bone', qa, blur_in=20, t=lt - dur * 0.42 - 2.2, dur=1.4)
    dust(c, lt, n=80, seed=71, alpha=0.3)


def plan(tl, L, CH, card):
    return [
        ('wipp', L('L09', -0.6), wipp, 'fade'),
        ('halflife', L('L12', -0.5), halflife, 'fade'),
        ('rule', L('L14', -0.4), rule, 'fade'),
        ('deeptime', L('L15', -0.6), deeptime, 'fade'),
        ('question', L('L23', -0.4), question, 'fade'),
    ]
