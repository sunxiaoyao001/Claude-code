# -*- coding: utf-8 -*-
"""镜头编排、转场、字幕、章节角标。"""
import math, re, sys
sys.path.insert(0, '/tmp/claude-0/proj')
import skia
from .core import *
import script as S

SUB_FONT = 'sans-m'
SUB_SIZE = 46
SUB_Y = LH - 82
SUB_MAX = 22  # 每条字幕最多字数


class Ctx:
    def __init__(self, tl):
        self.tl = tl
        self.lines = tl['lines']
        self.ch = tl['chapters']

    def ls(self, lid):
        return self.lines[lid][0]

    def le(self, lid):
        return self.lines[lid][1]


class Shot:
    def __init__(self, name, start, fn, trans='fade', xd=0.9, data=None):
        self.name, self.start, self.fn, self.trans, self.xd = name, start, fn, trans, xd
        self.end = None
        self.data = data or {}


def split_sub(text):
    """按标点把长句切成若干字幕块。"""
    text = text.strip()
    parts = re.split(r'(?<=[，。：；！？、])', text)
    parts = [p for p in parts if p]
    chunks, cur = [], ''
    for p in parts:
        if len(cur) + len(p) <= SUB_MAX:
            cur += p
        else:
            if cur:
                chunks.append(cur)
            while len(p) > SUB_MAX:
                chunks.append(p[:SUB_MAX]); p = p[SUB_MAX:]
            cur = p
    if cur:
        chunks.append(cur)
    # 去掉块尾的逗号句号（字幕习惯），保留问号感叹号和引号
    out = []
    for ch in chunks:
        ch2 = ch.rstrip('，。、；：')
        out.append(ch2 if ch2 else ch)
    return out


def build_subs(tl):
    global _LINE_STARTS
    _LINE_STARTS = sorted(v[0] for v in tl['lines'].values())
    subs = []
    for lid, chid, text, pause in S.LINES:
        if lid in NO_SUB:
            continue
        disp = S.SUB_OVERRIDE.get(lid, text)
        s, e = tl['lines'][lid]
        chunks = split_sub(disp)
        tot = sum(len(c) for c in chunks)
        t = s
        for i, ch in enumerate(chunks):
            d = (e - s) * len(ch) / tot
            subs.append((t, t + d, ch, lid))
            t += d
    return subs


KEYWORDS = ['荣耀之地', '核废料', '钚-239', '半衰期', '甲骨文', '线形文字A', '印章文字', '饥饿石', '海啸石',
            '如果你看见我，就哭吧', '此处以下，勿建房屋', '骷髅头', '逃跑的人', '诅咒', '宝藏', '原子祭司团', '辐射猫',
            '荆棘之地', '黑洞', '禁忌巨石', '七种语言', '中文', '安卡罗', '铜罐', '膨润土', '乏燃料', '北山', '什么都不留',
            '别过来', '评论区', '强大的文明', '疯狂', '冰盖', '磁铁', '一封信', '这封信', '陌生人', '危险']
_NUM = re.compile(r'[0-9][0-9,.\-]*\+?(?:年|米|人|个国家)?|[零〇一二三四五六七八九十百千万亿两]{2,}多?(?:亿年|万年|年|米|代|个国家|个人)?|[一二三四五六七八九十两]多?(?:亿年|万年|年|米)')


def highlight_mask(text):
    m = [False] * len(text)
    for kw in KEYWORDS:
        i = text.find(kw)
        while i >= 0:
            for j in range(i, i + len(kw)):
                m[j] = True
            i = text.find(kw, i + 1)
    for mt in _NUM.finditer(text):
        s_, e_ = mt.span()
        if e_ - s_ >= 2 or text[s_].isdigit():
            for j in range(s_, e_):
                m[j] = True
    return m


NO_SUB = {'L102', 'L103', 'L104', 'L72', 'L73', 'L74', 'L75', 'L76', 'L77', 'L78', 'L79', 'L80'}


def draw_subtitle(c, t, subs):
    for i, (s, e, text, lid) in enumerate(subs):
        if t < s - 0.12 or t > e + 0.25:
            continue
        # 和下一条紧邻时不做淡出，直接替换
        nxt = subs[i + 1][0] if i + 1 < len(subs) else 1e9
        prv = subs[i - 1][1] if i > 0 else -1e9
        fout = 0.0 if nxt - e < 0.3 else 0.22
        a = 1.0
        if s - prv < 0.3:
            if t < s:
                continue
        else:
            a = min(a, ease_out_cubic(remap(t, s - 0.12, s + 0.08)))
        if fout > 0:
            a = min(a, 1 - smooth(remap(t, e + 0.03, e + 0.03 + fout)))
        elif t > e:
            continue
        if a <= 0.01:
            continue
        items, w = layout(text, SUB_FONT, SUB_SIZE, 0.04)
        x0 = LW / 2 - w / 2
        # 柔和底部压暗，保证亮背景下的可读性
        sh_ = skia.GradientShader.MakeRadial(skia.Point(LW / 2, SUB_Y - 14), 1.0,
                                             [CI(0xFF000000, 0.42 * a), CI(0xFF000000, 0.0)], [0.0, 1.0])
        c.save()
        c.translate(LW / 2, SUB_Y - 14)
        c.scale(w / 2 + 260, 74)
        c.translate(-LW / 2, -(SUB_Y - 14))
        c.drawCircle(LW / 2, SUB_Y - 14, 1.0, skia.Paint(AntiAlias=True, Shader=sh_))
        c.restore()
        f_sh = skia.Paint(AntiAlias=True, Color4f=C(0xFF000000, 0.55 * a),
                          MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 7))
        p = skia.Paint(AntiAlias=True, Color4f=C('bone', a))
        ph = skia.Paint(AntiAlias=True, Color4f=C(0xFFF2B45A, a))
        hm = highlight_mask(text)
        for ch, fn, cx in items:
            f = font(fn, SUB_SIZE)
            c.drawString(ch, x0 + cx, SUB_Y + 3, f, f_sh)
        for k, (ch, fn, cx) in enumerate(items):
            f = font(fn, SUB_SIZE)
            c.drawString(ch, x0 + cx, SUB_Y, f, ph if hm[k] else p)


