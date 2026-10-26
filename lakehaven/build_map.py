#!/usr/bin/env python3
"""Build the printable Lakehaven planning sheets (lakehaven-map.html).

Lakehaven is a Cities: Skylines II custom map by CityLogic (Paradox Mods #162872).
No top-down image of it is published. The shorelines in geometry.json were
reconstructed from three high-altitude screenshots (the map page's overview and
two frames of CityLogic's Lakehaven videos): each was rectified to a top-down view
with a pinhole-camera model, the views were aligned by matching their water areas,
and the shorelines were traced from the combined water mask. See SOURCES.md.

Ground units: x east, y north. "North" is this sheet's convention (the big lake at
the top); 1 unit is roughly 3 km, estimated from the downtown block spacing.
Roads, zones and labels below are hand-placed in the same units.
Re-run after editing:  python3 lakehaven/build_map.py && node lakehaven/render_pdf.js
"""

import json
import math
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "lakehaven-map.html"
GEO = json.loads((HERE / "geometry.json").read_text(encoding="utf-8"))
X0, X1, Y0, Y1 = GEO["frame"]
SIZE = 1260                      # SVG units across the square map
SCALE = SIZE / (X1 - X0)         # SVG units per ground unit
KM_PER_UNIT = 3.0
COLS = "ABCDEFGHIJKLMNOPQRSTU"

# --------------------------------------------------------------------------- base map (ground units)

# open water beyond the photos, drawn with dashed shores
GUESSED_WATER = [
    [(-1.70, 3.85), (-1.74, 4.30), (0.78, 4.30), (0.78, 3.60), (0.40, 3.55)],             # big lake, north
    [(1.134, 1.302), (1.18, 1.302), (1.298, 1.518), (1.33, 1.38), (1.32, 1.18), (1.25, 1.02),
     (1.16, 1.02), (1.12, 1.16)],                                                           # channel, south of the photos
]

# pre-built roads; "guess_from" = index where the route leaves the photos (0: it starts outside them)
HIGHWAYS = [
    {"name": "W", "guess_from": 0,
     "pts": [(-1.80, 0.76), (-1.566, 0.975), (-1.486, 1.06), (-1.40, 1.165), (-1.31, 1.27), (-1.24, 1.355),
             (-1.17, 1.43), (-1.08, 1.49), (-0.98, 1.505), (-0.85, 1.49), (-0.72, 1.476), (-0.60, 1.47),
             (-0.50, 1.445), (-0.42, 1.44), (-0.34, 1.45), (-0.27, 1.465), (-0.19, 1.475), (-0.12, 1.478),
             (0.0, 1.485)]},
    {"name": "E", "guess_from": 10,
     "pts": [(0.0, 1.485), (0.2, 1.50), (0.3, 1.53), (0.46, 1.574), (0.62, 1.606), (0.78, 1.63), (0.99, 1.662),
             (1.124, 1.686), (1.26, 1.71), (1.45, 1.766), (1.72, 1.85)]},
    {"name": "SE", "guess_from": 16,
     "pts": [(-0.05, 1.47), (-0.12, 1.40), (-0.20, 1.33), (-0.27, 1.26), (-0.33, 1.16), (-0.33, 1.06),
             (-0.29, 0.93), (-0.14, 0.84), (0.05, 0.73), (0.22, 0.69), (0.37, 0.715), (0.50, 0.75), (0.61, 0.785),
             (0.665, 0.77), (0.67, 0.72), (0.67, 0.63), (0.68, 0.56), (0.69, 0.30), (0.71, -0.10), (0.72, -0.50)]},
]
MINOR_ROADS = [
    {"guess_from": None,   # downtown north to the causeway, small island and Forest Island
     "pts": [(-1.08, 1.49), (-1.10, 1.60), (-1.18, 1.76), (-1.26, 1.90), (-1.36, 2.03), (-1.43, 2.13),
             (-1.50, 2.196), (-1.57, 2.27), (-1.64, 2.347), (-1.72, 2.41), (-1.80, 2.505), (-1.88, 2.60),
             (-1.96, 2.70), (-2.03, 2.76), (-2.10, 2.82), (-2.19, 2.91), (-2.26, 2.97)]},
    {"guess_from": 8,      # east bank of the inner river, heading south-west
     "pts": [(-0.42, 1.44), (-0.47, 1.38), (-0.505, 1.29), (-0.505, 1.22), (-0.525, 1.11), (-0.555, 1.02),
             (-0.60, 0.955), (-0.70, 0.895), (-0.80, 0.86), (-0.92, 0.80)]},
]
EXITS = [("W", (-1.80, 0.76)), ("E", (1.70, 1.845)), ("SE", (0.72, -0.40))]
INTERCHANGE = (-0.03, 1.47)

