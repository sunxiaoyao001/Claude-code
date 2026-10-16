# -*- coding: utf-8 -*-
"""按时间轴编排配乐、音效，与旁白混音，输出 audio/mix.wav。"""
import sys, json, math, os
sys.path.insert(0, '/tmp/claude-0/proj')
sys.path.insert(0, '/tmp/claude-0/proj/audio')
import numpy as np
import soundfile as sf
from scipy import signal
from synth import *
import script as S
from engine import timeline as TLM
from scenes import shots as SH

tl = TLM.load()
shots, ctx = SH.build(tl)
SHOT = {s.name: (s.start, s.end) for s in shots}
TRANS = {s.name: s.trans for s in shots}
LN = tl['lines']
CH = tl['chapters']
TOTAL = tl['total']

music = Track(TOTAL)
sfx = Track(TOTAL)
amb = Track(TOTAL)

N = n2m
Dm9 = [N('D3'), N('F3'), N('A3'), N('C4'), N('E4')]
Bbm7 = [N('Bb2'), N('D3'), N('F3'), N('A3')]
Fma7 = [N('F2'), N('C3'), N('E3'), N('A3')]
Csus = [N('C3'), N('G3'), N('D4'), N('E4')]
Gm9 = [N('G2'), N('D3'), N('F3'), N('Bb3'), N('A4')]
Asus = [N('A2'), N('D3'), N('E3'), N('A3')]
A7 = [N('A2'), N('E3'), N('G3'), N('C#4')]
Dmaj = [N('D3'), N('F#3'), N('A3'), N('D4'), N('E4')]
PROG1 = [Dm9, Bbm7, Fma7, Csus]
PROG2 = [Bbm7, Fma7, Csus, Dm9]
PROG3 = [Gm9, Dm9, Asus, Dm9]
PROG5 = [Dm9, Bbm7, Gm9, Asus]


def chords(t0, t1, prog, step, amp=0.10, bright=0.45, bass_amp=0.16, with_bass=True, choir_amp=0.0, vowel='o',
           seed=0, piano_arp=0.0, arp_oct=12):
    """在 [t0,t1) 内按 step 秒循环和弦进行。"""
    t = t0
    k = 0
    while t < t1 - 0.5:
        ch = prog[k % len(prog)]
        d = min(step, t1 - t)
        ov = 2.5
        music.add(t, pad(ch, d + ov, amp=amp, attack=min(2.5, d * 0.5), release=min(3.0, d * 0.6) + ov * 0.5,
                         bright=bright, seed=seed + k))
        if with_bass:
            music.add(t, bass(ch[0] - 12 if ch[0] > 45 else ch[0], d + 1.5, amp=bass_amp, attack=1.2, release=2.0))
        if choir_amp > 0:
            music.add(t, choir([m + 12 for m in ch[1:4]], d + ov, amp=choir_amp, vowel=vowel, attack=2.5,
                               release=3.0, seed=seed + k))
        if piano_arp > 0:
            notes = [m + arp_oct for m in ch[1:4]] + [ch[1] + arp_oct + 12]
            for j, m in enumerate(notes):
                tt = t + 0.4 + j * (d / (len(notes) + 0.5))
                if tt < t1 - 0.3:
                    music.add(tt, piano(m, 5.0, vel=piano_arp * (0.8 + 0.2 * ((j + k) % 2)), p=(j - 1.5) * 0.25))
        t += step
        k += 1


def L(lid):
    return LN[lid][0]


def Le(lid):
    return LN[lid][1]


# =================================================================== 编排
title_t = tl['title'][0]
# --- 前置高光钩子 ---
story_t = CH['story'][0]
h1, h2, h3 = SHOT['hook1'], SHOT['hook2'], SHOT['hook3']
music.add(0.0, pad([N('D2'), N('A2')], title_t + 0.5, amp=0.10, attack=0.8, release=1.0, bright=0.2, seed=91))
music.add(0.0, pad([N('D4'), N('A4'), N('E5')], title_t + 0.3, amp=0.04, attack=1.5, release=0.8, bright=0.35, seed=92))
# H1：数字滚动的细碎机械声
for k in range(26):
    sfx.add(h1[0] + 0.2 + k * 0.055, click(0.03, 3200 + (k % 4) * 300, 0.03, p=0.2))
