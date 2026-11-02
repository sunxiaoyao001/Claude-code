"""Line-screen engraving: turns a photograph into banknote-style ink lines on
a transparent background. Usage: engrave.py in out.webp height [crop l,t,r,b] [period] [contrast]"""
import sys, numpy as np
from PIL import Image, ImageFilter, ImageOps

def engrave(src, out, H, crop=None, period=5.2, contrast=1.25, ink=(22,27,38), gamma=0.8, angle=28, bg_cut=0.93, floor=0.14):
    im = Image.open(src).convert('L')
    if crop: im = im.crop(crop)
    SS = 2
    w = int(im.width * H / im.height)
    im = im.resize((w*SS, H*SS), Image.LANCZOS)
    im = ImageOps.autocontrast(im, cutoff=1)
    g = np.asarray(im.filter(ImageFilter.GaussianBlur(1.2*SS)), dtype=np.float32)/255.0
    g = np.clip((g-0.5)*contrast+0.5, 0, 1)
    form = np.asarray(im.filter(ImageFilter.GaussianBlur(18*SS)), dtype=np.float32)/255.0
    yy, xx = np.mgrid[0:g.shape[0], 0:g.shape[1]].astype(np.float32)
    p = period*SS
    a = np.deg2rad(angle)
    # main line set follows form: phase warped by the large-scale tone
    ph1 = (xx*np.sin(a) + yy*np.cos(a))/p + form*2.2
    s1 = np.abs((ph1 % 1.0) - 0.5)*2          # 0 at line centre, 1 between lines
    dark = np.clip(1-g, 0, 1)
    t1 = np.clip(floor + (1-floor)*dark**gamma, 0, 1)
    ink1 = np.clip((t1 - s1)*p*0.9 + 0.5, 0, 1)
    # cross-hatch in the shadows
    a2 = np.deg2rad(angle-62)
    ph2 = (xx*np.sin(a2) + yy*np.cos(a2))/(p*1.05) - form*1.6
    s2 = np.abs((ph2 % 1.0) - 0.5)*2
    t2 = np.clip((dark-0.52)/0.48, 0, 1)**1.1 * 0.9
    ink2 = np.clip((t2 - s2)*p*0.9 + 0.5, 0, 1)
    # stipple-free highlights: fade lines out in near-white paper
    alpha = np.maximum(ink1, ink2)
    soft = np.asarray(im.filter(ImageFilter.GaussianBlur(10*SS)), dtype=np.float32)/255.0
    if bg_cut < 1: alpha *= np.clip((bg_cut - soft)/0.05, 0, 1)
    A = Image.fromarray((alpha*255).astype(np.uint8)).resize((w, H), Image.LANCZOS)
    rgba = Image.new('RGBA', (w, H), ink + (0,))
    rgba.putalpha(A)
    rgba.save(out, 'WEBP', quality=80, alpha_quality=55, method=6)
    return rgba

if __name__ == '__main__':
    a = sys.argv
    crop = tuple(int(v) for v in a[4].split(',')) if len(a) > 4 and a[4] != '-' else None
    period = float(a[5]) if len(a) > 5 else 5.2
    contrast = float(a[6]) if len(a) > 6 else 1.25
    engrave(a[1], a[2], int(a[3]), crop, period, contrast)
