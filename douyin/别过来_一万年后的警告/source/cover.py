# -*- coding: utf-8 -*-
"""抖音封面：16:9（3840x2160）与 3:4（1620x2160）。"""
import sys, math
sys.path.insert(0, '/tmp/claude-0/proj')
import numpy as np
import skia
from PIL import Image
from engine.core import *
from engine import three as T3
from scenes import ch4
from scenes.common import sun_rays, dust, glow as _g


def background(W=3840):
    fr = Frame(W, W * 9 // 16)
    c = fr.begin()
    sc, L = ch4.thorns_scene()
    cam = T3.Camera((-6, 16, -20), (6, 9, 260), fov=50)
    ch4.draw_world(c, cam, L)
    sc.render(c, cam)
    sx, sy, sz = ch4.sun_xy(cam, L)
    sun_rays(c, sx, sy, 0.08, t=0.0)
    dust(c, 3.0, n=200, seed=591, alpha=0.35, color=0xFFFFD8A8)
    return fr


def title_block(c, cx, y, scale=1.0, align='c'):
    draw_text(c, '别过来', cx, y, 'serif-k', 250 * scale, 'bone', 1.0, align=align, tracking=0.2)
    draw_text(c, '如何给一万年后的人类，写一封信', cx, y + 110 * scale, 'serif-sb', 52 * scale, 'bone', 0.95,
              align=align, tracking=0.12)
    draw_text(c, 'THIS PLACE IS NOT A PLACE OF HONOR', cx, y + 175 * scale, 'mono', 22 * scale, 'paper', 0.8,
              align=align, tracking=0.45)


if __name__ == '__main__':
    fr = background(3840)
    c = fr.surface.getCanvas()
    c.resetMatrix(); c.scale(fr.S, fr.S)
    # 左侧压暗
    hgrad(c, 0, 0, LW, LH, [CI(0xFF07050A, 0.82), CI(0xFF07050A, 0.35), CI(0xFF07050A, 0.0)], [0, 0.5, 0.8])
    vgrad(c, 0, 0, LW, LH, [CI(0xFF000000, 0.25), CI(0xFF000000, 0.0), CI(0xFF000000, 0.35)], [0, 0.5, 1])
    title_block(c, 150, 500, 1.0, align='l')
    line(c, 152, 720, 300, 720, 'vermilion', 3.0, 1.0)
    draw_text(c, '一部关于“深时间”的纪录短片', 150, 780, 'sans', 30, 'paper', 0.85, align='l', tracking=0.15)
    a = fr.read()
    Image.fromarray(a[..., :3].copy()).save('/tmp/claude-0/proj/out/cover_16x9.jpg', quality=95)
    # 3:4 竖版：从无字背景中裁切
    fr2 = background(3840)
    bgarr = fr2.read()[..., :3].copy()
    W, H = bgarr.shape[1], bgarr.shape[0]
    cw = int(H * 3 / 4)
    x0 = int(W * 0.55 - cw / 2)
    crop = np.ascontiguousarray(np.concatenate([bgarr[:, x0:x0 + cw], np.full((H, cw, 1), 255, np.uint8)], -1))
    surf = skia.Surface(cw, H)
    cc = surf.getCanvas()
    img = skia.Image.fromarray(crop, colorType=skia.kRGBA_8888_ColorType)
    cc.drawImage(img, 0, 0)
    s = cw / 810.0
    cc.scale(s, s)
    vgrad(cc, 0, 0, 810, 1080, [CI(0xFF000000, 0.15), CI(0xFF000000, 0.0), CI(0xFF06040A, 0.88)], [0, 0.35, 0.8])
    title_block(cc, 405, 780, 0.62)
    line(cc, 380, 900, 430, 900, 'vermilion', 2.0, 1.0)
    out = surf.makeImageSnapshot().toarray(colorType=skia.kRGBA_8888_ColorType)[..., :3]
    Image.fromarray(out.copy()).save('/tmp/claude-0/proj/out/cover_3x4.jpg', quality=95)
    print('ok')
