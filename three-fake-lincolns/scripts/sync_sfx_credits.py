"""Rewrite the sound-effect entries of research/credits.draft.json from what the film actually uses.

Reads public/sfx/manifest.json (files and measured peak offsets) and out/timeline.json (the sound
events and which sounds are onset-aligned; written by scripts/export_timeline.mjs), so the credits
list every effect the soundtrack plays, and only those, with the alignment the mix really uses.
Usage: python3 scripts/sync_sfx_credits.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREDITS = os.path.join(ROOT, "..", "research", "credits.draft.json")
TITLES = {
    "stamp": "朱砂印章盖下",
    "shutter": "快门",
    "paper_slide": "相纸滑动",
    "page_turn": "翻纸",
    "projector_click": "幻灯放映机咔嗒",
    "liquid": "相纸入显影液（入水声 + 晃液）",
    "pen": "红笔划纸",
    "tag_drop": "档案签落纸",
    "sub_hit": "低频冲击（反转）",
    "sub_hit_low": "低频冲击（低）",
    "flip": "纸张翻动",
    "drip": "相纸夹出时滴回显影盘",
    "loupe": "放大镜落桌",
    "paper_tick": "字幕纸张点击",
    "typewriter": "打字机按键",
    "room_tone": "房间底噪（暗房滴水、放映机风扇）",
}
ORIGINAL = "本项目原创（scripts/synth_audio.py，numpy 合成）"


def main():
    manifest = json.load(open(os.path.join(ROOT, "public", "sfx", "manifest.json")))
    timeline = json.load(open(os.path.join(ROOT, "out", "timeline.json")))
    used = {e["sound"] for e in timeline["sfx"]} | {"room_tone"}
    onset = set(timeline["onsetAligned"])
    entries = []
    for key, entry in manifest.items():
        if key.startswith("_"):
            continue
        base = key.rsplit("_", 1)[0] if key.rsplit("_", 1)[-1].isdigit() else key
        if base not in used:
            continue
        title = TITLES[base] + (f"（音高变体 {key.rsplit('_', 1)[1]}）" if base != key else "")
        if base == "room_tone":
            note = "全片铺底，从第 0 帧起循环；反转前 0.5 秒只剩它"
        elif base in onset:
            note = f"起音对齐画面：文件开头落在画面事件帧上（峰值在其后 {entry['peakOffsetFrames']:.2f} 帧）"
        else:
            note = f"峰值偏移 {entry['peakOffsetFrames']:.2f} 帧，按峰值对齐画面"
        entries.append({"file": "public/" + entry["file"], "标题": title, "作者": ORIGINAL, "年份": "2026", "来源URL": "—", "许可": "原创", "修改说明": note})
    credits = json.load(open(CREDITS))
    credits["sfx"] = entries
    with open(CREDITS, "w") as f:
        f.write(json.dumps(credits, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(entries)} sound effects:", ", ".join(sorted({e['file'].split('/')[-1] for e in entries})))


if __name__ == "__main__":
    main()
