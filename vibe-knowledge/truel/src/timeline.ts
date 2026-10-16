/**
 * ============================================================
 *  时间轴：全片唯一的“导演台本”
 * ============================================================
 *  所有场景起止、字幕、开枪、瞄准、镜头、音效都写在这里，
 *  画面组件与音效生成脚本（scripts/gen-audio.ts）共同读取，
 *  保证“字幕 → 画面 → 声音”三者逐帧同步。
 *
 *  帧率 30fps，1080×1920 竖屏，总长 114 秒。
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export type PlayerId = 'jia' | 'yi' | 'bing';

/* ------------------------------------------------------------
 * 1. 场景划分（绝对帧）
 * ---------------------------------------------------------- */
export const SCENES = {
  hook: {from: 0, dur: 150}, //      0:00  黄金 3 秒钩子
  cast: {from: 150, dur: 420}, //    0:05  登场：三个枪手 + 规则
  question: {from: 570, dur: 180}, // 0:19  抛问题：你是丙，打谁？
  intuition: {from: 750, dur: 630}, //0:25  直觉陷阱：打谁都是错
  twist: {from: 1380, dur: 270}, //  0:46  反转：朝天开枪
  logic: {from: 1650, dur: 480}, //  0:55  拆解：威胁度决定生死
  proof: {from: 2130, dur: 660}, //  1:11  证明：一万场蒙特卡洛模拟
  caveat: {from: 2790, dur: 240}, // 1:33  边界：只在三人局成立
  outro: {from: 3030, dur: 390}, //  1:41  升华 + 评论区互动
} as const;

export type SceneId = keyof typeof SCENES;
export const TOTAL_FRAMES = SCENES.outro.from + SCENES.outro.dur; // 3420

/* ------------------------------------------------------------
 * 2. 字幕轨（旁白字幕，全片信息主载体）
 *    语法：<g>金</g> <r>红</r> <b>蓝</b> <w>白色加粗</w>，\n 换行
 * ---------------------------------------------------------- */
export type Cue = {from: number; to: number; text: string};

