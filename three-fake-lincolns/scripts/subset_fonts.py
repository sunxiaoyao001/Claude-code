"""Subset the Noto CJK sources to the characters that actually appear in src/.

Sources (SIL OFL 1.1) live in assets/fonts_src/; fetch them with scripts/fetch_fonts.sh.
Output: public/fonts/*.woff2. Re-run whenever on-screen text changes.
"""
import os
import re
import sys

from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "src")
FONT_SRC = os.path.join(ROOT, "assets", "fonts_src")
OUT = os.path.join(ROOT, "public", "fonts")

FONTS = {
    "NotoSerifSC-Black.otf": "noto-serif-sc-900.woff2",
    "NotoSansSC-Medium.otf": "noto-sans-sc-500.woff2",
    "NotoSansSC-Bold.otf": "noto-sans-sc-700.woff2",
}

# Always keep ASCII, CJK punctuation and the quote marks used in subtitles.
BASE = "".join(chr(c) for c in range(0x20, 0x7F)) + "，。：；！？、「」『』（）·—…“”‘’《》０１２３４５６７８９"


def collect_text():
    chars = set(BASE)
    for dirpath, _, files in os.walk(SRC_DIR):
        for name in files:
            if name.endswith((".ts", ".tsx", ".json")):
                with open(os.path.join(dirpath, name), encoding="utf-8") as f:
                    chars.update(re.findall(r"[^\x00-\x7F]", f.read()))
    return "".join(sorted(chars))


def main():
    text = collect_text()
    os.makedirs(OUT, exist_ok=True)
    for src, dst in FONTS.items():
        path = os.path.join(FONT_SRC, src)
        if not os.path.exists(path):
            sys.exit(f"missing {path}; run scripts/fetch_fonts.sh")
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        font = subset.load_font(path, opts)
        sub = subset.Subsetter(opts)
        sub.populate(text=text)
        sub.subset(font)
        out = os.path.join(OUT, dst)
        subset.save_font(font, out, opts)
        print(f"{dst}: {os.path.getsize(out) // 1024} KB")
    print(f"{len(text)} characters")


if __name__ == "__main__":
    main()
