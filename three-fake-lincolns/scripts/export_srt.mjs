// Write Chinese and English .srt files from the single timeline (subtitles + the golden line).
// Usage: node scripts/export_srt.mjs <outDir>
import fs from "node:fs";
import path from "node:path";
import { serializeSrt } from "@remotion/captions";
import { BASE_FPS, GOLDEN, LINES } from "../src/timeline.ts";

const outDir = process.argv[2] ?? "out";
const ms = (frame) => Math.round((frame / BASE_FPS) * 1000);
const entries = [
  ...LINES.map((l) => ({ from: l.from, to: l.to, zh: l.zh.replace(/\*/g, ""), en: l.en })),
  { from: GOLDEN.from, to: GOLDEN.to, zh: GOLDEN.lines.flat().map((c) => c.text).join(""), en: GOLDEN.en },
].sort((a, b) => a.from - b.from);

fs.mkdirSync(outDir, { recursive: true });
for (const lang of ["zh", "en"]) {
  const lines = entries.map((e) => [{ text: e[lang], startMs: ms(e.from), endMs: ms(e.to), timestampMs: ms(e.from), confidence: 1 }]);
  const file = path.join(outDir, `three-fake-lincolns.${lang}.srt`);
  fs.writeFileSync(file, serializeSrt({ lines }));
  console.log(file, entries.length, "cues");
}
