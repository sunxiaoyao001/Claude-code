# -*- coding: utf-8 -*-
"""第四章 疯狂的方案"""
import math, sys, functools
import numpy as np
import skia
sys.path.insert(0, '/tmp/claude-0/proj')
from engine.core import *
from engine import three as T3
from scenes.common import *
from scenes import fx


def A(ctx, sh, lid):
    return ctx.ls(lid) - sh.start


# ---------------------------------------------------------------- 方案草图
def ideas(c, lt, dur, ctx, sh):
    """蓝图网格上，各种方案草图自己画出来。"""
    vgrad(c, 0, 0, LW, LH, [0xFF0F1418, 0xFF0A0D10])
    out = 1 - smooth(remap(lt, dur - 0.7, dur))
    ga = smooth(remap(lt, 0, 1.0)) * out
    for k in range(0, 40):
        x = k * 50
        line(c, x, 0, x, LH, 0xFF6F8FA0, 0.6 if k % 5 else 1.0, ga * (0.10 if k % 5 else 0.2))
    for k in range(0, 23):
        y = k * 50
        line(c, 0, y, LW, y, 0xFF6F8FA0, 0.6 if k % 5 else 1.0, ga * (0.10 if k % 5 else 0.2))
    rng = np.random.default_rng(50)
    labels = ['PROPOSAL 01  ·  FOLKLORE', 'PROPOSAL 02  ·  LIVING SIGNS', 'PROPOSAL 03  ·  HOSTILE ARCHITECTURE',
              'PROPOSAL 04  ·  PICTOGRAMS', 'PROPOSAL 05  ·  BURIED MARKERS']
    for k in range(5):
        cx = 260 + k * 350 + rng.uniform(-40, 40)
        cy = 380 + (k % 2) * 260 + rng.uniform(-30, 30)
        st = 0.3 + k * 0.35
        p = ease_in_out_cubic(remap(lt, st, st + 1.4))
        col = 0xFFB9CCD6
        if k == 0:
            path = skia.Path(); path.addCircle(cx, cy, 90)
            stroke_path(c, path, col, 1.4, out * 0.8, p=p)
            path2 = skia.Path(); path2.addCircle(cx, cy, 50)
            stroke_path(c, path2, col, 1.0, out * 0.6, p=p, dash=[6, 6])
        elif k == 1:
            path = poly_path([(cx - 90, cy + 60), (cx - 40, cy - 70), (cx + 10, cy + 20), (cx + 60, cy - 80), (cx + 100, cy + 60)], False)
            stroke_path(c, path, col, 1.4, out * 0.8, p=p)
        elif k == 2:
            for j in range(7):
                a = -math.pi / 2 + (j - 3) * 0.35
                line(c, cx, cy + 70, cx + math.cos(a) * 130, cy + 70 + math.sin(a) * 150, col, 1.3, out * 0.8,
                     p=clamp(p * 1.3 - j * 0.05))
        elif k == 3:
            path = skia.Path(); path.addRect(skia.Rect.MakeXYWH(cx - 80, cy - 80, 160, 160))
            stroke_path(c, path, col, 1.4, out * 0.8, p=p)
            path2 = skia.Path(); path2.addCircle(cx, cy - 10, 36)
            stroke_path(c, path2, col, 1.2, out * 0.7, p=p)
        else:
            for j in range(4):
                path = skia.Path(); path.addCircle(cx + (j - 1.5) * 50, cy + 40, 14)
                stroke_path(c, path, col, 1.2, out * 0.8, p=clamp(p * 1.3 - j * 0.1))
            line(c, cx - 120, cy, cx + 120, cy, col, 1.2, out * 0.6, p=p, dash=[8, 6])
        draw_text(c, labels[k], cx, cy + 150, 'mono', 13, 0xFF8FB0C0, out * smooth(remap(lt, st + 0.6, st + 1.2)),
                  tracking=0.2)
    draw_text(c, '疯狂的办法', LW / 2, 170, 'serif-sb', 56, 'bone', out, t=lt - 0.4, tracking=0.3, blur_in=8)