export const SUBTITLES: Cue[] = [
  // —— 登场 ——
  {from: 165, to: 245, text: '甲：<r>神枪手</r>，十枪中八枪'},
  {from: 250, to: 330, text: '乙：<b>老手</b>，十枪中六枪'},
  {from: 335, to: 415, text: '丙：<g>菜鸟</g>，十枪只中四枪'},
  {from: 420, to: 495, text: '规则：三人轮流开枪\n最弱的<g>丙</g>先开'},
  {from: 497, to: 566, text: '打谁自己选\n<w>活到最后</w>的人赢'},
  // —— 抛问题 ——
  {from: 582, to: 660, text: '现在，假设你就是<g>丙</g>'},
  {from: 662, to: 746, text: '先别往下滑，心里选一个'},
  // —— 直觉陷阱 ——
  {from: 758, to: 838, text: '大多数人的直觉：\n先干掉最强的<r>甲</r>'},
  {from: 842, to: 912, text: '砰——打中了！\n但问题来了'},
  {from: 915, to: 995, text: '下一枪轮到<b>乙</b>\n场上只剩一个目标：<g>你</g>'},
  {from: 998, to: 1048, text: '你活下来的概率，只剩 <r>21%</r>'},
  {from: 1078, to: 1140, text: '那换个目标，先打<b>乙</b>呢？'},
  {from: 1143, to: 1210, text: '下一枪轮到<r>甲</r>\n他十枪中八枪'},
  {from: 1212, to: 1268, text: '你的存活率：<r>9%</r>'},
  {from: 1278, to: 1376, text: '打中谁，都是在帮剩下那个人<r>清场</r>'},
  // —— 反转 ——
  {from: 1386, to: 1450, text: '正确答案\n是那个没人选的选项——'},
  {from: 1462, to: 1540, text: '朝天开一枪，<g>故意打空</g>'},
  {from: 1545, to: 1600, text: '这不是认怂'},
  {from: 1602, to: 1648, text: '而是全场<g>最狠</g>的一招'},
  // —— 拆解 ——
  {from: 1660, to: 1740, text: '站在<b>乙</b>的角度：\n<r>甲</r>是最大威胁，必须先除掉'},
  {from: 1744, to: 1824, text: '站在<r>甲</r>的角度：\n<b>乙</b>才是心腹大患'},
  {from: 1828, to: 1900, text: '至于<g>丙</g>？\n最弱的那个，谁也顾不上'},
  {from: 1904, to: 1975, text: '于是两个强者\n只能<r>先互相开枪</r>'},
  {from: 1980, to: 2045, text: '等他们分出胜负\n下一枪——<g>轮到你先开</g>'},
  // —— 证明 ——
  {from: 2140, to: 2215, text: '空口无凭\n我们模拟了 <w>10000</w> 场决斗'},
  {from: 2220, to: 2300, text: '每一个点，都是一场完整的生死局'},
  {from: 2305, to: 2395, text: '<g>金色</g> 丙赢　<b>蓝色</b> 乙赢　<r>红色</r> 甲赢'},
  {from: 2400, to: 2476, text: '结果出来了——'},
  {from: 2480, to: 2570, text: '最弱的丙，赢下了<g>一半</g>的对局'},
  {from: 2575, to: 2650, text: '命中率倒数第一\n存活率却是第一'},
  {from: 2652, to: 2715, text: '枪法最好的甲\n反而<r>死得最早</r>'},
  {from: 2718, to: 2788, text: '丙的三种开局里\n<g>朝天开枪</g>胜率最高'},
  // —— 边界 ——
  {from: 2800, to: 2870, text: '但注意：这招<w>只在三人局</w>有效'},
  {from: 2875, to: 2950, text: '一旦只剩两个人\n示弱就没用了'},
  {from: 2955, to: 3022, text: '朝天开枪，换来的是\n<g>先开第一枪</g>的机会'},
  // —— 升华 ——
  {from: 3040, to: 3120, text: '三国鼎立、商战、职场\n处处都是这场决斗'},
  {from: 3125, to: 3205, text: '最强的那个\n往往是<r>所有人的靶子</r>'},
  {from: 3210, to: 3288, text: '真正的高手\n知道<g>什么时候不开枪</g>'},
  {from: 3300, to: 3420, text: '如果你是<r>甲</r>，你会怎么破局？'},
];

/* ------------------------------------------------------------
 * 3. 决斗编排：开枪 / 死亡 / 倒带复活 / 瞄准 / 轮次
 * ---------------------------------------------------------- */
export type Shot = {
  t: number; // 扣扳机的帧
  from: PlayerId;
  to: PlayerId | 'sky';
  hit: boolean;
  big?: boolean; // 是否为重点镜头（更强闪白和震屏）
};

/** 子弹飞行时长（帧） */
export const BULLET_FRAMES = 6;

export const SHOTS: Shot[] = [
  {t: 850, from: 'bing', to: 'jia', hit: true, big: true}, //  直觉A：打甲
  {t: 1110, from: 'bing', to: 'yi', hit: true, big: true}, //  直觉B：打乙
  {t: 1455, from: 'bing', to: 'sky', hit: false, big: true}, // 反转：朝天开枪
  {t: 1930, from: 'yi', to: 'jia', hit: false}, //               强者互射：乙打空
  {t: 1960, from: 'jia', to: 'yi', hit: true}, //                强者互射：甲击倒乙
  {t: 3018, from: 'bing', to: 'jia', hit: false, big: true}, // 1v1 先手开枪（不揭晓结果）
];

/** 倒带复活：该帧起所有人恢复存活 */
export const REWINDS: number[] = [1064, 1384];

