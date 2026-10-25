"""Prepare archive images for the film and write src/assets.generated.json.

- Reads originals from assets/raw/ (never modified) and writes RGB JPEGs to public/images/.
  Images are only ever downscaled (long edge capped at MAX_EDGE), never enlarged.
- Registers the 1852 Calhoun print onto the Lincoln composite (SIFT + RANSAC similarity) and
  renders the difference mask used for the "差异图" shot.

Run: python3 -I scripts/prepare_images.py
"""
import json
import os

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "assets", "raw")
OUT = os.path.join(ROOT, "public", "images")
MANIFEST = os.path.join(ROOT, "src", "assets.generated.json")
MAX_EDGE = 2400

# id -> (raw file, output name, provenance caption shown on screen)
SOURCES = {
    "lincolnComposite": ("uploads/IMG01_lincoln_composite__loc-2003654314.jpg", "lincoln_composite.jpg", "LIBRARY OF CONGRESS · CA. 1865"),
    "calhoun1852": ("uploads/IMG02_calhoun_1852__loc-2003679757.jpg", "calhoun_1852.jpg", "LIBRARY OF CONGRESS · 1852"),
    "maryLincolnGhost": ("uploads/IMG03_mumler_mary_lincoln__commons-Mumler_Lincoln.jpg", "mumler_mary_lincoln.jpg", "W. H. MUMLER · CA. 1872"),
    "grantCityPoint": ("uploads/IMG04_grant_city_point__loc-2007681056.jpg", "grant_city_point.jpg", "LIBRARY OF CONGRESS · 1902"),
    "houdiniLincolnGhost": ("uploads/IMG05_houdini_lincoln_ghost__loc-96520658.jpg", "houdini_lincoln_ghost.jpg", "LIBRARY OF CONGRESS · 1920–1930"),
    "houdiniFamily": ("uploads/IMG06_houdini_bess_mother__loc-96518779.jpg", "houdini_family.jpg", "LIBRARY OF CONGRESS"),
    "houdiniClippings": ("uploads/IMG07_houdini_death_clippings__loc-2018682515.jpg", "houdini_clippings.jpg", "LIBRARY OF CONGRESS · 1926"),
    "mumlerElderlyMan": ("uploads/IMG08a_mumler_spirit_elderly_man__commons.jpg", "mumler_spirit_a.jpg", "W. H. MUMLER · 1860S–70S"),
    "mumlerWoman": ("uploads/IMG08b_mumler_spirit_woman__commons.jpg", "mumler_spirit_b.jpg", "W. H. MUMLER · 1860S–70S"),
    "mumlerYoungMan": ("uploads/IMG08c_mumler_spirit_young_man__commons.jpg", "mumler_spirit_c.jpg", "W. H. MUMLER · 1860S–70S"),
    "grantColdHarbor": ("uploads/IMG10_grant_coldharbor_negative__loc-2018667429.jpg", "grant_cold_harbor.jpg", "LIBRARY OF CONGRESS · 1864"),
    "mccookHorseback": ("uploads/IMG11_mccook_horseback_negative__loc-2018667065.jpg", "mccook_horseback.jpg", "LIBRARY OF CONGRESS · 1864"),
    "confederatePrisoners": ("uploads/IMG12_confederate_prisoners__loc-2007684716.jpg", "confederate_prisoners.jpg", "LIBRARY OF CONGRESS · 1864"),
    "metSitter": ("met/met_287722.jpg", "met_287722_sitter.jpg", "THE MET · CC0"),
}

# Hand-measured regions, normalised to the source image (x0, y0, x1, y1) or points (x, y).
REGIONS = {
    "lincolnComposite": {
        "engraving": [0.125, 0.08, 0.865, 0.873],
        "head": [0.50, 0.215, 0.585, 0.31],
        "neck": [0.505, 0.30, 0.575, 0.335],
        "papers": [0.66, 0.535, 0.82, 0.60],
        "figure": [0.39, 0.215, 0.68, 0.82],
    },
    "maryLincolnGhost": {
        "photo": [0.07, 0.04, 0.94, 0.95],
        "face": [0.33, 0.40, 0.55, 0.55],
        "ghost": [0.47, 0.04, 0.88, 0.33],
        "ghostHandLeft": [0.22, 0.54, 0.36, 0.62],
        "ghostHandRight": [0.55, 0.60, 0.70, 0.70],
    },
    "houdiniLincolnGhost": {
        "slide": [0.04, 0.03, 0.955, 0.965],
        "houdiniHead": [0.22, 0.13, 0.36, 0.33],
        "ghostHead": [0.72, 0.13, 0.85, 0.33],
        "ghostBody": [0.62, 0.13, 0.95, 0.75],
    },
    "houdiniFamily": {
        "photo": [0.09, 0.065, 0.94, 0.95],
        "bessHead": [0.27, 0.16, 0.40, 0.27],
        "houdiniHead": [0.49, 0.12, 0.64, 0.25],
        "bess": [0.17, 0.13, 0.50, 0.58],
    },
    "grantCityPoint": {
        "photo": [0.045, 0.07, 0.95, 0.905],
        "head": [0.49, 0.36, 0.555, 0.45],
        "horseAndBody": [0.30, 0.44, 0.69, 0.85],
        "background": [0.05, 0.18, 0.95, 0.33],
        "handwriting": [0.04, 0.905, 0.25, 0.95],
    },
}