# ---------------------------------------------------------------- 原子祭司团
def priest(c, lt, dur, ctx, sh):
    bg(c, 'ink')
    T = {k: A(ctx, sh, k) for k in ['L52', 'L53', 'L54']}
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    # 名字
    na = window(lt, 0.3, T['L53'] + 0.4, 0.8, 0.8) * out
    draw_text(c, 'Thomas A. Sebeok', LW / 2, 420, 'corm-li', 84, 'bone', na, t=lt - 0.3, stagger=0.03, blur_in=8)
    draw_text(c, '托马斯·西比奥克 · 语言学家 · 1984', LW / 2, 490, 'serif', 26, 'ash', na, t=lt - 0.8, tracking=0.12)
    qa = window(lt, T['L52'] + 2.6, T['L53'] + 0.4, 0.8, 0.8) * out
    draw_text(c, '“让故事活下去”', LW / 2, 640, 'serif-sb', 46, 'ember', qa, t=lt - T['L52'] - 2.6, tracking=0.2)
    # 代代相传的螺旋：约 400 代人
    sa = smooth(remap(lt, T['L53'] - 0.2, T['L53'] + 1.0)) * out
    if sa > 0:
        n = 400
        k = np.arange(n)
        th = np.sqrt(k / n) * 6.0 * math.pi
        rr = 40 + 380 * np.sqrt(k / n)
        rot = lt * 0.04
        xs = LW / 2 + np.cos(th + rot) * rr * 1.25
        ys = 500 + np.sin(th + rot) * rr * 0.86
        prog = (lt - T['L53'] - 0.6) * 60
        lit = k < prog
        if (~lit).any():
            points(c, np.stack([xs[~lit], ys[~lit]], -1), 2.2, 'dim', sa)
        if lit.any():
            points(c, np.stack([xs[lit], ys[lit]], -1), 2.8, 'ember', sa * 0.95)
        head = int(clamp(prog, 0, n - 1))
        if prog > 0:
            glow(c, float(xs[head]), float(ys[head]), 60, 'ember', 0.6 * sa)
            dot(c, float(xs[head]), float(ys[head]), 4.5, 'bone', sa)
        draw_text(c, '约 400 代人', LW / 2, 492, 'serif-sb', 34, 'bone', sa * smooth(remap(lt, T['L53'] + 1.0, T['L53'] + 2.0)),
                  tracking=0.2)
        draw_text(c, 'ATOMIC PRIESTHOOD  ·  原子祭司团', LW / 2, 536, 'mono', 14, 'ash', sa, tracking=0.3)
    fa = smooth(remap(lt, T['L54'] - 0.1, T['L54'] + 0.8)) * out
    if fa > 0:
        c.drawRect(skia.Rect.MakeWH(LW, LH), paint(0xFF09090B, 0.75 * fa))
        draw_text(c, '让一个传说，替真相站岗。', LW / 2, LH / 2 + 20, 'serif-sb', 64, 'bone', fa, t=lt - T['L54'],
                  stagger=0.08, tracking=0.16, blur_in=10)
    dust(c, lt, n=80, seed=451, alpha=0.3)


# ---------------------------------------------------------------- 辐射猫
@functools.lru_cache(maxsize=1)
def cat_paths():
    body = skia.Path()
    body.moveTo(-60, 0)
    body.cubicTo(-125, -8, -128, -120, -78, -188)
    body.cubicTo(-48, -228, -12, -252, 8, -268)
    body.cubicTo(20, -292, 24, -322, 38, -342)
    body.lineTo(40, -398)
    body.lineTo(66, -366)
    body.cubicTo(76, -370, 84, -370, 92, -368)
    body.lineTo(112, -396)
    body.lineTo(112, -346)
    body.cubicTo(126, -330, 128, -306, 118, -296)
    body.cubicTo(108, -286, 92, -282, 80, -282)
    body.cubicTo(72, -266, 66, -240, 62, -214)
    body.cubicTo(58, -170, 66, -110, 60, -50)
    body.cubicTo(60, -26, 72, -8, 74, 0)
    body.lineTo(26, 0)
    body.cubicTo(28, -20, 24, -44, 18, -62)
    body.cubicTo(6, -38, -24, -22, -42, -2)
    body.close()
    tail = skia.Path()
    tail.moveTo(-70, -6)
    tail.cubicTo(-170, 6, -205, -40, -178, -96)
    return body, tail