sfx.add(h1[0] + 0.15, thump(0.3, 48, 1.8))
# H2：下沉的风声 + 盖革计数器 + 心跳
sfx.add(h2[0], whoosh(1.4, 0.10))
sfx.add(h2[0] + 1.0, thump(0.45, 40, 2.4))
rng = np.random.default_rng(7)
t_ = h2[0] + 0.8
while t_ < h2[1]:
    sfx.add(t_, click(0.05 + 0.03 * rng.random(), 3500, 0.03, p=rng.uniform(-0.6, 0.6)))
    t_ += rng.exponential(0.07)
for t_ in np.arange(h2[0] + 1.2, h2[1], 0.85):
    sfx.add(float(t_), heartbeat(0.3))
# H3：快剪，每一刀一个冲击
n_cut = 8
seg = (h3[1] - h3[0] - 0.25) / n_cut
for k in range(n_cut):
    tc = h3[0] + k * seg
    sfx.add(tc - 0.25, whoosh(0.5, 0.07))
    sfx.add(tc, thump(0.28 + 0.03 * k, 55 - k * 2, 1.2))
# --- 故事开场（打字机）---
music.add(story_t - 0.5, pad([N('D4'), N('A4')], CH['c1'][0] - story_t + 1.0, amp=0.05, attack=3.0, release=2.5,
                             bright=0.15, seed=1))
music.add(story_t - 0.5, pad([N('D2')], CH['c1'][0] - story_t + 1.5, amp=0.06, attack=4.0, release=3.0, bright=0.1, seed=2))
amb.add(story_t - 0.5, wind(CH['c1'][0] - story_t + 2, amp=0.035, seed=11))
for k, (t_, m) in enumerate([(L('L01') - 0.2, N('A4')), (L('L03'), N('F4')), (L('L04') + 2.0, N('E4')),
                             (L('L06'), N('D4')), (L('L07') + 1.0, N('C5'))]):
    music.add(t_, piano(m, 6.0, vel=0.45, p=(k % 3 - 1) * 0.3))
# 打字机：开场英文 + 报告封面
op_txt = 'This place is not a place of honor.'
for k, ch in enumerate(op_txt):
    if ch != ' ':
        sfx.add(SHOT['opening'][0] + 0.8 + k / 17.0, click(0.05, 2600 + (k % 5) * 200, p=-0.2 + k / len(op_txt) * 0.4))
tm = SHOT['team'][0]
t7 = L('L07') - tm
for li, s in enumerate(['EXPERT JUDGMENT ON MARKERS', 'TO DETER INADVERTENT HUMAN', 'INTRUSION INTO THE WASTE',
                        'ISOLATION PILOT PLANT']):
    for k, ch in enumerate(s):
        if ch != ' ':
            sfx.add(tm + t7 - 0.4 + li * 1.1 + k / 26.0, click(0.035, 3000, p=0.1))
# 片名：上扬 + 重击 + 和弦
sfx.add(title_t - 3.0, riser(3.0, 0.16))
sfx.add(title_t, boom(0.55))
tdur = story_t - title_t + 0.5
music.add(title_t, pad(Dm9, tdur + 1.0, amp=0.13, attack=0.4, release=2.5, bright=0.55, seed=3))
music.add(title_t, choir([N('D4'), N('A4'), N('F5')], tdur, amp=0.05, vowel='o', attack=1.0, release=2.5))
music.add(title_t, bass(N('D2'), tdur, 0.22, attack=0.05, release=2.5))
sfx.add(story_t - 0.8, whoosh(1.2, 0.07))
# --- 每个镜头转场：轻 whoosh；闪白转场加一记低鼓 ---
for nm, (st, en) in SHOT.items():
    trans = TRANS[nm]
    if trans in ('fade', 'flash') and st > story_t + 1:
        sfx.add(st - 0.45, whoosh(0.9, 0.045))
    if trans == 'flash':
        sfx.add(st, thump(0.3, 46, 2.0))
        sfx.add(st, boom(0.12, 3.0))

# --- 章节卡：whoosh + 低鼓 + 钟 ---
for k in ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7']:
    t0, t1 = CH[k]
    sfx.add(t0 - 1.2, whoosh(1.6, 0.09))
    sfx.add(t0 + 0.05, thump(0.32, 50, 2.5))
    music.add(t0 + 0.1, bell(N('D6') if k != 'c6' else N('A6'), 6.0, 0.05, p=0.2))

