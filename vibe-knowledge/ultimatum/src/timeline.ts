/**
 * ============================================================
 *  时间轴：第四集「最后通牒博弈」的导演台本
 * ============================================================
 *  场景、字幕、重击、情绪色、音效全部写在这里，
 *  画面组件与 scripts/gen-audio.ts 共同读取，逐帧同步。
 *  30fps · 1080×1920 · 114 秒
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/* ------------------------------------------------------------
 * 1. 场景（绝对帧）
 * ---------------------------------------------------------- */
export const SCENES = {
  hook: {from: 0, dur: 150}, //        0:00 钩子：100 元，他说“不”，两人都没有
  rules: {from: 150, dur: 390}, //     0:05 规则
  rational: {from: 540, dur: 360}, //  0:18 理性答案：给 1 元
  reality: {from: 900, dur: 480}, //   0:30 真实实验：五五开、低于 2 成一半被拒
  brain: {from: 1380, dur: 360}, //    0:46 脑扫描：前脑岛
  chimp: {from: 1740, dur: 300}, //    0:58 黑猩猩才是“理性人”
  culture: {from: 2040, dur: 420}, //  1:08 文化：马奇根加 / 拉马莱拉 / 巴布亚新几内亚
  dictator: {from: 2460, dur: 360}, // 1:22 独裁者博弈：对方不能拒绝时只给 28%
  meaning: {from: 2820, dur: 360}, //  1:34 升华：敢说“不”
  outro: {from: 3180, dur: 240}, //    1:46 片尾：你最低接受多少？
} as const;

export type SceneId = keyof typeof SCENES;
export const TOTAL_FRAMES = SCENES.outro.from + SCENES.outro.dur; // 3420

export const CHAPTERS = [
  {name: '规则', from: SCENES.rules.from, to: SCENES.rational.from},
  {name: '理性', from: SCENES.rational.from, to: SCENES.reality.from},
  {name: '真相', from: SCENES.reality.from, to: SCENES.chimp.from},
  {name: '世界', from: SCENES.chimp.from, to: SCENES.meaning.from},
  {name: '启示', from: SCENES.meaning.from, to: TOTAL_FRAMES},
];

/* ------------------------------------------------------------
 * 2. 字幕轨
 *    <g>金=你/答案</g> <b>蓝=他</b> <c>青=接受</c> <r>红=拒绝</r> <w>白色强调</w>
 * ---------------------------------------------------------- */
export type Cue = {from: number; to: number; text: string};