def chapter_tag(c, t, ctx):
    """左上角章节角标。"""
    names = {k: (i, n, e) for i, (k, n, e) in enumerate(S.CHAPTERS)}
    for k in ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']:
        if k not in ctx.ch:
            continue
        cs, ce = ctx.ch[k]
        # 本章结束 = 下一章卡开始
        order = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'end']
        nk = order[order.index(k) + 1]
        end = ctx.ch[nk][0] if nk in ctx.ch else 1e9
        a = window(t, ce + 0.6, end - 0.2, 1.2, 0.6)
        if a <= 0.01:
            continue
        i, n, e = names[k]
        draw_text(c, '%02d' % i, 96, 92, 'mono', 17, 'ash', a * 0.85, align='l', tracking=0.1)
        line(c, 132, 86, 160, 86, 'ash', 1.0, a * 0.6)
        draw_text(c, n, 172, 93, 'sans', 18, 'ash', a * 0.9, align='l', tracking=0.15)


NOPUSH = {'wipp', 'thorns', 'blackhole', 'blocks', 'primal', 'repository', 'tsunami', 'letter_final', 'bars',
          'letter', 'glacier', 'well', 'beishan'}


_LINE_STARTS = []


def _call(sh, c, lt, dur, ctx):
    """镜头统一加一层极缓的推近，让静态画面也有呼吸感。"""
    if sh.name in NOPUSH:
        sh.fn(c, lt, dur, ctx, sh)
        return
    z = 1 + 0.028 * ease_in_out_sine(clamp(lt / max(dur, 0.1)))
    # 每句旁白开始时给一个极轻的“推一下”，让画面跟着语气呼吸
    t_abs = sh.start + lt
    for st in _LINE_STARTS:
        x = t_abs - st
        if 0 < x < 4.0 and sh.start - 0.2 <= st <= sh.end:
            z += 0.014 * ease_out_cubic(clamp(x / 0.35)) * math.exp(-max(0.0, x - 0.35) / 1.1)
    c.save()
    c.translate(LW / 2, LH / 2)
    c.scale(z, z)
    c.translate(-LW / 2, -LH / 2)
    sh.fn(c, lt, dur, ctx, sh)
    c.restore()


def render_frame(fr, t, shots, subs, ctx, overlay=True):
    from scenes import common as _cm
    _cm.set_time(t)
    c = fr.begin()
    # 找出当前时间的镜头及转场权重
    active = []
    for i, sh in enumerate(shots):
        s, e = sh.start, sh.end
        if t < s - 0.0001 or t >= e + (shots[i + 1].xd if (i + 1 < len(shots) and shots[i + 1].trans == 'fade') else 0):
            continue
        active.append((i, sh))
    drawn = False
    for i, sh in active:
        lt = t - sh.start
        dur = sh.end - sh.start
        w = 1.0
        if sh.trans == 'fade' and i > 0:
            w = smooth(remap(t, sh.start, sh.start + sh.xd))
        elif sh.trans == 'black' and i > 0:
            w = smooth(remap(t, sh.start, sh.start + sh.xd))
        if not drawn or w >= 0.999:
            if w < 0.999 and sh.trans == 'black':
                _call(sh, c, lt, dur, ctx)
                c.drawRect(skia.Rect.MakeWH(LW, LH), paint(0xFF000000, 1 - w))
            else:
                _call(sh, c, lt, dur, ctx)
                if sh.trans == 'flash' and i > 0 and lt < sh.xd:
                    k = 1 - lt / sh.xd
                    c.drawRect(skia.Rect.MakeWH(LW, LH), paint(0xFFFFF1E0, 0.6 * k * k))
            drawn = True
        else:
            if sh.trans == 'black':
                # 先压黑上一镜头，再淡入本镜头
                c.drawRect(skia.Rect.MakeWH(LW, LH), paint(0xFF000000, smooth(remap(w, 0, 0.5))))
                c.saveLayerAlpha(None, int(255 * smooth(remap(w, 0.5, 1.0))))
            else:
                c.saveLayerAlpha(None, int(255 * w))
            _call(sh, c, lt, dur, ctx)
            c.restore()
    if overlay:
        chapter_tag(c, t, ctx)
        draw_subtitle(c, t, subs)
    return fr.read()
