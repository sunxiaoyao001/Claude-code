# -*- coding: utf-8 -*-
"""逐帧渲染引擎核心：画布、缓动、颜色、字体、排版、基础图形。
所有绘制使用 1920x1080 逻辑坐标，帧开始时整体 scale 到输出分辨率。
"""
import math, functools, os
import numpy as np
import skia

LW, LH = 1920.0, 1080.0
FD = '/tmp/claude-0/proj/fonts/'

# ------------------------------------------------------------------ 调色板
PAL = dict(
    ink=0xFF09090B, basalt=0xFF141418, slate=0xFF1D1E24,
    bone=0xFFEDE6D8, paper=0xFFE4DCCB, ash=0xFF8E887C, dim=0xFF5A564F,
    sand=0xFFC9A77C, ember=0xFFE2A24A, gold=0xFFD9B26F,
    vermilion=0xFFD2432C, blood=0xFF9E2A1E,
    glacier=0xFFA9C3CF, ice=0xFFDCE8EE, steel=0xFF5F7884, copper=0xFFB87333,
)


def C(hexv, a=1.0):
    """ARGB int -> skia Color4f with alpha multiplier."""
    if isinstance(hexv, str):
        hexv = PAL[hexv]
    r = ((hexv >> 16) & 255) / 255.0
    g = ((hexv >> 8) & 255) / 255.0
    b = (hexv & 255) / 255.0
    aa = ((hexv >> 24) & 255) / 255.0
    return skia.Color4f(r, g, b, max(0.0, min(1.0, aa * a)))


def CI(hexv, a=1.0):
    """ARGB int with alpha multiplier -> ARGB int."""
    if isinstance(hexv, str):
        hexv = PAL[hexv]
    aa = int(round(((hexv >> 24) & 255) * max(0.0, min(1.0, a))))
    return (aa << 24) | (hexv & 0xFFFFFF)


def mixc(c1, c2, t):
    if isinstance(c1, str): c1 = PAL[c1]
    if isinstance(c2, str): c2 = PAL[c2]
    t = max(0.0, min(1.0, t))
    out = 0
    for sh in (24, 16, 8, 0):
        a = (c1 >> sh) & 255; b = (c2 >> sh) & 255
        out |= int(round(a + (b - a) * t)) << sh
    return out


def rgb(r, g, b, a=255):
    return (int(a) << 24) | (int(r) << 16) | (int(g) << 8) | int(b)


# ------------------------------------------------------------------ 缓动
def clamp(x, a=0.0, b=1.0):
    return a if x < a else (b if x > b else x)


def lerp(a, b, t):
    return a + (b - a) * t


def remap(x, a, b):
    """x 在 [a,b] 上映射到 [0,1] 并截断。"""
    if b == a:
        return 1.0 if x >= b else 0.0
    return clamp((x - a) / (b - a))


def smooth(t):
    t = clamp(t); return t * t * (3 - 2 * t)


def smoother(t):
    t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10)


def ease_out_cubic(t):
    t = clamp(t); return 1 - (1 - t) ** 3


def ease_out_quint(t):
    t = clamp(t); return 1 - (1 - t) ** 5


def ease_out_expo(t):
    t = clamp(t); return 1.0 if t >= 1 else 1 - 2 ** (-10 * t)


def ease_in_out_cubic(t):
    t = clamp(t)
    return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def ease_in_out_sine(t):
    t = clamp(t); return -(math.cos(math.pi * t) - 1) / 2


def ease_in_cubic(t):
    t = clamp(t); return t * t * t


def ease_in_out_expo(t):
    t = clamp(t)
    if t <= 0: return 0.0
    if t >= 1: return 1.0
    return 2 ** (20 * t - 10) / 2 if t < 0.5 else (2 - 2 ** (-20 * t + 10)) / 2


def spring(t, freq=1.6, damping=0.55):
    """闭式欠阻尼弹簧，从 0 到 1。t 为秒。"""
    if t <= 0: return 0.0
    w = 2 * math.pi * freq
    z = damping
    if z >= 1: return 1 - math.exp(-w * t) * (1 + w * t)
    wd = w * math.sqrt(1 - z * z)
    return 1 - math.exp(-z * w * t) * (math.cos(wd * t) + z * w / wd * math.sin(wd * t))


