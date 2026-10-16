/**
 * ============================================================
 *  时间轴：第二集「阿克塞尔罗德大赛」的导演台本
 * ============================================================
 *  场景、字幕、重击、情绪色、音效全部写在这里，
 *  画面组件与 scripts/gen-audio.ts 共同读取，逐帧同步。
 *  30fps · 1080×1920 · 116 秒
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/* ------------------------------------------------------------
 * 1. 场景（绝对帧）
 * ---------------------------------------------------------- */
export const SCENES = {
  hook: {from: 0, dur: 150}, //        0:00 钩子：冠军只有 4 行代码，一局没赢过
  dilemma: {from: 150, dur: 570}, //   0:05 囚徒困境规则
  tourney: {from: 720, dur: 390}, //   0:24 200 次重复 + 电脑大赛
  board: {from: 1110, dur: 360}, //    0:37 排行榜揭晓
  tft: {from: 1470, dur: 510}, //      0:49 以牙还牙的 4 行代码
  paradox: {from: 1980, dur: 420}, //  1:06 悖论：一局没赢过
  evolve: {from: 2400, dur: 450}, //   1:20 第二届 + 演化 1000 代
  caveat: {from: 2850, dur: 240}, //   1:35 弱点：误会
  outro: {from: 3090, dur: 390}, //    1:43 四条建议 + 升华
} as const;

export type SceneId = keyof typeof SCENES;
export const TOTAL_FRAMES = SCENES.outro.from + SCENES.outro.dur; // 3480

/** 顶部章节进度条 */
export const CHAPTERS = [
  {name: '规则', from: SCENES.dilemma.from, to: SCENES.tourney.from},
  {name: '大赛', from: SCENES.tourney.from, to: SCENES.tft.from},
  {name: '冠军', from: SCENES.tft.from, to: SCENES.evolve.from},
  {name: '进化', from: SCENES.evolve.from, to: SCENES.outro.from},
  {name: '启示', from: SCENES.outro.from, to: TOTAL_FRAMES},
];

/* ------------------------------------------------------------
 * 2. 字幕轨
 *    <c>青=合作</c> <r>红=背叛</r> <g>金=以牙还牙/答案</g> <b>蓝</b> <w>白色强调</w>
 * ---------------------------------------------------------- */
export type Cue = {from: number; to: number; text: string};

export const SUBTITLES: Cue[] = [
  // —— 囚徒困境 ——
  {from: 160, to: 235, text: '先认识一个经典游戏：<w>囚徒困境</w>'},
  {from: 238, to: 318, text: '两个人同时选择：\n<c>合作</c>，还是<r>背叛</r>'},
  {from: 321, to: 396, text: '都合作：各得 <c>3</c> 分'},
  {from: 399, to: 474, text: '都背叛：各得 <r>1</r> 分'},
  {from: 477, to: 562, text: '一个背叛、一个合作：\n背叛者拿 <r>5</r> 分，老实人 <w>0</w> 分'},
  {from: 565, to: 640, text: '不管对手怎么选\n<r>背叛</r>都能多拿分'},
  {from: 643, to: 718, text: '可两个人都这么想\n就只剩各拿 <r>1</r> 分'},
  // —— 大赛 ——
  {from: 730, to: 805, text: '但如果不是玩一次\n而是<w>连玩 200 次</w>呢？'},
  {from: 808, to: 888, text: '1980 年，政治学家<w>阿克塞尔罗德</w>\n办了一场电脑大赛'},
  {from: 891, to: 971, text: '经济学、心理学、数学……\n<w>14</w> 位专家各交一个程序'},
  {from: 974, to: 1049, text: '再加一个随机乱选的程序\n两两对战，每场 200 回合'},
  {from: 1052, to: 1108, text: '谁，才是最会算计的那个？'},
  // —— 排行榜 ——
  {from: 1120, to: 1195, text: '结果揭晓——'},
  {from: 1198, to: 1278, text: '冠军：<g>以牙还牙</g>\n每场平均 504.5 分'},
  {from: 1281, to: 1361, text: '它是全场最短的程序\n只有 <g>4 行</g>代码'},
  {from: 1364, to: 1468, text: '而且排名前 8 的\n全是<c>从不先背叛</c>的“善良”程序'},
  // —— 以牙还牙 ——
  {from: 1480, to: 1555, text: '以牙还牙的全部代码，就这些：'},
  {from: 1558, to: 1638, text: '第一回合：<c>先合作</c>'},
  {from: 1641, to: 1716, text: '之后只做一件事：\n<w>照抄对手的上一步</w>'},
  {from: 1719, to: 1799, text: '碰上永远背叛的人？\n只吃亏一次，然后<r>奉陪到底</r>'},
  {from: 1802, to: 1882, text: '对方一回头\n它立刻<c>原谅</c>'},
  {from: 1885, to: 1978, text: '不先害人、不吃哑巴亏、不记仇'},
  // —— 悖论 ——
  {from: 1990, to: 2070, text: '可奇怪的是：\n它<r>一局都没赢过</r>'},
  {from: 2073, to: 2153, text: '碰上背叛者，它先吃一次亏\n但最多只输 <r>5</r> 分'},
  {from: 2156, to: 2236, text: '碰上好人，它也只是<w>打平</w>'},
  {from: 2239, to: 2319, text: '那些“赢了”的背叛者呢？\n赢下一局，只拿到 <r>204</r> 分'},
  {from: 2322, to: 2398, text: '而两个合作者\n<c>各拿 600 分</c>'},
  // —— 第二届 + 演化 ——
  {from: 2410, to: 2490, text: '第二届：<w>62</w> 个程序，来自 6 个国家'},
  {from: 2493, to: 2568, text: '人人都知道以牙还牙夺了冠\n都想着怎么打败它——'},
  {from: 2571, to: 2636, text: '冠军：<g>还是以牙还牙</g>'},
  {from: 2639, to: 2719, text: '再让策略们繁衍 1000 代：\n得分越高，后代越多'},
  {from: 2722, to: 2797, text: '背叛者先吃掉了老好人\n然后<r>饿死了自己</r>'},
  {from: 2800, to: 2848, text: '最后活下来的，是<c>合作</c>'},
  // —— 弱点 ——
  {from: 2860, to: 2935, text: '但以牙还牙也有弱点：<r>误会</r>'},
  {from: 2938, to: 3013, text: '一次手滑\n就可能<r>互相报复到底</r>'},
  {from: 3016, to: 3088, text: '所以现实里更好的做法：\n<c>偶尔原谅一次</c>'},
  // —— 启示 ——
  {from: 3100, to: 3180, text: '阿克塞尔罗德总结了四条建议'},
  {from: 3183, to: 3263, text: '第一条最反直觉：\n<w>不嫉妒</w>，不需要赢过任何人'},
  {from: 3266, to: 3346, text: '人生不是一局定输赢\n而是一场<g>重复的游戏</g>'},
  {from: 3352, to: 3480, text: '你身边，有“永远背叛”的人吗？'},
];

