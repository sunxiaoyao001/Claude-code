# Seamless 青砖 wall tile: varied brick lengths/tones, clay texture, recessed mortar, wear, patched bricks.
import random
random.seed(12)
W, BH, M, ROWS = 520, 30, 5, 12
H = ROWS * (BH + M)
tones = ["#7c8488", "#838b8f", "#899194", "#767e83", "#8f9699", "#80878a", "#868e92", "#727a7f", "#8b9196", "#7f8689"]
o = []
o.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
o.append('<!-- provenance: procedurally authored by brick.py (No.12 Coffee demo), seed 12; no external source -->')
o.append('''<defs>
<filter id="clay" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency=".9 1.3" numOctaves="3" seed="7" stitchTiles="stitch" result="n"/>
  <feColorMatrix in="n" type="matrix" values=".24 .24 .24 0 .14  .24 .24 .24 0 .14  .24 .24 .24 0 .14  0 0 0 0 1" result="g"/>
  <feTurbulence type="fractalNoise" baseFrequency=".06 .14" numOctaves="2" seed="3" stitchTiles="stitch" result="m"/>
  <feColorMatrix in="m" type="matrix" values=".14 .14 .14 0 .29  .14 .14 .14 0 .29  .14 .14 .14 0 .29  0 0 0 0 1" result="mg"/>
  <feBlend in="g" in2="mg" mode="overlay" result="tex"/>
  <feBlend in="tex" in2="SourceGraphic" mode="overlay" result="b"/>
  <feComposite in="b" in2="SourceGraphic" operator="in"/>
</filter>
<filter id="grime" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency=".012 .03" numOctaves="2" seed="4" stitchTiles="stitch"/>
  <feColorMatrix type="matrix" values="0 0 0 0 .22  0 0 0 0 .24  0 0 0 0 .25  0 0 0 .55 -.18"/>
</filter>
<filter id="mortar" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="9" stitchTiles="stitch"/>
  <feColorMatrix type="matrix" values="0 0 0 0 .55  0 0 0 0 .56  0 0 0 0 .54  0 0 0 .5 0"/>
</filter>
</defs>''')
o.append(f'<rect width="{W}" height="{H}" fill="#a7aaa4"/>')
o.append(f'<rect width="{W}" height="{H}" filter="url(#mortar)" opacity=".7"/>')
bricks = []
for r in range(ROWS):
    y = r * (BH + M) + M / 2
    lens = []
    while sum(lens) < W - 140:
        lens.append(random.choice([104, 112, 120, 120, 128, 136]))
    lens.append(W - sum(lens))
    x = -random.uniform(20, 90)
    for L in lens:
        bricks.append((x, y, L - M, BH + random.uniform(-1, 1)))
        x += L
o.append('<g filter="url(#clay)">')
for (x, y, w, h) in bricks:
    tone = random.choice(tones)
    kind = random.random()
    if kind < .06: tone = "#9a9c97"   # weathered, chalky
    elif kind < .1: tone = "#857f7b"  # patched replacement brick, warmer
    for sx in (0, W, -W):
        X = x + sx + M / 2
        if X > W or X + w < 0: continue
        o.append(f'<rect x="{X:.1f}" y="{y + 2:.1f}" width="{w:.1f}" height="{h:.1f}" rx="2" fill="#4f5558" opacity=".55"/>')  # cast shadow into recessed mortar
        if random.random() < .18:  # worn corner
            c = random.uniform(4, 9)
            o.append(f'<path d="M{X + c:.1f} {y:.1f}H{X + w:.1f}V{y + h:.1f}H{X:.1f}V{y + c:.1f}Z" fill="{tone}"/>')
        else:
            o.append(f'<rect x="{X:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="1.6" fill="{tone}"/>')
        o.append(f'<rect x="{X + 1:.1f}" y="{y:.1f}" width="{w - 2:.1f}" height="1.4" fill="#c3c8ca" opacity=".45"/>')  # top arris catching light
        if kind < .06:
            o.append(f'<rect x="{X:.1f}" y="{y + h * .55:.1f}" width="{w:.1f}" height="{h * .45:.1f}" fill="#c9ccc6" opacity=".35"/>')  # efflorescence
o.append('</g>')
o.append(f'<rect width="{W}" height="{H}" filter="url(#grime)"/>')
o.append('</svg>')
open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'brick.svg'), 'w').write("\n".join(o))
print(W, H)