def window(t, t0, t1, fin=0.5, fout=0.5, ease=smooth):
    """t 在 [t0,t1] 窗口内的可见度（带淡入淡出）。"""
    if t < t0 or t > t1: return 0.0
    a = ease(remap(t, t0, t0 + fin)) if fin > 0 else 1.0
    b = ease(remap(t, t1, t1 - fout)) if fout > 0 else 1.0
    return min(a, b)


def hash01(*xs):
    h = 0
    for x in xs:
        h = (h * 1000003) ^ (int(x * 7919) & 0xFFFFFFFF)
    h = (h ^ (h >> 13)) * 0x5BD1E995 & 0xFFFFFFFF
    h ^= h >> 15
    return (h & 0xFFFFFF) / float(0xFFFFFF)


def wobble(t, seed=0.0, f=0.2):
    """平滑伪随机 -1..1，由几组正弦叠加。"""
    return (math.sin(t * f * 6.283 + seed * 12.9898) * 0.5
            + math.sin(t * f * 2.71 * 6.283 + seed * 78.233) * 0.3
            + math.sin(t * f * 5.13 * 6.283 + seed * 37.719) * 0.2)


# ------------------------------------------------------------------ 字体
FONT_FILES = {
    'serif-l': 'NotoSerifSC_300Light.ttf', 'serif-r': 'NotoSerifSC_400Regular.ttf',
    'serif': 'NotoSerifSC_500Medium.ttf', 'serif-sb': 'NotoSerifSC_600SemiBold.ttf',
    'serif-b': 'NotoSerifSC_700Bold.ttf', 'serif-k': 'NotoSerifSC_900Black.ttf',
    'sans-l': 'NotoSansSC_300Light.ttf', 'sans': 'NotoSansSC_400Regular.ttf',
    'sans-m': 'NotoSansSC_500Medium.ttf', 'sans-b': 'NotoSansSC_700Bold.ttf',
    'corm-l': 'CormorantGaramond_300Light.ttf', 'corm-li': 'CormorantGaramond_300Light_Italic.ttf',
    'corm': 'CormorantGaramond_400Regular.ttf', 'corm-i': 'CormorantGaramond_400Regular_Italic.ttf',
    'corm-m': 'CormorantGaramond_500Medium.ttf', 'corm-mi': 'CormorantGaramond_500Medium_Italic.ttf',
    'corm-sb': 'CormorantGaramond_600SemiBold.ttf', 'corm-sbi': 'CormorantGaramond_600SemiBold_Italic.ttf',
    'mono-l': 'IBMPlexMono_300Light.ttf', 'mono': 'IBMPlexMono_400Regular.ttf',
    'mono-m': 'IBMPlexMono_500Medium.ttf',
    'inter-xl': 'Inter_200ExtraLight.ttf', 'inter-l': 'Inter_300Light.ttf',
    'inter': 'Inter_400Regular.ttf', 'inter-m': 'Inter_500Medium.ttf', 'inter-sb': 'Inter_600SemiBold.ttf',
    'lina': 'NotoSansLinearA_400Regular.ttf', 'arabic': 'NotoSansArabic_400Regular.ttf',
}
FALLBACK = {}
for k in FONT_FILES:
    if k.startswith(('serif', 'sans')):
        FALLBACK[k] = ['inter']
    else:
        FALLBACK[k] = ['sans', 'inter']


@functools.lru_cache(maxsize=None)
def typeface(name):
    return skia.Typeface.MakeFromFile(FD + FONT_FILES[name])


@functools.lru_cache(maxsize=4096)
def font(name, size):
    f = skia.Font(typeface(name), float(size))
    f.setSubpixel(True)
    f.setEdging(skia.Font.Edging.kAntiAlias)
    f.setHinting(skia.FontHinting.kNone)
    f.setLinearMetrics(True)
    return f