/* ------------------------------------------------------------
 * 3. 重击：闪白 + 震屏
 * ---------------------------------------------------------- */
export type Impact = {f: number; flash: number; shake: number};
export const IMPACTS: Impact[] = [
  {f: 0, flash: 0.9, shake: 14},
  {f: 42, flash: 0.25, shake: 10},
  {f: 88, flash: 0.45, shake: 18},
  {f: 1198, flash: 0.5, shake: 16},
  {f: 2000, flash: 0.3, shake: 14},
  {f: 2118, flash: 0.2, shake: 10},
  {f: 2200, flash: 0.15, shake: 8},
  {f: 2580, flash: 0.55, shake: 18},
  {f: 2878, flash: 0.35, shake: 14},
  {f: 3360, flash: 0.3, shake: 8},
];

/* ------------------------------------------------------------
 * 4. 情绪色（驱动 GLSL 背景）
 * ---------------------------------------------------------- */
export type MoodKey = {f: number; tint: [number, number, number]; energy: number};
export const MOODS: MoodKey[] = [
  {f: 0, tint: [1.0, 0.62, 0.22], energy: 0.85},
  {f: 150, tint: [0.32, 0.78, 0.68], energy: 0.5},
  {f: 720, tint: [0.36, 0.62, 0.9], energy: 0.55},
  {f: 1110, tint: [0.4, 0.6, 0.9], energy: 0.5},
  {f: 1198, tint: [1.0, 0.72, 0.3], energy: 0.9},
  {f: 1470, tint: [1.0, 0.66, 0.28], energy: 0.6},
  {f: 1980, tint: [0.95, 0.3, 0.22], energy: 0.6},
  {f: 2322, tint: [0.3, 0.8, 0.65], energy: 0.6},
  {f: 2400, tint: [0.4, 0.6, 0.9], energy: 0.55},
  {f: 2571, tint: [1.0, 0.72, 0.3], energy: 0.95},
  {f: 2640, tint: [0.32, 0.78, 0.66], energy: 0.6},
  {f: 2850, tint: [0.9, 0.3, 0.24], energy: 0.55},
  {f: 3016, tint: [0.32, 0.8, 0.66], energy: 0.55},
  {f: 3090, tint: [1.0, 0.7, 0.32], energy: 0.7},
];

/* ------------------------------------------------------------
 * 5. 音效提示点
 * ---------------------------------------------------------- */
export type SfxName =
  | 'crtOn'
  | 'typing'
  | 'coin'
  | 'boom'
  | 'whoosh'
  | 'riser'
  | 'pop'
  | 'tick'
  | 'blips'
  | 'shimmer'
  | 'stamp'
  | 'glitch'
  | 'beep'
  | 'buzz';

