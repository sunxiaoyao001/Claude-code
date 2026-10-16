# 逐句生成旁白：Kokoro v1.1-zh，088 号男声
import sys, json, os, time
sys.path.insert(0, '/tmp/claude-0/proj')
import sherpa_onnx as so, soundfile as sf, numpy as np
import script as S
SID = 88
SPEED = float(os.environ.get('SPEED', '1.35'))
# 多音字/读音修正：只改送进 TTS 的文本，字幕不变
FIX = {
    '之地': '之第',
    'T恤': '体恤',
    '膨润土': '膨闰土',
}
M = '/tmp/claude-0/dl/kokoro-multi-lang-v1_1/'
cfg = so.OfflineTtsConfig(model=so.OfflineTtsModelConfig(kokoro=so.OfflineTtsKokoroModelConfig(
    model=M + 'model.onnx', voices=M + 'voices.bin', tokens=M + 'tokens.txt',
    lexicon=M + 'lexicon-us-en.txt,' + M + 'lexicon-zh.txt', data_dir=M + 'espeak-ng-data', dict_dir=M + 'dict'),
    num_threads=4), rule_fsts=M + 'date-zh.fst,' + M + 'phone-zh.fst,' + M + 'number-zh.fst', max_num_sentences=1)
tts = so.OfflineTts(cfg)
only = set(sys.argv[1:])
extra = json.load(open('/tmp/claude-0/proj/audio/fix_extra.json')) if os.path.exists('/tmp/claude-0/proj/audio/fix_extra.json') else {}
FIX.update(extra.get('global', {}))
durs = {}
dp = '/tmp/claude-0/proj/audio/vo/durs.json'
if os.path.exists(dp):
    durs = json.load(open(dp))
for lid, ch, text, pause in S.LINES:
    if only and lid not in only:
        continue
    t = extra.get('lines', {}).get(lid, text)
    for a, b in FIX.items():
        t = t.replace(a, b)
    g = tts.generate(t, sid=SID, speed=SPEED)
    a = np.array(g.samples, np.float32)
    # 修剪首尾静音
    thr = 0.004
    env = np.convolve(np.abs(a), np.ones(240) / 240, mode='same')
    idx = np.nonzero(env > thr)[0]
    if len(idx):
        a = a[max(0, idx[0] - int(0.10 * g.sample_rate)): idx[-1] + int(0.12 * g.sample_rate)]
        fi = int(0.01 * g.sample_rate)
        a[:fi] *= np.linspace(0, 1, fi)
        a[-fi:] *= np.linspace(1, 0, fi)
    sf.write('/tmp/claude-0/proj/audio/vo/%s.wav' % lid, a, g.sample_rate)
    durs[lid] = round(len(a) / g.sample_rate, 4)
    print(lid, durs[lid], flush=True)
    json.dump(durs, open(dp, 'w'), indent=0)
print('total speech', round(sum(durs.values()), 1))