def raycat(c, lt, dur, ctx, sh):
    bg(c, 'ink')
    T = {k: A(ctx, sh, k) for k in ['L55', 'L56', 'L57']}
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    d56 = ctx.le('L56') - ctx.ls('L56')
    t_change = T['L56'] + d56 * 0.18
    chg = smooth(remap(lt, t_change, t_change + 2.0))
    body, tail = cat_paths()
    cx, cy, sc = 760, 800, 1.35
    ca = smooth(remap(lt, 0.3, 1.4)) * out
    col = mixc(PAL['bone'], PAL['vermilion'], chg)
    # 辐射粒子从右侧飘来
    if lt > T['L56']:
        rng = np.random.default_rng(56)
        n = 160
        R = rng.random((n, 4))
        ph = (lt - T['L56']) * 0.25 + R[:, 0]
        px = 1800 - (ph % 1.0) * 900 + R[:, 1] * 80
        py = 300 + R[:, 2] * 520 + np.sin(lt + R[:, 3] * 6) * 20
        points(c, np.stack([px, py], -1), 1.6, 'vermilion', 0.5 * out * smooth(remap(lt, T['L56'], T['L56'] + 1.5)))
    glow(c, cx, cy - 250, 600, col, (0.08 + 0.18 * chg) * ca)
    c.save()
    c.translate(cx, cy)
    c.scale(sc, sc)
    c.drawPath(body, paint(col, ca))
    c.drawPath(tail, paint(col, ca, stroke=16, cap='round'))
    # 眼睛
    c.drawCircle(96, -318, 4.5, paint(0xFF0A0A0B, ca))
    c.restore()
    line(c, cx - 400, cy, cx + 400, cy, 'dim', 1.0, ca * 0.6)
    # 标题
    ta = window(lt, 0.3, T['L56'] + 1.0, 0.8, 0.8) * out
    draw_text(c, '辐射猫', 1180, 430, 'serif-sb', 76, 'bone', ta, align='l', t=lt - 0.4, tracking=0.2, blur_in=8)
    draw_text(c, 'RAY CAT  ·  BASTIDE & FABBRI, 1984', 1184, 482, 'mono', 14, 'ash', ta, align='l', tracking=0.3)
    # 歌谣
    sa = window(lt, T['L56'] + d56 * 0.55, T['L57'] + 0.2, 0.8, 0.8) * out
    draw_text(c, '♪', 1180, 420, 'inter', 40, 'ember', sa, align='l')
    draw_text(c, '“猫变了颜色，', 1240, 420, 'serif', 44, 'bone', sa, align='l', t=lt - T['L56'] - d56 * 0.55, tracking=0.1)
    draw_text(c, '  就赶快离开。”', 1240, 486, 'serif', 44, 'bone', sa, align='l', t=lt - T['L56'] - d56 * 0.55 - 0.8,
              tracking=0.1)
    ya = smooth(remap(lt, T['L57'], T['L57'] + 0.8)) * out
    draw_text(c, '~9,500', 1180, 430, 'inter-xl', 110, 'bone', ya, align='l', t=lt - T['L57'])
    draw_text(c, '年 · 人类与猫共同生活的时间', 1184, 484, 'serif', 24, 'ash', ya, align='l', tracking=0.12)
    dust(c, lt, n=70, seed=561, alpha=0.3)


# ---------------------------------------------------------------- 3D：敌意建筑
DUSK = dict(sun_dir=(-0.42, 0.16, 1.0), sun=0xFFFFC890, sky=0xFF4A4E6A, ground=0xFF4A3020, fog=0xFFC98656,
            fog_density=0.0032, shadow_alpha=0.55, rim=0.55, amb_int=0.6, sun_int=1.05)


def sun_xy(cam, L):
    P = cam.pos[None, :] + np.asarray(L.sun_dir)[None, :] * 1e6
    xy, z = cam.project(P)
    return float(xy[0, 0]), float(xy[0, 1]), float(z[0])


