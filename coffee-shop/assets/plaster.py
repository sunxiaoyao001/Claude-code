# Limewashed interior wall (粉墙) tile + a plaster-loss patch showing the 青砖 underneath.
import math, random
random.seed(21)
base = '/home/user/Claude-code/coffee-shop/assets/'
open(base + 'plaster.svg', 'w').write('''<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
<!-- provenance: procedurally authored by plaster.py (No.12 Coffee demo), seed 21; no external source -->
<defs>
<filter id="mottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".006 .009" numOctaves="3" seed="2" stitchTiles="stitch"/>
<feColorMatrix type="matrix" values="0 0 0 0 .55  0 0 0 0 .58  0 0 0 0 .6  0 0 0 .5 -.12"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="5" stitchTiles="stitch"/>
<feColorMatrix type="matrix" values="0 0 0 0 .4  0 0 0 0 .42  0 0 0 0 .45  0 0 0 .12 0"/></filter>
<filter id="brush" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".004 .08" numOctaves="2" seed="8" stitchTiles="stitch"/>
<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 -.2"/></filter>
</defs>
<rect width="640" height="640" fill="#e2e5e0"/>
<rect width="640" height="640" filter="url(#mottle)"/>
<rect width="640" height="640" filter="url(#brush)" opacity=".6"/>
<rect width="640" height="640" filter="url(#grain)"/>
</svg>''')

# ragged loss outline
cx, cy, R = 210, 130, 1
pts = []
n = 64
for i in range(n):
    a = 2 * math.pi * i / n
    rx, ry = 180, 100
    k = 1 + .18 * math.sin(3 * a + 1) + .1 * math.sin(7 * a) + random.uniform(-.07, .07)
    pts.append((cx + rx * k * math.cos(a), cy + ry * k * math.sin(a)))
d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z"
bricks = []
for r in range(9):
    y = r * 31 + 2
    x = -60 if r % 2 else -2
    while x < 420:
        tone = random.choice(["#7c8488", "#838b8f", "#899194", "#767e83", "#8f9699"])
        bricks.append(f'<rect x="{x}" y="{y + 2}" width="112" height="26" rx="2" fill="#4f5558" opacity=".5"/><rect x="{x}" y="{y}" width="112" height="26" rx="1.6" fill="{tone}"/>')
        x += 117
open(base + 'plaster-loss.svg', 'w').write(f'''<svg xmlns="http://www.w3.org/2000/svg" width="420" height="260" viewBox="0 0 420 260">
<!-- provenance: procedurally authored by plaster.py (No.12 Coffee demo), seed 21; no external source -->
<defs><clipPath id="c"><path d="{d}"/></clipPath>
<filter id="clay" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".6 .9" numOctaves="3" seed="7"/>
<feColorMatrix type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  .9 .9 .9 0 -1.05" result="g"/><feComposite in="g" in2="SourceGraphic" operator="in" result="gm"/><feBlend in="gm" in2="SourceGraphic" mode="overlay"/></filter></defs>
<path d="{d}" fill="#c9ccc6" transform="translate(-3 -4) scale(1.02)"/>
<g clip-path="url(#c)"><rect width="420" height="260" fill="#a5a8a2"/><g filter="url(#clay)">{''.join(bricks)}</g>
<path d="{d}" fill="none" stroke="#5d6260" stroke-width="7" opacity=".35"/></g>
<path d="{d}" fill="none" stroke="#f1f3ef" stroke-width="1.5" opacity=".8" transform="translate(-1.5 -2)"/>
</svg>''')
print('ok')
