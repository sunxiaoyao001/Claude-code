import sys, json; sys.path.insert(0, '/home/user/tts')
import tts, asr, lines
HOMO = str.maketrans({'它': '他', '她': '他', '望': '忘', '为': '位', '事': '是', '的': '得', '地': '得'})
L = lines.load(); SPEEDS = [1.28, 1.22, 1.16, 1.1, 1.04]
for sid in [int(s) for s in sys.argv[1:]]:
    choice, total, bad = {}, 0.0, []
    for i, l in enumerate(L):
        ref = l['text'].replace('TA', '他').translate(HOMO); best = None
        for sp in SPEEDS:
            d = tts.say(f'/tmp/s_{sid}_{i}.wav', sid, sp, l['text'].replace('TA', '他'))
            c = asr.cer(ref, asr.text(f'/tmp/s_{sid}_{i}.wav').translate(HOMO))
            if best is None or c < best[1]: best = (sp, c, d)
            if c == 0: break
        choice[i] = {'speed': best[0], 'cer': round(best[1], 3)}; total += best[2]
        if best[1] > 0: bad.append(i)
    json.dump(choice, open(f'vo/choice_{sid}.json', 'w'))
    print(f'voice {sid}: unresolved {bad}  raw speech {total:.1f}s', flush=True)