def to_rgb_jpeg(src, dst):
    im = Image.open(src).convert("RGB")
    w, h = im.size
    scale = min(1.0, MAX_EDGE / max(w, h))
    if scale < 1:
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    im.save(dst, quality=93, subsampling=0)
    return im.size, (w, h)


def register(a_path, b_path):
    a = cv2.imread(a_path, 0)
    b = cv2.imread(b_path, 0)
    sift = cv2.SIFT_create(4000)
    ka, da = sift.detectAndCompute(a, None)
    kb, db = sift.detectAndCompute(b, None)
    pairs = cv2.BFMatcher().knnMatch(db, da, k=2)
    good = [m for m, n in pairs if m.distance < 0.75 * n.distance]
    src = np.float32([kb[g.queryIdx].pt for g in good])
    dst = np.float32([ka[g.trainIdx].pt for g in good])
    M, inliers = cv2.estimateAffinePartial2D(src, dst, ransacReprojThreshold=3.0, maxIters=5000, confidence=0.999, refineIters=20)
    return a, b, M, len(good), int(inliers.sum())


def difference_mask(a, b, M, engraving):
    """Vermilion-on-transparent PNG (in Lincoln-print pixels) where the two plates differ."""
    h, w = a.shape
    warped = cv2.warpAffine(b, M, (w, h), flags=cv2.INTER_LINEAR, borderValue=255)
    # Compare local structure, not paper tone: normalise each with a large-radius high-pass.
    def structure(x):
        x = x.astype(np.float32)
        return cv2.GaussianBlur(x - cv2.GaussianBlur(x, (0, 0), 25), (0, 0), 2)
    d = np.abs(structure(a) - structure(warped))
    x0, y0, x1, y1 = engraving
    roi = np.zeros_like(d, dtype=bool)
    roi[int(y0 * h) + 6:int(y1 * h) - 6, int(x0 * w) + 6:int(x1 * w) - 6] = True
    thr = np.percentile(d[roi], 97.5)
    mask = ((d > thr) & roi).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    mask = cv2.dilate(mask, np.ones((7, 7), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask)
    keep = np.zeros_like(mask)
    blobs = []
    for i in range(1, n):
        x, y, bw, bh, area = stats[i]
        if area >= 900:
            keep[lab == i] = 255
            blobs.append([round(x / w, 4), round(y / h, 4), round((x + bw) / w, 4), round((y + bh) / h, 4), int(area)])
    keep = cv2.GaussianBlur(keep, (0, 0), 3)
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = 200, 65, 43  # vermilion #C8412B
    rgba[..., 3] = keep
    return rgba, sorted(blobs, key=lambda b: -b[4])


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = {"images": {}, "registration": {}}
    for key, (raw, name, caption) in SOURCES.items():
        (w, h), (ow, oh) = to_rgb_jpeg(os.path.join(RAW, raw), os.path.join(OUT, name))
        manifest["images"][key] = {
            "file": f"images/{name}",
            "width": w,
            "height": h,
            "sourceWidth": ow,
            "sourceHeight": oh,
            "caption": caption,
            "regions": REGIONS.get(key, {}),
        }
        print(f"{key:22s} {ow}x{oh} -> {w}x{h}")

    lin = os.path.join(OUT, "lincoln_composite.jpg")
    cal = os.path.join(OUT, "calhoun_1852.jpg")
    a, b, M, n_good, n_inl = register(lin, cal)
    scale = float(np.hypot(M[0, 0], M[1, 0]))
    rot = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
    rgba, blobs = difference_mask(a, b, M, REGIONS["lincolnComposite"]["engraving"])
    Image.fromarray(rgba, "RGBA").save(os.path.join(OUT, "diff_calhoun_lincoln.png"))
    manifest["registration"]["calhounToLincoln"] = {
        "matrix": [[float(v) for v in row] for row in M],
        "scale": round(scale, 5),
        "rotationDeg": round(rot, 4),
        "matches": n_good,
        "inliers": n_inl,
        "differenceMask": "images/diff_calhoun_lincoln.png",
        "differenceBlobs": blobs,
    }
    print(f"registration: {n_inl}/{n_good} inliers, scale {scale:.4f}, rot {rot:.3f} deg")
    print("difference blobs (x0,y0,x1,y1,area):", blobs[:6])
    with open(MANIFEST, "w") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
