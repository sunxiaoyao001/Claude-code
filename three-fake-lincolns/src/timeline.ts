// Explicit extension: the timeline is also imported by Node scripts (export_srt, export_timeline).
import { splitGroups } from "./text.ts";

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

// Subtitles. The golden line (2400–2544) is not here: it has its own component.
export const LINES: readonly Line[] = [
  { from: 0, to: 96, zh: "林肯的头，*借*来的身子", en: "Lincoln's head, a borrowed body", isStatic: true, size: 72, facts: ["F01", "F02"] },
  { from: 96, to: 192, zh: "猜猜，跟*谁*借的", en: "Guess whose body it is", facts: ["F05", "F22"] },
  { from: 288, to: 384, zh: "答案是 B：*卡尔霍恩*", en: "It's B: John C. Calhoun", facts: ["F02", "F05", "F21"] },
  { from: 384, to: 480, zh: "他说奴隶制不是恶，是*善*", en: "He said slavery wasn't an evil, but a good", facts: ["F04", "F06"] },
  { from: 480, to: 576, zh: "*解放者*的头，蓄奴派的身子", en: "The Emancipator's head on a pro-slavery body", facts: ["F05", "F23"] },
  { from: 576, to: 672, zh: "桌上的字，从州权改成了*联邦*", en: "On the desk, \"states\" became \"Union\"", facts: ["F03", "F24"] },
  { from: 672, to: 744, zh: "这只是第 *1* 张", en: "That was only the first", facts: [] },
  { from: 744, to: 840, zh: "第 2 张，主角是林肯的*遗孀*", en: "The second stars Lincoln's widow", facts: ["F07"] },
  { from: 840, to: 936, zh: "她报*假名*，摄影师说没认出", en: "She gave a false name; he said he didn't know her", facts: ["F09"] },
  { from: 936, to: 1056, zh: "一双手，搭在她*肩*上", en: "A pair of hands on her shoulders", facts: ["F07"] },
  { from: 1056, to: 1200, zh: "她身后，站着「*林肯*」", en: "Behind her stands \"Lincoln\"", facts: ["F07", "F11"] },
  { from: 1200, to: 1296, zh: "摄影师曾被控诈骗，法官*放*人", en: "Tried for fraud, the photographer walked free", facts: ["F10"] },
  { from: 1296, to: 1392, zh: "怎么做的，至今说*不清*", en: "How he did it is still unclear", facts: ["F11"] },
  { from: 1392, to: 1488, zh: "鬼影的常见造法：*双重曝光*", en: "The usual trick for ghosts: double exposure", facts: ["F11"] },
  { from: 1488, to: 1584, zh: "底片不换，再曝光 *1* 次", en: "Same plate, exposed a second time", facts: ["F11"] },
  { from: 1584, to: 1680, zh: "另一种造假：*拼*起来的照片", en: "Another kind of fake: a composite", facts: ["F12"] },
  { from: 1680, to: 1776, zh: "头是*格兰特*，其余都不是", en: "Only the head is Grant's", facts: ["F12"] },
  { from: 1776, to: 1905, zh: "那第 3 张*林肯*呢", en: "So who made the third Lincoln?", facts: [] },
  { from: 1920, to: 2016, zh: "第 3 张，是*魔术师*做来打假的", en: "The third was made by a magician, to expose the fakers", facts: ["F13", "F20"] },
  { from: 2016, to: 2112, zh: "胡迪尼约妻子：死后报*暗号*", en: "Houdini promised his wife a code from beyond", facts: ["F15"] },
  { from: 2112, to: 2208, zh: "他死在*万圣节*，她招魂 10 年", en: "He died on Halloween; she held séances for 10 years", facts: ["F14", "F16"] },
  { from: 2208, to: 2304, zh: "最后那场，什么也*没来*", en: "At the last one, nothing came", facts: ["F17"] },
  { from: 2304, to: 2400, zh: "今年万圣节，他走了 *100* 年", en: "This Halloween marks 100 years since he died", facts: ["F14", "F19"] },
  { from: 2544, to: 2616, zh: "最近哪张图*骗*过你", en: "What's the last picture that fooled you?", facts: [] },
  { from: 2616, to: 2688, zh: "林肯的头，*借*来的身子", en: "Lincoln's head, a borrowed body", isStatic: true, size: 72, facts: ["F01", "F02"] },
];

