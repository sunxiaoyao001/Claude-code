# -*- coding: utf-8 -*-
"""全片时间轴：由配音时长 + 停顿 + 章节卡生成每句旁白的起止时间。"""
import json, os, sys
sys.path.insert(0, '/tmp/claude-0/proj')
import script as S

PROJ = '/tmp/claude-0/proj'
OPEN_LEAD = 4.2        # 片头：打字机英文先出现
TITLE_GAP = 6.0        # “别过来”标题停留
CARD_GAP = 3.0         # 章节卡（无旁白）
EPI_GAP = 2.4
END_TAIL = 9.0         # 片尾
PAUSE_SCALE = 0.55


def build(durs):
    """durs: {line_id: seconds}. 返回 dict(lines, chapters, total, title)."""
    t = OPEN_LEAD
    lines = {}
    chapters = {}
    title = None
    cur_ch = 'c0'
    for lid, ch, text, pause in S.LINES:
        if ch != cur_ch:
            gap = EPI_GAP if ch == 'c7' else CARD_GAP
            chapters[ch] = (t, t + gap)
            t += gap
            cur_ch = ch
        d = durs[lid]
        lines[lid] = (round(t, 4), round(t + d, 4))
        t += d + pause * PAUSE_SCALE
        if lid == 'L08':
            title = (t - 0.2, t + TITLE_GAP)
            t += TITLE_GAP
    end = t + END_TAIL
    chapters['end'] = (t, end)
    return dict(lines=lines, chapters=chapters, total=round(end, 3), title=title)


def load():
    with open(os.path.join(PROJ, 'audio', 'timeline.json')) as f:
        tl = json.load(f)
    tl['lines'] = {k: tuple(v) for k, v in tl['lines'].items()}
    tl['chapters'] = {k: tuple(v) for k, v in tl['chapters'].items()}
    tl['title'] = tuple(tl['title'])
    return tl