/** 瞄准镜锁定区间 */
export type Aim = {from: PlayerId; to: PlayerId; start: number; end: number};
export const AIMS: Aim[] = [
  {from: 'bing', to: 'jia', start: 800, end: 852},
  {from: 'yi', to: 'bing', start: 935, end: 1048},
  {from: 'bing', to: 'yi', start: 1085, end: 1112},
  {from: 'jia', to: 'bing', start: 1150, end: 1268},
  {from: 'yi', to: 'jia', start: 1680, end: 1745},
  {from: 'jia', to: 'yi', start: 1752, end: 1824},
  {from: 'yi', to: 'jia', start: 1915, end: 1932},
  {from: 'jia', to: 'yi', start: 1938, end: 1962},
  {from: 'jia', to: 'bing', start: 2870, end: 3030},
  {from: 'bing', to: 'jia', start: 2885, end: 3020},
];

/** 当前持枪者（轮次指示器） */
export type Turn = {who: PlayerId; start: number; end: number};
export const TURNS: Turn[] = [
  {who: 'bing', start: 420, end: 470},
  {who: 'yi', start: 470, end: 520},
  {who: 'jia', start: 520, end: 568},
  {who: 'bing', start: 590, end: 860},
  {who: 'yi', start: 930, end: 1048},
  {who: 'bing', start: 1078, end: 1115},
  {who: 'jia', start: 1145, end: 1268},
  {who: 'bing', start: 1390, end: 1470},
  {who: 'yi', start: 1915, end: 1945},
  {who: 'jia', start: 1945, end: 1975},
  {who: 'bing', start: 1985, end: 2128},
  {who: 'bing', start: 2860, end: 3030},
];

/* ------------------------------------------------------------
 * 4. 镜头关键帧（舞台坐标系的焦点 + 缩放 + 旋转）
 * ---------------------------------------------------------- */
export type CamKey = {f: number; x: number; y: number; s: number; r: number};
export const CAMERA: CamKey[] = [
  {f: 0, x: 540, y: 700, s: 1.32, r: -4},
  {f: 140, x: 540, y: 820, s: 1.0, r: 0},
  {f: 590, x: 540, y: 820, s: 1.0, r: 0},
  {f: 650, x: 820, y: 760, s: 1.55, r: 2},
  {f: 740, x: 820, y: 760, s: 1.62, r: 2},
  {f: 776, x: 540, y: 820, s: 1.0, r: 0},
  {f: 920, x: 540, y: 820, s: 1.0, r: 0},
  {f: 960, x: 700, y: 800, s: 1.18, r: 1.5},
  {f: 1046, x: 700, y: 800, s: 1.22, r: 1.5},
  {f: 1070, x: 540, y: 820, s: 1.0, r: 0},
  {f: 1140, x: 540, y: 820, s: 1.0, r: 0},
  {f: 1180, x: 680, y: 770, s: 1.18, r: -1.5},
  {f: 1266, x: 680, y: 770, s: 1.22, r: -1.5},
  {f: 1300, x: 540, y: 820, s: 1.0, r: 0},
  {f: 1440, x: 600, y: 800, s: 1.08, r: 0},
  {f: 1478, x: 690, y: 630, s: 1.08, r: 0},
  {f: 1560, x: 640, y: 680, s: 1.04, r: 0},
  {f: 1640, x: 540, y: 820, s: 1.0, r: 0},
  {f: 1690, x: 430, y: 760, s: 1.12, r: -1},
  {f: 1820, x: 430, y: 760, s: 1.12, r: -1},
  {f: 1856, x: 760, y: 780, s: 1.2, r: 1.5},
  {f: 1898, x: 540, y: 820, s: 1.0, r: 0},
  {f: 1978, x: 540, y: 820, s: 1.0, r: 0},
  {f: 2010, x: 740, y: 800, s: 1.16, r: 1},
  {f: 2046, x: 740, y: 800, s: 1.18, r: 1},
  {f: 2070, x: 540, y: 840, s: 0.96, r: 0},
  {f: 2130, x: 540, y: 840, s: 0.94, r: 0},
  {f: 2790, x: 540, y: 820, s: 1.0, r: 0},
  {f: 2860, x: 660, y: 760, s: 1.08, r: 0},
  {f: 3015, x: 680, y: 740, s: 1.28, r: 0},
  {f: 3030, x: 680, y: 740, s: 1.3, r: 0},
];

