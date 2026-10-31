// Dump the timeline's sound events and subtitles to JSON for the review tools (audio plots).
// Usage: node --no-warnings scripts/export_timeline.mjs <out.json>
import fs from "node:fs";
import { BASE_FPS, GOLDEN, LINES, SFX, SILENCE, SUBTITLE_TICKS } from "../src/timeline.ts";

const out = process.argv[2] ?? "out/timeline.json";
fs.writeFileSync(out, JSON.stringify({ fps: BASE_FPS, silence: SILENCE, sfx: [...SFX, ...SUBTITLE_TICKS], lines: LINES, golden: GOLDEN }, null, 2));
console.log(out);