@functools.lru_cache(maxsize=65536)
def _glyph_info(name, ch):
    """返回 (实际字体名, 字宽@size1000)。"""
    for fn in [name] + FALLBACK.get(name, []):
        f = font(fn, 1000)
        g = f.textToGlyphs(ch)
        if len(g) and g[0] != 0:
            return fn, f.measureText(ch)
    return name, font(name, 1000).measureText(ch)


def _is_cjk_punct(ch):
    return ch in '，。、：；！？“”‘’（）《》——…·「」'


def layout(text, name, size, tracking=0.0):
    """单行排版 -> [(ch, fontname, x)], 总宽。tracking 以字号为单位。"""
    out = []
    x = 0.0
    sc = size / 1000.0
    for i, ch in enumerate(text):
        fn, w = _glyph_info(name, ch)
        out.append((ch, fn, x))
        x += w * sc + (tracking * size if i < len(text) - 1 else 0)
    return out, x


def text_width(text, name, size, tracking=0.0):
    return layout(text, name, size, tracking)[1]


_PAINT = skia.Paint(AntiAlias=True)


def draw_text(c, text, x, y, name, size, color='bone', alpha=1.0, align='c', tracking=0.0,
              t=None, stagger=0.035, dur=0.6, rise=0.35, blur_in=0.0, glow=None, glow_alpha=0.5,
              out_t=None, out_dur=0.5, out_stagger=0.0, per_char=None, mode='up'):
    """绘制一行文字。
    t: 若给定，则做逐字入场（t 为相对入场开始的秒数）。
    out_t: 若给定，则做逐字退场。
    per_char: 可选回调 (i, ch) -> (alpha_mul, dx, dy, color or None)
    返回 (x0, width)。
    """
    if alpha <= 0.002 or not text:
        return x, 0
    items, w = layout(text, name, size, tracking)
    if align == 'c':
        x0 = x - w / 2
    elif align == 'r':
        x0 = x - w
    else:
        x0 = x
    n = len(items)
    col_default = color
    for i, (ch, fn, cx) in enumerate(items):
        if ch == ' ':
            continue
        a = alpha
        dx = dy = 0.0
        blur = 0.0
        col = col_default
        if t is not None:
            p = clamp((t - i * stagger) / dur)
            e = ease_out_cubic(p)
            a *= e
            if mode == 'up':
                dy += (1 - e) * rise * size
            elif mode == 'down':
                dy -= (1 - e) * rise * size
            if blur_in > 0:
                blur = (1 - e) * blur_in
        if out_t is not None:
            p = clamp((out_t - i * out_stagger) / out_dur)
            e = ease_in_out_cubic(p)
            a *= (1 - e)
            if blur_in > 0:
                blur = max(blur, e * blur_in)
            dy -= e * rise * size * 0.5
        if per_char is not None:
            am, ddx, ddy, cc = per_char(i, ch)
            a *= am; dx += ddx; dy += ddy
            if cc is not None:
                col = cc
        if a <= 0.003:
            continue
        f = font(fn, size)
        px, py = x0 + cx + dx, y + dy
        if glow is not None:
            gp = skia.Paint(AntiAlias=True, Color4f=C(glow, a * glow_alpha),
                            MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, size * 0.18))
            c.drawString(ch, px, py, f, gp)
        p = skia.Paint(AntiAlias=True, Color4f=C(col, a))
        if blur > 0.05:
            p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, blur))
        c.drawString(ch, px, py, f, p)
    return x0, w


def wrap_cjk(text, name, size, max_w, tracking=0.0):
    """中文按宽度折行，标点不放行首。"""
    lines = []
    cur = ''
    for ch in text:
        trial = cur + ch
        if text_width(trial, name, size, tracking) > max_w and cur:
            if _is_cjk_punct(ch):
                cur = trial
                continue
            lines.append(cur)
            cur = ch
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines


