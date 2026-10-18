# 外卖之王 · KING OF DELIVERY

A ~2-minute fan-made anime trailer — 美团 Meituan (yellow) vs 饿了么 Ele.me (blue), with a twist rider: 淘宝闪购 Taobao Shangou (orange).
Every frame is drawn in code (Canvas 2D) and every sound is synthesized (Web Audio), in the style of Ishu Agrawal's
"Claude vs ChatGPT" JavaScript anime trailer.

Fan-made parody · not affiliated with or endorsed by Meituan, Ele.me, Taobao or any company.

## Layout

| Path | What |
| --- | --- |
| `src/index.html` | Dev page (loads the scripts below) |
| `src/js/core.js` | Constants (1920×1080, 24 fps, 150 BPM), math, seeded RNG, colour, canvas helpers, emissive bloom buffer |
| `src/js/fx.js` | Rain, speed lines, sparks, lightning, shockwaves, impact frames, typography, post-processing |
| `src/js/face.js` | Anime faces: busts with expressions and 3/4 turns, eyes, hair, headgear, outfits |
| `src/js/riders.js` | The three riders and their distinct scooters (side view), profile heads |
| `src/js/figures.js` | Standing figures, top-down riders, chibis |
| `src/js/world.js`, `scenes.js` | Sky, moon, clouds, skylines, street, rooftops, tower, phone/map UI, energy constructs |
| `src/js/ui.js` | Title cards, name cards, subtitles, attack names, HUD, countdown timer |
| `src/js/shots1.js`, `shots2.js` | The 51-shot timeline (every cut on the 1.6 s bar grid) |
| `src/js/audio.js` | The score and SFX (OfflineAudioContext, just-in-time node scheduling) |
| `src/js/player.js` | Render API + live HTML player |
| `tools/` | `fonts.py` (subset fonts), `still.js`/`sheet.sh` (review frames), `audio.js` (WAV), `render.js` (MP4), `build.py` (single-file HTML) |

## Rebuild

```bash
FONT_DIR=/path/to/ttf python3 tools/fonts.py          # subset Noto Serif/Sans SC, Ma Shan Zheng, ZCOOL, Anton, Orbitron, Rajdhani
node tools/audio.js out/audio.wav                      # ~30 s
node tools/render.js out/audio.wav out/trailer.mp4 4 22  # 4 workers, CRF 22
ffmpeg -i out/audio.wav -c:a aac -b:a 160k out/audio.m4a
python3 tools/build.py out/audio.m4a dist/king-of-delivery.html
```

Requires Node with Playwright + Chromium, ffmpeg, Python 3 with fontTools/brotli.