# --- 第一章 ---
c1s, c2s = CH['c1'][1], CH['c2'][0]
chords(c1s, c2s, PROG1, 6.0, amp=0.09, bright=0.4, bass_amp=0.13, piano_arp=0.35, seed=10)
amb.add(SHOT['wipp'][0], wind(SHOT['wipp'][1] - SHOT['wipp'][0] + 1.0, 0.05, seed=12))
# 盖革计数器（半衰期镜头）
hs, he = SHOT['halflife']
rng = np.random.default_rng(239)
t_ = hs + 1.0
while t_ < he - 0.5:
    sfx.add(t_, click(0.04 + 0.03 * rng.random(), 3500, 0.03, p=rng.uniform(-0.6, 0.6)))
    t_ += rng.exponential(0.16)
# 时间轴上的点：轻钟
for k, lid in enumerate(['L16', 'L17', 'L18', 'L19']):
    music.add(L(lid) + 0.1, bell(N('A5') + [0, 3, 5, 7][k], 4.0, 0.035, p=-0.4 + k * 0.25))
sfx.add(L('L21') + 0.2, whoosh(2.4, 0.06))

# --- 第二章 ---
c2e, c3s = CH['c2'][1], CH['c3'][0]
chords(c2e, c3s, PROG2, 6.0, amp=0.085, bright=0.45, bass_amp=0.12, piano_arp=0.4, seed=20)
sfx.add(L('L25') + 0.6, whoosh(3.4, 0.07))  # 文字被吹散
amb.add(L('L25') + 0.5, wind(4.5, 0.05, seed=13))
hs, he = SHOT['hunger']
amb.add(hs, water(he - hs + 1, 0.05))
ts, te = SHOT['tsunami']
amb.add(L('L37'), water(6.0, 0.06, seed=5))
music.add(L('L37') + 0.2, thump(0.25, 45, 3))

# --- 第三章 ---
c3e, c4s = CH['c3'][1], CH['c4'][0]
chords(c3e, c4s, PROG3, 6.0, amp=0.085, bright=0.35, bass_amp=0.13, piano_arp=0.25, seed=30)
for t_ in np.arange(SHOT['trefoil'][0] + 0.5, SHOT['iso'][1], 1.0):
    sfx.add(float(t_), click(0.022, 1800, 0.04, p=0.3))
d43 = Le('L43') - L('L43')
for k, fr in enumerate([0.58, 0.70, 0.85]):
    music.add(L('L43') + d43 * fr, bell(N('E5') + k * 3, 3.0, 0.04, p=-0.3 + k * 0.3))
d49 = Le('L49') - L('L49')
music.add(L('L49') + d49 * 0.62, bell(N('A5'), 5.0, 0.06))
music.add(L('L49') + d49 * 0.62, pad([N('A3'), N('C#4'), N('E4')], 4.0, amp=0.05, attack=0.5, release=3, bright=0.6))

# --- 第四章 ---
c4e, c5s = CH['c4'][1], CH['c5'][0]
chords(c4e, c5s, PROG1, 4.0, amp=0.085, bright=0.5, bass_amp=0.14, piano_arp=0.0, seed=40)
# 低鼓脉冲（3D 段落）
t3d0 = SHOT['thorns'][0]
t3d1 = SHOT['primal'][1]
for k, t_ in enumerate(np.arange(SHOT['ideas'][0], t3d1, 2.0)):
    a = 0.12 if t_ < t3d0 else 0.2
    sfx.add(float(t_), thump(a, 52, 1.6))
amb.add(t3d0, wind(t3d1 - t3d0 + 1, 0.07, seed=14))
for nm in ['thorns', 'blackhole', 'blocks']:
    st = SHOT[nm][0] + (L('L59') - SHOT['thorns'][0] if nm == 'thorns' else 0.1)
    if nm == 'thorns':
        sfx.add(st, boom(0.22, 4.0))
    music.add(st, bell(N('D5'), 5.0, 0.05))
# 辐射猫：变色时的上扬音
d56 = Le('L56') - L('L56')
music.add(L('L56') + d56 * 0.18, pad([N('A4'), N('E5')], 3.5, amp=0.04, attack=0.8, release=2.0, bright=0.7))
music.add(L('L54'), choir([N('D4'), N('A4')], 5.0, amp=0.04, vowel='u', attack=1.0, release=3.0))
d63 = Le('L63') - L('L63')
sfx.add(L('L63') + d63 * 0.55, thump(0.35, 40, 3.0))

