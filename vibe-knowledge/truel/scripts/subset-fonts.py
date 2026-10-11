#!/usr/bin/env python3
"""
中文字体子集化：npm run fonts -- --src <ttf 所在目录>
------------------------------------------------------------
仓库里已经带了裁好的 woff2（public/fonts），正常渲染不需要运行本脚本。
只有当你修改了字幕、出现了“豆腐块”缺字时，才需要重新裁剪。

字体来源（SIL OFL 1.1，可商用）：
  npm pack @expo-google-fonts/noto-serif-sc @expo-google-fonts/noto-sans-sc
  解压后把 *.ttf 所在目录传给 --src

字符集 = GB2312 一级常用字（3755 字）+ src/ 下所有源码里出现的字符 + ASCII + 常用标点
依赖：pip install fonttools brotli
"""
import argparse
import pathlib
import re

from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts"

# (源文件名, 输出文件名)
TARGETS = [
    ("NotoSerifSC_900Black.ttf", "NotoSerifSC-Black.woff2"),
    ("NotoSansSC_500Medium.ttf", "NotoSansSC-Medium.woff2"),
    ("NotoSansSC_700Bold.ttf", "NotoSansSC-Bold.woff2"),
    ("NotoSansSC_900Black.ttf", "NotoSansSC-Black.woff2"),
]


def gb2312_level1() -> str:
    chars = []
    for hi in range(0xB0, 0xD8):  # 16 区 ~ 55 区
        for lo in range(0xA1, 0xFF):
            try:
                chars.append(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    return "".join(chars)


def source_chars() -> str:
    text = ""
    for p in (ROOT / "src").rglob("*"):
        if p.suffix in {".ts", ".tsx"}:
            text += p.read_text(encoding="utf-8")
    return "".join(sorted(set(re.sub(r"[\x00-\x7f]", "", text))))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="包含 NotoSerifSC_*.ttf / NotoSansSC_*.ttf 的目录（可递归）")
    args = ap.parse_args()
    src = pathlib.Path(args.src)

    ascii_chars = "".join(chr(c) for c in range(0x20, 0x7F))
    punct = "，。！？：；、“”‘’（）《》【】—…·％＋－×÷→←↑↓↺▶◀▸●✕"
    charset = "".join(sorted(set(gb2312_level1() + source_chars() + ascii_chars + punct)))
    print(f"字符数：{len(charset)}")

    OUT.mkdir(parents=True, exist_ok=True)
    for src_name, out_name in TARGETS:
        found = list(src.rglob(src_name))
        if not found:
            raise SystemExit(f"找不到 {src_name}，请确认 --src 目录")
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        font = subset.load_font(str(found[0]), opts)
        sub = subset.Subsetter(opts)
        sub.populate(text=charset)
        sub.subset(font)
        dst = OUT / out_name
        subset.save_font(font, str(dst), opts)
        print(f"{out_name}: {dst.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
