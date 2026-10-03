# Limewashed interior wall (粉墙) tile + plaster-loss patch exposing the 青砖 beneath.
import math, os, random
random.seed(21)
here = os.path.dirname(os.path.abspath(__file__))

# --- tile: even, non-directional mottle + trowel arcs + fine grain ---
arcs = []
for _ in range(14):
    cx, cy = random.uniform(0, 640), random.uniform(0, 640)
    r = random.uniform(70, 160)
    a0 = random.uniform(0, 2 * math.pi); sweep = random.uniform(.5, 1.1)
    for dx in (0, 640, -640):
        for dy in (0, 640, -640):
            x1, y1 = cx + dx + r * math.cos(a0), cy + dy + r * math.sin(a0)
            x2, y2 = cx + dx + r * math.cos(a0 + sweep), cy + dy + r * math.sin(a0 + sweep)
            col = random.choice(["#f6f7f3", "#cfd3cd"])
            arcs.append(f'<path d="M{x1:.1f} {y1:.1f}A{r:.1f} {r:.1f} 0 0 1 {x2:.1f} {y2:.1f}" stroke="{col}" stroke-width="{random.uniform(18, 34):.1f}" fill="none" opacity="{random.uniform(.07, .13):.2f}" stroke-linecap="round"/>')
open(os.path.join(here, 'plaster.svg'), 'w').write(f'''<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
<!-- provenance: procedurally authored by plaster.py (No.12 Coffee demo), seed 21; no external source -->
<defs>
<filter id="mottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".007" numOctaves="4" seed="2" stitchTiles="stitch"/>
<feColorMatrix type="matrix" values="0 0 0 0 .5  0 0 0 0 .53  0 0 0 0 .55  .5 .5 .5 0 -.66"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="5" stitchTiles="stitch"/>
<feColorMatrix type="matrix" values="0 0 0 0 .4  0 0 0 0 .42  0 0 0 0 .45  0 0 0 .1 0"/></filter>
</defs>
<rect width="640" height="640" fill="#e4e7e2"/>
<rect width="640" height="640" filter="url(#mottle)"/>
<g>{''.join(arcs)}</g>
<rect width="640" height="640" filter="url(#grain)"/>
</svg>''')

# --- loss patch ---
def ragged(cx, cy, rx, ry, jit, n=72):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 1 + .17 * math.sin(3 * a + 1) + .09 * math.sin(7 * a) + random.uniform(-jit, jit)
        pts.append((cx + rx * k * math.cos(a), cy + ry * k * math.sin(a)))
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z"
hole = ragged(220, 140, 170, 92, .06)
edge = ragged(220, 140, 184, 104, .09)   # broken plaster thickness, wider and more ragged
bricks = []
for r in range(10):
    y = r * 31 + 2
    x = -60 if r % 2 else -2
    while x < 440:
        tone = random.choice(["#7c8488", "#838b8f", "#899194", "#767e83", "#8f9699"])
        bricks.append(f'<rect x="{x}" y="{y + 2}" width="112" height="26" rx="2" fill="#4f5558" opacity=".5"/><rect x="{x}" y="{y}" width="112" height="26" rx="1.6" fill="{tone}"/>')
        x += 117
open(os.path.join(here, 'plaster-loss.svg'), 'w').write(f'''<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
<!-- provenance: procedurally authored by plaster.py (No.12 Coffee demo), seed 21; no external source -->
<defs><clipPath id="c"><path d="{hole}"/></clipPath><clipPath id="e"><path d="{edge}"/></clipPath>
<filter id="clay" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".9 1.3" numOctaves="3" seed="7" result="n"/>
<feColorMatrix in="n" type="matrix" values=".24 .24 .24 0 .14  .24 .24 .24 0 .14  .24 .24 .24 0 .14  0 0 0 0 1" result="g"/><feBlend in="g" in2="SourceGraphic" mode="overlay" result="b"/><feComposite in="b" in2="SourceGraphic" operator="in"/></filter>
<filter id="lip" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="crumb" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".5" numOctaves="2" seed="11"/>
<feColorMatrix type="matrix" values="0 0 0 0 .62  0 0 0 0 .63  0 0 0 0 .6  0 0 0 1.4 -.55"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>
<!-- plaster cross-section: the broken thickness between wall face and brick -->
<path d="{edge}" fill="#c4c7c0"/>
<g clip-path="url(#e)"><rect width="440" height="280" fill="#c4c7c0" filter="url(#crumb)"/></g>
<path d="{edge}" fill="none" stroke="#f3f4f0" stroke-width="2" opacity=".9" transform="translate(-1 -1.5)"/>
<!-- exposed brick -->
<g clip-path="url(#c)">
  <rect width="440" height="280" fill="#a5a8a2"/>
  <g filter="url(#clay)">{''.join(bricks)}</g>
  <!-- shadow cast by the plaster lip onto the recessed brick (light from upper left) -->
  <path d="{hole}" fill="none" stroke="#2f3436" stroke-width="18" opacity=".55" filter="url(#lip)" transform="translate(7 9)"/>
</g>
<path d="{hole}" fill="none" stroke="#8d918b" stroke-width="1.5"/>
</svg>''')
print('ok')