def draw_world(c, cam, L, sky=(0xFF1A1C2C, 0xFF6A4650, 0xFFE79A5A), ground=(0xFF1E1512, 0xFFB0704A), sun_r=22,
               glow_a=0.55, mesas=True):
    sx, sy, sz = sun_xy(cam, L)
    hy = T3.sky(c, cam, sky[0], sky[1], sky[2], sun_xy=(sx, sy) if sz > 0 else None, sun_r=sun_r, glow_a=glow_a)
    if mesas:
        # 远处台地剪影
        xs = np.linspace(-200, LW + 200, 80)
        yaw = math.atan2(cam.f[0], cam.f[2])
        base = hy
        prof = base - np.maximum(0, 30 + 26 * np.sin((xs + yaw * 1800) * 0.004) + 18 * np.sin((xs + yaw * 1800) * 0.011 + 1))
        path = poly_path([(xs[0], base + 2)] + list(zip(xs, prof)) + [(xs[-1], base + 2)])
        c.drawPath(path, paint(mixc(sky[2], 0xFF5A3A36, 0.55), 0.9))
    T3.ground(c, cam, ground[0], ground[1], hy)
    return hy


@functools.lru_cache(maxsize=1)
def thorns_scene():
    rng = np.random.default_rng(59)
    meshes = []
    for i in range(-14, 15):
        for j in range(0, 34):
            if rng.random() < 0.18:
                continue
            x = i * 13 + rng.normal(0, 3.5)
            z = 30 + j * 13 + rng.normal(0, 3.5)
            h = rng.uniform(10, 22)
            tilt = rng.normal(0, 0.5, 2)
            apex = (x + tilt[0] * h, h * rng.uniform(0.75, 1.0), z + tilt[1] * h)
            col = mixc(0xFF7E7266, 0xFF9C8E7E, rng.uniform())
            meshes.append(T3.spike((x, 0, z), rng.uniform(1.0, 1.9), apex, col, sides=4, rot=rng.uniform(0, 6)))
    L = T3.Light(**DUSK)
    sc = T3.Scene3D(meshes, L)
    # 生长动画用：每个尖刺的底点与顶点索引
    return sc, L


def thorns(c, lt, dur, ctx, sh):
    T = {k: A(ctx, sh, k) for k in ['L58', 'L59']}
    sc, L = thorns_scene()
    out = 1 - smooth(remap(lt, dur - 0.6, dur))
    # 相机：从低处向前推进，L59 后升高
    p = lt / max(dur, 1)
    rise = ease_in_out_cubic(remap(lt, T['L59'] + 1.0, dur))
    pos = (lerp(-20, 10, p), lerp(5, 34, rise), lerp(-60, 40, ease_in_out_sine(p)))
    tgt = (lerp(10, 0, p), lerp(8, 2, rise), 260)
    cam = T3.Camera(pos, tgt, fov=50)
    draw_world(c, cam, L)
    # 尖刺从地面依次升起（L59 开始）
    g = (lt - T['L59'] + 0.6) * 1.2
    V = sc.V.copy()
    n_sp = len(V) // 5
    Vr = V.reshape(n_sp, 5, 3)
    base = Vr[:, :4, :].mean(1)
    zrank = (base[:, 2] - 30) / 450
    gi = np.clip((g - zrank * 0.9) / 0.6, 0, 1)
    gi = 1 - (1 - gi) ** 3
    Vr = base[:, None, :] + (Vr - base[:, None, :]) * gi[:, None, None]
    V2 = Vr.reshape(-1, 3)
    if g > -0.5:
        sc.render(c, cam, alpha=1.0, V=V2, shadow_mul=smooth(remap(g, 0.6, 1.6)))
    sx, sy, sz = sun_xy(cam, L)
    if sz > 0:
        sun_rays(c, sx, sy, 0.07, t=lt)
    dust(c, lt, n=160, seed=591, alpha=0.35, color=0xFFFFD8A8, speed=12, drift=(1.0, -0.2))
    # 标题
    la = window(lt, T['L58'] + 0.4, T['L59'] - 0.2, 0.8, 0.6) * out
    draw_text(c, '让土地本身开口说话', LW / 2, 300, 'serif-sb', 52, 'bone', la, t=lt - T['L58'] - 0.4, tracking=0.22,
              blur_in=8)
    ta = smooth(remap(lt, T['L59'] + 0.6, T['L59'] + 1.6)) * out
    draw_text(c, '荆棘之地', 140, 180, 'serif-sb', 64, 'bone', ta, align='l', t=lt - T['L59'] - 0.6, tracking=0.2,
              blur_in=8)
    draw_text(c, 'LANDSCAPE OF THORNS  ·  MICHAEL BRILL / SAFDAR ABIDI', 144, 226, 'mono', 14, 'bone', ta * 0.8,
              align='l', tracking=0.25)


