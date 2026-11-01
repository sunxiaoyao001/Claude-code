import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { FONTS } from "./theme";

// Every face is a local woff2 so renders never depend on the network.
// Chinese faces are subsets made by scripts/subset_fonts.py; Latin faces come from Google Fonts (SIL OFL 1.1).
loadFont({ family: FONTS.serifZh, url: staticFile("fonts/noto-serif-sc-900.woff2"), weight: "900" });
loadFont({ family: FONTS.sansZh, url: staticFile("fonts/noto-sans-sc-500.woff2"), weight: "500" });
loadFont({ family: FONTS.sansZh, url: staticFile("fonts/noto-sans-sc-700.woff2"), weight: "700" });
loadFont({ family: FONTS.italicEn, url: staticFile("fonts/eb-garamond-400-italic.woff2"), weight: "400", style: "italic" });
loadFont({ family: FONTS.mono, url: staticFile("fonts/ibm-plex-mono-400-normal.woff2"), weight: "400" });
loadFont({ family: FONTS.mono, url: staticFile("fonts/ibm-plex-mono-500-normal.woff2"), weight: "500" });
