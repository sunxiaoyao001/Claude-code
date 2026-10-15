# -*- coding: utf-8 -*-
"""第三章 符号会说谎"""
import math, sys
import numpy as np
import skia
sys.path.insert(0, '/tmp/claude-0/proj')
from engine.core import *
from scenes.common import *
from scenes import icons as I
from scenes import fx


def A(ctx, sh, lid):
    return ctx.ls(lid) - sh.start


def trefoil_scene(c, lt, dur, ctx, sh):
    bg(c, 'ink')
    T = {k: A(ctx, sh, k) for k in ['L40', 'L41', 'L42']}
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    cx, cy, R = LW / 2, 520, 42
    zoom = lerp(1.0, 1.08, ease_in_out_sine(lt / max(dur, 1)))
    c.save()
    c.translate(cx, cy); c.scale(zoom, zoom); c.translate(-cx, -cy)
    gp = remap(lt, T['L41'] - 0.6, T['L41'] + 2.4)
    I.trefoil_guides(c, cx, cy, R, out, p=gp)
    glow(c, cx, cy, 520, 'ember', 0.12 * smooth(gp) * out)
    I.trefoil(c, cx, cy, R, 'ember', out, grow=remap(lt, T['L41'] + 0.2, T['L41'] + 2.6))
    # 尺寸标注
    da = smooth(remap(lt, T['L41'] + 2.0, T['L41'] + 3.0)) * out * (1 - smooth(remap(lt, T['L42'] + 3, T['L42'] + 4)))
    draw_text(c, 'R', cx + R * 0.5, cy - 8, 'mono', 14, 'ash', da)
    draw_text(c, '1.5R', cx + 1.5 * R + 4, cy + 24, 'mono', 13, 'ash', da, align='l')
    draw_text(c, '5R', cx + 5 * R + 8, cy + 6, 'mono', 13, 'ash', da, align='l')
    draw_text(c, '60°', cx + 60, cy - 2.6 * R - 20, 'mono', 13, 'ash', da)
    c.restore()
    la = smooth(remap(lt, T['L42'], T['L42'] + 1.0)) * out
    draw_text(c, '1946', 220, 330, 'inter-xl', 120, 'bone', la, align='l', t=lt - T['L42'])
    draw_text(c, '加州大学伯克利分校 · 辐射实验室', 224, 384, 'serif', 24, 'ash', la, align='l', tracking=0.1,
              t=lt - T['L42'] - 0.4)
    draw_text(c, 'UC BERKELEY RADIATION LABORATORY', 224, 420, 'mono', 13, 'ash', la * 0.8, align='l', tracking=0.3)
    # 问号漂浮
    qa = smooth(remap(lt, T['L42'] + 3.0, T['L42'] + 4.5)) * out
    if qa > 0:
        rng = np.random.default_rng(42)
        for k in range(14):
            ang = rng.uniform(0, 6.28)
            rr = rng.uniform(300, 470)
            x = cx + math.cos(ang + lt * 0.05) * rr * 1.25
            y = cy + math.sin(ang + lt * 0.05) * rr * 0.8
            draw_text(c, '?', x, y + 10 * math.sin(lt * 1.3 + k), 'corm-l', rng.uniform(30, 64), 'ash',
                      qa * rng.uniform(0.3, 0.8), t=lt - T['L42'] - 3.0 - k * 0.12)
    dust(c, lt, n=80, seed=341, alpha=0.3)


COUNTRIES = ['BRAZIL', 'MEXICO', 'MOROCCO', 'KENYA', 'SAUDI ARABIA', 'CHINA', 'INDIA', 'THAILAND', 'POLAND',
             'UKRAINE', 'UNITED STATES']


