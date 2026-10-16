/**
 * ============================================================
 *  时间轴：第六集「海盗分金」的导演台本
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
  hook: {from: 0, dur: 150}, //          0:00 钩子：提方案的随时被扔下海，却能拿走 98 枚
  rules: {from: 150, dur: 450}, //       0:05 规则：资历、投票、一半通过、否则落水；海盗的三条偏好
  guess: {from: 600, dur: 180}, //       0:20 直觉：平分 20？多分给别人？——都错了
  backward: {from: 780, dur: 1230}, //   0:26 倒着想：1 人 → 2 人 → … → 5 人，98 : 0 : 1 : 0 : 1
  why: {from: 2010, dur: 450}, //        1:07 原理：每票的价码、提案权、最小获胜联盟
  human: {from: 2460, dur: 390}, //      1:22 人性：第四集的最后通牒——1 枚金币很可能被拒绝
  meaning: {from: 2850, dur: 330}, //    1:35 升华：倒着想 / 规则给权力，人心定多少
  outro: {from: 3180, dur: 270}, //      1:46 片尾：如果你是 3 号，投赞成还是反对？
} as const;

export type SceneId = keyof typeof SCENES;
export const TOTAL_FRAMES = SCENES.outro.from + SCENES.outro.dur; // 3450

export const CHAPTERS = [
  {name: '规则', from: SCENES.rules.from, to: SCENES.backward.from},
  {name: '倒推', from: SCENES.backward.from, to: SCENES.why.from},
  {name: '原理', from: SCENES.why.from, to: SCENES.human.from},
  {name: '人性', from: SCENES.human.from, to: SCENES.meaning.from},
  {name: '启示', from: SCENES.meaning.from, to: TOTAL_FRAMES},
];

/* ------------------------------------------------------------
 * 2. 字幕轨
 *    <g>金=金币 / 船长</g> <b>蓝=被收买的人</b> <c>青=赞成</c> <r>红=反对 / 落水</r> <w>白色强调</w>
 * ---------------------------------------------------------- */
export type Cue = {from: number; to: number; text: string};

export const SUBTITLES: Cue[] = [
  // —— 规则 ——
  {from: 160, to: 236, text: '5 个海盗按资历排好\n1 号最大，5 号最小'},
  {from: 240, to: 316, text: '由 1 号提出分配方案\n所有人投票，<w>包括他自己</w>'},
  {from: 320, to: 396, text: '赞成票<c>不少于一半</c>，方案通过'},
  {from: 400, to: 476, text: '否则，把他<r>扔进海里</r>\n由下一个人接着提'},
  {from: 480, to: 556, text: '海盗个个精明：先保命，再要钱\n钱一样多时，宁可把人扔下海'},
  {from: 560, to: 596, text: '1 号该怎么分？'},
  // —— 直觉 ——
  {from: 610, to: 686, text: '直觉告诉你：平分，每人 20 枚'},
  {from: 690, to: 776, text: '或者多分给别人，好保住命\n——<r>都错了</r>'},
  // —— 倒着想 ——
  {from: 790, to: 866, text: '这道题，要<w>倒着想</w>'},
  {from: 870, to: 946, text: '假如只剩 5 号：<g>100 枚</g>全归他'},
  {from: 950, to: 1026, text: '只剩 4 号和 5 号\n4 号一票就够一半：<g>100 : 0</g>'},
  {from: 1030, to: 1106, text: '剩 3、4、5 号时\n3 号需要 <w>2 票</w>'},
  {from: 1110, to: 1186, text: '3 号一死，5 号只能拿 0\n给他 <g>1 枚</g>，他就会赞成'},
  {from: 1190, to: 1266, text: '3 号拿 <g>99</g>\n4 号拿 0，5 号拿 1'},
  {from: 1270, to: 1346, text: '剩 2～5 号时\n2 号也需要 <w>2 票</w>'},
  {from: 1350, to: 1426, text: '4 号在下一轮会是 0\n给他 <g>1 枚</g> 就够了'},
  {from: 1430, to: 1506, text: '2 号拿 <g>99</g>\n3 号 0，4 号 1，5 号 0'},
  {from: 1510, to: 1586, text: '终于轮到 1 号\n5 个人，他需要 <w>3 票</w>'},
  {from: 1590, to: 1666, text: '在 2 号的方案里，谁拿 0？\n<b>3 号和 5 号</b>'},
  {from: 1670, to: 1746, text: '各给 <g>1 枚</g>\n加上自己一票，正好 3 票'},
  {from: 1750, to: 1846, text: '答案：<g>98 : 0 : 1 : 0 : 1</g>'},
  {from: 1850, to: 2006, text: '最危险的位置\n拿走了<g>几乎全部</g>金币'},
  // —— 原理 ——
  {from: 2020, to: 2096, text: '为什么 1 号这么强？'},
  {from: 2100, to: 2176, text: '每一票的价码\n= 他下一轮能拿的 + 1'},
  {from: 2180, to: 2256, text: '规则又写着“一半就够”\n<w>提方案的人</w>，握着最大的权力'},
  {from: 2260, to: 2336, text: '政治学里也有个说法：\n“最小获胜联盟”'},
  {from: 2340, to: 2456, text: '只拉刚好够赢的人\n分的人越少，自己留得越多'},
  // —— 人性 ——
  {from: 2470, to: 2546, text: '可这只是“理性海盗”的答案'},
  {from: 2550, to: 2626, text: '还记得第四集的最后通牒吗？'},
  {from: 2630, to: 2706, text: '低于 2 成的分法\n大约<r>一半会被拒绝</r>'},
  {from: 2710, to: 2786, text: '1 枚金币，只有 <r>1%</r>'},
  {from: 2790, to: 2846, text: '真实的 3 号和 5 号\n很可能<r>投反对票</r>'},
  // —— 升华 ——
  {from: 2860, to: 2936, text: '海盗分金，教会我们两件事'},
  {from: 2940, to: 3016, text: '第一：<w>倒着想</w>\n从结局出发，看清每一步'},
  {from: 3020, to: 3096, text: '第二：规则给你权力\n<g>人心决定你能拿多少</g>'},
  {from: 3100, to: 3176, text: '算得太精的船长\n<r>会被扔下海</r>'},
  // —— 片尾 ——
  {from: 3184, to: 3450, text: '如果你是 3 号，只分到 1 枚\n你投赞成，还是反对？'},
];

