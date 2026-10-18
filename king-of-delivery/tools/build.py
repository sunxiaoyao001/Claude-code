#!/usr/bin/env python3
"""Inline src/ into one self-contained HTML file: fonts (subset WOFF2), CSS,
scripts, and the pre-rendered soundtrack as a base64 AAC data URI.
usage: tools/build.py <audio.m4a> <out.html>"""
import base64, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'src')
audio, out = sys.argv[1], sys.argv[2]

html = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()

def inline_css(m):
    href = m.group(1)
    css = open(os.path.join(SRC, href), encoding='utf-8').read()
    return '<style>\n' + css + '\n</style>'
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)

def inline_js(m):
    js = open(os.path.join(SRC, m.group(1)), encoding='utf-8').read()
    return '<script>\n' + js.replace('</script', '<\\/script') + '\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)

b64 = base64.b64encode(open(audio, 'rb').read()).decode()
html = html.replace('<script>', '<script>window.AUDIO_SRC = "data:audio/mp4;base64,' + b64 + '";</script>\n<script>', 1)
html = html.replace('<meta name="viewport" content="width=device-width, initial-scale=1">',
                    '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
                    '<meta name="description" content="外卖之王 KING OF DELIVERY — fan-made anime trailer: Meituan vs Ele.me vs ???">')
open(out, 'w', encoding='utf-8').write(html)
print(f'{out}: {os.path.getsize(out) / 1e6:.2f} MB')
