/**
 * ============================================================
 *  时间轴：第三集「美元拍卖」的导演台本
 * ============================================================
 *  场景、字幕、竞价进程、重击、情绪色、音效全部写在这里，
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
  hook: {from: 0, dur: 150}, //        0:00 钩子：第二名也要付钱，价格冲破 100
  rules: {from: 150, dur: 410}, //     0:05 规则
  cheap: {from: 560, dur: 450}, //     0:18 便宜阶段：人人举牌 → 只剩两人，拍卖师稳赚
  trap: {from: 1010, dur: 630}, //     0:33 陷阱：95 对 100，放弃亏 95，加价只亏 5
  sold: {from: 1640, dur: 280}, //     0:54 成交：245 元买下 100 元
  lab: {from: 1920, dur: 410}, //      1:04 真实实验：舒比克 1971，巴泽曼课堂
  why: {from: 2330, dur: 370}, //      1:17 原因：沉没成本 + 不能输给他
  world: {from: 2700, dur: 270}, //    1:30 现实：价格战、补贴大战、军备竞赛
  how: {from: 2970, dur: 360}, //      1:39 解法：止损线 / 沉没成本不是理由 / 不出价
  outro: {from: 3330, dur: 150}, //    1:51 片尾
} as const;

export type SceneId = keyof typeof SCENES;
export const TOTAL_FRAMES = SCENES.outro.from + SCENES.outro.dur; // 3480

export const CHAPTERS = [
  {name: '规则', from: SCENES.rules.from, to: SCENES.cheap.from},
  {name: '竞价', from: SCENES.cheap.from, to: SCENES.sold.from},
  {name: '实验', from: SCENES.sold.from, to: SCENES.why.from},
  {name: '陷阱', from: SCENES.why.from, to: SCENES.how.from},
  {name: '解法', from: SCENES.how.from, to: TOTAL_FRAMES},
];

/* ------------------------------------------------------------
 * 2. 字幕轨
 *    <c>青=面值/价值</c> <r>红=亏损/危险</r> <g>金=你/答案</g> <b>蓝=他</b> <w>白色强调</w>
 * ---------------------------------------------------------- */
export type Cue = {from: number; to: number; text: string};

export const SUBTITLES: Cue[] = [
  // —— 规则 ——
  {from: 160, to: 232, text: '来玩一个拍卖游戏\n拍品：一张 <c>100 元</c>'},
  {from: 236, to: 322, text: '起价 5 元，每次加 5 元\n出价最高的人，拿走 100 元'},
  {from: 326, to: 384, text: '但有一条特殊规则——'},
  {from: 388, to: 478, text: '<r>第二名也要付钱</r>\n而且什么也得不到'},
  {from: 482, to: 556, text: '如果是你，会出价吗？'},
  // —— 便宜阶段 ——
  {from: 570, to: 644, text: '5 块钱换 100 块？\n太划算了！'},
  {from: 648, to: 724, text: '10、15、20……\n举牌的人越来越多'},
  {from: 728, to: 808, text: '价格涨到 50\n大多数人开始放下牌子'},
  {from: 812, to: 912, text: '只剩两个人：<b>他</b>出 50，<g>你</g>出 45\n拍卖师已经收了 95 元'},
  {from: 916, to: 1006, text: '再加一口，两人加起来就超过 100\n拍卖师<g>稳赚不赔</g>'},
  // —— 陷阱 ——
  {from: 1020, to: 1094, text: '价格继续涨——\n他出 <b>100</b>，你出 <g>95</g>'},
  {from: 1098, to: 1176, text: '你放弃：95 元<r>白白亏掉</r>'},
  {from: 1180, to: 1262, text: '你加到 105，赢了：\n只亏 <w>5</w> 元'},
  {from: 1266, to: 1330, text: '理性的选择：<r>继续加价</r>'},
  {from: 1334, to: 1424, text: '可他也会这么算：\n放弃亏 100，加价只亏 10'},
  {from: 1428, to: 1512, text: '从这一刻起，加价不是为了赚\n而是为了<r>少亏一点</r>'},
  {from: 1516, to: 1636, text: '每一步都很理性\n合起来，却是一场<r>灾难</r>'},
  // —— 成交 ——
  {from: 1650, to: 1726, text: '最后，他在 240 元时放弃了'},
  {from: 1730, to: 1816, text: '你花 245 元\n买下了一张 100 元'},
  {from: 1820, to: 1916, text: '他付了 240 元，什么也没得到\n拍卖师净赚 <g>385</g> 元'},
  // —— 真实实验 ——
  {from: 1930, to: 2010, text: '这不是瞎编的\n1971 年，经济学家<w>舒比克</w>设计了它'},
  {from: 2014, to: 2084, text: '在真实实验里\n成交价常常<r>超过面值</r>'},
  {from: 2088, to: 2168, text: '哈佛商学院的巴泽曼教授\n在课堂上拍卖 20 美元'},
  {from: 2172, to: 2252, text: '出价一般在 12 到 16 美元放缓\n然后一路冲过 20 美元'},
  {from: 2256, to: 2326, text: '流传最广的一次：\n拍到了 <r>204 美元</r>'},
  // —— 原因 ——
  {from: 2340, to: 2410, text: '为什么聪明人也会掉进去？'},
  {from: 2414, to: 2494, text: '因为付出去的钱，<w>收不回来了</w>\n这叫“沉没成本”'},
  {from: 2498, to: 2578, text: '投入越多，越舍不得放手'},
  {from: 2582, to: 2696, text: '到最后，目标从“赚 100 元”\n变成了“<r>不能输给他</r>”'},
  // —— 现实 ——
  {from: 2710, to: 2790, text: '价格战、补贴大战、军备竞赛……'},
  {from: 2794, to: 2874, text: '明知会亏\n却谁也不敢先停下来'},
  {from: 2878, to: 2966, text: '都是同一场<r>美元拍卖</r>'},
  // —— 解法 ——
  {from: 2980, to: 3044, text: '那怎么才能不掉进去？'},
  {from: 3048, to: 3118, text: '第一：入场之前，<w>先定止损线</w>'},
  {from: 3122, to: 3226, text: '第二：已经花掉的钱\n<w>不是继续的理由</w>'},
  {from: 3230, to: 3326, text: '第三：有些游戏\n最好的出价，是<g>不出价</g>'},
  // —— 片尾 ——
  {from: 3334, to: 3480, text: '你有没有一件事\n明知该放手，却还在加价？'},
];