// The golden line falls one character per eighth note (brief), two lines, then the English.
export const GOLDEN = {
  from: 2400,
  to: 2544,
  lines: [
    [
      { at: 2400, text: "骗", keyword: false },
      { at: 2412, text: "你", keyword: false },
      { at: 2424, text: "的，", keyword: false },
    ],
    [
      { at: 2436, text: "是", keyword: false },
      { at: 2448, text: "你", keyword: false },
      { at: 2460, text: "想", keyword: true },
      { at: 2472, text: "相", keyword: true },
      { at: 2484, text: "信", keyword: true },
    ],
  ],
  enAt: 2496,
  en: "It's wanting to believe that fools you",
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
  centenary: { from: 2304, to: 2400 },
  golden: { from: 2400, to: 2544 },
  outro: { from: 2544, to: 2688 },
} as const;

// Bottom progress: one slot per fake (the chapter tags No.001 / No.002 / No.003).
export const CHAPTERS = { bounds: [0, 672, 1776, BASE_TOTAL], labels: ["No.001", "No.002", "No.003"] } as const;

// Frames with fast movement (prints dealt, swept, lifted, pulled; transitions). The final render
// applies motion blur only here; everything else is slow camera breath and needs none.
export const BLUR_WINDOWS: readonly (readonly [number, number])[] = [
  [96, 124], // prints rise for the bet
  [100, 130], // bet tags slide in
  [288, 332], // tag pulled, prints slide into alignment
  [672, 722], // sweep-off + cards dealt
  [744, 770], // the widow's card is lifted
  [1150, 1180], // the print is lifted out of the tray
  [1200, 1216], // sweep-off + case card
  [1278, 1308], // case card moves, cards dealt
  [1392, 1408], // leaf shutter, plate holder
  [1574, 1600], // sweep-off, first original falls
  [1598, 1634], // originals fall
  [1644, 1658], // composite pushed in
  [1776, 1800], // sweep-off, prints slide in
  [1824, 1844], // slide box
  [2016, 2034], // slide carrier
  [2112, 2128], // clipping laid over
  [2208, 2224], // clipping pulled away
  [2304, 2322], // leaf shutter, print slides in
  [2544, 2558], // credits card in
  [2604, 2618], // credits card out
];

// The 0.5 s of musical silence before the twist.
export const SILENCE = { from: 1905, to: 1920 } as const;

// Top-right chapter tag. The date and place only show while that very item is on screen.
export const ARCHIVE_TAGS = [
  { from: 0, text: "ARCHIVE No.001 · CA. 1865 · NEW YORK" },
  { from: 384, text: "ARCHIVE No.001" },
  { from: 480, text: "ARCHIVE No.001 · CA. 1865 · NEW YORK" },
  { from: 672, text: "ARCHIVE No.002" },
  { from: 768, text: "ARCHIVE No.002 · CA. 1872 · BOSTON" },
  { from: 1200, text: "ARCHIVE No.002" },
  { from: 1584, text: "EXHIBIT · CA. 1902 · L.C. HANDY" },
  { from: 1776, text: "ARCHIVE No.003 · ?" },
  { from: 1920, text: "ARCHIVE No.003 · 1920S" },
  { from: 2016, text: "ARCHIVE No.003" },
  { from: 2304, text: "ARCHIVE No.003 · 1920S" },
  { from: 2400, text: "ARCHIVE No.001 — No.003" },
  { from: 2616, text: "ARCHIVE No.001 · CA. 1865 · NEW YORK" },
] as const;

// Typed text on screen: one character every `every` frames from `from`. The keystroke sounds
// below are derived from these, so picture and sound cannot drift apart.
export type Typed = { readonly from: number; readonly every: number; readonly text: string };
export const TYPED = {
  trialStamp: { from: 1206, every: 2, text: "NEW YORK · APRIL 1869" },
  code: { from: 2028, every: 2, text: "ROSABELLE, BELIEVE" },
  centenary: { from: 2316, every: 3, text: "+100 YEARS" },
} as const satisfies Record<string, Typed>;

// Halloween séance counter: one year per eighth-note triplet, landing on 1936 at 2192.
export const SEANCE_COUNTER = { from: 2120, every: 8, first: 1927, last: 1936 } as const;

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

// One keystroke per visible character (the space bar is silent).
const typedSfx = (x: Typed, gainDb: number): SfxEvent[] =>
  [...x.text].flatMap((ch, i) => (ch === " " ? [] : [{ at: x.from + i * x.every, sound: "typewriter" as const, gainDb }]));