/* ------------------------------------------------------------
 * 5. 情绪色（驱动 GLSL 背景的色调）
 * ---------------------------------------------------------- */
export type MoodKey = {f: number; tint: [number, number, number]; energy: number};
export const MOODS: MoodKey[] = [
  {f: 0, tint: [0.9, 0.42, 0.18], energy: 0.9},
  {f: 150, tint: [0.85, 0.55, 0.3], energy: 0.55},
  {f: 570, tint: [0.75, 0.5, 0.32], energy: 0.45},
  {f: 760, tint: [0.95, 0.28, 0.2], energy: 0.6},
  {f: 1300, tint: [0.95, 0.25, 0.18], energy: 0.7},
  {f: 1380, tint: [0.3, 0.25, 0.22], energy: 0.15},
  {f: 1455, tint: [1.0, 0.72, 0.28], energy: 1.0},
  {f: 1650, tint: [0.85, 0.55, 0.3], energy: 0.55},
  {f: 2130, tint: [0.35, 0.6, 0.85], energy: 0.5},
  {f: 2780, tint: [0.4, 0.62, 0.85], energy: 0.5},
  {f: 2800, tint: [0.92, 0.45, 0.22], energy: 0.6},
  {f: 3030, tint: [1.0, 0.7, 0.32], energy: 0.75},
];

/* ------------------------------------------------------------
 * 6. 全局闪白 / 震屏（开枪、重击）
 * ---------------------------------------------------------- */
export type Impact = {f: number; flash: number; shake: number};
export const IMPACTS: Impact[] = [
  {f: 0, flash: 1, shake: 26},
  {f: 44, flash: 0.25, shake: 10},
  {f: 92, flash: 0.45, shake: 16},
  ...SHOTS.map((s) => ({f: s.t, flash: s.big ? 0.75 : 0.4, shake: s.big ? 22 : 12})),
  {f: 1272, flash: 0.3, shake: 14},
  {f: 2050, flash: 0.25, shake: 8},
  {f: 2480, flash: 0.3, shake: 10},
  {f: 3292, flash: 0.35, shake: 8},
];

/* ------------------------------------------------------------
 * 7. 音效提示点（scripts/gen-audio.ts 生成素材，Soundtrack 组件摆放）
 * ---------------------------------------------------------- */
export type SfxName =
  | 'gunshot'
  | 'gunshotSky'
  | 'boom'
  | 'riser'
  | 'whoosh'
  | 'click'
  | 'lock'
  | 'shatter'
  | 'heartbeat'
  | 'tick'
  | 'rewind'
  | 'shimmer'
  | 'blips'
  | 'pop';

export type Sfx = {f: number; name: SfxName; vol?: number};