/* ------------------------------------------------------------
 * 3. 竞价进程：第 k 口出价 = 5k 元，奇数口是你，偶数口是他
 *    BID_AT[k] = 第 k 口出价出现的帧（k = 1..49）
 * ---------------------------------------------------------- */
export const STEP = 5;
export const FACE = 100;
export const FINAL_K = 49; // 你 245 元成交，他停在 240 元

const bidFrames = (): number[] => {
  const at: number[] = [0];
  // 便宜阶段：1~10 口（5 → 50），570~800 帧，人群举牌
  for (let k = 1; k <= 10; k++) at.push(578 + (k - 1) * 22);
  // 11~20 口（55 → 100）在陷阱段开头快速补齐
  for (let k = 11; k <= 20; k++) at.push(1024 + (k - 11) * 4);
  // 21 口：你加到 105；22 口：他加到 110
  at.push(1270);
  at.push(1392);
  // 23~49 口：理性的灾难，越加越快（1516 → 1626）
  for (let k = 23; k <= FINAL_K; k++) {
    const t = (k - 23) / (FINAL_K - 23);
    at.push(Math.round(1520 + 106 * Math.pow(t, 0.6)));
  }
  return at;
};
export const BID_AT = bidFrames();

/** 当前帧已经喊出的最高一口 */
export const bidIndexAt = (frame: number) => {
  let k = 0;
  for (let i = 1; i < BID_AT.length; i++) if (frame >= BID_AT[i]) k = i;
  return k;
};

/** 他放弃的帧、落槌成交的帧 */
export const QUIT_AT = 1652;
export const SOLD_AT = 1664;

/* ------------------------------------------------------------
 * 4. 重击：闪白 + 震屏
 * ---------------------------------------------------------- */
export type Impact = {f: number; flash: number; shake: number};
export const IMPACTS: Impact[] = [
  {f: 0, flash: 0.7, shake: 16},
  {f: 44, flash: 0.2, shake: 8},
  {f: 96, flash: 0.5, shake: 18},
  {f: 390, flash: 0.35, shake: 12},
  {f: 918, flash: 0.3, shake: 10},
  {f: 1270, flash: 0.35, shake: 14},
  {f: 1626, flash: 0.4, shake: 16},
  {f: SOLD_AT, flash: 0.6, shake: 20},
  {f: 2258, flash: 0.35, shake: 12},
  {f: 2584, flash: 0.3, shake: 10},
  {f: 2880, flash: 0.45, shake: 16},
  {f: 3232, flash: 0.3, shake: 8},
];

/* ------------------------------------------------------------
 * 5. 情绪色
 * ---------------------------------------------------------- */
