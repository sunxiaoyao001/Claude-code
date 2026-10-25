// The single timeline: picture, subtitles and sound effects are all driven from here.
// Every frame number is a base frame at 30 fps for the 89.6 s cut (75 BPM, 28 bars of 96 f).
// Changing `durationSec` rescales all of them through useTime() (see time.ts).

export const BASE_FPS = 30;
export const BASE_BPM = 75;
export const BEAT = 24;
export const BAR = 96;
export const BARS = 28;
export const BASE_TOTAL = BAR * BARS; // 2688
export const BASE_DURATION_SEC = BASE_TOTAL / BASE_FPS; // 89.6

export type Line = {
  readonly from: number;
  readonly to: number;
  // *keyword* is rendered in vermilion; 「」 are kept as typed.
  readonly zh: string;
  readonly en: string;
  // Already on screen when the line starts (frame-0 cover and the loop return).
  readonly isStatic?: boolean;
  readonly size?: number;
  readonly facts: readonly string[];
};

// Subtitles. The golden line (2304–2448) is not here: it has its own component.
export const LINES: readonly Line[] = [
  { from: 0, to: 96, zh: "这张林肯像，身子是*借*的", en: "Lincoln's head. Someone else's body", isStatic: true, size: 72, facts: ["F01", "F02"] },
  { from: 96, to: 192, zh: "猜猜，跟*谁*借的", en: "Guess whose body it is", facts: ["F05", "F22"] },
  { from: 288, to: 384, zh: "答案是 B：*卡尔霍恩*", en: "It's B: John C. Calhoun", facts: ["F02", "F05", "F21"] },
  { from: 384, to: 480, zh: "他说奴隶制不是恶，是*善*", en: "He said slavery wasn't an evil, but a good", facts: ["F04", "F06"] },
  { from: 480, to: 576, zh: "*解放者*的头，蓄奴派的身子", en: "The Emancipator's head on a pro-slavery body", facts: ["F05", "F23"] },
  { from: 576, to: 672, zh: "连桌上的*文件*都改了", en: "Even the papers on the table were changed", facts: ["F03", "F24"] },
  { from: 672, to: 744, zh: "这只是第 *1* 张", en: "That was only the first", facts: [] },
  { from: 744, to: 840, zh: "第 2 张，主角是林肯的*遗孀*", en: "The second stars Lincoln's widow", facts: ["F07"] },
  { from: 840, to: 936, zh: "她报*假名*，摄影师说没认出", en: "She gave a false name; he said he didn't know her", facts: ["F09"] },
  { from: 936, to: 1056, zh: "照片*印*出来了", en: "The print came up", facts: ["F07"] },
  { from: 1056, to: 1200, zh: "他，就站在她*身后*", en: "And there he was, right behind her", facts: ["F07", "F11"] },
  { from: 1200, to: 1296, zh: "他被控诈骗，法官*放*了他", en: "Charged with fraud. The judge let him go", facts: ["F10"] },
  { from: 1296, to: 1392, zh: "怎么做的，至今说*不清*", en: "How he did it is still unclear", facts: ["F11"] },
  { from: 1392, to: 1488, zh: "可在暗房里，造假*不难*", en: "But in a darkroom, faking is easy", facts: ["F10", "F11"] },
  { from: 1488, to: 1584, zh: "1 块底片曝光 *2* 次", en: "One plate, two exposures", facts: ["F11"] },
  { from: 1584, to: 1680, zh: "或者把 *3* 张底片拼成 1 张", en: "Or three negatives printed as one", facts: ["F12"] },
  { from: 1680, to: 1776, zh: "头是*格兰特*，其余都不是", en: "Only the head is Grant's", facts: ["F12"] },
  { from: 1776, to: 1905, zh: "那第 3 张*林肯*呢", en: "So who made the third Lincoln?", facts: [] },
  { from: 1920, to: 2016, zh: "第 3 张，*魔术师*造来打假", en: "A magician faked the third, to expose the fakers", facts: ["F13", "F20"] },
  { from: 2016, to: 2112, zh: "胡迪尼约妻子：死后报*暗号*", en: "Houdini promised his wife a code from beyond", facts: ["F15"] },
  { from: 2112, to: 2208, zh: "她办了 *10* 年万圣节降神会", en: "She held a séance every Halloween for 10 years", facts: ["F14", "F16"] },
  { from: 2208, to: 2304, zh: "最后那场，什么也*没来*", en: "At the last one, nothing came", facts: ["F17"] },
  { from: 2448, to: 2544, zh: "今年万圣节，他走了 *100* 年", en: "This Halloween: 100 years since he died", facts: ["F14", "F19"] },
  { from: 2544, to: 2616, zh: "最近哪张图*骗*过你", en: "What's the last picture that fooled you?", facts: [] },
  { from: 2616, to: 2688, zh: "这张林肯像，身子是*借*的", en: "Lincoln's head. Someone else's body", isStatic: true, size: 72, facts: ["F01", "F02"] },
];

export const GOLDEN = {
  from: 2304,
  to: 2448,
  groups: [
    { at: 2304, text: "骗你的，", keyword: false },
    { at: 2328, text: "是你", keyword: false },
    { at: 2328, text: "想相信", keyword: true },
  ],
  en: "What fools you is wanting to believe",
} as const;

// Scene boundaries (the moment each scene becomes visible). Content-driven transitions overlap
// the previous scene by their own length; see Main.tsx.
export const SCENES = {
  borrowedBody: { from: 0, to: 672 },
  widowGhost: { from: 672, to: 1200 },
  trial: { from: 1200, to: 1392 },
  darkroom: { from: 1392, to: 1584 },
  grant: { from: 1584, to: 1776 },
  question: { from: 1776, to: 1920 },
  twist: { from: 1920, to: 2016 },
  code: { from: 2016, to: 2112 },
  seances: { from: 2112, to: 2304 },
  golden: { from: 2304, to: 2448 },
  centenary: { from: 2448, to: 2544 },
  outro: { from: 2544, to: 2688 },
} as const;

