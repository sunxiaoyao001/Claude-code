/**
 * ============================================================
 *  时间轴：第五集「猜平均数的 2/3」的导演台本
 * ============================================================
 *  场景、字幕、重击、情绪色、音效全部写在这里，
 *  画面组件与 scripts/gen-audio.ts 共同读取，逐帧同步。
 *  30fps · 1080×1920 · 115 秒
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/* ------------------------------------------------------------
 * 1. 场景（绝对帧）
 * ---------------------------------------------------------- */
export const SCENES = {
  hook: {from: 0, dur: 150}, //        0:00 钩子：选 0 最聪明，却全输了
  rules: {from: 150, dur: 390}, //     0:05 规则 + 举例 + 暂停 3 秒想数字
  reason: {from: 540, dur: 690}, //    0:18 一层一层想：50 → 33 → 22 → … → 0（纳什均衡）
  lab: {from: 1230, dur: 390}, //      0:41 纳格尔 1995：平均 36.7，扎堆在 33 和 22
  papers: {from: 1620, dur: 420}, //   0:54 报纸大赛：金融时报 13、政治报 21.6
  why: {from: 2040, dur: 480}, //      1:08 错在哪：人平均只想 1.5 层
  keynes: {from: 2520, dur: 420}, //   1:24 凯恩斯选美比赛 → 股市泡沫
  meaning: {from: 2940, dur: 270}, //  1:38 升华：最懂人的人
  outro: {from: 3210, dur: 240}, //    1:47 片尾：你选的是几？
} as const;

export type SceneId = keyof typeof SCENES;
export const TOTAL_FRAMES = SCENES.outro.from + SCENES.outro.dur; // 3450

export const CHAPTERS = [
  {name: '规则', from: SCENES.rules.from, to: SCENES.reason.from},
  {name: '推理', from: SCENES.reason.from, to: SCENES.lab.from},
  {name: '实验', from: SCENES.lab.from, to: SCENES.why.from},
  {name: '真相', from: SCENES.why.from, to: SCENES.meaning.from},
  {name: '启示', from: SCENES.meaning.from, to: TOTAL_FRAMES},
];

/* ------------------------------------------------------------
 * 2. 字幕轨
 *    <g>金=目标 2/3 · 答案</g> <b>蓝=别人</b> <c>青=赢</c> <r>红=输 · 误区</r> <w>白色强调</w>
 * ---------------------------------------------------------- */
export type Cue = {from: number; to: number; text: string};

export const SUBTITLES: Cue[] = [
  // —— 规则 ——
  {from: 160, to: 236, text: '每个人从 0～100 里\n选一个整数'},
  {from: 240, to: 316, text: '把所有人的数字取平均\n再乘以 <g>2/3</g>'},
  {from: 320, to: 400, text: '谁最接近这个数，<c>谁就赢</c>'},
  {from: 404, to: 466, text: '先别往下看——'},
  {from: 470, to: 536, text: '暂停 3 秒，<g>想好你的数字</g>'},
  // —— 推理 ——
  {from: 550, to: 626, text: '我们一层一层地想'},
  {from: 630, to: 706, text: '如果大家随便选，平均是 50\n2/3 就是 <g>33</g>'},
  {from: 710, to: 786, text: '可别人也会这么想，都选 33\n那你应该选 <g>22</g>'},
  {from: 790, to: 866, text: '别人也想到了 22？\n那就选 <g>15</g>'},
  {from: 870, to: 946, text: '再想一层，10……再一层，7……'},
  {from: 950, to: 1050, text: '一直想下去，只剩一个答案：<w>0</w>'},
  {from: 1054, to: 1134, text: '所有人都选 0，2/3 还是 0\n谁换数字都不会更好'},
  {from: 1138, to: 1226, text: '这就是博弈论的标准答案\n<w>纳什均衡：选 0</w>'},
  // —— 实验 ——
  {from: 1240, to: 1316, text: '1995 年，经济学家<w>纳格尔</w>\n发表了真人实验的结果'},
  {from: 1320, to: 1396, text: '第一轮，平均数是 <w>36.7</w>\n<r>没有一个人选 0</r>'},
  {from: 1400, to: 1476, text: '大家的数字，扎堆在两个地方——'},
  {from: 1480, to: 1556, text: '<g>33</g> 和 <g>22</g>'},
  {from: 1560, to: 1616, text: '大多数人，只往下想了一两层'},
  // —— 报纸大赛 ——
  {from: 1630, to: 1706, text: '后来，报纸请成千上万读者来玩'},
  {from: 1710, to: 1786, text: '1997 年，英国《金融时报》\n平均 18.91，赢家选的是 <g>13</g>'},
  {from: 1790, to: 1866, text: '2005 年，丹麦《政治报》\n19196 人参加，正确答案 <g>21.6</g>'},
  {from: 1870, to: 1946, text: '正确答案，从来都不是 0'},
  {from: 1950, to: 2036, text: '那些算出 0 的“聪明人”\n<r>一个都没赢</r>'},
  // —— 错在哪 ——
  {from: 2050, to: 2126, text: '选 0 的人，错在哪？'},
  {from: 2130, to: 2206, text: '他们的数学没错\n错在以为<r>别人都和他一样理性</r>'},
  {from: 2210, to: 2286, text: '研究发现，大多数人\n平均只往下想 <w>1.5 层</w>'},
  {from: 2290, to: 2366, text: '赢家，只比大家<g>多想了一步</g>'},
  {from: 2370, to: 2446, text: '想少了，被人看穿\n想多了，脱离人群'},
  {from: 2450, to: 2516, text: '最好的位置：<g>比大家多想一步</g>'},
  // —— 凯恩斯 ——
  {from: 2530, to: 2606, text: '1936 年，凯恩斯讲过一场\n报纸上的“选美比赛”'},
  {from: 2610, to: 2686, text: '100 张照片，选出最美的 6 张\n和大家选得最一致的人得奖'},
  {from: 2690, to: 2766, text: '你该选的不是你觉得最美的\n而是<g>大家以为大家会选</g>的'},
  {from: 2770, to: 2846, text: '股市也一样：\n人们买的是<r>“别人会买”</r>'},
  {from: 2850, to: 2936, text: '泡沫，就是这样吹起来的'},
  // —— 升华 ——
  {from: 2950, to: 3026, text: '所以，聪明不是想得最深'},
  {from: 3030, to: 3106, text: '而是知道别人想到了哪一层'},
  {from: 3110, to: 3206, text: '真正的高手，不是最理性的人\n是<g>最懂人</g>的人'},
  // —— 片尾 ——
  {from: 3214, to: 3450, text: '你最开始选的是几？\n评论区报出你的数字'},
];