@functools.lru_cache(maxsize=1)
def slab_scene():
    meshes = [T3.box(0, 0, 200, 260, 1.6, 260, 0xFF0B0B0B)]
    rng = np.random.default_rng(60)
    for k in range(40):
        x = rng.uniform(-400, 400); z = rng.uniform(-100, 600)
        if abs(x) < 150 and 60 < z < 340:
            continue
        meshes.append(T3.box(x, 0, z, rng.uniform(1, 3), rng.uniform(0.5, 1.5), rng.uniform(1, 3), 0xFF8A6A4C,
                             ry=rng.uniform(0, 3)))
    L = T3.Light(sun_dir=(0.25, 0.75, 0.6), sun=0xFFFFF0D8, sky=0xFF9AA8B8, ground=0xFF9A7A5A, fog=0xFFE8D2B4,
                 fog_density=0.0005, shadow_alpha=0.45, rim=0.0, amb_int=0.55, sun_int=1.0)
    return T3.Scene3D(meshes, L), L


def blackhole(c, lt, dur, ctx, sh):
    sc, L = slab_scene()
    out = 1 - smooth(remap(lt, dur - 0.6, dur))
    ang = lerp(-0.55, -0.2, ease_in_out_sine(lt / max(dur, 1)))
    r = 250
    pos = (math.sin(ang) * r, 62, 200 - math.cos(ang) * r)
    cam = T3.Camera(pos, (0, 0, 240), fov=50)
    draw_world(c, cam, L, sky=(0xFF6F8AA6, 0xFFC9C3B8, 0xFFF1E2C8), ground=(0xFF8A6A4C, 0xFFE2C8A4), sun_r=0, glow_a=0.0,
               mesas=True)
    sc.render(c, cam)
    # 热浪：石板上方的扭动光线
    P = np.array([[-130, 1.6, 70], [130, 1.6, 70], [130, 1.6, 330], [-130, 1.6, 330]], float)
    xy, z = cam.project(P)
    y_top = float(xy[:, 1].min()); y_bot = float(xy[:, 1].max())
    x0 = float(xy[:, 0].min()); x1 = float(xy[:, 0].max())
    for k in range(26):
        yy = y_top - 10 - k * 9
        xs = np.linspace(x0, x1, 70)
        ys = yy + 3.5 * np.sin(xs * 0.03 + lt * 5 + k * 0.7) + 2 * np.sin(xs * 0.071 - lt * 7 + k)
        c.drawPath(poly_path(list(zip(xs, ys)), False), paint(0xFFFFE6C8, 0.06 * (1 - k / 26) * out, stroke=2.2))
    glow(c, (x0 + x1) / 2, (y_top + y_bot) / 2, (x1 - x0) * 0.6, 'vermilion', 0.12 * out)
    ta = smooth(remap(lt, 0.4, 1.4)) * out
    draw_text(c, '黑洞', 140, 180, 'serif-sb', 64, 0xFF1C1612, ta, align='l', t=lt - 0.4, tracking=0.3, blur_in=8)
    draw_text(c, 'BLACK HOLE  ·  吸热的黑色石板', 144, 226, 'mono', 14, 0xFF3A2E24, ta, align='l', tracking=0.25)
    tem = smooth(remap(lt, 1.6, 2.6)) * out
    draw_text(c, '烫得没人能靠近', LW - 140, 180, 'serif', 30, 0xFF5A1E14, tem, align='r', tracking=0.2, t=lt - 1.6)