export type Sfx = {f: number; name: SfxName; vol?: number};

export const SFX: Sfx[] = [
  // 钩子
  {f: 0, name: 'crtOn', vol: 0.9},
  {f: 6, name: 'typing', vol: 0.55},
  {f: 42, name: 'stamp', vol: 0.8},
  {f: 60, name: 'riser', vol: 0.4},
  {f: 88, name: 'boom', vol: 0.9},
  {f: 90, name: 'buzz', vol: 0.5},
  // 囚徒困境
  {f: 150, name: 'whoosh', vol: 0.5},
  {f: 240, name: 'pop', vol: 0.5},
  {f: 252, name: 'pop', vol: 0.5},
  {f: 323, name: 'coin', vol: 0.7},
  {f: 401, name: 'coin', vol: 0.6},
  {f: 479, name: 'coin', vol: 0.8},
  {f: 567, name: 'tick', vol: 0.6},
  {f: 590, name: 'tick', vol: 0.6},
  {f: 645, name: 'boom', vol: 0.6},
  // 大赛
  {f: 722, name: 'whoosh', vol: 0.5},
  {f: 735, name: 'blips', vol: 0.4},
  {f: 808, name: 'crtOn', vol: 0.6},
  {f: 812, name: 'typing', vol: 0.45},
  {f: 893, name: 'whoosh', vol: 0.5},
  {f: 976, name: 'blips', vol: 0.4},
  {f: 1052, name: 'riser', vol: 0.55},
  // 排行榜
  {f: 1112, name: 'whoosh', vol: 0.5},
  {f: 1122, name: 'tick', vol: 0.5},
  {f: 1140, name: 'tick', vol: 0.5},
  {f: 1158, name: 'tick', vol: 0.5},
  {f: 1176, name: 'riser', vol: 0.5},
  {f: 1198, name: 'boom', vol: 1},
  {f: 1200, name: 'shimmer', vol: 0.8},
  {f: 1283, name: 'beep', vol: 0.5},
  {f: 1366, name: 'pop', vol: 0.6},
  // 以牙还牙
  {f: 1472, name: 'crtOn', vol: 0.5},
  {f: 1484, name: 'typing', vol: 0.55},
  {f: 1560, name: 'beep', vol: 0.5},
  {f: 1643, name: 'beep', vol: 0.5},
  {f: 1722, name: 'pop', vol: 0.5},
  {f: 1805, name: 'pop', vol: 0.5},
  {f: 1840, name: 'shimmer', vol: 0.5},
  // 悖论
  {f: 1990, name: 'riser', vol: 0.35},
  {f: 2000, name: 'boom', vol: 0.8},
  {f: 2118, name: 'stamp', vol: 0.9},
  {f: 2200, name: 'stamp', vol: 0.7},
  {f: 2241, name: 'buzz', vol: 0.4},
  {f: 2324, name: 'coin', vol: 0.8},
  // 第二届 + 演化
  {f: 2402, name: 'whoosh', vol: 0.5},
  {f: 2412, name: 'blips', vol: 0.45},
  {f: 2540, name: 'riser', vol: 0.55},
  {f: 2580, name: 'stamp', vol: 1},
  {f: 2582, name: 'shimmer', vol: 0.8},
  {f: 2641, name: 'whoosh', vol: 0.5},
  {f: 2724, name: 'buzz', vol: 0.35},
  {f: 2802, name: 'shimmer', vol: 0.6},
  // 弱点
  {f: 2852, name: 'whoosh', vol: 0.4},
  {f: 2878, name: 'glitch', vol: 0.9},
  {f: 2940, name: 'buzz', vol: 0.4},
  {f: 3040, name: 'shimmer', vol: 0.6},
  // 启示
  {f: 3092, name: 'whoosh', vol: 0.5},
  {f: 3110, name: 'pop', vol: 0.55},
  {f: 3122, name: 'pop', vol: 0.55},
  {f: 3134, name: 'pop', vol: 0.55},
  {f: 3146, name: 'pop', vol: 0.55},
  {f: 3185, name: 'beep', vol: 0.5},
  {f: 3268, name: 'riser', vol: 0.4},
  {f: 3360, name: 'boom', vol: 0.6},
  {f: 3362, name: 'shimmer', vol: 0.7},
];

/** 配乐音量包络：揭晓冠军前压低，制造屏息 */
export const MUSIC_DUCK: {f: number; v: number}[] = [
  {f: 0, v: 0.5},
  {f: 1150, v: 0.5},
  {f: 1185, v: 0.12},
  {f: 1197, v: 0.12},
  {f: 1203, v: 0.7},
  {f: 1300, v: 0.5},
  {f: 2540, v: 0.5},
  {f: 2570, v: 0.15},
  {f: 2578, v: 0.15},
  {f: 2584, v: 0.7},
  {f: 2700, v: 0.5},
  {f: 3420, v: 0.55},
  {f: 3480, v: 0},
];
