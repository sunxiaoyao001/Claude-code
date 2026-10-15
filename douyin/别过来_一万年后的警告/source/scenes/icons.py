# -*- coding: utf-8 -*-
"""图标：三叶辐射标志、骷髅、逃跑的人、猫、人脸等（矢量路径）。"""
import math, sys, functools
import numpy as np
import skia
sys.path.insert(0, '/tmp/claude-0/proj')
from engine.core import *


def sector(cx, cy, r0, r1, a0, a1):
    """环形扇区（角度：度，屏幕坐标 y 向下）。"""
    p = skia.Path()
    p.arcTo(skia.Rect.MakeLTRB(cx - r1, cy - r1, cx + r1, cy + r1), a0, a1 - a0, True)
    p.arcTo(skia.Rect.MakeLTRB(cx - r0, cy - r0, cx + r0, cy + r0), a1, -(a1 - a0), False)
    p.close()
    return p


def trefoil(c, cx, cy, R, color='ember', alpha=1.0, grow=1.0, spin=0.0):
    """标准三叶标志：中心圆半径 R，叶片 1.5R~5R，宽 60°。grow 0..1 依次长出。"""
    if alpha <= 0.003:
        return
    pc = paint(color, alpha)
    g0 = smooth(remap(grow, 0, 0.25))
    c.drawCircle(cx, cy, R * g0, pc)
    for k, ang in enumerate((90, 210, 330)):
        g = ease_out_cubic(remap(grow, 0.2 + k * 0.2, 0.55 + k * 0.2))
        if g <= 0:
            continue
        a0 = ang - 30 * g + spin
        a1 = ang + 30 * g + spin
        r1 = 1.5 * R + (3.5 * R) * g
        c.drawPath(sector(cx, cy, 1.5 * R, r1, a0, a1), pc)


def trefoil_guides(c, cx, cy, R, alpha=1.0, p=1.0):
    if alpha <= 0.003:
        return
    for rr, k in ((R, 0), (1.5 * R, 1), (5 * R, 2)):
        pp = ease_in_out_cubic(remap(p, k * 0.15, 0.5 + k * 0.15))
        path = skia.Path()
        path.addCircle(cx, cy, rr)
        stroke_path(c, path, 'ash', 1.0, alpha * 0.7, p=pp, dash=[5, 6])
    for k in range(6):
        ang = math.radians(60 + k * 60)
        pp = ease_out_cubic(remap(p, 0.4 + k * 0.05, 0.8 + k * 0.05))
        line(c, cx, cy, cx + math.cos(ang) * 5.6 * R * pp, cy + math.sin(ang) * 5.6 * R * pp, 'ash', 0.8,
             alpha * 0.5)


@functools.lru_cache(maxsize=4)
def skull_path(s=100.0):
    """骷髅头（单位尺寸 s，中心在颅骨中心）。返回 (头骨外形, 眼鼻孔洞, 牙缝线)。"""
    head = skia.Path()
    # 颅骨
    head.addOval(skia.Rect.MakeLTRB(-0.62 * s, -0.78 * s, 0.62 * s, 0.42 * s))
    # 下颌
    jaw = skia.Path()
    jaw.addRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(-0.36 * s, 0.18 * s, 0.36 * s, 0.68 * s), 0.12 * s, 0.12 * s))
    head = skia.Op(head, jaw, skia.PathOp.kUnion_PathOp)
    holes = skia.Path()
    holes.addOval(skia.Rect.MakeLTRB(-0.44 * s, -0.22 * s, -0.1 * s, 0.12 * s))
    holes.addOval(skia.Rect.MakeLTRB(0.1 * s, -0.22 * s, 0.44 * s, 0.12 * s))
    nose = skia.Path()
    nose.moveTo(0, 0.14 * s); nose.lineTo(-0.09 * s, 0.32 * s); nose.lineTo(0.09 * s, 0.32 * s); nose.close()
    holes = skia.Op(holes, nose, skia.PathOp.kUnion_PathOp)
    head = skia.Op(head, holes, skia.PathOp.kDifference_PathOp)
    teeth = []
    for k in range(-2, 3):
        x = k * 0.12 * s
        teeth.append((x, 0.46 * s, x, 0.66 * s))
    return head, teeth


def bone(c, x1, y1, x2, y2, w, col, a):
    p = paint(col, a, stroke=w, cap='round')
    c.drawLine(x1, y1, x2, y2, p)
    ang = math.atan2(y2 - y1, x2 - x1)
    nx, ny = -math.sin(ang), math.cos(ang)
    for (x, y) in ((x1, y1), (x2, y2)):
        for sgn in (1, -1):
            c.drawCircle(x + nx * w * 0.45 * sgn, y + ny * w * 0.45 * sgn, w * 0.55, paint(col, a))