@functools.lru_cache(maxsize=1)
def blocks_scene():
    rng = np.random.default_rng(61)
    meshes = []
    S = 30.0
    gap = 6.0
    for i in range(-4, 5):
        for j in range(0, 12):
            x = i * (S + gap) + (S + gap) / 2
            z = j * (S + gap) + 20
            h = rng.uniform(24, 40)
            col = mixc(0xFF2C2826, 0xFF3E3832, rng.uniform())
            meshes.append(T3.box(x, 0, z, S * rng.uniform(0.9, 1.0), h, S * rng.uniform(0.9, 1.0), col,
                                 ry=rng.normal(0, 0.05), top_scale=rng.uniform(0.85, 1.0)))
    L = T3.Light(**dict(DUSK, fog_density=0.004, sun_dir=(-0.6, 0.22, 0.75)))
    return T3.Scene3D(meshes, L), L


def blocks(c, lt, dur, ctx, sh):
    sc, L = blocks_scene()
    out = 1 - smooth(remap(lt, dur - 0.6, dur))
    p = ease_in_out_sine(lt / max(dur, 1))
    pos = (0.0, 2.2, lerp(-10, 120, p))
    cam = T3.Camera(pos, (0.0, lerp(10, 14, p), pos[2] + 120), fov=58, roll=0.0)
    draw_world(c, cam, L, mesas=False)
    sc.render(c, cam, edge=0xFF000000, edge_alpha=0.3)
    dust(c, lt, n=140, seed=611, alpha=0.3, color=0xFFFFD8A8, speed=10, drift=(0.6, -0.3))
    ta = smooth(remap(lt, 0.4, 1.4)) * out
    draw_text(c, '禁忌巨石', 140, 180, 'serif-sb', 64, 'bone', ta, align='l', t=lt - 0.4, tracking=0.2, blur_in=8)
    draw_text(c, 'FORBIDDING BLOCKS', 144, 226, 'mono', 14, 'bone', ta * 0.8, align='l', tracking=0.3)


def primal(c, lt, dur, ctx, sh):
    """升到高空俯瞰荆棘之地：这里不对劲。"""
    sc, L = thorns_scene()
    out = 1 - smooth(remap(lt, dur - 0.8, dur))
    p = ease_in_out_cubic(clamp(lt / max(dur, 1)))
    pos = (lerp(-60, -140, p), lerp(40, 150, p), lerp(-80, -60, p))
    cam = T3.Camera(pos, (0, 0, 230), fov=48)
    draw_world(c, cam, L)
    sc.render(c, cam)
    sx, sy, sz = sun_xy(cam, L)
    if sz > 0:
        sun_rays(c, sx, sy, 0.06, t=lt, seed=9)
    c.drawRect(skia.Rect.MakeWH(LW, LH), paint(0xFF0A0606, 0.25))
    d = ctx.le('L63') - ctx.ls('L63')
    t63 = A(ctx, sh, 'L63')
    a1 = smooth(remap(lt, t63 + d * 0.55, t63 + d * 0.55 + 0.6)) * out
    a2 = smooth(remap(lt, t63 + d * 0.78, t63 + d * 0.78 + 0.6)) * out
    draw_text(c, '这里不对劲。', LW / 2, 420, 'serif-sb', 72, 'bone', a1, t=lt - t63 - d * 0.55, stagger=0.08,
              tracking=0.2, blur_in=10)
    draw_text(c, '我不想待在这儿。', LW / 2, 520, 'serif', 44, 'bone', a2 * 0.85, t=lt - t63 - d * 0.78, stagger=0.07,
              tracking=0.2, blur_in=8)


def plan(tl, L, CH, card):
    return [
        ('card4', CH('c4', -0.2), card(4, '疯狂的方案', 'RADICAL IDEAS'), 'black'),
        ('ideas', L('L50', -0.5), ideas, 'fade'),
        ('priest', L('L52', -0.4), priest, 'fade'),
        ('raycat', L('L55', -0.4), raycat, 'fade'),
        ('thorns', L('L58', -0.4), thorns, 'fade'),
        ('blackhole', L('L60', -0.3), blackhole, 'fade'),
        ('blocks', L('L61', -0.3), blocks, 'fade'),
        ('primal', L('L63', -0.3), primal, 'fade'),
    ]