/* ------------------------------------------------------------
 * 3. 重击：闪白 + 震屏
 * ---------------------------------------------------------- */
export type Impact = {f: number; flash: number; shake: number};
export const IMPACTS: Impact[] = [
  {f: 8, flash: 0.3, shake: 8},
  {f: 46, flash: 0.3, shake: 10},
  {f: 92, flash: 0.45, shake: 16},
  {f: 446, flash: 0.35, shake: 12},
  {f: 760, flash: 0.3, shake: 10},
  {f: 1756, flash: 0.5, shake: 16},
  {f: 2182, flash: 0.25, shake: 8},
  {f: 2802, flash: 0.4, shake: 14},
  {f: 3104, flash: 0.45, shake: 14},
];

/* ------------------------------------------------------------
 * 4. 情绪色
 * ---------------------------------------------------------- */
export type MoodKey = {f: number; tint: [number, number, number]; energy: number};
export const MOODS: MoodKey[] = [
  {f: 0, tint: [1.0, 0.7, 0.32], energy: 0.8},
  {f: 92, tint: [1.0, 0.78, 0.4], energy: 0.85},
  {f: 150, tint: [0.3, 0.55, 0.85], energy: 0.55},
  {f: 600, tint: [0.9, 0.72, 0.42], energy: 0.5},
  {f: 780, tint: [0.35, 0.7, 0.85], energy: 0.5},
  {f: 1750, tint: [1.0, 0.75, 0.35], energy: 0.8},
  {f: 2010, tint: [0.35, 0.78, 0.7], energy: 0.55},
  {f: 2460, tint: [0.95, 0.38, 0.28], energy: 0.55},
  {f: 2850, tint: [0.35, 0.6, 0.9], energy: 0.55},
  {f: 3104, tint: [1.0, 0.76, 0.38], energy: 0.85},
];

/* ------------------------------------------------------------
 * 5. 音效提示点
 * ---------------------------------------------------------- */
export type SfxName =
  | 'coin'
  | 'coins'
  | 'splash'
  | 'creak'
  | 'stamp'
  | 'whoosh'
  | 'pop'
  | 'tick'
  | 'ding'
  | 'boom'
  | 'riser'
  | 'shimmer'
  | 'buzz'
  | 'heartbeat';