export const SUBTITLES: Cue[] = [
  // —— 规则 ——
  {from: 160, to: 236, text: '规则很简单：\n你拿到 <g>100 元</g>，分给一个陌生人'},
  {from: 240, to: 316, text: '怎么分，<g>你说了算</g>'},
  {from: 320, to: 404, text: '但他有一票否决权：\n<c>接受</c>，就按你说的分'},
  {from: 408, to: 476, text: '<r>拒绝</r>，两个人<r>一分都拿不到</r>'},
  {from: 480, to: 536, text: '只玩一次。你会给他多少？'},
  // —— 理性答案 ——
  {from: 550, to: 624, text: '经济学的标准答案——'},
  {from: 628, to: 708, text: '对他来说，1 块钱也比 0 块多\n理性的人，<c>什么都会接受</c>'},
  {from: 712, to: 792, text: '所以你只要给他 <w>1 元</w>\n自己留下 <g>99 元</g>'},
  {from: 796, to: 896, text: '这就是“最后通牒博弈”\n1982 年，德国经济学家第一次用真人来做实验'},
  // —— 真实实验 ——
  {from: 910, to: 990, text: '结果，完全不是这样'},
  {from: 994, to: 1074, text: '最常见的分法，是<w>五五开</w>'},
  {from: 1078, to: 1158, text: '平均下来，会分出<w>三四成</w>'},
  {from: 1162, to: 1242, text: '而低于 2 成的分法\n大约<r>一半会被拒绝</r>'},
  {from: 1246, to: 1376, text: '宁可自己一分不要\n也不让对方占便宜'},
  // —— 脑扫描 ——
  {from: 1390, to: 1466, text: '为什么要跟钱过不去？'},
  {from: 1470, to: 1550, text: '2003 年，科学家把回应者送进了脑扫描仪'},
  {from: 1554, to: 1634, text: '不公平的出价，会激活“前脑岛”\n一个和<r>负面情绪</r>有关的脑区'},
  {from: 1638, to: 1736, text: '被拒绝的不公平出价\n这片区域<r>反应更强</r>'},
  // —— 黑猩猩 ——
  {from: 1750, to: 1830, text: '有意思的是，黑猩猩也玩过这个游戏'},
  {from: 1834, to: 1914, text: '只要能分到一点，它们<c>几乎全部接受</c>'},
  {from: 1918, to: 2036, text: '在这场游戏里\n最像“经济学理性人”的，是<w>黑猩猩</w>'},
  // —— 文化 ——
  {from: 2050, to: 2130, text: '而人的公平感，还被文化塑造'},
  {from: 2134, to: 2214, text: '秘鲁亚马逊的马奇根加人\n通常只给 <w>15%～25%</w>，几乎都被接受'},
  {from: 2218, to: 2298, text: '印尼以捕鲸为生的拉马莱拉人\n平均给出 <g>58%</g>，比一半还多'},
  {from: 2302, to: 2382, text: '巴布亚新几内亚的两个村落\n连<r>给太多</r>都会被拒绝'},
  {from: 2386, to: 2456, text: '研究者认为：\n收了大礼，就欠下人情'},
  // —— 独裁者博弈 ——
  {from: 2470, to: 2550, text: '那我们愿意分一半，是因为善良吗？'},
  {from: 2554, to: 2634, text: '换个规则：对方<r>不能拒绝</r>\n这叫“独裁者博弈”'},
  {from: 2638, to: 2718, text: '600 多组实验汇总：\n平均只给 <w>28%</w>，36% 的人<r>一分不给</r>'},
  {from: 2722, to: 2816, text: '原来让我们公平的\n不只是良心，还有<r>对方的“不”</r>'},
  // —— 升华 ——
  {from: 2830, to: 2910, text: '那些宁可吃亏，也要说“不”的人'},
  {from: 2914, to: 2994, text: '看起来不理性\n却让所有人都<c>不敢太过分</c>'},
  {from: 2998, to: 3078, text: '就像第二集的以牙还牙：\n<g>会反击</g>，才换得来合作'},
  {from: 3082, to: 3172, text: '公平从来不是别人施舍的\n是<g>敢说“不”</g>换来的'},
  // —— 片尾 ——
  {from: 3184, to: 3420, text: '100 元，你最低能接受多少？\n评论区留下你的底线'},
];

/* ------------------------------------------------------------
 * 3. 重击：闪白 + 震屏
 * ---------------------------------------------------------- */
export type Impact = {f: number; flash: number; shake: number};
export const IMPACTS: Impact[] = [
  {f: 6, flash: 0.5, shake: 12},
  {f: 44, flash: 0.35, shake: 16},
  {f: 90, flash: 0.45, shake: 18},
  {f: 410, flash: 0.3, shake: 12},
  {f: 714, flash: 0.25, shake: 10},
  {f: 912, flash: 0.45, shake: 16},
  {f: 1164, flash: 0.25, shake: 10},
  {f: 1556, flash: 0.3, shake: 10},
  {f: 1920, flash: 0.35, shake: 12},
  {f: 2304, flash: 0.25, shake: 10},
  {f: 2640, flash: 0.3, shake: 12},
  {f: 3084, flash: 0.45, shake: 16},
];

/* ------------------------------------------------------------
 * 4. 情绪色
 * ---------------------------------------------------------- */
export type MoodKey = {f: number; tint: [number, number, number]; energy: number};
export const MOODS: MoodKey[] = [
  {f: 0, tint: [1.0, 0.6, 0.26], energy: 0.85},
  {f: 90, tint: [0.95, 0.3, 0.22], energy: 0.8},
  {f: 150, tint: [0.92, 0.7, 0.4], energy: 0.55},
  {f: 540, tint: [0.45, 0.62, 0.9], energy: 0.5},
  {f: 900, tint: [0.98, 0.7, 0.32], energy: 0.75},
  {f: 1162, tint: [0.95, 0.32, 0.24], energy: 0.6},
  {f: 1380, tint: [0.75, 0.3, 0.55], energy: 0.55},
  {f: 1740, tint: [0.7, 0.58, 0.32], energy: 0.55},
  {f: 2040, tint: [0.35, 0.75, 0.68], energy: 0.55},
  {f: 2460, tint: [0.5, 0.55, 0.85], energy: 0.5},
  {f: 2820, tint: [0.95, 0.35, 0.25], energy: 0.6},
  {f: 3084, tint: [1.0, 0.72, 0.32], energy: 0.85},
];

