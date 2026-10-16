# -*- coding: utf-8 -*-
"""镜头表：每个镜头的起点锚定在旁白或章节卡上。"""
import sys
sys.path.insert(0, '/tmp/claude-0/proj')
from engine.film import Shot, Ctx
from scenes import common as CM
import importlib

_mods = {}


def M(name):
    if name not in _mods:
        _mods[name] = importlib.import_module('scenes.' + name)
    return _mods[name]


def card(idx, cn, en, theme='ink', accent='ember'):
    def f(c, lt, dur, ctx, sh):
        CM.chapter_card(c, lt, dur, idx, cn, en, theme, accent)
    return f


XD = {'black': 0.7, 'fade': 0.45, 'cut': 0.0, 'flash': 0.3}


def build(tl):
    ctx = Ctx(tl)
    L = lambda lid, d=0.0: tl['lines'][lid][0] + d
    CH = lambda k, d=0.0: tl['chapters'][k][0] + d
    m0 = M('ch0')
    hk = M('hook')
    plan = hk.plan_hook(tl, L, CH) + [
        ('title', tl['title'][0] - 0.02, m0.title, 'cut'),
        ('opening', CH('story', -0.3), m0.opening, 'black'),
        ('letter', L('L03', -0.5), m0.letter, 'fade'),
        ('team', L('L06', -0.4), m0.team, 'fade'),
        ('card1', CH('c1', -0.2), card(1, '一万年有多远', 'HOW FAR IS TEN THOUSAND YEARS'), 'black'),
    ]
    more = []
    for modname in ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7']:
        try:
            mod = M(modname)
        except ModuleNotFoundError:
            continue
        more += mod.plan(tl, L, CH, card)
    plan += more
    plan.sort(key=lambda x: x[1])
    shots = []
    for name, start, fn, trans in plan:
        shots.append(Shot(name, start, fn, trans, xd=XD.get(trans, 0.45)))
    for i, s in enumerate(shots):
        s.end = shots[i + 1].start if i + 1 < len(shots) else tl['total']
    ctx.shots = shots
    return shots, ctx