/* ------------------------------------------------------------
 * 3. 重击：闪白 + 震屏
 * ---------------------------------------------------------- */
export type Impact = {f: number; flash: number; shake: number};
export const IMPACTS: Impact[] = [
  {f: 6, flash: 0.35, shake: 8},
  {f: 46, flash: 0.3, shake: 10},
  {f: 100, flash: 0.45, shake: 16},
  {f: 322, flash: 0.25, shake: 8},
  {f: 950, flash: 0.5, shake: 16},
  {f: 1138, flash: 0.3, shake: 12},
  {f: 1480, flash: 0.3, shake: 10},
  {f: 1950, flash: 0.35, shake: 12},
  {f: 2450, flash: 0.3, shake: 10},
  {f: 2850, flash: 0.4, shake: 16},
  {f: 3110, flash: 0.45, shake: 14},
];

/* ------------------------------------------------------------
 * 4. 情绪色
 * ---------------------------------------------------------- */
export type MoodKey = {f: number; tint: [number, number, number]; energy: number};
export const MOODS: MoodKey[] = [
  {f: 0, tint: [1.0, 0.68, 0.3], energy: 0.8},
  {f: 90, tint: [0.95, 0.35, 0.25], energy: 0.8},
  {f: 150, tint: [0.92, 0.72, 0.42], energy: 0.55},
  {f: 540, tint: [0.4, 0.62, 0.95], energy: 0.5},
  {f: 940, tint: [0.75, 0.85, 1.0], energy: 0.75},
  {f: 1230, tint: [0.35, 0.78, 0.7], energy: 0.55},
  {f: 1620, tint: [0.95, 0.78, 0.5], energy: 0.55},
  {f: 2040, tint: [0.95, 0.38, 0.28], energy: 0.55},
  {f: 2290, tint: [1.0, 0.72, 0.32], energy: 0.6},
  {f: 2520, tint: [0.72, 0.45, 0.92], energy: 0.55},
  {f: 2850, tint: [0.95, 0.3, 0.25], energy: 0.7},
  {f: 2940, tint: [1.0, 0.72, 0.32], energy: 0.65},
  {f: 3110, tint: [1.0, 0.78, 0.4], energy: 0.85},
];

/* ------------------------------------------------------------
 * 5. 音效提示点
 * ---------------------------------------------------------- */
export type SfxName =
  | 'drop'
  | 'pop'
  | 'tick'
  | 'ding'
  | 'boom'
  | 'stamp'
  | 'riser'
  | 'shimmer'
  | 'buzz'
  | 'whoosh'
  | 'zoom'
  | 'coin'
  | 'heartbeat'
  | 'crash';

export type Sfx = {f: number; name: SfxName; vol?: number};

