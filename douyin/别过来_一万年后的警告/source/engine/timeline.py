# -*- coding: utf-8 -*-
"""全片时间轴：由配音时长 + 停顿 + 章节卡生成每句旁白的起止时间。"""
import json, os, sys
sys.path.insert(0, '/tmp/claude-0/proj')
import script as S

PROJ = '/tmp/claude-0/proj'
OPEN_LEAD = 0.5        # 片头：前置高光几乎立刻开始
TITLE_AFTER = 'H3'     # 标题“别过来”砸在这句之后
TITLE_GAP = 1.7        # 标题重击的停顿
STORY_LEAD = 2.6       # 钩子结束后，打字机英文先出现再进旁白
CARD_GAP = 2.2         # 章节卡（无旁白）
EPI_GAP = 1.8
END_TAIL = 7.0         # 片尾
PAUSE_SCALE = 0.45


def build(durs):
    """durs: {line_id: seconds}. 返回 dict(lines, chapters, total, title)."""
    t = OPEN_LEAD
    lines = {}
    chapters = {}
    title = None
    cur_ch = 'c0'
    for lid, ch, text, pause in S.LINES:
        if lid == 'L01':
            chapters['story'] = (t, t + STORY_LEAD)
            t += STORY_LEAD
        if lid == 'L104':
            chapters['end'] = (t - 0.2, None)
        if ch != cur_ch:
            gap = EPI_GAP if ch == 'c7' else CARD_GAP
            chapters[ch] = (t, t + gap)
            t += gap
            cur_ch = ch
        d = durs[lid]
        lines[lid] = (round(t, 4), round(t + d, 4))
        t += d + pause * PAUSE_SCALE
        if lid == TITLE_AFTER:
            title = (t - 0.05, t + TITLE_GAP)
            t += TITLE_GAP
    end = t + END_TAIL
    chapters['end'] = (chapters['end'][0], end)
    return dict(lines=lines, chapters=chapters, total=round(end, 3), title=title)


def load():
    with open(os.path.join(PROJ, 'audio', 'timeline.json')) as f:
        tl = json.load(f)
    tl['lines'] = {k: tuple(v) for k, v in tl['lines'].items()}
    tl['chapters'] = {k: tuple(v) for k, v in tl['chapters'].items()}
    tl['title'] = tuple(tl['title'])
    return tl