export type Sfx = {f: number; name: SfxName; vol?: number};

export const SFX: Sfx[] = [
  // 钩子
  {f: 0, name: 'boom', vol: 0.6},
  {f: 6, name: 'coins', vol: 0.8},
  {f: 44, name: 'creak', vol: 0.7},
  {f: 58, name: 'riser', vol: 0.4},
  {f: 92, name: 'boom', vol: 0.8},
  {f: 94, name: 'coin', vol: 0.9},
  // 规则
  {f: 152, name: 'whoosh', vol: 0.5},
  ...[162, 166, 170, 174, 178].map((f) => ({f, name: 'pop' as const, vol: 0.4})),
  {f: 244, name: 'pop', vol: 0.6},
  {f: 326, name: 'ding', vol: 0.7},
  {f: 404, name: 'buzz', vol: 0.45},
  {f: 418, name: 'creak', vol: 0.7},
  {f: 444, name: 'splash', vol: 1},
  {f: 482, name: 'tick', vol: 0.5},
  {f: 562, name: 'heartbeat', vol: 0.7},
  // 直觉
  {f: 612, name: 'coin', vol: 0.6},
  {f: 692, name: 'coin', vol: 0.6},
  {f: 760, name: 'stamp', vol: 0.9},
  {f: 762, name: 'buzz', vol: 0.4},
  // 倒着想
  {f: 782, name: 'whoosh', vol: 0.5},
  {f: 872, name: 'coins', vol: 0.6},
  {f: 952, name: 'pop', vol: 0.6},
  {f: 990, name: 'ding', vol: 0.6},
  {f: 1032, name: 'pop', vol: 0.6},
  {f: 1112, name: 'coin', vol: 0.8},
  {f: 1192, name: 'ding', vol: 0.6},
  {f: 1272, name: 'pop', vol: 0.6},
  {f: 1352, name: 'coin', vol: 0.8},
  {f: 1432, name: 'ding', vol: 0.6},
  {f: 1512, name: 'pop', vol: 0.6},
  {f: 1592, name: 'shimmer', vol: 0.5},
  {f: 1672, name: 'coin', vol: 0.8},
  {f: 1690, name: 'coin', vol: 0.8},
  {f: 1730, name: 'riser', vol: 0.5},
  {f: 1756, name: 'boom', vol: 1},
  {f: 1758, name: 'coins', vol: 0.9},
  {f: 1852, name: 'shimmer', vol: 0.6},
  // 原理
  {f: 2012, name: 'whoosh', vol: 0.5},
  {f: 2102, name: 'tick', vol: 0.6},
  {f: 2182, name: 'stamp', vol: 0.8},
  {f: 2262, name: 'pop', vol: 0.6},
  {f: 2342, name: 'coin', vol: 0.7},
  // 人性
  {f: 2462, name: 'whoosh', vol: 0.5},
  {f: 2552, name: 'shimmer', vol: 0.5},
  {f: 2632, name: 'buzz', vol: 0.4},
  {f: 2712, name: 'tick', vol: 0.6},
  {f: 2782, name: 'creak', vol: 0.7},
  {f: 2794, name: 'buzz', vol: 0.5},
  {f: 2802, name: 'splash', vol: 1},
  // 升华
  {f: 2852, name: 'whoosh', vol: 0.5},
  {f: 2942, name: 'tick', vol: 0.5},
  {f: 3022, name: 'ding', vol: 0.6},
  {f: 3104, name: 'stamp', vol: 1},
  {f: 3106, name: 'splash', vol: 0.8},
  {f: 3108, name: 'boom', vol: 0.8},
  // 片尾
  {f: 3184, name: 'shimmer', vol: 0.7},
  {f: 3270, name: 'pop', vol: 0.4},
];

/** 配乐音量包络：答案揭晓、最后一句金句前压低 */
export const MUSIC_DUCK: {f: number; v: number}[] = [
  {f: 0, v: 0.5},
  {f: 1730, v: 0.5},
  {f: 1748, v: 0.15},
  {f: 1756, v: 0.15},
  {f: 1762, v: 0.7},
  {f: 1840, v: 0.5},
  {f: 3080, v: 0.5},
  {f: 3098, v: 0.15},
  {f: 3106, v: 0.7},
  {f: 3390, v: 0.55},
  {f: 3450, v: 0},
];
