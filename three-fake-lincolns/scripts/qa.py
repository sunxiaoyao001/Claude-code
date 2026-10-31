"""Automatic checks on a rendered MP4. Run before every review round and before delivery.

Usage: python3 -I scripts/qa.py <video.mp4> [--md report.md]

Checks
- container: 9:16, 30 fps, 89.6 s (±1 frame), H.264 + AAC
- loudness: integrated loudness and true peak (ffmpeg ebur128)
- silence: frames 1905–1920 carry only the room tone (no score, no effects)
- loop seam: the last frame matches the first
- vermilion: share of #C8412B-like pixels in any frame (brief: ≤ 5%)
- motion: longest stretch with no visible change (brief: ≤ 2.5 s)
"""
import argparse
import json
import re
import subprocess
import sys

import numpy as np

FPS = 30
TOTAL = 2688
SILENCE = (1905, 1920)
VERMILION = np.array([200, 65, 43], dtype=np.float32)
SMALL = (135, 240)  # analysis size (w, h); enough for colour share and motion


def ffprobe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path], capture_output=True, check=True, text=True).stdout
    return json.loads(out)


def frames(path):
    w, h = SMALL
    proc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={w}:{h}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE,
    )
    size = w * h * 3
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, w, 3)
    proc.wait()


def audio(path):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32)


def loudness(path):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    summary = err[err.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+) LUFS", summary)
    tp = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary)
    return float(i.group(1)) if i else None, float(tp.group(1)) if tp else None


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x.astype(np.float64) ** 2)) + 1e-12)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--md")
    a = ap.parse_args()
    rows = []

    def check(name, ok, value, rule):
        rows.append((name, "PASS" if ok else "FAIL", value, rule))

    info = ffprobe(a.video)
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    au = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    num, den = (int(x) for x in v["r_frame_rate"].split("/"))
    fps = num / den
    dur = float(info["format"]["duration"])
    w, h = int(v["width"]), int(v["height"])
    check("画幅", abs(w / h - 9 / 16) < 0.002, f"{w}×{h}", "9:16")
    check("帧率", abs(fps - FPS) < 0.01, f"{fps:g} fps", "30 fps")
    check("时长", abs(dur - TOTAL / FPS) <= 1.5 / FPS, f"{dur:.3f} s", "89.6 s ±1 帧")
    check("编码", v["codec_name"] == "h264" and au is not None and au["codec_name"] == "aac", f"{v['codec_name']} / {au['codec_name'] if au else '无音轨'}", "H.264 + AAC")

    lufs, tp = loudness(a.video)
    check("响度", lufs is not None and abs(lufs - -14) <= 1, f"{lufs} LUFS", "−14 ±1 LUFS（成片）")
    check("真峰值", tp is not None and tp <= -1.0, f"{tp} dBTP", "≤ −1 dBTP")

    pcm = audio(a.video)
    sr = 48000
    seg = lambda f0, f1: pcm[int(f0 / FPS * sr): int(f1 / FPS * sr)]
    quiet = rms_db(seg(SILENCE[0] + 1, SILENCE[1] - 1))
    before = rms_db(seg(SILENCE[0] - 45, SILENCE[0] - 3))
    check("静默 1905–1920", quiet <= -38 and before - quiet >= 10, f"{quiet:.1f} dBFS（前 1.4 秒 {before:.1f}）", "只剩底噪：≤ −38 dBFS，且比前段低 ≥ 10 dB")

    first = last = None
    max_red, max_red_at = 0.0, 0
    static_run, longest, longest_at = 0, 0, 0
    prev = None
    n = 0
    for i, fr in enumerate(frames(a.video)):
        f = fr.astype(np.float32)
        if first is None:
            first = f
        last = f
        red = float((np.linalg.norm(f - VERMILION, axis=2) < 48).mean())
        if red > max_red:
            max_red, max_red_at = red, i
        if prev is not None:
            # Average 8 x 8 blocks (≈ 64 x 64 source pixels) so per-frame film grain cancels out.
            a = f.reshape(30, 8, 15, 9, 3).mean(axis=(1, 3))
            b = prev.reshape(30, 8, 15, 9, 3).mean(axis=(1, 3))
            moving = np.abs(a - b).mean() > 0.35
            static_run = 0 if moving else static_run + 1
            if static_run > longest:
                longest, longest_at = static_run, i - static_run
        prev = f
        n = i + 1
    seam = float(np.abs(first - last).mean())
    check("循环接缝", seam < 4.0, f"首尾帧平均差 {seam:.2f} / 255（含逐帧胶片颗粒）", "< 4")
    check("朱砂占比", max_red <= 0.05, f"最高 {max_red * 100:.2f}%（第 {max_red_at} 帧）", "单帧 ≤ 5%")
    check("静止画面", longest <= 75, f"最长 {longest} 帧（从第 {longest_at} 帧起）", "≤ 2.5 秒（75 帧）")
    check("帧数", abs(n - round(dur * FPS)) <= 1, f"{n} 帧", "与时长一致")

    lines = ["| 检查 | 结果 | 实测 | 标准 |", "|---|---|---|---|"] + [f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} |" for r in rows]
    report = "\n".join(lines)
    print(report)
    if a.md:
        with open(a.md, "w") as fh:
            fh.write(f"# 质检报告：{a.video}\n\n{report}\n")
    sys.exit(0 if all(r[1] == "PASS" for r in rows) else 1)


if __name__ == "__main__":
    main()