# --- 第五章：信 ---
c5e, c6s = CH['c5'][1], CH['c6'][0]
msg0 = SHOT['message'][0]
chords(c5e, msg0, [Dm9, Bbm7], 6.0, amp=0.08, bright=0.35, bass_amp=0.1, seed=50)
chords(msg0, SHOT['langs'][0], PROG5, 8.0, amp=0.075, bright=0.3, bass_amp=0.12, choir_amp=0.045, vowel='o', seed=51)
chords(SHOT['langs'][0], c6s, [Dm9, Fma7], 6.0, amp=0.08, bright=0.4, bass_amp=0.12, seed=52)
for k, lid in enumerate(['L72', 'L73', 'L74', 'L75', 'L76', 'L77', 'L78', 'L79', 'L80']):
    music.add(L(lid) - 0.1, bell([N('A5'), N('F5'), N('D5'), N('E5')][k % 4], 5.0, 0.03, p=(k % 3 - 1) * 0.3))
sfx.add(L('L78') + 0.2, thump(0.3, 42, 3.0))
# 扫描：雷达 ping
d83 = Le('L83') - L('L83')
scan0 = L('L83') + d83 * 0.6
for k in range(6):
    sfx.add(scan0 + k * d83 * 0.06, ping(N('E6') if k % 2 == 0 else N('B5'), 0.05, 2.0, p=-0.8 + k * 0.3))
sfx.add(L('L83') + d83 * 0.3, whoosh(2.4, 0.07))

# --- 第六章：冷 ---
c6e, c7s = CH['c6'][1], CH['c7'][0]
chords(c6e, SHOT['well'][0], [Dm9, Csus, Bbm7, Asus], 7.0, amp=0.065, bright=0.2, bass_amp=0.1, seed=60)
rng = np.random.default_rng(66)
t_ = c6e + 1.0
scale = [N('D6'), N('E6'), N('F6'), N('A6'), N('C7'), N('A5')]
while t_ < SHOT['well'][0] - 1:
    music.add(t_, bell(int(rng.choice(scale)), 5.0, 0.028, p=rng.uniform(-0.7, 0.7)))
    t_ += rng.uniform(1.6, 3.2)
amb.add(c6e, wind(SHOT['well'][0] - c6e, 0.055, seed=15))
ws, we = SHOT['well']
music.add(ws, pad([N('D2'), N('A2'), N('Eb3')], we - ws + 2, amp=0.09, attack=2.0, release=2.0, bright=0.25, seed=61))
for t_ in np.arange(ws + 0.8, we, 0.9):
    sfx.add(float(t_), heartbeat(0.28))
bs, be = SHOT['beishan']
chords(bs, c7s, [Gm9, Asus], (be - bs) / 2, amp=0.07, bright=0.3, bass_amp=0.1, seed=62)

# --- 尾声 ---
c7e = CH['c7'][1]
endt = CH['end'][0]
sfx.add(c7s - 0.6, whoosh(1.4, 0.06))
chords(c7e, L('L103'), [Dm9, Bbm7, Fma7, Csus, Gm9, Bbm7, Asus, A7], 5.0, amp=0.095, bright=0.5, bass_amp=0.14,
       choir_amp=0.03, vowel='o', piano_arp=0.0, seed=70)
# 钢琴旋律
mel = [('A4', 0), ('F4', 1), ('E4', 2), ('D4', 3), ('C5', 5), ('A4', 6), ('Bb4', 7), ('A4', 8), ('G4', 10),
       ('F4', 11), ('E4', 12), ('F4', 13), ('A4', 15), ('D5', 16), ('C5', 17), ('A4', 18), ('G4', 20), ('A4', 22)]
beat = 1.25
t0m = c7e + 1.0
for nm, b in mel:
    tt = t0m + b * beat
    if tt < L('L103') - 1:
        music.add(tt, piano(N(nm), 6.0, vel=0.5, p=-0.15))
for k in range(int((L('L103') - t0m) / (beat * 24)) + 1):
    for nm, b in mel:
        tt = t0m + (k * 24 + b) * beat
        if t0m + 24 * beat <= tt < L('L103') - 1.5 and k > 0:
            music.add(tt, piano(N(nm) + 12, 6.0, vel=0.35, p=0.2))