def skull(c, x, y, s, col='bone', a=1.0, bones=True, bg_col=0xFF0A0A0B):
    if a <= 0.003:
        return
    head, teeth = skull_path(100.0)
    c.save()
    c.translate(x, y)
    if bones:
        bw = s * 0.16
        bone(c, -0.75 * s, 0.35 * s, 0.75 * s, 1.15 * s, bw, col, a)
        bone(c, 0.75 * s, 0.35 * s, -0.75 * s, 1.15 * s, bw, col, a)
    c.scale(s / 100.0, s / 100.0)
    c.drawPath(head, paint(col, a))
    for (x1, y1, x2, y2) in teeth:
        c.drawLine(x1, y1, x2, y2, paint(bg_col, a, stroke=3.0))
    c.restore()


def runner(c, x, y, s, col='bone', a=1.0, phase=0.0):
    """逃跑的人（象形图），以臀部为原点，phase 0..1 让手脚摆动。"""
    if a <= 0.003:
        return
    w = s * 0.13
    p = paint(col, a, stroke=w, cap='round')
    sw = math.sin(phase * 2 * math.pi) * 0.25
    # 躯干（前倾）
    hx, hy = x, y
    sx, sy = x + s * 0.2, y - s * 0.55
    c.drawLine(hx, hy, sx, sy, p)
    c.drawCircle(sx + s * 0.12, sy - s * 0.2, s * 0.12, paint(col, a))
    # 手臂
    for d in (1, -1):
        ex = sx + s * (0.05 + 0.2 * d * (0.8 + sw)); ey = sy + s * 0.18
        c.drawLine(sx, sy + s * 0.05, ex, ey, p)
        c.drawLine(ex, ey, ex + s * 0.18 * d, ey - s * 0.1 * d + s * 0.05, p)
    # 腿
    for d in (1, -1):
        kx = hx + s * 0.25 * d * (0.9 + sw); ky = hy + s * 0.3
        c.drawLine(hx, hy, kx, ky, p)
        c.drawLine(kx, ky, kx - s * 0.12 * d + (s * 0.15 if d < 0 else 0), ky + s * 0.32, p)


def arrow(c, x1, y1, x2, y2, w, col, a, head=None):
    head = head or w * 4
    p = paint(col, a, stroke=w, cap='round')
    c.drawLine(x1, y1, x2, y2, p)
    ang = math.atan2(y2 - y1, x2 - x1)
    for s_ in (1, -1):
        c.drawLine(x2, y2, x2 - head * math.cos(ang + s_ * 0.5), y2 - head * math.sin(ang + s_ * 0.5), p)


def waves(c, cx, cy, r0, n, col, a, spread=50, t=0.0, w=4.0):
    for k in range(n):
        rr = r0 + k * (w * 3.2)
        aa = a * (0.9 - k * 0.15)
        ph = (t * 1.2 - k * 0.3) % 1.0
        path = skia.Path()
        path.addArc(skia.Rect.MakeLTRB(cx - rr, cy - rr, cx + rr, cy + rr), -90 - spread / 2, spread)
        c.drawPath(path, paint(col, aa * (0.6 + 0.4 * math.sin(ph * 6.28)), stroke=w))


def iso21482(c, cx, cy, s, a=1.0, p=1.0, t=0.0, parts=(1, 1, 1)):
    """ISO 21482 风格警示：红三角 + 辐射波三叶 + 骷髅 + 逃跑的人和箭头。"""
    if a <= 0.003:
        return
    tri = poly_path([(cx, cy - s * 0.62), (cx + s * 0.62, cy + s * 0.46), (cx - s * 0.62, cy + s * 0.46)])
    pa = smooth(remap(p, 0, 0.25))
    c.drawPath(tri, paint('vermilion', a * pa))
    inner = poly_path([(cx, cy - s * 0.48), (cx + s * 0.5, cy + s * 0.38), (cx - s * 0.5, cy + s * 0.38)])
    c.drawPath(inner, paint(0xFFF2EEE6, a * pa))
    stroke_path(c, tri, 0xFF101010, s * 0.012, a * pa, cap='round')
    k1, k2, k3 = parts
    if k1 > 0:
        trefoil(c, cx, cy - s * 0.12, s * 0.035, 0xFF111111, a * k1, grow=k1)
        waves(c, cx, cy - s * 0.12, s * 0.2, 3, 0xFF111111, a * k1, spread=70, t=t, w=s * 0.012)
    if k2 > 0:
        skull(c, cx - s * 0.2, cy + s * 0.14, s * 0.08, 0xFF111111, a * k2, bg_col=0xFFF2EEE6)
    if k3 > 0:
        runner(c, cx + s * 0.13, cy + s * 0.2, s * 0.17, 0xFF111111, a * k3, phase=t * 1.4)
        arrow(c, cx + s * 0.22, cy + s * 0.13, cx + s * 0.36, cy + s * 0.13, s * 0.014, 0xFF111111, a * k3)
