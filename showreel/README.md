# CLAUDE — motion reel

A 30-second looping showreel. A pencil line is promoted three times: graphite on paper, a wire on a blueprint, then light on black. The camera never moves. Each shot is built from the one before it, and the film never cuts or fades.

Built in Remotion. Every frame is drawn into one `<canvas>` by a pure function of time, and the soundtrack is synthesised in Python.

```bash
npm install
npm run music        # music/synth.py -> public/music.wav + src/envelope.json
npm run studio       # scrub the film
npm run render       # out/showreel.mp4 (1920x1080, 60 fps, 1800 frames)
python3 tools/check_cuts.py out/showreel.mp4   # flags any frame-to-frame pop
```

Contact sheet of any moments:

```bash
npx remotion still Sheet out/sheet.png --props='{"times":[0,4.1,9.8,17.7,28.2]}'
```

## How it is put together

| file | what it does |
| --- | --- |
| `src/lib/core.ts` | timing (120 BPM, critically damped spring `1-(1+wt)e^-wt`, moves start 0.05 s before their beat), geometry, 3D helpers |
| `src/lib/ink.ts` | the three inks. Scenes describe geometry once, and each ink draws it in its own way: **paper** (boiling double-stroked pencil, paper tooth knocked out, multiplied; hatching drawn one line at a time), **blueprint** (clean white wire, dashed hidden edges, fine hatching), **hologram** (cyan with a 30% white core; fills are 8 px scan lines whose thickness is the light) |
| `src/lib/font.ts` | Geist 900 outlines via opentype.js, so big type can be hatched, squashed, wrapped round reels and extruded |
| `src/scenes/paper.ts` | bars 1–5: HOOK, TYPE, CURVE, MORPH, TILE |
| `src/scenes/blueprint.ts` | bars 6–9: SOLID, GEAR, PANEL, DATA |
| `src/scenes/holo.ts` | bars 10–15: LIGHT, WAVE, GLOBE, DRUM, FORM, END |
| `src/scenes/shared.ts` | the wordmark layout, typed labels, the creative-director mascot |
| `src/frame.ts` | picks the inks on screen (hex flood paper→blueprint, scan lines blueprint→hologram→paper), draws corner labels |

To use your own paper scan, pass an image to `new PaperInk(image)` in `src/frame.ts`.