export const SFX: Sfx[] = [
  // 钩子
  {f: 0, name: 'gunshot', vol: 1},
  {f: 0, name: 'boom', vol: 0.8},
  {f: 40, name: 'whoosh', vol: 0.5},
  {f: 52, name: 'riser', vol: 0.45},
  {f: 92, name: 'boom', vol: 0.9},
  // 登场
  {f: 150, name: 'whoosh', vol: 0.45},
  {f: 168, name: 'click', vol: 0.8},
  {f: 253, name: 'click', vol: 0.8},
  {f: 338, name: 'click', vol: 0.8},
  {f: 420, name: 'tick', vol: 0.6},
  {f: 470, name: 'tick', vol: 0.6},
  {f: 520, name: 'tick', vol: 0.6},
  // 抛问题
  {f: 590, name: 'heartbeat', vol: 0.9},
  {f: 620, name: 'heartbeat', vol: 0.9},
  {f: 650, name: 'heartbeat', vol: 1},
  {f: 678, name: 'tick', vol: 0.7},
  {f: 698, name: 'tick', vol: 0.7},
  {f: 718, name: 'tick', vol: 0.7},
  {f: 738, name: 'riser', vol: 0.3},
  // 直觉陷阱
  {f: 800, name: 'lock', vol: 0.7},
  {f: 850, name: 'gunshot', vol: 1},
  {f: 856, name: 'shatter', vol: 0.8},
  {f: 935, name: 'lock', vol: 0.7},
  {f: 998, name: 'boom', vol: 0.7},
  {f: 1050, name: 'rewind', vol: 0.8},
  {f: 1085, name: 'lock', vol: 0.7},
  {f: 1110, name: 'gunshot', vol: 1},
  {f: 1116, name: 'shatter', vol: 0.8},
  {f: 1150, name: 'lock', vol: 0.7},
  {f: 1212, name: 'boom', vol: 0.7},
  {f: 1272, name: 'boom', vol: 1},
  // 反转
  {f: 1370, name: 'rewind', vol: 0.6},
  {f: 1410, name: 'riser', vol: 0.6},
  {f: 1455, name: 'gunshotSky', vol: 1},
  {f: 1457, name: 'boom', vol: 1},
  {f: 1462, name: 'shimmer', vol: 0.7},
  {f: 1545, name: 'whoosh', vol: 0.5},
  // 拆解
  {f: 1660, name: 'whoosh', vol: 0.4},
  {f: 1680, name: 'lock', vol: 0.5},
  {f: 1752, name: 'lock', vol: 0.5},
  {f: 1828, name: 'whoosh', vol: 0.4},
  {f: 1930, name: 'gunshot', vol: 0.75},
  {f: 1960, name: 'gunshot', vol: 0.85},
  {f: 1966, name: 'shatter', vol: 0.7},
  {f: 1985, name: 'shimmer', vol: 0.6},
  {f: 2050, name: 'boom', vol: 0.8},
  // 证明
  {f: 2130, name: 'whoosh', vol: 0.6},
  {f: 2222, name: 'blips', vol: 0.55},
  {f: 2400, name: 'whoosh', vol: 0.5},
  {f: 2480, name: 'boom', vol: 0.9},
  {f: 2575, name: 'whoosh', vol: 0.4},
  {f: 2726, name: 'pop', vol: 0.6},
  {f: 2738, name: 'pop', vol: 0.6},
  {f: 2750, name: 'pop', vol: 0.8},
  // 边界
  {f: 2800, name: 'heartbeat', vol: 0.8},
  {f: 2830, name: 'heartbeat', vol: 0.8},
  {f: 2870, name: 'lock', vol: 0.6},
  {f: 2885, name: 'lock', vol: 0.6},
  {f: 2960, name: 'riser', vol: 0.5},
  {f: 3018, name: 'gunshot', vol: 1},
  // 升华
  {f: 3030, name: 'boom', vol: 0.8},
  {f: 3292, name: 'shimmer', vol: 0.7},
  {f: 3292, name: 'boom', vol: 0.6},
];

/** 配乐（环境声床）音量包络：反转前全部静音，制造“屏息”感 */
export const MUSIC_DUCK: {f: number; v: number}[] = [
  {f: 0, v: 0.55},
  {f: 150, v: 0.5},
  {f: 1360, v: 0.5},
  {f: 1385, v: 0.0},
  {f: 1452, v: 0.0},
  {f: 1458, v: 0.75},
  {f: 1650, v: 0.5},
  {f: 3380, v: 0.55},
  {f: 3420, v: 0.0},
];