def iso_scene(c, lt, dur, ctx, sh):
    bg(c, 'ink')
    T = {k: A(ctx, sh, k) for k in ['L43', 'L44']}
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    d43 = ctx.le('L43') - ctx.ls('L43')
    # 三个部件按旁白节奏出现（“放射线、骷髅头，和一个正在逃跑的人”位于句尾 ~55%~95%）
    k1 = smooth(remap(lt, T['L43'] + d43 * 0.55, T['L43'] + d43 * 0.62))
    k2 = smooth(remap(lt, T['L43'] + d43 * 0.66, T['L43'] + d43 * 0.74))
    k3 = smooth(remap(lt, T['L43'] + d43 * 0.8, T['L43'] + d43 * 0.9))
    move = ease_in_out_cubic(remap(lt, T['L44'] - 0.2, T['L44'] + 1.4))
    cx = lerp(LW / 2, 560, move)
    cy = 500
    s = lerp(560, 500, move)
    pa = remap(lt, T['L43'] + 0.6, T['L43'] + 2.2)
    glow(c, cx, cy, 600, 'vermilion', 0.12 * smooth(pa) * out)
    I.iso21482(c, cx, cy, s, out, p=pa, t=lt, parts=(k1, k2, k3))
    la = smooth(remap(lt, T['L43'] + 1.0, T['L43'] + 2.0)) * out * (1 - move)
    draw_text(c, '2007 · ISO 21482', LW / 2, 900, 'mono', 18, 'ash', la, tracking=0.3)
    # 右侧：11 国 · 1,650 人
    ra = smooth(remap(lt, T['L44'] + 0.6, T['L44'] + 1.6)) * out
    if ra > 0:
        x0 = 1010
        draw_text(c, '11', x0, 330, 'inter-xl', 120, 'bone', ra, align='l', t=lt - T['L44'] - 0.6)
        draw_text(c, '个国家', x0 + 150, 330, 'serif', 30, 'ash', ra, align='l')
        draw_text(c, '1,650', x0 + 330, 330, 'inter-xl', 120, 'bone', ra, align='l', t=lt - T['L44'] - 1.0)
        draw_text(c, '人', x0 + 330 + text_width('1,650', 'inter-xl', 120) + 16, 330, 'serif', 30, 'ash', ra, align='l')
        # 1650 个小点
        cols = 66
        n = 1650
        idx = np.arange(n)
        xs = x0 + (idx % cols) * 11.5
        ys = 400 + (idx // cols) * 11.5
        appear = (lt - T['L44'] - 1.2) * 900 - idx
        m = appear > 0
        if m.any():
            points(c, np.stack([xs[m], ys[m]], -1), 2.0, 'bone', ra * 0.75)
        for k, cn in enumerate(COUNTRIES):
            ta = lt - T['L44'] - 1.6 - k * 0.12
            draw_text(c, cn, x0 + (k % 4) * 190, 740 + (k // 4) * 32, 'mono', 14, 'ash', ra, align='l',
                      tracking=0.2, t=ta)
    dust(c, lt, n=60, seed=342, alpha=0.25)


def skull_scene(c, lt, dur, ctx, sh):
    bg(c, 'ink')
    T = {k: A(ctx, sh, k) for k in ['L45', 'L46']}
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    d46 = ctx.le('L46') - ctx.ls('L46')
    t_today = T['L46'] + d46 * 0.42
    pat = ease_in_out_cubic(remap(lt, t_today, t_today + 2.2))
    # 背景图案化：平铺骷髅（时尚印花）
    if pat > 0.01:
        sp = 150
        off = (lt * 30) % sp
        for i in range(-1, 15):
            for j in range(-1, 9):
                x = i * sp + (j % 2) * sp / 2 - off
                y = j * sp * 0.86 + off * 0.5
                d = math.hypot(x - LW / 2, y - LH / 2)
                aa = pat * smooth(remap(pat * 1400 - d, 0, 200)) * 0.22 * out
                I.skull(c, x, y, 26, 'ash', aa, bones=False)
    # 中心骷髅
    sa = smooth(remap(lt, 0.2, 1.2)) * out
    sz = lerp(150, 120, pat)
    glow(c, LW / 2, 440, 500, 'bone', 0.07 * sa)
    I.skull(c, LW / 2, 400, sz, 'bone', sa)
    # 含义标签
    tags = [('死亡', 'DEATH', -520), ('海盗', 'PIRACY', 0), ('毒药', 'POISON', 520)]
    for k, (cn, en, dx) in enumerate(tags):
        ta = lt - T['L46'] - 0.3 - k * d46 * 0.1
        a = smooth(remap(ta, 0, 0.6)) * out * (1 - pat)
        draw_text(c, cn, LW / 2 + dx, 760, 'serif-sb', 40, 'bone', a, t=ta, tracking=0.2)
        draw_text(c, en, LW / 2 + dx, 806, 'mono', 14, 'ash', a, tracking=0.4)
    fa = smooth(remap(lt, t_today + 0.8, t_today + 1.8)) * out
    draw_text(c, 'T恤 · 滑板 · 时尚印花', LW / 2, 780, 'serif-sb', 40, 'ember', fa, t=lt - t_today - 0.8, tracking=0.16)


def curse(c, lt, dur, ctx, sh):
    bg(c, 'warm')
    T = {k: A(ctx, sh, k) for k in ['L47', 'L48', 'L49']}
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    # 金字塔剖面线稿
    cx, base_y, hw, h = LW / 2, 760, 520, 500
    pa = remap(lt, T['L48'] - 0.4, T['L48'] + 2.2)
    outline = poly_path([(cx - hw, base_y), (cx, base_y - h), (cx + hw, base_y)], closed=False)
    stroke_path(c, outline, 'sand', 1.8, out, p=ease_in_out_cubic(pa))
    line(c, cx - hw - 200, base_y, cx + hw + 200, base_y, 'sand', 1.0, out * 0.5 * smooth(pa))
    # 内部通道（示意）
    ip = ease_in_out_cubic(remap(lt, T['L48'] + 0.8, T['L48'] + 3.0))
    desc = poly_path([(cx - 140, base_y - 160), (cx - 30, base_y + 40), (cx + 60, base_y + 40)], closed=False)
    stroke_path(c, desc, 'sand', 1.4, out * 0.8, p=ip)
    gal = poly_path([(cx - 60, base_y - 30), (cx + 40, base_y - 170), (cx + 40, base_y - 230)], closed=False)
    stroke_path(c, gal, 'sand', 1.4, out * 0.8, p=ip)
    rect(c, cx + 40, base_y - 262, 90, 40, 'sand', out * 0.85 * smooth(ip), stroke=1.4)
    # 盗洞（朱红虚线）
    rp = ease_in_out_cubic(remap(lt, T['L48'] + 3.0, T['L48'] + 5.5))
    rob = poly_path([(cx - hw * 0.62, base_y - 40), (cx - 200, base_y - 110), (cx - 60, base_y - 30),
                     (cx + 40, base_y - 170), (cx + 85, base_y - 242)], closed=False)
    stroke_path(c, rob, 'vermilion', 2.2, out, p=rp, dash=[10, 8])
    if rp > 0.98:
        glow(c, cx + 85, base_y - 242, 90, 'vermilion', 0.4 * out)
    # 诅咒铭文
    ca = smooth(remap(lt, T['L48'] + 0.6, T['L48'] + 1.6)) * out * (1 - smooth(remap(lt, T['L49'] - 0.4, T['L49'] + 0.4)))
    draw_text(c, '“任何进入此墓者……”', cx + 120, base_y - 330, 'serif', 24, 'ash', ca, align='l', tracking=0.1)
    draw_text(c, 'TOMB CURSE · OLD KINGDOM', cx + 120, base_y - 294, 'mono', 13, 'ash', ca * 0.8, align='l', tracking=0.3)
    # 文字变形：危险 → 宝藏
    d49 = ctx.le('L49') - ctx.ls('L49')
    t1 = T['L49'] + 0.2
    t2 = T['L49'] + d49 * 0.62
    w1 = window(lt, t1, t2 + 0.3, 0.6, 0.0)
    a_old = 1 - smooth(remap(lt, t2, t2 + 0.6))
    a_new = smooth(remap(lt, t2 + 0.2, t2 + 0.9))
    if lt > t1:
        draw_text(c, '这里很危险，千万别打开', LW / 2, 200, 'serif-sb', 52, 'vermilion', out * a_old,
                  t=lt - t1, tracking=0.12, out_t=lt - t2 if lt > t2 else None, out_dur=0.5, out_stagger=0.03,
                  blur_in=6)
        draw_text(c, '这里藏着宝藏', LW / 2, 200, 'serif-sb', 60, 'gold', out * a_new, t=lt - t2 - 0.2, tracking=0.2,
                  blur_in=8, glow='gold', glow_alpha=0.35)
    dust(c, lt, n=110, seed=343, alpha=0.35, color='sand')


def plan(tl, L, CH, card):
    return [
        ('card3', CH('c3', -0.2), card(3, '符号会说谎', 'SYMBOLS LIE'), 'black'),
        ('trefoil', L('L40', -0.5), trefoil_scene, 'fade'),
        ('iso', L('L43', -0.4), iso_scene, 'fade'),
        ('skull', L('L45', -0.4), skull_scene, 'fade'),
        ('curse', L('L47', -0.4), curse, 'fade'),
    ]