def wrap_words(text, name, size, max_w, tracking=0.0):
    words = text.split(' ')
    lines, cur = [], ''
    for wd in words:
        trial = (cur + ' ' + wd) if cur else wd
        if text_width(trial, name, size, tracking) > max_w and cur:
            lines.append(cur); cur = wd
        else:
            cur = trial
    if cur: lines.append(cur)
    return lines


# ------------------------------------------------------------------ 图形
def paint(color='bone', alpha=1.0, stroke=None, cap='round', join='round', blur=None, aa=True):
    p = skia.Paint(AntiAlias=aa, Color4f=C(color, alpha))
    if stroke is not None:
        p.setStyle(skia.Paint.kStroke_Style)
        p.setStrokeWidth(stroke)
        p.setStrokeCap({'round': skia.Paint.kRound_Cap, 'butt': skia.Paint.kButt_Cap,
                        'square': skia.Paint.kSquare_Cap}[cap])
        p.setStrokeJoin({'round': skia.Paint.kRound_Join, 'miter': skia.Paint.kMiter_Join,
                         'bevel': skia.Paint.kBevel_Join}[join])
    if blur:
        p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, blur))
    return p


def line(c, x1, y1, x2, y2, color='bone', w=1.5, alpha=1.0, p=1.0, cap='round', dash=None):
    if alpha <= 0.003 or p <= 0: return
    x2b = x1 + (x2 - x1) * p; y2b = y1 + (y2 - y1) * p
    pt = paint(color, alpha, stroke=w, cap=cap)
    if dash:
        pt.setPathEffect(skia.DashPathEffect.Make(dash, 0))
    c.drawLine(x1, y1, x2b, y2b, pt)


def poly_path(pts, closed=True):
    path = skia.Path()
    if len(pts) == 0: return path
    path.moveTo(float(pts[0][0]), float(pts[0][1]))
    for q in pts[1:]:
        path.lineTo(float(q[0]), float(q[1]))
    if closed: path.close()
    return path


def trimmed(path, p0, p1):
    """返回 path 的 [p0,p1] 片段绘制用 PathEffect。"""
    return skia.TrimPathEffect.Make(max(0.0, p0), min(1.0, p1))


def stroke_path(c, path, color='bone', w=1.5, alpha=1.0, p=1.0, p0=0.0, dash=None, cap='round', blur=None):
    if alpha <= 0.003 or p <= p0: return
    pt = paint(color, alpha, stroke=w, cap=cap, blur=blur)
    effs = []
    if p < 1.0 or p0 > 0:
        effs.append(trimmed(path, p0, p))
    if dash:
        effs.append(skia.DashPathEffect.Make(dash, 0))
    if len(effs) == 1:
        pt.setPathEffect(effs[0])
    elif len(effs) == 2:
        pt.setPathEffect(skia.PathEffect.MakeCompose(effs[1], effs[0]))
    c.drawPath(path, pt)


def fill_path(c, path, color='bone', alpha=1.0, blur=None):
    if alpha <= 0.003: return
    c.drawPath(path, paint(color, alpha, blur=blur))


def glow(c, x, y, r, color='ember', alpha=1.0, core=0.0):
    """径向渐变光斑（无模糊滤镜，便宜）。"""
    if alpha <= 0.003 or r <= 0.5: return
    col = color if isinstance(color, int) else PAL[color]
    cs = [CI(col, alpha), CI(col, alpha * 0.35), CI(col, alpha * 0.08), CI(col, 0)]
    pos = [0.0, 0.25 + core * 0.5, 0.6, 1.0]
    sh = skia.GradientShader.MakeRadial(skia.Point(x, y), r, cs, pos)
    c.drawCircle(x, y, r, skia.Paint(AntiAlias=True, Shader=sh))


def dot(c, x, y, r, color='bone', alpha=1.0):
    if alpha <= 0.003: return
    c.drawCircle(x, y, r, paint(color, alpha))


def rect(c, x, y, w, h, color='bone', alpha=1.0, stroke=None, r=0):
    if alpha <= 0.003: return
    p = paint(color, alpha, stroke=stroke)
    if r > 0:
        c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(x, y, w, h), r, r), p)
    else:
        c.drawRect(skia.Rect.MakeXYWH(x, y, w, h), p)


