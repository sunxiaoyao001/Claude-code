/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import fs from "node:fs";
import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);
// Cloud sessions cannot download Chrome Headless Shell; use the preinstalled one when present.
const PREINSTALLED_SHELL =
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
// @remotion/effects run on WebGL2. GPU-less containers need the software (SwiftShader) backend.
if (fs.existsSync(PREINSTALLED_SHELL)) {
  Config.setBrowserExecutable(PREINSTALLED_SHELL);
  Config.setChromiumOpenGlRenderer("swangle");
} else {
  Config.setChromiumOpenGlRenderer("angle");
}