/* ------------------------------------------------------------
 * 5. 音效提示点
 * ---------------------------------------------------------- */
export type SfxName =
  | 'slice'
  | 'crumble'
  | 'stamp'
  | 'coin'
  | 'boom'
  | 'whoosh'
  | 'pop'
  | 'tick'
  | 'heartbeat'
  | 'shimmer'
  | 'buzz'
  | 'riser'
  | 'scan'
  | 'ding';

export type Sfx = {f: number; name: SfxName; vol?: number};

export const SFX: Sfx[] = [
  // 钩子
  {f: 0, name: 'boom', vol: 0.6},
  {f: 6, name: 'slice', vol: 0.9},
  {f: 44, name: 'stamp', vol: 1},
  {f: 60, name: 'riser', vol: 0.4},
  {f: 90, name: 'crumble', vol: 0.9},
  {f: 92, name: 'boom', vol: 0.8},
  // 规则
  {f: 152, name: 'whoosh', vol: 0.5},
  {f: 246, name: 'slice', vol: 0.6},
  {f: 326, name: 'ding', vol: 0.7},
  {f: 412, name: 'crumble', vol: 0.8},
  {f: 484, name: 'heartbeat', vol: 0.7},
  // 理性答案
  {f: 552, name: 'whoosh', vol: 0.5},
  {f: 636, name: 'tick', vol: 0.6},
  {f: 660, name: 'ding', vol: 0.5},
  {f: 714, name: 'coin', vol: 0.8},
  {f: 798, name: 'stamp', vol: 0.7},
  // 真实实验
  {f: 896, name: 'riser', vol: 0.5},
  {f: 912, name: 'boom', vol: 1},
  {f: 1028, name: 'shimmer', vol: 0.6},
  {f: 1080, name: 'pop', vol: 0.5},
  {f: 1164, name: 'buzz', vol: 0.5},
  {f: 1258, name: 'slice', vol: 0.6},
  {f: 1290, name: 'stamp', vol: 0.7},
  {f: 1298, name: 'crumble', vol: 0.9},
  // 脑扫描
  {f: 1382, name: 'whoosh', vol: 0.5},
  {f: 1472, name: 'scan', vol: 0.7},
  {f: 1556, name: 'heartbeat', vol: 0.8},
  {f: 1586, name: 'heartbeat', vol: 0.8},
  {f: 1640, name: 'boom', vol: 0.7},
  // 黑猩猩
  {f: 1742, name: 'whoosh', vol: 0.5},
  {f: 1840, name: 'ding', vol: 0.6},
  {f: 1858, name: 'ding', vol: 0.6},
  {f: 1876, name: 'ding', vol: 0.6},
  {f: 1920, name: 'stamp', vol: 0.9},
  // 文化
  {f: 2042, name: 'whoosh', vol: 0.5},
  {f: 2136, name: 'pop', vol: 0.6},
  {f: 2220, name: 'pop', vol: 0.6},
  {f: 2304, name: 'buzz', vol: 0.45},
  {f: 2388, name: 'shimmer', vol: 0.5},
  // 独裁者博弈
  {f: 2462, name: 'whoosh', vol: 0.5},
  {f: 2556, name: 'stamp', vol: 0.8},
  {f: 2640, name: 'coin', vol: 0.8},
  {f: 2724, name: 'boom', vol: 0.8},
  // 升华
  {f: 2822, name: 'whoosh', vol: 0.5},
  {f: 2916, name: 'riser', vol: 0.45},
  {f: 3000, name: 'shimmer', vol: 0.6},
  {f: 3084, name: 'stamp', vol: 1},
  {f: 3086, name: 'boom', vol: 0.9},
  // 片尾
  {f: 3184, name: 'shimmer', vol: 0.7},
  {f: 3256, name: 'pop', vol: 0.4},
];

/** 配乐音量包络：真实实验揭晓、最后一句金句前压低 */
export const MUSIC_DUCK: {f: number; v: number}[] = [
  {f: 0, v: 0.5},
  {f: 880, v: 0.5},
  {f: 900, v: 0.12},
  {f: 910, v: 0.12},
  {f: 918, v: 0.65},
  {f: 1000, v: 0.5},
  {f: 3060, v: 0.5},
  {f: 3080, v: 0.15},
  {f: 3086, v: 0.7},
  {f: 3360, v: 0.55},
  {f: 3420, v: 0},
];