// The 0.5 s of musical silence before the twist.
export const SILENCE = { from: 1905, to: 1920 } as const;

export const ARCHIVE_TAGS = [
  { from: 0, text: "ARCHIVE No.001 · CA. 1865 · NEW YORK" },
  { from: 672, text: "ARCHIVE No.002 · CA. 1872 · BOSTON" },
  { from: 1584, text: "EXHIBIT · CA. 1902 · L.C. HANDY" },
  { from: 1776, text: "ARCHIVE No.003 · ?" },
  { from: 1920, text: "ARCHIVE No.003 · 1920S" },
  { from: 2448, text: "1926 — 2026" },
  { from: 2616, text: "ARCHIVE No.001 · CA. 1865 · NEW YORK" },
] as const;

export type SfxName =
  | "stamp"
  | "shutter"
  | "paper_slide"
  | "page_turn"
  | "loupe"
  | "projector_click"
  | "liquid"
  | "pen"
  | "tag_drop"
  | "sub_hit"
  | "sub_hit_low"
  | "flip"
  | "paper_tick"
  | "typewriter";

// Sound events at the frame the picture event happens; Audio.tsx subtracts each file's measured
// peak offset so the transient (not the file start) lands on that frame.
export type SfxEvent = { readonly at: number; readonly sound: SfxName; readonly gainDb: number };

const typewriterRun = (from: number, count: number, every: number, gainDb = -30): SfxEvent[] =>
  Array.from({ length: count }, (_, i) => ({ at: from + i * every, sound: "typewriter" as const, gainDb }));

export const SFX: readonly SfxEvent[] = [
  // cover, bet, title
  { at: 36, sound: "pen", gainDb: -26 },
  { at: 108, sound: "tag_drop", gainDb: -24 },
  { at: 120, sound: "tag_drop", gainDb: -24 },
  ...typewriterRun(144, 3, 16, -26),
  { at: 192, sound: "paper_tick", gainDb: -28 },
  { at: 240, sound: "stamp", gainDb: -18 },
  // fake No.1
  { at: 288, sound: "paper_slide", gainDb: -22 },
  { at: 288, sound: "pen", gainDb: -28 },
  { at: 330, sound: "paper_slide", gainDb: -26 },
  { at: 432, sound: "tag_drop", gainDb: -28 },
  { at: 480, sound: "pen", gainDb: -26 },
  { at: 504, sound: "pen", gainDb: -26 },
  { at: 576, sound: "pen", gainDb: -26 },
  { at: 600, sound: "pen", gainDb: -26 },
  // fake No.2
  { at: 672, sound: "tag_drop", gainDb: -28 },
  { at: 684, sound: "tag_drop", gainDb: -30 },
  { at: 696, sound: "tag_drop", gainDb: -30 },
  { at: 708, sound: "tag_drop", gainDb: -30 },
  { at: 744, sound: "paper_slide", gainDb: -26 },
  { at: 768, sound: "liquid", gainDb: -28 },
  { at: 936, sound: "liquid", gainDb: -32 },
  { at: 1056, sound: "sub_hit_low", gainDb: -24 },
  { at: 1056, sound: "pen", gainDb: -26 },
  // trial, mystery
  ...typewriterRun(1206, 18, 2, -32),
  { at: 1296, sound: "pen", gainDb: -28 },
  { at: 1308, sound: "pen", gainDb: -28 },
  { at: 1320, sound: "pen", gainDb: -28 },
  // darkroom
  { at: 1392, sound: "paper_slide", gainDb: -26 },
  { at: 1488, sound: "shutter", gainDb: -20 },
  { at: 1536, sound: "shutter", gainDb: -20 },
  // Grant
  { at: 1584, sound: "tag_drop", gainDb: -26 },
  { at: 1608, sound: "tag_drop", gainDb: -26 },
  { at: 1632, sound: "tag_drop", gainDb: -26 },
  { at: 1656, sound: "shutter", gainDb: -22 },
  { at: 1680, sound: "pen", gainDb: -26 },
  { at: 1704, sound: "pen", gainDb: -26 },
  { at: 1728, sound: "pen", gainDb: -26 },
  // the question, the slide box
  { at: 1776, sound: "paper_slide", gainDb: -26 },
  { at: 1824, sound: "paper_slide", gainDb: -24 },
  // twist: the one punch
  { at: 1920, sound: "projector_click", gainDb: -16 },
  { at: 1920, sound: "sub_hit", gainDb: -12 },
  { at: 1968, sound: "pen", gainDb: -26 },
  // code, séances
  { at: 2016, sound: "paper_slide", gainDb: -26 },
  { at: 2040, sound: "pen", gainDb: -28 },
  ...typewriterRun(2028, 17, 2, -30),
  { at: 2112, sound: "page_turn", gainDb: -24 },
  ...typewriterRun(2120, 10, 8, -34),
  // golden line, centenary, outro
  { at: 2304, sound: "sub_hit_low", gainDb: -16 },
  ...typewriterRun(2460, 11, 3, -32),
  { at: 2544, sound: "flip", gainDb: -24 },
  { at: 2604, sound: "flip", gainDb: -26 },
];

// One soft paper tick per subtitle entrance (except lines that are already on screen).
export const SUBTITLE_TICKS: readonly SfxEvent[] = LINES.filter((l) => !l.isStatic).map((l) => ({
  at: l.from,
  sound: "paper_tick" as const,
  gainDb: -30,
}));