# --------------------------------------------------------------------------- planning (ground units)
ZONES = [  # id, name, kind, phase, polygon, label position
    ("1", "湖港中心 CBD", "com", "1", [(-1.28, 1.62), (-1.29, 1.50), (-1.24, 1.40), (-1.16, 1.32), (-1.06, 1.25),
     (-0.98, 1.20), (-0.92, 1.22), (-0.90, 1.34), (-0.92, 1.46), (-0.98, 1.58), (-1.10, 1.66), (-1.22, 1.68)],
     (-1.82, 1.66, -1.18, 1.56)),
    ("2", "半岛北住宅", "res", "1-2", [(-1.27, 1.72), (-1.24, 1.73), (-1.10, 1.71), (-0.96, 1.64), (-0.82, 1.60),
     (-0.72, 1.64), (-0.70, 1.86), (-0.78, 2.06), (-0.95, 2.09), (-1.15, 2.00), (-1.28, 2.02), (-1.27, 1.84)],
     (-1.00, 1.90)),
    ("3", "北岸大学/办公", "off", "2", [(-0.45, 2.18), (-0.30, 2.24), (-0.15, 2.30), (-0.05, 2.40), (0.08, 2.46),
     (0.18, 2.36), (0.28, 2.24), (0.32, 2.02), (0.32, 1.80), (0.10, 1.76), (-0.12, 1.80), (-0.35, 1.82),
     (-0.48, 1.95)], (-0.18, 2.10)),
    ("4", "东部工业物流", "ind", "1-2", [(0.30, 1.44), (0.30, 1.30), (0.40, 1.12), (0.55, 1.04), (0.68, 1.06),
     (0.80, 1.12), (0.95, 1.18), (1.08, 1.30), (1.08, 1.44), (0.95, 1.56), (0.75, 1.56), (0.55, 1.52)],
     (0.55, 1.20)),
    ("5", "南岸新城", "res", "3", [(-0.40, 0.86), (-0.20, 0.80), (0.0, 0.68), (0.20, 0.64), (0.40, 0.66),
     (0.60, 0.70), (0.62, 0.30), (0.20, 0.15), (-0.25, 0.20), (-0.45, 0.45), (-0.48, 0.72)], (0.12, 0.30)),
    ("6", "市中心东扩", "mix", "2", [(-0.92, 1.22), (-0.86, 1.16), (-0.80, 1.11), (-0.72, 1.09), (-0.69, 1.14),
     (-0.70, 1.24), (-0.67, 1.36), (-0.61, 1.42), (-0.62, 1.52), (-0.74, 1.56), (-0.86, 1.54), (-0.90, 1.38)],
     (-1.02, 0.80, -0.80, 1.26)),
    ("7", "森林岛", "tour", "3", [(-2.70, 2.78), (-2.74, 3.00), (-2.68, 3.25), (-2.60, 3.60), (-2.56, 3.92),
     (-1.70, 3.92), (-1.74, 3.62), (-1.86, 3.42), (-1.95, 3.28), (-2.08, 3.10), (-2.18, 3.00), (-2.26, 2.94),
     (-2.38, 2.82), (-2.52, 2.76), (-2.62, 2.74)], (-2.24, 3.42)),
    ("8", "东北岸住宅", "res", "3", [(0.72, 2.40), (0.86, 2.22), (1.00, 2.06), (1.12, 1.92), (1.24, 1.98),
     (1.26, 2.20), (1.20, 2.45), (1.02, 2.62), (0.80, 2.66)], (0.99, 2.38)),
    ("9", "东北农林区", "agr", "1-3", [(0.42, 2.92), (0.62, 2.80), (0.85, 2.74), (1.10, 2.72), (1.35, 2.64),
     (1.62, 2.48), (1.66, 3.30), (0.40, 3.30)], (1.02, 3.05)),
    ("10", "机场", "air", "4", [(1.30, 2.12), (1.64, 2.22), (1.60, 2.44), (1.28, 2.34)], (1.47, 2.29)),
    ("11", "能源/重工区", "heavy", "3-4", [(-1.72, 1.20), (-1.66, 1.25), (-1.45, 1.25), (-1.34, 1.20), (-1.25, 1.13),
     (-1.17, 1.04), (-1.22, 0.95), (-1.40, 0.91), (-1.58, 0.90), (-1.68, 1.00)], (-2.22, 1.02, -1.62, 1.06)),
]
ZONE_STYLE = {  # fill colour, hatch pattern id (None = solid), legend text
    "res": ("#8fd17a", None, "住宅"),
    "com": ("#e8735f", "p-com", "商业 + 办公（高密度）"),
    "off": ("#a07ad6", "p-off", "办公 / 大学"),
    "mix": ("#6fc2c0", "p-mix", "商住混合"),
    "ind": ("#e9bf3f", "p-ind", "工业 / 物流"),
    "agr": ("#cfdc84", "p-agr", "农业 / 林业（专门工业）"),
    "tour": ("#ef8fb4", "p-tour", "旅游 / 公园"),
    "air": ("#9aa1ab", None, "机场"),
    "heavy": ("#b9785c", "p-heavy", "电厂 / 垃圾 / 重工"),
}
ZONE_NOTES = {
    "1": "高速 W 过桥第一站，作者也在这里建市中心",
    "2": "半岛北端湖景住宅，堤道路通森林岛",
    "3": "朝北的湖岸，放大学和办公；M2 北端",
    "4": "紧挨东线高速，货车不进市中心",
    "5": "南边地形照片没拍到，先进游戏补画",
    "6": "市中心外溢的商住混合区",
    "7": "整岛森林，做自然公园和度假区",
    "8": "隔着悬索桥水道的安静郊区",
    "9": "进游戏开资源图层确认肥沃土地",
    "10": "跑道顺着东线高速，噪音远离市中心",
    "11": "海峡对岸，隔水放污染设施（若在地图内）",
}
PLANNED_ROADS = [
    [(-0.56, 1.67), (-0.42, 1.66), (-0.30, 1.66), (-0.16, 1.70)],      # B1 across the inner river
    [(0.70, 2.05), (0.80, 2.15), (0.90, 2.25), (1.00, 2.35)],          # B2 across the channel
]
PLANNED_BRIDGE_LABELS = [("B1", (-0.36, 1.87)), ("B2", (0.62, 2.20))]
METRO = [  # name, colour, tag position, polyline
    ("M1", "#d6403a", (-1.44, 1.47), [(-1.18, 1.45), (-0.95, 1.56), (-0.72, 1.62), (-0.48, 1.64), (-0.22, 1.70),
                                       (0.05, 1.70), (0.35, 1.60), (0.62, 1.42)]),
    ("M2", "#2f6fd0", (0.12, 2.50), [(0.12, 2.32), (0.02, 2.00), (-0.22, 1.70), (-0.36, 1.32), (-0.42, 1.00),
                                      (-0.28, 0.70), (0.05, 0.45)]),
]
STATIONS = [  # ground point, name, label offset (svg units), anchor
    ((-1.18, 1.45), "", (0, 0), "middle"), ((-0.72, 1.62), "半岛东", (0, -16), "middle"),
    ((-0.22, 1.70), "双子桥", (-14, -10), "end"), ((0.62, 1.42), "工业园", (0, 26), "middle"),
    ((0.12, 2.32), "大学城", (14, 5), "start"), ((0.02, 2.00), "北岸", (14, 5), "start"),
    ((-0.42, 1.00), "南湖西", (14, 5), "start"), ((0.05, 0.45), "南岸", (14, 5), "start"),
]
FERRY = [[(-1.20, 2.16), (-0.80, 2.55), (-0.20, 2.85), (0.30, 3.02)]]
FERRY_LABEL = (-0.80, 2.62)
FACILITIES = [  # ground point, glyph, caption, caption offset
    ((-1.05, 1.30), "客", "", (0, 0)), ((0.88, 1.40), "货", "货运站", (0, 30)),
    ((-0.05, 2.28), "学", "", (0, 0)), ((-1.62, 1.15), "电", "电厂", (0, -22)),
    ((-1.28, 1.00), "废", "垃圾/焚烧", (0, 30)),
]
START_AREA = [(-1.36, 1.16), (-0.58, 1.16), (-0.58, 1.76), (-1.36, 1.76)]

# --------------------------------------------------------------------------- helpers


def P(pt):
    x, y = pt
    return ((x - X0) * SCALE, (Y1 - y) * SCALE)


def PL(pts):
    return [P(p) for p in pts]


