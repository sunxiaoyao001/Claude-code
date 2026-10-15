import sys, json, re
sys.path.insert(0,'/tmp/claude-0/proj')
import sherpa_onnx as so, soundfile as sf, numpy as np
from difflib import SequenceMatcher
from pypinyin import lazy_pinyin
import script as S
M='/tmp/claude-0/dl/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09/'
rec=so.OfflineRecognizer.from_sense_voice(model=M+'model.int8.onnx',tokens=M+'tokens.txt',num_threads=4,use_itn=False,language='zh')
def cn(s): return ''.join(ch for ch in s if '一'<=ch<='鿿')
bad=[]
only=set(sys.argv[1:])
for lid,ch,text,p in S.LINES:
    if only and lid not in only: continue
    a,sr=sf.read('/tmp/claude-0/proj/audio/vo/%s.wav'%lid,dtype='float32')
    s=rec.create_stream(); s.accept_waveform(sr,a); rec.decode_stream(s)
    hyp=cn(s.result.text); ref=cn(text)
    # 用拼音比较（同音字不算错）
    pr=lazy_pinyin(ref); ph=lazy_pinyin(hyp)
    sim=SequenceMatcher(None,pr,ph).ratio()
    if sim<0.97:
        sm=SequenceMatcher(None,pr,ph)
        diffs=[]
        for op,i1,i2,j1,j2 in sm.get_opcodes():
            if op!='equal': diffs.append((op,ref[i1:i2],hyp[j1:j2]))
        bad.append((lid,round(sim,3),diffs))
        print(lid, round(sim,3), diffs, flush=True)
print('checked; flagged', len(bad))
