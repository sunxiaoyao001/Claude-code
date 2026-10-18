#!/usr/bin/env python3
"""Subset the display fonts to the glyphs the trailer actually uses and emit
src/fonts.css with base64 WOFF2 @font-face rules (self-contained, offline-safe)."""
import base64, glob, io, os, string, sys
from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'src')
FONT_DIR = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('FONT_DIR', '')

FONTS = [
    ('Noto Serif SC', 900, 'NotoSerifSC-Black.ttf'),
    ('Noto Sans SC', 900, 'NotoSansSC-Black.ttf'),
    ('Noto Sans SC', 700, 'NotoSansSC-Bold.ttf'),
    ('Ma Shan Zheng', 400, 'MaShanZheng.ttf'),
    ('ZCOOL QingKe HuangYou', 400, 'ZCOOLQingKe.ttf'),
    ('Anton', 400, 'Anton.ttf'),
    ('Orbitron', 900, 'Orbitron-Black.ttf'),
    ('Rajdhani', 700, 'Rajdhani-Bold.ttf'),
]

chars = set(string.printable) | set('·—…“”‘’！？，。：；、（）《》【】「」×✓■●▲▶◀★☆→←↑↓°％￥')
for path in glob.glob(os.path.join(SRC, 'js', '*.js')) + [os.path.join(SRC, 'index.html')]:
    with open(path, encoding='utf-8') as f:
        chars |= {c for c in f.read() if ord(c) > 127}
text = ''.join(sorted(chars))

css = []
for family, weight, fname in FONTS:
    fpath = os.path.join(FONT_DIR, fname)
    font = TTFont(fpath)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'palt', 'vert', 'locl']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    b64 = base64.b64encode(buf.getvalue()).decode()
    print(f'{family} {weight}: {len(buf.getvalue()) / 1024:.1f} KB', file=sys.stderr)
    css.append("@font-face{font-family:'%s';font-weight:%d;font-style:normal;font-display:block;"
               "src:url(data:font/woff2;base64,%s) format('woff2');}" % (family, weight, b64))

with open(os.path.join(SRC, 'fonts.css'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(css) + '\n')
print(f'{len(chars)} glyphs -> src/fonts.css', file=sys.stderr)