def f(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def catmull_segments(pts, closed):
    """Catmull-Rom spline through pts as a list of cubic Bezier segments."""
    n = len(pts)
    segs = []
    for i in range(n if closed else n - 1):
        p0 = pts[(i - 1) % n] if (closed or i > 0) else pts[i]
        p1, p2 = pts[i], pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if (closed or i + 2 < n) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        segs.append((p1, c1, c2, p2))
    return segs


def smooth(pts, closed=False):
    segs = catmull_segments(pts, closed)
    d = f"M{f(pts[0][0])},{f(pts[0][1])}"
    for _, c1, c2, p2 in segs:
        d += f"C{f(c1[0])},{f(c1[1])} {f(c2[0])},{f(c2[1])} {f(p2[0])},{f(p2[1])}"
    return d + ("Z" if closed else "")


def sample(pts, closed=False, steps=12):
    out = []
    for p1, c1, c2, p2 in catmull_segments(pts, closed):
        for k in range(steps):
            t = k / steps
            a, b, c, e = (1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3
            out.append((a * p1[0] + b * c1[0] + c * c2[0] + e * p2[0],
                        a * p1[1] + b * c1[1] + c * c2[1] + e * p2[1]))
    if not closed:
        out.append(pts[-1])
    return out


def inside(pt, poly):
    x, y = pt
    hit = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            hit = not hit
    return hit


WATER_RINGS = [PL(r["pts"]) for r in GEO["water"]]
WATER_SAMPLES = [sample(r, True) for r in WATER_RINGS] + [sample(PL(g), True) for g in GUESSED_WATER]


def is_water(pt):
    return sum(inside(pt, poly) for poly in WATER_SAMPLES) % 2 == 1


def bridge_runs(pts):
    """Sub-polylines of a smoothed route (svg units) that lie over water."""
    runs, cur = [], []
    for p in sample(pts, steps=24):
        if 0 <= p[0] <= SIZE and 0 <= p[1] <= SIZE and is_water(p):
            cur.append(p)
        elif cur:
            if len(cur) > 2:
                runs.append(cur)
            cur = []
    if len(cur) > 2:
        runs.append(cur)
    return runs


def polyline(pts):
    return "M" + " L".join(f"{f(x)},{f(y)}" for x, y in pts)


def end_ticks(run, half):
    """Short splayed strokes at both ends of a bridge, the classic map symbol."""
    d = ""
    for (x, y), (px, py) in ((run[0], run[1]), (run[-1], run[-2])):
        ln = math.hypot(x - px, y - py) or 1
        ux, uy = (x - px) / ln, (y - py) / ln
        nx, ny = -uy, ux
        for side in (1, -1):
            sx, sy = x + nx * half * side, y + ny * half * side
            ex, ey = sx + ux * 7 + nx * 6 * side, sy + uy * 7 + ny * 6 * side
            d += f"M{f(sx)},{f(sy)} L{f(ex)},{f(ey)} "
    return d


def text(x, y, s, cls, size=None, rotate=0, anchor="middle"):
    attrs = f' font-size="{size}"' if size else ""
    rot = f' transform="rotate({rotate} {f(x)} {f(y)})"' if rotate else ""
    return f'<text x="{f(x)}" y="{f(y)}" class="{cls}" text-anchor="{anchor}"{attrs}{rot}>{s}</text>'


def gtext(pt, s, cls, size=None, rotate=0, anchor="middle", dx=0, dy=0):
    x, y = P(pt)
    return text(x + dx, y + dy, s, cls, size, rotate, anchor)


def text_width(s, size):
    return sum(size if ord(c) > 255 else size * 0.6 for c in s)


def split_route(pts, guess_from):
    """(surveyed part, guessed part) of a route; they share the joint point. guess_from=0 means the
    route starts outside the photos, so pts[0] is the guessed end."""
    if guess_from is None:
        return pts, None
    if guess_from == 0:
        return pts[1:], pts[:2]
    return pts[:guess_from + 1], pts[guess_from:]


def shore_runs(ring, edge):
    """Consecutive runs of real-shore vertices of a closed ring (edge vertices excluded)."""
    n = len(ring)
    if not any(edge):
        return [ring + ring[:1]]
    start = edge.index(1)
    runs, cur = [], []
    for k in range(1, n + 1):
        i = (start + k) % n
        if edge[i]:
            if len(cur) >= 2:
                runs.append(cur)
            cur = []
        else:
            cur.append(ring[i])
    if len(cur) >= 2:
        runs.append(cur)
    return runs

# --------------------------------------------------------------------------- svg layers


def known_path():
    return " ".join(polyline(PL(r)) + "Z" for r in GEO["known"])


def layer_unknown():
    return (f'<mask id="known-m"><rect x="-50" y="-50" width="{SIZE + 100}" height="{SIZE + 100}" fill="#fff"/>'
            f'<path d="{known_path()}" fill="#000"/></mask>'
            f'<rect x="0" y="0" width="{SIZE}" height="{SIZE}" fill="url(#p-unknown)" mask="url(#known-m)"/>')


def water_fill_path():
    return " ".join(smooth(r, True) for r in WATER_RINGS)


def layer_water(shore_band=False):
    out = []
    for g in GUESSED_WATER:
        out.append(f'<path d="{smooth(PL(g), True)}" class="water-guess"/>')
    if shore_band:  # green waterfront strip: a wide stroke half hidden under the water
        for r, w in zip(WATER_RINGS, GEO["water"]):
            for run in shore_runs(r, w["edge"]):
                out.append(f'<path d="{smooth(run)}" class="shore-band"/>')
    out.append(f'<path d="{water_fill_path()}" class="water" fill-rule="evenodd"/>')
    for r, w in zip(WATER_RINGS, GEO["water"]):
        for run in shore_runs(r, w["edge"]):
            out.append(f'<path d="{smooth(run)}" class="shore"/>')
    return "\n".join(out)


def layer_grid(labels=True):
    out = ['<g class="grid">']
    for i in range(1, 21):
        v = i * SIZE / 21
        out.append(f'<line x1="{f(v)}" y1="0" x2="{f(v)}" y2="{SIZE}"/><line x1="0" y1="{f(v)}" x2="{SIZE}" y2="{f(v)}"/>')
    out.append("</g>")
    out.append(f'<rect x="0" y="0" width="{SIZE}" height="{SIZE}" class="frame"/>')
    if labels:
        cell = SIZE / 21
        for i, c in enumerate(COLS):
            x = i * cell + cell / 2
            out.append(text(x, -12, c, "gl"))
            out.append(text(x, SIZE + 27, c, "gl"))
        for i in range(21):
            y = i * cell + cell / 2 + 7
            out.append(text(-16, y, str(i + 1), "gl"))
            out.append(text(SIZE + 16, y, str(i + 1), "gl"))
    return "\n".join(out)


def layer_transport(muted=False):
    out = [f'<g class="transport{" muted" if muted else ""}">']
    routes = [(h["pts"], h["guess_from"]) for h in HIGHWAYS] + [(r["pts"], r["guess_from"]) for r in MINOR_ROADS]
    for pts, gf in routes:
        known, _ = split_route(pts, gf)
        for run in bridge_runs(PL(known)):
            out.append(f'<path d="{polyline(run)}" class="bridge-casing"/>')
            out.append(f'<path d="{end_ticks(run, 8)}" class="bridge-tick"/>')
    for r in MINOR_ROADS:
        known, guess = split_route(r["pts"], r["guess_from"])
        out.append(f'<path d="{smooth(PL(known))}" class="rd-casing"/><path d="{smooth(PL(known))}" class="rd"/>')
        if guess:
            out.append(f'<path d="{smooth(PL(guess))}" class="rd-guess"/>')
    for h in HIGHWAYS:
        known, guess = split_route(h["pts"], h["guess_from"])
        out.append(f'<path d="{smooth(PL(known))}" class="hw-casing"/>')
        if guess:
            out.append(f'<path d="{smooth(PL(guess))}" class="hw-guess"/>')
    for h in HIGHWAYS:
        known, _ = split_route(h["pts"], h["guess_from"])
        out.append(f'<path d="{smooth(PL(known))}" class="hw"/>')
    x, y = P(INTERCHANGE)
    out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="12" class="ic"/>')
    out.append("</g>")
    return "\n".join(out)


def layer_exits():
    out = []
    for label, pt in EXITS:
        x, y = P(pt)
        x = min(max(x, 30), SIZE - 30); y = min(max(y, 18), SIZE - 18)
        w = 40 + 12 * len(label)
        out.append(f'<g class="exit-hw"><rect x="{f(x - w / 2)}" y="{f(y - 15)}" width="{f(w)}" height="30" rx="7"/>'
                   f'{text(x, y + 7, label, "exit-t")}</g>')
    return "\n".join(out)


def callout(anchor, label_pt, lines, side="start"):
    ax, ay = P(anchor); lx, ly = P(label_pt)
    out = [f'<path d="M{f(ax)},{f(ay)} L{f(lx)},{f(ly)}" class="callout"/>',
           f'<circle cx="{f(ax)}" cy="{f(ay)}" r="3.5" class="callout-dot"/>']
    tx = lx + (6 if side == "start" else -6)
    for i, (s, cls, size) in enumerate(lines):
        out.append(text(tx, ly + 5 + i * (size + 3), s, cls, size, anchor=side))
    return "\n".join(out)


def base_labels():
    return "\n".join([
        gtext((-0.75, 3.40), "大 湖", "wl", 50), gtext((-0.75, 3.27), "GREAT LAKE", "wl-en", 17),
        gtext((-2.24, 3.42), "森林岛", "ll", 26),
        gtext((-1.62, 2.30), "堤道", "ll", 16, 45, dx=16, dy=-14),
        gtext((-2.22, 2.52), "小岛", "ll", 15),
        gtext((-2.30, 2.05), "西 湖", "wl", 30),
        gtext((-1.00, 1.84), "市中心半岛", "ll", 21),
        gtext((-0.10, 2.18), "北 岸", "ll", 26),
        gtext((-0.86, 1.075), "内 河", "wl", 15),
        gtext((0.06, 1.12), "南湖", "wl", 20),
        gtext((0.38, 0.79), "南水道", "wl", 14, -8),
        gtext((0.74, 2.20), "悬索桥水道", "wl", 16, 45),
        gtext((0.70, 1.25), "东 岸", "ll", 24),
        gtext((1.05, 2.95), "东 北 高 地", "ll", 24),
        gtext((-1.28, 1.08), "海峡对岸", "ol", 15), gtext((-1.28, 1.00), "（可能在地图外）", "ol", 12),
        gtext((-0.50, 0.00), "南 部 · 照 片 未 覆 盖", "ul", 26),
        gtext((1.20, 3.85), "照片未覆盖", "ul", 20),
        gtext((-2.35, 0.35), "照片未覆盖", "ul", 20),
        gtext((1.48, 0.85), "照片未覆盖", "ul", 16),
    ])


def base_callouts():
    return "\n".join([
        callout((-0.18, 1.475), (0.12, 1.95), [("双子斜拉桥", "co", 17), ("全图交通枢纽", "co-en", 13)]),
        callout((1.19, 1.70), (1.36, 1.52), [("悬索桥", "co", 16)]),
        callout((-1.28, 1.30), (-1.55, 1.55), [("市中心斜拉桥", "co", 15)], side="end"),
    ])


def hatch(pid, color, angle, gap=14, width=3, cross=False, dots=False):
    if dots:
        body = f'<circle cx="{gap / 2}" cy="{gap / 2}" r="2.2" fill="{color}"/>'
    else:
        body = f'<line x1="0" y1="0" x2="0" y2="{gap}" stroke="{color}" stroke-width="{width}"/>'
        if cross:
            body += f'<line x1="0" y1="{gap / 2}" x2="{gap}" y2="{gap / 2}" stroke="{color}" stroke-width="{width}"/>'
    return (f'<pattern id="{pid}" width="{gap}" height="{gap}" patternUnits="userSpaceOnUse" '
            f'patternTransform="rotate({angle})">{body}</pattern>')


PATTERNS = "".join([
    hatch("p-com", "#9c3b2b", 45), hatch("p-off", "#5e3a96", -45), hatch("p-mix", "#2f7c7a", 0),
    hatch("p-ind", "#8a6a10", 45, cross=True), hatch("p-agr", "#6f7d2a", 0, gap=16, dots=True),
    hatch("p-tour", "#a8456c", 90), hatch("p-heavy", "#6b3a26", 30, gap=10, cross=True),
    hatch("p-unknown", "#b9b2a0", -45, gap=12, width=1.6),
])


def svg_open():
    return (f'<svg viewBox="-40 -40 {SIZE + 80} {SIZE + 80}" xmlns="http://www.w3.org/2000/svg">'
            f'<defs><clipPath id="clip"><rect x="0" y="0" width="{SIZE}" height="{SIZE}"/></clipPath>{PATTERNS}</defs>'
            f'<rect x="0" y="0" width="{SIZE}" height="{SIZE}" class="land"/>'
            '<g clip-path="url(#clip)">')


def map_base():
    return (svg_open() + layer_unknown() + layer_water() + "</g>" + layer_grid() +
            '<g clip-path="url(#clip)">' + layer_transport() + base_labels() + base_callouts() +
            layer_exits() + "</g></svg>")


def map_plan():
    zones = []
    for zid, name, kind, phase, poly, _ in ZONES:
        color, pat, _ = ZONE_STYLE[kind]
        d = smooth(PL(poly), True)
        zones.append(f'<path d="{d}" fill="{color}" class="zone"/>')
        if pat:
            zones.append(f'<path d="{d}" fill="url(#{pat})" class="zone-hatch"/>')
    start = f'<path d="{polyline(PL(START_AREA))}Z" class="start"/>'
    sx, sy = P(START_AREA[3])
    start += text(sx, sy - 10, "起步区", "start-t", 17, anchor="start")
    planned = []
    for route in PLANNED_ROADS:
        for run in bridge_runs(PL(route)):
            planned.append(f'<path d="{polyline(run)}" class="bridge-casing plan-bridge"/>')
            planned.append(f'<path d="{end_ticks(run, 6)}" class="bridge-tick"/>')
        planned.append(f'<path d="{smooth(PL(route))}" class="plan-road"/>')
    for b, pt in PLANNED_BRIDGE_LABELS:
        x, y = P(pt)
        planned.append(f'<g class="plan-b"><circle cx="{f(x)}" cy="{f(y)}" r="17"/>{text(x, y + 6, b, "plan-b-t")}</g>')
    transit = [f'<path d="{smooth(PL(r))}" class="ferry"/>' for r in FERRY]
    fx, fy = P(FERRY_LABEL)
    transit.append(text(fx + 10, fy - 12, "轮渡", "ferry-t", 16, anchor="start"))
    for name, color, tag, pts in METRO:
        transit.append(f'<path d="{smooth(PL(pts))}" stroke="{color}" class="metro"/>')
        tx, ty = P(tag)
        transit.append(f'<g><rect x="{f(tx - 22)}" y="{f(ty - 13)}" width="44" height="26" rx="6" fill="{color}"/>'
                       f'{text(tx, ty + 6, name, "line-tag-t")}</g>')
    for pt, name, (dx, dy), anchor in STATIONS:
        x, y = P(pt)
        transit.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="9" class="station"/>')
        if name:
            transit.append(text(x + dx, y + dy, name, "st-t", 15, anchor=anchor))
    fac = []
    for pt, glyph, cap, (dx, dy) in FACILITIES:
        x, y = P(pt)
        fac.append(f'<g class="fac"><rect x="{f(x - 14)}" y="{f(y - 14)}" width="28" height="28" rx="5"/>'
                   f'{text(x, y + 7, glyph, "fac-t")}</g>')
        if cap:
            fac.append(text(x + dx, y + dy, cap, "fac-cap", 14))
    labels = []
    for zid, name, kind, phase, _, pos in ZONES:
        lx, ly = P(pos[:2])
        if len(pos) == 4:  # label sits outside its zone: draw a leader to it
            ax, ay = P(pos[2:])
            labels.append(f'<path d="M{f(ax)},{f(ay)} L{f(lx)},{f(ly - 4)}" class="leader"/>'
                          f'<circle cx="{f(ax)}" cy="{f(ay)}" r="4.5" class="leader-dot"/>')
        w = 43 + text_width(name, 16)
        labels.append(f'<g class="zlabel"><rect x="{f(lx - w / 2)}" y="{f(ly - 18)}" width="{f(w)}" height="28" rx="14"/>'
                      f'<circle cx="{f(lx - w / 2 + 15)}" cy="{f(ly - 4)}" r="10.5" class="zl-badge"/>'
                      f'{text(lx - w / 2 + 15, ly + 0.5, zid, "zl-n")}'
                      f'{text(lx - w / 2 + 30, ly + 1.5, name, "zl-t", anchor="start")}</g>')
    return (svg_open() + layer_unknown() + "".join(zones) + layer_water(shore_band=True) + "</g>" + layer_grid() +
            '<g clip-path="url(#clip)">' + start + layer_transport(muted=True) + "".join(planned) +
            "".join(transit) + "".join(fac) + "".join(labels) + layer_exits() + "</g></svg>")


def map_blank():
    return (svg_open() + layer_unknown() + layer_water() + "</g>" + layer_grid() + '<g clip-path="url(#clip)">' +
            layer_transport(muted=True) + layer_exits() + "</g></svg>")

# --------------------------------------------------------------------------- html


def scale_bar():
    km = SCALE / KM_PER_UNIT  # svg units per km
    w = 2 * km
    return f"""
<div class="scale">
  <svg viewBox="0 0 {f(w + 40)} 34"><rect x="10" y="6" width="{f(km)}" height="8" fill="#333"/><rect x="{f(10 + km)}" y="6" width="{f(km)}" height="8" fill="#fff" stroke="#333"/>
  <text x="10" y="30">0</text><text x="{f(10 + km)}" y="30" text-anchor="middle">1 km</text><text x="{f(10 + w)}" y="30" text-anchor="end">2 km（估）</text></svg>
  <svg viewBox="0 0 60 60" class="north"><path d="M30 4 L42 46 L30 38 L18 46 Z" fill="#333"/><text x="30" y="58" text-anchor="middle">上</text></svg>
</div>"""


LEGEND_BASE = """
<ul class="legend">
  <li><svg viewBox="0 0 40 16"><rect width="40" height="16" fill="var(--water)"/><line x1="0" y1="15" x2="40" y2="15" stroke="var(--shore)" stroke-width="2"/></svg>湖泊 / 河道（照片描出）</li>
  <li><svg viewBox="0 0 40 16"><rect width="40" height="16" fill="var(--water-guess)"/><line x1="0" y1="15" x2="40" y2="15" stroke="var(--shore)" stroke-width="2" stroke-dasharray="5 4"/></svg>水面延伸（推测）</li>
  <li><svg viewBox="0 0 40 16"><line x1="0" y1="8" x2="40" y2="8" stroke="#6b2d12" stroke-width="9"/><line x1="0" y1="8" x2="40" y2="8" stroke="#ef8a3c" stroke-width="5.5"/></svg>既有高速（3 条出城：W / E / SE）</li>
  <li><svg viewBox="0 0 40 16"><line x1="0" y1="8" x2="40" y2="8" stroke="#ef8a3c" stroke-width="4" stroke-dasharray="7 5"/></svg>高速延伸方向（推测）</li>
  <li><svg viewBox="0 0 40 16"><line x1="0" y1="8" x2="40" y2="8" stroke="#7a6f5c" stroke-width="5"/><line x1="0" y1="8" x2="40" y2="8" stroke="#fff" stroke-width="2.8"/></svg>其他道路（示意）</li>
  <li><svg viewBox="0 0 40 16"><line x1="0" y1="8" x2="40" y2="8" stroke="#222" stroke-width="12"/><line x1="0" y1="8" x2="40" y2="8" stroke="#ef8a3c" stroke-width="5.5"/></svg>桥梁</li>
  <li><svg viewBox="0 0 40 16"><rect width="40" height="16" fill="url(#lg-unknown)" stroke="#b9b2a0"/></svg>照片没拍到，进游戏后补画</li>
</ul>"""


def zone_legend():
    rows = []
    for zid, name, kind, phase, _, _ in ZONES:
        color, pat, kind_txt = ZONE_STYLE[kind]
        sw = f'<rect width="26" height="16" fill="{color}"/>' + (f'<rect width="26" height="16" fill="url(#{pat})"/>' if pat else "")
        rows.append(f'<tr><td><svg viewBox="0 0 26 16" class="sw">{sw}</svg></td><td class="zn">{zid}</td>'
                    f'<td><b>{name}</b><span class="ph">第{phase}期</span><br><span class="dim">{kind_txt} · {ZONE_NOTES[zid]}</span></td></tr>')
    return '<table class="zones">' + "".join(rows) + "</table>"


PLAN_TEXT = """
<section class="page text-page">
  <header class="tp-head">
    <div><p class="kicker">LAKEHAVEN · 规划说明</p><h1>半岛起步，双桥成心</h1></div>
    <p class="tp-sub">地图骨架：北边是一片延伸到图外的<b>大湖</b>，被一条<b>堤道</b>分成东西两半，堤道连着<b>森林岛</b>。
    <b>市中心半岛</b>在湖南岸，高速 W 从西边跨海峡斜拉桥进城；往东约 3 km 是<b>双子斜拉桥</b>立交，
    东线 E（经悬索桥）和东南线 SE 两条高速都从这里出发。规划沿“半岛—双子桥—悬索桥”这条东西轴展开。</p>
  </header>
  <div class="cols">
    <div>
      <h2>分期建设清单</h2>
      <h3>第 1 期 · 起步（0 → 约 2,000 人）</h3>
      <ul class="check">
        <li>在 ① 市中心半岛起步（作者也是这么开局的）：高速 W 一过桥就到。</li>
        <li>半岛内铺方格路网，住宅支路不直接接高速匝道。</li>
        <li>④ 东部工业物流区先铺西端一小块（双子桥东侧），货车直上东线高速。</li>
        <li>水：先开<b>水流图层</b>看流向，取水泵放上游，排污口放下游并远离取水口。</li>
        <li>诊所、消防、警察、小学、垃圾场（垃圾场先放工业侧）。</li>
      </ul>
      <h3>第 2 期 · 成长（约 2,000 → 15,000 人）</h3>
      <ul class="check">
        <li>② 半岛北住宅、⑥ 市中心东扩；开通地铁 M1（东西轴）。</li>
        <li>建 B1 小桥（半岛东 ↔ 北岸），③ 北岸湖滨放大学和办公。</li>
        <li>开资源图层，确认<b>肥沃土地 / 石油 / 矿石</b>，再在 ⑨ 或原地开专门工业（远离住宅）。</li>
        <li>④ 工业区沿东线高速往东扩，货运站放在高速旁。</li>
      </ul>
      <h2 class="notes-h">笔记</h2>
      <div class="rules rules-notes"><div class="rule"></div><div class="rule"></div><div class="rule"></div><div class="rule"></div><div class="rule"></div><div class="rule"></div></div>
    </div>
    <div>
      <h3>第 3 期 · 扩张（约 15,000 → 60,000 人）</h3>
      <ul class="check">
        <li>地铁 M2（大学城—双子桥—南岸），开发 ⑤ 南岸新城（先进游戏把南部地形补画完整）。</li>
        <li>建 B2 跨水道桥，开发 ⑧ 东北岸住宅；⑨ 东北农林区全面铺开。</li>
        <li>⑦ 森林岛整岛做自然公园和度假区，堤道路是唯一陆路入口。</li>
        <li>大湖开<b>轮渡</b>：半岛北端 ↔ 东北岸，湖对岸不用绕路（Bridges &amp; Ports 有港口和渡轮）。</li>
        <li>⑪ 海峡对岸放电厂、焚烧厂和重工（先确认那块地在不在地图里）。</li>
      </ul>
      <h3>第 4 期 · 成熟（60,000 人以上）</h3>
      <ul class="check">
        <li>⑩ 机场放在东北，跑道顺着东线高速，噪音远离市中心。</li>
        <li>市中心换高密度办公 / 商业，地标放半岛西岸和湖边。</li>
        <li>双子桥立交吃紧时加平行桥或隧道分流，别再往桥头加路口。</li>
      </ul>
      <h2>交通要点</h2>
      <ul class="dots">
        <li><b>W</b>：从西南跨斜拉桥进市中心；<b>E</b>：双子桥经悬索桥向东；<b>SE</b>：双子桥沿南湖、南水道向南。三个出口的确切位置都在照片外，图上是推测方向。</li>
        <li>双子斜拉桥是全图咽喉，桥头 1 格内不开平面路口。</li>
        <li>两条铁路在照片里看不清，进游戏后补画。</li>
      </ul>
    </div>
    <div>
      <h2>进游戏后先核对</h2>
      <ul class="check">
        <li>纸面方向：本图上方 = 大湖；进游戏后按大湖、堤道转纸对齐</li>
        <li>水流方向（决定取水 / 排污位置）</li>
        <li>风向（工业放下风处）</li>
        <li>地下水、肥沃土地、石油、矿石的位置</li>
        <li>斜线区域（南部、东部、东北）的真实地形</li>
        <li>两条铁路的走向和出口</li>
        <li>海峡对岸那块地在不在地图边界内</li>
      </ul>
      <h2>这张图是怎么来的</h2>
      <p class="note">作者没有公开俯视图。底图用了三张高空截图：Paradox Mods 页面的全景图，以及作者第 1、3 集视频里的画面。
      每张图先按相机透视校正成俯视，再自动比对水面形状把三张对齐（重叠区水面吻合约 90–96%），最后从合成的水面图里描出岸线。</p>
      <p class="note">比例尺按市中心街区间距估算，误差约 ±20%。网格只是纸面坐标，不对应游戏地块。地名是本图自拟的。</p>
    </div>
  </div>
</section>"""


def page(svg, panel, cls=""):
    return f'<section class="page {cls}"><div class="map">{svg}</div><aside class="panel">{panel}</aside></section>'


def build():
    legend_defs = ('<svg width="0" height="0" style="position:absolute"><defs>' + PATTERNS +
                   hatch("lg-unknown", "#b9b2a0", -45, gap=6, width=1.2) + "</defs></svg>")
    p1 = page(map_base(), f"""
      <p class="kicker">CITIES: SKYLINES II · 自定义地图</p>
      <h1>Lakehaven<br><span>湖港 · 规划底图</span></h1>
      <dl class="facts">
        <dt>作者</dt><dd>CityLogic · Paradox Mods #162872</dd>
        <dt>灵感</dt><dd>加拿大圣约翰 + 五大湖区</dd>
        <dt>外部连接</dt><dd>高速 ×3 · 铁路 ×2</dd>
        <dt>资源</dt><dd>肥沃土地、石油、矿石</dd>
        <dt>需要</dt><dd>Bridges &amp; Ports DLC · 版本 1.6.*</dd>
        <dt>网格</dt><dd>21×21 参考网格，每格约 0.67 km（估）</dd>
      </dl>
      {LEGEND_BASE}
      {scale_bar()}
      <div class="box">
        <p class="box-h">资源标注（进游戏开图层后用彩笔圈出）</p>
        <p class="ticks"><span>□ 肥沃土地</span><span>□ 石油</span><span>□ 矿石</span><span>□ 地下水</span></p>
        <p class="ticks"><span>水流方向 →______</span><span>主导风向 →______</span></p>
      </div>
      <p class="caveat">由三张高空截图透视校正、对齐后描成，不是官方俯视图。形状和位置是近似的，斜线区域没有照片。</p>""")
    p2 = page(map_plan(), f"""
      <p class="kicker">LAKEHAVEN · 规划方案</p>
      <h1 class="h1-sm">功能分区与交通</h1>
      {zone_legend()}
      <ul class="legend legend-sm">
        <li><svg viewBox="0 0 40 16"><line x1="0" y1="8" x2="40" y2="8" stroke="#d6403a" stroke-width="5"/><circle cx="20" cy="8" r="5" fill="#fff" stroke="#222" stroke-width="2"/></svg>地铁 M1 / <span style="color:#2f6fd0">M2</span> 与车站</li>
        <li><svg viewBox="0 0 40 16"><line x1="0" y1="8" x2="40" y2="8" stroke="#1f8a8a" stroke-width="3" stroke-dasharray="3 5"/></svg>轮渡（大湖）</li>
        <li><svg viewBox="0 0 40 16"><line x1="0" y1="8" x2="40" y2="8" stroke="#c4541c" stroke-width="4" stroke-dasharray="9 5"/></svg>规划道路 / 新桥 B1–B2</li>
        <li><svg viewBox="0 0 40 16"><rect x="1" y="1" width="38" height="14" rx="4" fill="none" stroke="#222" stroke-width="2" stroke-dasharray="5 3"/></svg>建议起步区（作者也在这里起步）</li>
        <li><svg viewBox="0 0 40 16"><rect x="12" y="0" width="16" height="16" rx="3" fill="#fff" stroke="#222" stroke-width="1.6"/></svg>客 火车站 · 货 货运站 · 学 大学 · 电 电厂 · 废 垃圾</li>
      </ul>""", "plan")
    lines = "".join('<div class="rule"></div>' for _ in range(16))
    p4 = page(map_blank(), f"""
      <p class="kicker">LAKEHAVEN · 空白规划图</p>
      <h1 class="h1-sm">自己画</h1>
      <p class="dim">只保留水系、既有道路和网格。斜线区域先进游戏看清地形补上，再用彩笔涂分区。</p>
      <div class="rules">{lines}</div>""", "blank")
    html = f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lakehaven 规划图</title>
<style>{CSS}</style>
</head>
<body>
{legend_defs}
<p class="screen-tip">打印：A4 横向 · 边距“无” · 勾选“背景图形”。共 4 页：底图 / 规划方案 / 规划说明 / 空白规划图。</p>
{p1}
{p2}
{PLAN_TEXT}
{p4}
</body>
</html>
"""
    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT}")


CSS = """
:root{--paper:#fbfaf6;--land:#f1ede0;--water:#c4dcea;--water-guess:#d6e6ef;--shore:#5d8fb2;--ink:#24282c;--dim:#5f656b;--rule:#d9d4c6}
*{box-sizing:border-box}
html,body{margin:0;background:#e6e2d8;color:var(--ink);font-family:"Noto Sans SC","Source Han Sans SC","PingFang SC","Microsoft YaHei","WenQuanYi Zen Hei",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.screen-tip{max-width:297mm;margin:16px auto 0;padding:0 16px;font-size:13px;color:var(--dim)}
.page{width:297mm;height:210mm;margin:12px auto 24px;padding:9mm 10mm;display:flex;gap:7mm;background:var(--paper);box-shadow:0 2px 14px rgba(0,0,0,.12);overflow:hidden;break-after:page;page-break-after:always}
.page:last-child{break-after:auto;page-break-after:auto}
.map{flex:none;width:192mm;height:192mm}
.map svg{width:100%;height:100%;display:block}
.panel{flex:1;min-width:0;display:flex;flex-direction:column;gap:3mm;font-size:8.6pt;line-height:1.45}
.kicker{margin:0;font-size:7.5pt;letter-spacing:.14em;color:var(--dim);font-weight:600}
h1{margin:0;font-size:24pt;line-height:1.05;letter-spacing:-.01em}
h1 span{display:block;font-size:12.5pt;font-weight:500;color:var(--dim);margin-top:1.5mm;letter-spacing:0}
.h1-sm{font-size:15pt}
.facts{display:grid;grid-template-columns:auto 1fr;gap:.6mm 3mm;margin:0;padding:2.2mm 0;border-top:1.2px solid var(--ink);border-bottom:1px solid var(--rule)}
.facts dt{color:var(--dim)}.facts dd{margin:0}
.legend{list-style:none;margin:0;padding:0;display:grid;gap:1.1mm}
.legend li{display:flex;align-items:center;gap:2.5mm}
.legend svg{width:11mm;height:4.4mm;flex:none}
.legend-sm{font-size:7.6pt;gap:1mm}
.scale{display:flex;align-items:center;justify-content:space-between}
.scale svg{width:44mm;height:7mm}.scale .north{width:9mm;height:9mm}
.scale text{font-size:11px;fill:var(--ink)}
.box{border:1.2px solid var(--ink);padding:2mm 2.6mm;border-radius:2mm}
.box p{margin:0}.box-h{font-weight:700;margin-bottom:1mm!important}
.ticks{display:flex;flex-wrap:wrap;gap:1mm 4mm}
.caveat,.dim{color:var(--dim);font-size:7.6pt;margin:0}
.caveat{margin-top:auto;border-left:2px solid #c4541c;padding-left:2.4mm}
table.zones{border-collapse:collapse;width:100%;font-size:7.5pt;line-height:1.28}
.zones td{padding:.7mm 1mm;vertical-align:top;border-bottom:1px solid var(--rule)}
.zones .sw{width:7mm;height:4.4mm;display:block;margin-top:.4mm;outline:1px solid rgba(0,0,0,.25)}
.zones .zn{font-weight:700;text-align:center;width:5mm}
.zones .ph{margin-left:1.6mm;font-size:6.8pt;padding:0 1.2mm;border:1px solid var(--ink);border-radius:2mm}
.zones .dim{font-size:6.9pt}
.rules{flex:1;display:flex;flex-direction:column;justify-content:space-between;padding-top:2mm}
.rule{border-bottom:1px solid var(--rule);height:0}
.notes-h{margin-top:4mm!important}
.rules-notes{flex:none;height:42mm;padding-top:0}
/* svg */
.land{fill:var(--land)}
.water{fill:var(--water);stroke:none}
.water-guess{fill:var(--water-guess);stroke:var(--shore);stroke-width:2.2;stroke-dasharray:9 7;stroke-linejoin:round}
.shore{fill:none;stroke:var(--shore);stroke-width:2.4;stroke-linejoin:round;stroke-linecap:round}
.shore-band{fill:none;stroke:#7dbb6f;stroke-width:30;stroke-linejoin:round;stroke-linecap:round;opacity:.7}
.grid line{stroke:#8f8a7d;stroke-width:.8;opacity:.5}
.frame{fill:none;stroke:var(--ink);stroke-width:2.4}
.gl{font-size:17px;fill:var(--dim);font-weight:600}
.hw-casing{fill:none;stroke:#6b2d12;stroke-width:12;stroke-linecap:round;stroke-linejoin:round}
.hw{fill:none;stroke:#ef8a3c;stroke-width:7;stroke-linecap:round;stroke-linejoin:round}
.hw-guess{fill:none;stroke:#ef8a3c;stroke-width:5;stroke-dasharray:12 9;stroke-linecap:round}
.rd-casing{fill:none;stroke:#7a6f5c;stroke-width:7;stroke-linecap:round;stroke-linejoin:round}
.rd{fill:none;stroke:#fff;stroke-width:3.6;stroke-linecap:round;stroke-linejoin:round}
.rd-guess{fill:none;stroke:#7a6f5c;stroke-width:2.6;stroke-dasharray:7 6;stroke-linecap:round}
.bridge-casing{fill:none;stroke:#1f1f1f;stroke-width:19;stroke-linecap:butt;stroke-linejoin:round}
.bridge-casing.plan-bridge{stroke-width:13}
.bridge-tick{fill:none;stroke:#1f1f1f;stroke-width:2.6;stroke-linecap:round}
.ic{fill:#fff;stroke:#6b2d12;stroke-width:3}
.transport.muted{opacity:.72}
.exit-hw rect{fill:#ef8a3c;stroke:#6b2d12;stroke-width:2.4}
.exit-t{font-size:17px;font-weight:800;fill:#24282c}
text{font-family:inherit}
.wl{fill:#2f6286;font-weight:700;letter-spacing:.06em;paint-order:stroke;stroke:var(--water);stroke-width:5}
.wl-en{fill:#2f6286;font-weight:600;letter-spacing:.3em;opacity:.8}
.ll{fill:#5a5243;font-weight:700;letter-spacing:.08em;paint-order:stroke;stroke:var(--land);stroke-width:5}
.ol{fill:#857c6c;font-weight:600;paint-order:stroke;stroke:var(--land);stroke-width:5}
.ul{fill:#9a927f;font-weight:700;letter-spacing:.12em;paint-order:stroke;stroke:var(--land);stroke-width:6}
.callout{fill:none;stroke:var(--ink);stroke-width:1.6}
.callout-dot{fill:var(--ink)}
.co{font-weight:700;fill:var(--ink);paint-order:stroke;stroke:var(--land);stroke-width:5}
.co-en{fill:var(--dim);font-weight:600;paint-order:stroke;stroke:var(--land);stroke-width:5}
.zone{opacity:.62}
.zone-hatch{opacity:.42}
.start{fill:none;stroke:#222;stroke-width:3;stroke-dasharray:14 9;stroke-linejoin:round}
.start-t{font-weight:700;fill:#222;paint-order:stroke;stroke:#fff;stroke-width:5}
.plan-road{fill:none;stroke:#c4541c;stroke-width:6;stroke-dasharray:16 9;stroke-linecap:round}
.plan-b circle{fill:#c4541c;stroke:#fff;stroke-width:3}
.plan-b-t{font-size:15px;font-weight:800;fill:#fff}
.metro{fill:none;stroke-width:8;stroke-linecap:round;stroke-linejoin:round;opacity:.92}
.ferry{fill:none;stroke:#1f8a8a;stroke-width:4;stroke-dasharray:4 7;stroke-linecap:round}
.ferry-t{font-weight:700;fill:#1f6f6f;paint-order:stroke;stroke:var(--water);stroke-width:5}
.station{fill:#fff;stroke:#1f1f1f;stroke-width:3.2}
.st-t{font-weight:700;fill:#1f1f1f;paint-order:stroke;stroke:#fff;stroke-width:5}
.line-tag-t{font-size:16px;font-weight:800;fill:#fff}
.fac rect{fill:#fff;stroke:#1f1f1f;stroke-width:2.4}
.fac-t{font-size:17px;font-weight:800;fill:#1f1f1f}
.fac-cap{font-weight:700;fill:#1f1f1f;paint-order:stroke;stroke:#fff;stroke-width:5}
.zlabel rect{fill:#fff;stroke:#1f1f1f;stroke-width:2;opacity:.94}
.leader{fill:none;stroke:#1f1f1f;stroke-width:2}
.leader-dot{fill:#1f1f1f}
.zl-badge{fill:#1f1f1f}
.zl-n{font-size:12.5px;font-weight:800;fill:#fff}
.zl-t{font-size:16px;font-weight:700;fill:#1f1f1f}
/* text page */
.text-page{flex-direction:column;gap:4.5mm;font-size:9pt;line-height:1.5}
.tp-head{display:grid;grid-template-columns:auto 1fr;gap:9mm;align-items:end;border-bottom:1.4px solid var(--ink);padding-bottom:3.5mm}
.tp-head h1{font-size:21pt}
.tp-sub{margin:0;color:var(--dim)}
.tp-sub b{color:var(--ink)}
.cols{display:grid;grid-template-columns:1fr 1fr .9fr;gap:8mm;flex:1}
.cols h2{font-size:11.5pt;margin:0 0 1.6mm;letter-spacing:.04em}
.cols h3{font-size:9.8pt;margin:2.6mm 0 1.2mm}
.cols ul{margin:0 0 2.4mm;padding:0;list-style:none}
.cols li{position:relative;padding-left:5mm;margin-bottom:1.3mm}
.check li::before{content:"";position:absolute;left:0;top:1.4mm;width:2.6mm;height:2.6mm;border:1.2px solid var(--ink);border-radius:.5mm}
.dots li::before{content:"";position:absolute;left:1mm;top:2.1mm;width:1.4mm;height:1.4mm;background:var(--ink);border-radius:50%}
.note{margin:0 0 2.4mm;color:var(--dim);font-size:8.4pt}
@page{size:A4 landscape;margin:0}
@media print{html,body{background:none}.screen-tip{display:none}.page{margin:0;box-shadow:none}}
"""

if __name__ == "__main__":
    build()