/** 钩子里数字雨落到数轴上的帧（画面与音效共用） */
export const RAIN_AT = [6, 11, 15, 20, 24, 29, 33, 38];

export const SFX: Sfx[] = [
  // 钩子
  {f: 0, name: 'boom', vol: 0.6},
  ...RAIN_AT.map((f, i) => ({f, name: 'drop' as const, vol: 0.55 - i * 0.03})),
  {f: 46, name: 'ding', vol: 0.8},
  {f: 60, name: 'riser', vol: 0.4},
  {f: 88, name: 'shimmer', vol: 0.5},
  {f: 100, name: 'stamp', vol: 1},
  {f: 102, name: 'boom', vol: 0.8},
  // 规则
  {f: 152, name: 'whoosh', vol: 0.5},
  {f: 244, name: 'drop', vol: 0.6},
  {f: 250, name: 'drop', vol: 0.6},
  {f: 256, name: 'drop', vol: 0.6},
  {f: 262, name: 'drop', vol: 0.6},
  {f: 268, name: 'drop', vol: 0.6},
  {f: 286, name: 'pop', vol: 0.6},
  {f: 300, name: 'tick', vol: 0.6},
  {f: 322, name: 'ding', vol: 0.8},
  {f: 476, name: 'heartbeat', vol: 0.7},
  {f: 496, name: 'heartbeat', vol: 0.7},
  {f: 516, name: 'heartbeat', vol: 0.8},
  // 推理
  {f: 542, name: 'whoosh', vol: 0.5},
  {f: 556, name: 'zoom', vol: 0.6},
  {f: 634, name: 'pop', vol: 0.6},
  {f: 714, name: 'pop', vol: 0.6},
  {f: 794, name: 'pop', vol: 0.6},
  {f: 874, name: 'tick', vol: 0.6},
  {f: 892, name: 'tick', vol: 0.6},
  {f: 906, name: 'tick', vol: 0.6},
  {f: 918, name: 'tick', vol: 0.6},
  {f: 928, name: 'tick', vol: 0.6},
  {f: 900, name: 'riser', vol: 0.5},
  {f: 950, name: 'boom', vol: 1},
  {f: 1056, name: 'shimmer', vol: 0.5},
  {f: 1138, name: 'stamp', vol: 0.9},
  // 实验
  {f: 1232, name: 'whoosh', vol: 0.5},
  {f: 1290, name: 'drop', vol: 0.4},
  {f: 1324, name: 'buzz', vol: 0.4},
  {f: 1400, name: 'riser', vol: 0.4},
  {f: 1480, name: 'shimmer', vol: 0.7},
  {f: 1562, name: 'tick', vol: 0.5},
  // 报纸大赛
  {f: 1622, name: 'whoosh', vol: 0.5},
  {f: 1712, name: 'coin', vol: 0.7},
  {f: 1792, name: 'coin', vol: 0.7},
  {f: 1872, name: 'pop', vol: 0.5},
  {f: 1950, name: 'stamp', vol: 0.9},
  {f: 1954, name: 'buzz', vol: 0.4},
  // 错在哪
  {f: 2042, name: 'whoosh', vol: 0.5},
  {f: 2132, name: 'buzz', vol: 0.4},
  {f: 2212, name: 'pop', vol: 0.6},
  {f: 2292, name: 'ding', vol: 0.7},
  {f: 2372, name: 'tick', vol: 0.5},
  {f: 2450, name: 'shimmer', vol: 0.7},
  // 凯恩斯
  {f: 2522, name: 'whoosh', vol: 0.5},
  {f: 2612, name: 'pop', vol: 0.5},
  {f: 2692, name: 'shimmer', vol: 0.6},
  {f: 2772, name: 'riser', vol: 0.5},
  {f: 2850, name: 'crash', vol: 1},
  // 升华
  {f: 2942, name: 'whoosh', vol: 0.5},
  {f: 3032, name: 'tick', vol: 0.5},
  {f: 3110, name: 'stamp', vol: 1},
  {f: 3112, name: 'boom', vol: 0.9},
  // 片尾
  {f: 3214, name: 'shimmer', vol: 0.7},
  {f: 3290, name: 'pop', vol: 0.4},
];

/** 配乐音量包络：0 揭晓、最后一句金句前压低 */
export const MUSIC_DUCK: {f: number; v: number}[] = [
  {f: 0, v: 0.5},
  {f: 930, v: 0.5},
  {f: 946, v: 0.15},
  {f: 952, v: 0.15},
  {f: 960, v: 0.65},
  {f: 1040, v: 0.5},
  {f: 3090, v: 0.5},
  {f: 3106, v: 0.15},
  {f: 3112, v: 0.7},
  {f: 3390, v: 0.55},
  {f: 3450, v: 0},
];