export type MoodKey = {f: number; tint: [number, number, number]; energy: number};
export const MOODS: MoodKey[] = [
  {f: 0, tint: [1.0, 0.62, 0.24], energy: 0.9},
  {f: 150, tint: [0.95, 0.7, 0.36], energy: 0.55},
  {f: 560, tint: [0.4, 0.82, 0.62], energy: 0.6},
  {f: 900, tint: [0.95, 0.66, 0.3], energy: 0.6},
  {f: 1100, tint: [0.95, 0.38, 0.24], energy: 0.65},
  {f: 1520, tint: [1.0, 0.22, 0.16], energy: 1.0},
  {f: 1664, tint: [0.95, 0.3, 0.2], energy: 0.7},
  {f: 1920, tint: [0.4, 0.6, 0.9], energy: 0.5},
  {f: 2330, tint: [0.7, 0.24, 0.2], energy: 0.55},
  {f: 2700, tint: [0.9, 0.28, 0.2], energy: 0.65},
  {f: 2970, tint: [0.45, 0.8, 0.66], energy: 0.55},
  {f: 3230, tint: [1.0, 0.72, 0.32], energy: 0.8},
];

/* ------------------------------------------------------------
 * 6. 音效提示点
 * ---------------------------------------------------------- */
export type SfxName =
  | 'gavel'
  | 'coin'
  | 'tick'
  | 'heartbeat'
  | 'boom'
  | 'riser'
  | 'whoosh'
  | 'pop'
  | 'shimmer'
  | 'stamp'
  | 'buzz'
  | 'alarm'
  | 'shepard';

export type Sfx = {f: number; name: SfxName; vol?: number};

const bidTicks: Sfx[] = BID_AT.slice(1).map((f, i) => ({
  f,
  name: (i < 10 ? 'pop' : 'tick') as SfxName,
  vol: i < 10 ? 0.5 : i < 20 ? 0.25 : 0.45,
}));

export const SFX: Sfx[] = [
  // 钩子
  {f: 0, name: 'gavel', vol: 1},
  {f: 2, name: 'boom', vol: 0.7},
  {f: 30, name: 'riser', vol: 0.45},
  {f: 96, name: 'alarm', vol: 0.55},
  {f: 98, name: 'boom', vol: 0.8},
  // 规则
  {f: 152, name: 'whoosh', vol: 0.5},
  {f: 240, name: 'coin', vol: 0.6},
  {f: 390, name: 'stamp', vol: 0.9},
  {f: 486, name: 'heartbeat', vol: 0.7},
  // 便宜阶段 + 陷阱段的每一口出价
  ...bidTicks,
  {f: 730, name: 'whoosh', vol: 0.4},
  {f: 918, name: 'stamp', vol: 0.8},
  {f: 920, name: 'coin', vol: 0.7},
  // 陷阱
  {f: 1100, name: 'heartbeat', vol: 0.8},
  {f: 1182, name: 'heartbeat', vol: 0.8},
  {f: 1270, name: 'alarm', vol: 0.5},
  {f: 1336, name: 'heartbeat', vol: 0.8},
  {f: 1500, name: 'shepard', vol: 0.75},
  {f: 1626, name: 'boom', vol: 0.9},
  // 成交
  {f: QUIT_AT - 6, name: 'buzz', vol: 0.4},
  {f: SOLD_AT, name: 'gavel', vol: 1},
  {f: SOLD_AT + 2, name: 'boom', vol: 0.7},
  {f: 1822, name: 'coin', vol: 0.8},
  // 实验
  {f: 1922, name: 'whoosh', vol: 0.5},
  {f: 2090, name: 'whoosh', vol: 0.4},
  {f: 2176, name: 'riser', vol: 0.5},
  {f: 2258, name: 'boom', vol: 0.8},
  // 原因
  {f: 2332, name: 'whoosh', vol: 0.5},
  {f: 2584, name: 'stamp', vol: 0.8},
  // 现实
  {f: 2702, name: 'whoosh', vol: 0.5},
  {f: 2878, name: 'gavel', vol: 0.9},
  {f: 2880, name: 'boom', vol: 0.8},
  // 解法
  {f: 2972, name: 'whoosh', vol: 0.4},
  {f: 3050, name: 'pop', vol: 0.6},
  {f: 3124, name: 'pop', vol: 0.6},
  {f: 3232, name: 'shimmer', vol: 0.8},
  // 片尾
  {f: 3336, name: 'whoosh', vol: 0.4},
  {f: 3340, name: 'shimmer', vol: 0.6},
];

/** 配乐音量包络：落槌成交前一瞬全部静音 */
export const MUSIC_DUCK: {f: number; v: number}[] = [
  {f: 0, v: 0.5},
  {f: 1500, v: 0.55},
  {f: 1630, v: 0.6},
  {f: 1650, v: 0.05},
  {f: 1664, v: 0.05},
  {f: 1700, v: 0.5},
  {f: 3420, v: 0.55},
  {f: 3480, v: 0},
];
