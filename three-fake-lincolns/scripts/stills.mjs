// Render several stills of Main with one bundle.
// Usage: [COMP=Main] [PROPS='{"motionBlur":true}'] node scripts/stills.mjs <outDir> <frame> [frame...] [--scale=0.5]
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const args = process.argv.slice(2);
const scaleArg = args.find((a) => a.startsWith("--scale="));
const scale = scaleArg ? Number(scaleArg.split("=")[1]) : 1;
const [outDir, ...frames] = args.filter((a) => !a.startsWith("--"));
const compId = process.env.COMP ?? "Main";
// Optional input props as JSON, e.g. PROPS='{"motionBlur":true}'.
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};

const SHELL = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const browserExecutable = fs.existsSync(SHELL) ? SHELL : undefined;
const chromiumOptions = { gl: browserExecutable ? "swangle" : "angle" };

fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: compId, browserExecutable, chromiumOptions, inputProps });
for (const f of frames) {
  const frame = Number(f);
  const output = path.join(outDir, `${compId}_${String(frame).padStart(4, "0")}.png`);
  await renderStill({ serveUrl, composition, frame, output, scale, browserExecutable, chromiumOptions, overwrite: true, inputProps });
  console.log(output);
}