def _full_grad(c, colors, pos, alpha, vertical):
    key = ('grad', tuple(CI(cc, alpha) for cc in colors), tuple(pos) if pos else None, vertical)
    W, H = int(round(LW * CUR_S)), int(round(LH * CUR_S))

    def b(W, H):
        cols = [CI(cc, alpha) for cc in colors]
        n = len(cols)
        ps = list(pos) if pos else [i / (n - 1) for i in range(n)]
        L = H if vertical else W
        u = np.linspace(0, 1, L, dtype=np.float32)
        ch = []
        for sh in (16, 8, 0, 24):
            v = np.array([((cc >> sh) & 255) for cc in cols], np.float32)
            ch.append(np.interp(u, ps, v))
        a = ch[3] / 255.0
        line_ = np.stack([ch[0] * a, ch[1] * a, ch[2] * a, ch[3]], -1)
        line_ += np.random.default_rng(5).uniform(-0.5, 0.5, line_.shape).astype(np.float32) * (line_[..., 3:4] > 0)
        line_ = np.clip(line_ + 0.5, 0, 255).astype(np.uint8)
        if vertical:
            return np.broadcast_to(line_[:, None, :], (H, W, 4)).copy()
        return np.broadcast_to(line_[None, :, :], (H, W, 4)).copy()
    if sum(1 for k in _IMG_CACHE if isinstance(k[0], tuple) and k[0][0] == 'grad') > 24:
        for k in [k for k in _IMG_CACHE if isinstance(k[0], tuple) and k[0][0] == 'grad']:
            del _IMG_CACHE[k]
    img = cached_image(key, W, H, b)
    draw_device_image(c, img)


def _covers_full(c, x, y, w, h):
    m = c.getTotalMatrix()
    r = m.mapRect(skia.Rect.MakeXYWH(x, y, w, h))
    S = CUR_S
    return r.left() <= 0.5 and r.top() <= 0.5 and r.right() >= LW * S - 0.5 and r.bottom() >= LH * S - 0.5 \
        and abs(m.getScaleX() - m.getScaleY()) < 1e-6 and abs(m.getSkewX()) < 1e-9 and \
        abs(r.width() - w * m.getScaleX()) < 1 and x <= 0 and y <= 0 and x + w >= LW and y + h >= LH and \
        abs(m.getScaleX() - S) < 1e-6


def vgrad(c, x, y, w, h, colors, pos=None, alpha=1.0):
    if _covers_full(c, x, y, w, h) and alpha >= 1.0 and all(((CI(cc, 1) >> 24) & 255) == 255 for cc in colors):
        _full_grad(c, colors, pos, alpha, True)
        return
    cols = [CI(cc, alpha) for cc in colors]
    sh = skia.GradientShader.MakeLinear([skia.Point(x, y), skia.Point(x, y + h)], cols, pos)
    c.drawRect(skia.Rect.MakeXYWH(x, y, w, h), skia.Paint(Shader=sh))


def hgrad(c, x, y, w, h, colors, pos=None, alpha=1.0):
    cols = [CI(cc, alpha) for cc in colors]
    sh = skia.GradientShader.MakeLinear([skia.Point(x, y), skia.Point(x + w, y)], cols, pos)
    c.drawRect(skia.Rect.MakeXYWH(x, y, w, h), skia.Paint(Shader=sh))


def points(c, xy, r, color='bone', alpha=1.0):
    """批量画圆点。xy: Nx2 numpy。"""
    if alpha <= 0.003 or len(xy) == 0: return
    p = paint(color, alpha, stroke=r * 2, cap='round')
    pts = [skia.Point(float(a), float(b)) for a, b in xy]
    c.drawPoints(skia.Canvas.kPoints_PointMode, pts, p)


