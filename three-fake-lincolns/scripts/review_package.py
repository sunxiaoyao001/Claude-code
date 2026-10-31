"""Build the review package for one review round (brief, step 5).

Usage: python3 -I scripts/review_package.py <video.mp4> <round> [--root ../review]

Writes review/round_N/:
  final.mp4                 the rendered cut
  contact/sheet_XX.png      one frame every 0.2 s, 20 per sheet (5 x 4), with timecodes
  keyframes/*.png           full-size frames: cover, reveals, twist, golden line, last frame
  phone/*.png, phone.mp4    360 px wide feed-size previews
  audio/waveform.png        waveform + sound-event markers (from timeline.ts)
  audio/spectrogram.png     spectrogram + markers
  audio/alignment.md        each sound event vs the nearest detected onset (frames)
  audio/ebur128.txt         loudness report
  facts.json, credits.json, script.md
"""
import argparse
import json
import os
import shutil
import subprocess

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESEARCH = os.path.join(os.path.dirname(ROOT), "research")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
KEYFRAMES = {"cover_0000": 0, "reveal_0336": 336, "reveal_0348": 348, "difference_0612": 612, "ghost_1100": 1100, "grant_1740": 1740, "twist_1932": 1932, "twist_1990": 1990, "golden_2500": 2500, "credits_2580": 2580, "last_2687": 2687}
PHONE = [0, 348, 1100, 1932, 2500]


def run(cmd):
    subprocess.run(cmd, check=True)


def ffmpeg(*args):
    run(["ffmpeg", "-v", "error", "-y", *args])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("round", type=int)
    ap.add_argument("--root", default=os.path.join(os.path.dirname(ROOT), "review"))
    a = ap.parse_args()
    out = os.path.join(a.root, f"round_{a.round}")
    for sub in ("contact", "keyframes", "phone", "audio"):
        os.makedirs(os.path.join(out, sub), exist_ok=True)
    shutil.copy(a.video, os.path.join(out, "final.mp4"))

    # Contact sheets: 5 fps, 384 px wide, 5 x 4 tiles, timecode burnt into each tile.
    draw = f"drawtext=fontfile={FONT}:text='%{{pts\\:hms}}':x=8:y=8:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6"
    ffmpeg("-i", a.video, "-vf", f"fps=5,scale=384:-1,{draw},tile=5x4", os.path.join(out, "contact", "sheet_%02d.png"))

    for name, f in KEYFRAMES.items():
        ffmpeg("-i", a.video, "-vf", f"select=eq(n\\,{f})", "-frames:v", "1", os.path.join(out, "keyframes", f"{name}.png"))
    for f in PHONE:
        ffmpeg("-i", a.video, "-vf", f"select=eq(n\\,{f}),scale=360:-1", "-frames:v", "1", os.path.join(out, "phone", f"phone_{f:04d}.png"))
    ffmpeg("-i", a.video, "-vf", "scale=360:-2", "-c:v", "libx264", "-crf", "26", "-c:a", "aac", "-b:a", "96k", os.path.join(out, "phone", "phone.mp4"))

    # Audio: mono 48 kHz samples, onsets from spectral flux, markers from the timeline.
    timeline = json.load(open(os.path.join(ROOT, "out", "timeline.json")))
    fps = timeline["fps"]
    pcm = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", a.video, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True, check=True).stdout, np.float32)
    sr = 48000
    t = np.arange(len(pcm)) / sr
    events = sorted(timeline["sfx"], key=lambda e: e["at"])

    fig, ax = plt.subplots(figsize=(28, 5))
    step = 40
    ax.plot(t[::step], pcm[::step], lw=0.3, color="#333")
    for e in events:
        ax.axvline(e["at"] / fps, color="#C8412B", lw=0.5, alpha=0.6)
    s0, s1 = timeline["silence"]["from"] / fps, timeline["silence"]["to"] / fps
    ax.axvspan(s0, s1, color="#4a90e2", alpha=0.3, label="silence 1905–1920")
    ax.set_xlim(0, t[-1])
    ax.set_xlabel("seconds")
    ax.set_title("Waveform; vermilion lines = sound events from timeline.ts")
    ax.legend(loc="upper right")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "audio", "waveform.png"), dpi=110)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(28, 6))
    ax.specgram(pcm, NFFT=2048, Fs=sr, noverlap=1024, cmap="magma")
    for e in events:
        ax.axvline(e["at"] / fps, color="cyan", lw=0.4, alpha=0.5)
    ax.set_ylim(0, 12000)
    ax.set_xlabel("seconds")
    ax.set_title("Spectrogram; cyan = sound events")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "audio", "spectrogram.png"), dpi=110)
    plt.close(fig)

    # Onset detection: half-wave-rectified spectral flux on 256-sample hops, peak picking.
    hop, n = 256, 1024
    frames = np.lib.stride_tricks.sliding_window_view(pcm, n)[::hop] * np.hanning(n)
    mag = np.abs(np.fft.rfft(frames, axis=1))
    flux = np.maximum(0, np.diff(np.log1p(mag * 10), axis=0)).sum(axis=1)
    flux = (flux - np.median(flux)) / (np.std(flux) + 1e-9)
    peaks = [i for i in range(1, len(flux) - 1) if flux[i] > 1.5 and flux[i] >= flux[i - 1] and flux[i] >= flux[i + 1]]
    onset_t = (np.array(peaks) + 1) * hop / sr + n / 2 / sr
    rows = ["| 事件 | 帧 | 最近起音（帧） | 误差（帧） |", "|---|---|---|---|"]
    errs = []
    for e in events:
        target = e["at"] / fps
        if len(onset_t) == 0:
            break
        j = int(np.argmin(np.abs(onset_t - target)))
        d = (onset_t[j] - target) * fps
        if abs(d) <= 6:
            errs.append(abs(d))
        rows.append(f"| {e['sound']} ({e['gainDb']} dB) | {e['at']} | {onset_t[j] * fps:.1f} | {d:+.1f} |")
    summary = f"检测到起音的事件：{len(errs)} / {len(events)}；其中误差 ≤ 1 帧：{sum(1 for x in errs if x <= 1)}，≤ 2 帧：{sum(1 for x in errs if x <= 2)}（很轻的点击声可能被配乐盖住而检测不到）"
    with open(os.path.join(out, "audio", "alignment.md"), "w") as fh:
        fh.write("# 音效对齐（起音检测）\n\n" + summary + "\n\n" + "\n".join(rows) + "\n")

    rep = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", a.video, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    with open(os.path.join(out, "audio", "ebur128.txt"), "w") as fh:
        fh.write(rep[rep.rfind("Summary:"):])

    shutil.copy(os.path.join(RESEARCH, "facts.json"), os.path.join(out, "facts.json"))
    shutil.copy(os.path.join(RESEARCH, "credits.draft.json"), os.path.join(out, "credits.json"))
    shutil.copy(os.path.join(RESEARCH, "script.md"), os.path.join(out, "script.md"))
    shutil.copy(os.path.join(RESEARCH, "publish.md"), os.path.join(out, "description.md"))
    print(out)
    print(summary)


if __name__ == "__main__":
    main()
