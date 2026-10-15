import json, subprocess, re
def load():
    import os; js = open(os.environ.get('ZG_TIMELINE', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine', 'timeline.js')) if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine', 'timeline.js')) else '/home/user/Claude-code/zeigarnik-video/engine/timeline.js', encoding='utf8').read()
    out = []
    for m in re.finditer(r"\{ t0: ([\d.]+), t1: ([\d.]+), text: '([^']+)'(.*?)\}", js[js.index('ZG.LINES'):js.index('ZG.CUES')]):
        ve = re.search(r'voEnd: ([\d.]+)', m.group(4))
        out.append({'t0': float(m.group(1)), 't1': float(ve.group(1)) if ve else float(m.group(2)), 'text': m.group(3)})
    return out