# ------------------------------------------------------------------ 渲染上下文
class Frame:
    def __init__(self, W, H):
        self.W, self.H = W, H
        self.S = W / LW
        self.surface = skia.Surface(W, H)
        self.info = skia.ImageInfo.Make(W, H, skia.kRGBA_8888_ColorType, skia.kPremul_AlphaType)
        self.buf = np.zeros((H, W, 4), np.uint8)

    def begin(self):
        global CUR_S
        CUR_S = self.S
        c = self.surface.getCanvas()
        c.resetMatrix()
        c.clear(skia.Color4f(0, 0, 0, 1))
        c.scale(self.S, self.S)
        return c

    def read(self):
        self.surface.readPixels(self.info, self.buf, self.W * 4, 0, 0)
        return self.buf


_IMG_CACHE = {}
CUR_S = 1.0


def cur_s():
    return CUR_S


def draw_full(c, img, alpha=1.0):
    """把设备分辨率的全屏图画进当前坐标系的 (0,0,LW,LH)（会跟随镜头缩放）。"""
    p = skia.Paint(AntiAlias=True)
    if alpha < 1.0:
        p.setAlphaf(alpha)
    c.drawImageRect(img, skia.Rect.MakeWH(LW, LH), skia.SamplingOptions(skia.FilterMode.kLinear), p)


def to_image(arr_rgba_premul):
    """RGBA(预乘) numpy -> BGRA 预乘 skia.Image（与光栅表面同格式，贴图最快）。"""
    a = np.ascontiguousarray(arr_rgba_premul[..., [2, 1, 0, 3]])
    return skia.Image.fromarray(a, colorType=skia.kBGRA_8888_ColorType, alphaType=skia.kPremul_AlphaType)


def cached_image(key, W, H, builder):
    """builder(W,H)->numpy RGBA uint8（不透明或已预乘）。按设备分辨率缓存成 skia.Image。"""
    k = (key, W, H)
    img = _IMG_CACHE.get(k)
    if img is None:
        img = to_image(builder(W, H))
        _IMG_CACHE[k] = img
    return img


def draw_device_image(c, img, alpha=1.0, mode=None):
    """以设备像素 1:1 画全屏图（忽略当前逻辑缩放）。"""
    c.save()
    c.resetMatrix()
    p = skia.Paint()
    if alpha < 1.0:
        p.setAlphaf(alpha)
    if mode is not None:
        p.setBlendMode(mode)
    c.drawImage(img, 0, 0, skia.SamplingOptions(), p)
    c.restore()


# ------------------------------------------------------------------ 背景构建（numpy）
def np_vgrad(W, H, stops):
    """stops: [(pos, (r,g,b)), ...] -> HxWx3 float32"""
    ys = np.linspace(0, 1, H, dtype=np.float32)
    pos = np.array([s[0] for s in stops], np.float32)
    cols = np.array([s[1] for s in stops], np.float32)
    out = np.empty((H, 3), np.float32)
    for k in range(3):
        out[:, k] = np.interp(ys, pos, cols[:, k])
    return np.broadcast_to(out[:, None, :], (H, W, 3)).copy()


def np_vignette(W, H, strength=0.55, power=2.2, cx=0.5, cy=0.5):
    y = (np.arange(H, dtype=np.float32) / H - cy)[:, None] * (H / W) * 1.6
    x = (np.arange(W, dtype=np.float32) / W - cx)[None, :] * 1.6 * 0.9
    d = np.sqrt(x * x + y * y)
    v = 1 - strength * np.clip(d, 0, 1.4) ** power
    return np.clip(v, 0, 1)


def np_grain(W, H, amount=3.0, seed=7):
    rng = np.random.default_rng(seed)
    return rng.normal(0, amount, (H, W, 1)).astype(np.float32)


def np_finish(rgbf):
    """float RGB 0..255 -> RGBA uint8 不透明"""
    H, W, _ = rgbf.shape
    out = np.empty((H, W, 4), np.uint8)
    out[..., :3] = np.clip(rgbf + 0.5, 0, 255).astype(np.uint8)
    out[..., 3] = 255
    return out


def hex3(h):
    if isinstance(h, str): h = PAL[h]
    return ((h >> 16) & 255, (h >> 8) & 255, h & 255)