# 最终解决到 D 大调
fin = L('L103')
music.add(fin, pad(Dmaj, TOTAL - fin, amp=0.12, attack=2.0, release=7.0, bright=0.5, seed=80))
music.add(fin, choir([N('D4'), N('F#4'), N('A4'), N('D5')], TOTAL - fin, amp=0.06, vowel='a', attack=2.5,
                     release=7.0, seed=81))
music.add(fin, bass(N('D2'), TOTAL - fin, 0.16, attack=1.5, release=6.0))
music.add(fin + 0.1, bell(N('D6'), 8.0, 0.05))
music.add(fin + 0.1, piano(N('D4'), 8.0, 0.55))
music.add(fin + 0.15, piano(N('A4'), 8.0, 0.45))
music.add(fin + 0.2, piano(N('F#5'), 8.0, 0.4))

# =================================================================== 旁白
vo = Track(TOTAL)
for lid, ch, text, p in S.LINES:
    a, sr = sf.read('/tmp/claude-0/proj/audio/vo/%s.wav' % lid, dtype='float32')
    a = signal.resample_poly(a, SR, sr).astype(np.float32)
    vo.add(LN[lid][0], np.stack([a, a], -1))
v = vo.buf
v = highpass(v, 75)
# 轻压缩：平滑 RMS 增益
rms = np.sqrt(signal.lfilter([1 - 0.999], [1, -0.999], (v[:, 0] ** 2)) + 1e-9)
gain = np.minimum(1.0, (0.12 / np.maximum(rms, 1e-4)) ** 0.35)
v *= gain[:, None]
ir_room = make_ir(1.2, 0.01, 6000, seed=3)
v = reverb(v, ir_room, wet=0.07)
# 旁白按有声段 RMS 归一到 -20 dBFS
env_v = signal.lfilter([1 - 0.995], [1, -0.995], np.abs(v[:, 0]))
voiced = env_v > 0.02 * env_v.max()
rms_v = np.sqrt(np.mean(v[voiced, 0] ** 2))
v *= 0.1 / rms_v
# 人声临场感：高频架式提升约 +2.5dB
v = v + 0.33 * highpass(v, 2800)

# =================================================================== 混音
ir_hall = make_ir(4.2, 0.03, 5000, seed=7)
m = reverb(music.buf, ir_hall, wet=0.45)
# 音乐总线：去掉次低频，低频架式衰减，整体电平定到 -26 dBFS RMS
m = highpass(m, 45)
low = lowpass(m, 160)
m = m - 0.45 * low
rm = np.sqrt(np.mean(m[:int(TOTAL * SR)] ** 2))
m *= 10 ** (-22.5 / 20) / rm
ab = highpass(amb.buf, 120)
ra = np.sqrt(np.mean(ab[:int(TOTAL * SR)] ** 2)) + 1e-9
ab *= 10 ** (-38 / 20) / ra
sfx_raw = sfx.buf
s_ = reverb(sfx_raw, make_ir(2.4, 0.02, 7000, seed=8), wet=0.22)
s_ = highpass(s_, 35)
s_ *= 0.8
# 旁白闪避
env = np.abs(v[:, 0])
env = signal.lfilter([1 - 0.9995], [1, -0.9995], env)
env = env / (env.max() + 1e-9)
duck = 1 - 0.74 * np.clip(env * 6, 0, 1)
duck = signal.lfilter([1 - 0.9998], [1, -0.9998], duck).astype(np.float32)
mix = v + (m * 1.0 + ab * 0.9) * duck[:, None] + s_ * (0.6 + 0.4 * duck[:, None])
n = int(TOTAL * SR)
mix = mix[:n]
# 柔和限幅
pk = np.max(np.abs(mix))
if pk > 0.95:
    mix *= 0.95 / pk
os.makedirs('/tmp/claude-0/proj/audio/out', exist_ok=True)
sf.write('/tmp/claude-0/proj/audio/out/mix.wav', mix.astype(np.float32), SR, subtype='FLOAT')
sf.write('/tmp/claude-0/proj/audio/out/music_only.wav', (m + ab)[:n].astype(np.float32), SR, subtype='FLOAT')
print('done', TOTAL, 'peak', float(np.max(np.abs(mix))))