export const SFX: readonly SfxEvent[] = [
  // cover, bet, title
  { at: 3, sound: "pen", gainDb: -26 },
  { at: 27, sound: "pen", gainDb: -30 },
  { at: 39, sound: "pen", gainDb: -30 },
  { at: 51, sound: "pen", gainDb: -30 },
  { at: 108, sound: "tag_drop", gainDb: -24 },
  { at: 120, sound: "tag_drop", gainDb: -24 },
  ...typewriterRun(144, 3, 16, -26),
  { at: 192, sound: "paper_tick", gainDb: -28 },
  { at: 240, sound: "stamp", gainDb: -22 },
  // fake No.1
  { at: 288, sound: "paper_slide", gainDb: -22 },
  { at: 330, sound: "paper_slide", gainDb: -26 },
  // blink comparator: one hard switch per eighth note
  { at: 342, sound: "paper_tick", gainDb: -22 },
  { at: 354, sound: "paper_tick", gainDb: -22 },
  { at: 366, sound: "paper_tick", gainDb: -22 },
  { at: 378, sound: "paper_tick", gainDb: -22 },
  { at: 432, sound: "tag_drop", gainDb: -28 },
  { at: 480, sound: "pen", gainDb: -26 },
  { at: 504, sound: "pen", gainDb: -26 },
  { at: 532, sound: "paper_tick", gainDb: -26 },
  { at: 544, sound: "paper_tick", gainDb: -26 },
  { at: 576, sound: "pen", gainDb: -26 },
  { at: 600, sound: "pen", gainDb: -26 },
  // fake No.2 (prints swept off the table at 672)
  { at: 672, sound: "paper_slide", gainDb: -26 },
  { at: 672, sound: "tag_drop", gainDb: -28 },
  { at: 684, sound: "tag_drop", gainDb: -30 },
  { at: 696, sound: "tag_drop", gainDb: -30 },
  { at: 708, sound: "tag_drop", gainDb: -30 },
  { at: 720, sound: "stamp", gainDb: -22 },
  { at: 744, sound: "paper_slide", gainDb: -26 },
  { at: 768, sound: "liquid", gainDb: -28 },
  { at: 936, sound: "liquid", gainDb: -32 },
  { at: 1008, sound: "pen", gainDb: -28 },
  { at: 1020, sound: "pen", gainDb: -28 },
  { at: 1056, sound: "sub_hit_low", gainDb: -26 },
  { at: 1056, sound: "pen", gainDb: -26 },
  { at: 1152, sound: "liquid", gainDb: -34 },
  { at: 1176, sound: "paper_slide", gainDb: -28 },
  { at: 1200, sound: "paper_slide", gainDb: -26 },
  // trial, mystery
  ...typedSfx(TYPED.trialStamp, -32),
  { at: 1296, sound: "tag_drop", gainDb: -30 },
  { at: 1300, sound: "tag_drop", gainDb: -30 },
  { at: 1304, sound: "tag_drop", gainDb: -30 },
  { at: 1308, sound: "pen", gainDb: -28 },
  { at: 1320, sound: "pen", gainDb: -28 },
  { at: 1332, sound: "pen", gainDb: -28 },
  // darkroom
  { at: 1397, sound: "shutter", gainDb: -24 },
  { at: 1400, sound: "paper_slide", gainDb: -30 },
  { at: 1416, sound: "shutter", gainDb: -22 },
  { at: 1488, sound: "shutter", gainDb: -22 },
  // Grant
  { at: 1584, sound: "paper_slide", gainDb: -28 },
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
  { at: 1920, sound: "projector_click", gainDb: -20 },
  { at: 1920, sound: "sub_hit", gainDb: -23 },
  { at: 1944, sound: "tag_drop", gainDb: -28 },
  { at: 1968, sound: "pen", gainDb: -26 },
  // code, séances
  { at: 2016, sound: "projector_click", gainDb: -26 },
  { at: 2016, sound: "paper_slide", gainDb: -28 },
  ...typedSfx(TYPED.code, -30),
  { at: 2112, sound: "page_turn", gainDb: -24 },
  { at: 2208, sound: "paper_slide", gainDb: -28 },
  ...typewriterRun(SEANCE_COUNTER.from, SEANCE_COUNTER.last - SEANCE_COUNTER.first + 1, SEANCE_COUNTER.every, -34),
  // centenary, golden line, outro
  { at: 2309, sound: "shutter", gainDb: -24 },
  { at: 2304, sound: "paper_slide", gainDb: -28 },
  ...typedSfx(TYPED.centenary, -32),
  { at: 2400, sound: "sub_hit_low", gainDb: -22 },
  { at: 2544, sound: "flip", gainDb: -24 },
  { at: 2604, sound: "flip", gainDb: -26 },
];

// One soft paper tick per subtitle entrance, and a light stamp as its keyword presses down
// (except lines that are already on screen).
export const SUBTITLE_TICKS: readonly SfxEvent[] = LINES.filter((l) => !l.isStatic).flatMap((l) => {
  const k = splitGroups(l.zh).findIndex((c) => c.keyword);
  const tick = { at: l.from, sound: "paper_tick" as const, gainDb: -30 };
  return k < 0 ? [tick] : [tick, { at: l.from + k * 2 + 6, sound: "stamp" as const, gainDb: -34 }];
});
