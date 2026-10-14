/**
 * 重复囚徒困境（Iterated Prisoner's Dilemma）
 * ------------------------------------------------------------
 *  - 收益矩阵：都合作 3/3，都背叛 1/1，单方背叛 5/0（阿克塞尔罗德大赛原始设定）
 *  - 几种经典策略 + 对局模拟
 *  - 演化模拟：得分越高，下一代占比越大（离散复制者动态）
 *  - 第一届大赛的原始成绩（Axelrod, 1980,
 *    "Effective Choice in the Prisoner's Dilemma", J. Conflict Resolution 24(1)）
 *
 *  视频里所有数字都由本文件产生，scripts/verify-math.ts 会打印校验。
 */

export type Move = 'C' | 'D';

export const PAYOFF = {R: 3, T: 5, S: 0, P: 1} as const;

/** 返回 [我的得分, 对手得分] */
export const payoff = (me: Move, op: Move): [number, number] => {
  if (me === 'C' && op === 'C') return [PAYOFF.R, PAYOFF.R];
  if (me === 'D' && op === 'D') return [PAYOFF.P, PAYOFF.P];
  if (me === 'D' && op === 'C') return [PAYOFF.T, PAYOFF.S];
  return [PAYOFF.S, PAYOFF.T];
};

/* ---------------- 确定性随机 ---------------- */
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ---------------- 策略 ---------------- */
export type StrategyId = 'tft' | 'allc' | 'alld' | 'joss' | 'random';

type Ctx = {mine: Move[]; theirs: Move[]; rand: () => number};
type Strategy = (c: Ctx) => Move;

export const STRATEGIES: Record<StrategyId, Strategy> = {
  // 以牙还牙：先合作，之后照抄对手上一步
  tft: ({theirs}) => (theirs.length === 0 ? 'C' : theirs[theirs.length - 1]),
  // 老好人：永远合作
  allc: () => 'C',
  // 背叛者：永远背叛
  alld: () => 'D',
  // 狡猾者（JOSS，第一届真实参赛程序）：以牙还牙，但有 10% 概率偷偷背叛
  joss: ({theirs, rand}) => {
    const base: Move = theirs.length === 0 ? 'C' : theirs[theirs.length - 1];
    return base === 'C' && rand() < 0.1 ? 'D' : base;
  },
  // 随机：五五开
  random: ({rand}) => (rand() < 0.5 ? 'C' : 'D'),
};

export type MatchResult = {a: Move[]; b: Move[]; scoreA: number; scoreB: number};

/** 两个策略对战 n 回合 */
export const playMatch = (sa: StrategyId, sb: StrategyId, n = 200, seed = 1): MatchResult => {
  const rand = mulberry32(seed);
  const a: Move[] = [];
  const b: Move[] = [];
  let scoreA = 0;
  let scoreB = 0;
  for (let i = 0; i < n; i++) {
    const ma = STRATEGIES[sa]({mine: a, theirs: b, rand});
    const mb = STRATEGIES[sb]({mine: b, theirs: a, rand});
    const [pa, pb] = payoff(ma, mb);
    a.push(ma);
    b.push(mb);
    scoreA += pa;
    scoreB += pb;
  }
  return {a, b, scoreA, scoreB};
};

/** 直接给定双方出招序列计分（用于画面里手工编排的演示） */
export const scoreMoves = (a: Move[], b: Move[]) =>
  a.reduce(
    (acc, ma, i) => {
      const [pa, pb] = payoff(ma, b[i]);
      return [acc[0] + pa, acc[1] + pb];
    },
    [0, 0],
  );

/** 以牙还牙对任意序列的回应（含“手滑”：在 slip 回合把 C 误发成 D） */
export const tftAgainst = (theirs: Move[], slip = -1): Move[] =>
  theirs.map((_, i) => {
    const m: Move = i === 0 ? 'C' : theirs[i - 1];
    return i === slip ? 'D' : m;
  });

/* ---------------- 演化（复制者动态） ---------------- */
export const EVO_IDS: StrategyId[] = ['tft', 'allc', 'alld', 'joss', 'random'];
export const EVO_INIT: Record<StrategyId, number> = {tft: 0.12, allc: 0.3, alld: 0.18, joss: 0.2, random: 0.2};
export const EVO_GENERATIONS = 1000;

/** 每对策略 200 回合的平均得分（随机策略取多场平均） */
export const payoffTable = () => {
  const table: Record<string, number> = {};
  for (const i of EVO_IDS) {
    for (const j of EVO_IDS) {
      let s = 0;
      const reps = 20;
      for (let r = 0; r < reps; r++) s += playMatch(i, j, 200, 1000 + r * 7 + i.length * 31 + j.length).scoreA;
      table[`${i}-${j}`] = s / reps;
    }
  }
  return table;
};

let evoCache: Record<StrategyId, number>[] | null = null;
/** 返回每一代的占比（长度 EVO_GENERATIONS + 1） */
export const evolve = (): Record<StrategyId, number>[] => {
  if (evoCache) return evoCache;
  const table = payoffTable();
  let share = {...EVO_INIT};
  const out = [share];
  for (let g = 0; g < EVO_GENERATIONS; g++) {
    const fit: Record<string, number> = {};
    let mean = 0;
    for (const i of EVO_IDS) {
      fit[i] = EVO_IDS.reduce((acc, j) => acc + share[j] * table[`${i}-${j}`], 0);
      mean += share[i] * fit[i];
    }
    // 选择强度：一代只往前走一小步，曲线平滑
    const k = 0.012;
    const next = {} as Record<StrategyId, number>;
    let total = 0;
    for (const i of EVO_IDS) {
      next[i] = share[i] * (1 + (k * (fit[i] - mean)) / 100);
      total += next[i];
    }
    for (const i of EVO_IDS) next[i] /= total;
    share = next;
    out.push(share);
  }
  evoCache = out;
  return out;
};

/* ---------------- 第一届大赛原始成绩（每场 200 回合的平均得分） ---------------- */
export type Entry = {rank: number; name: string; zh?: string; score: number; nice: boolean; lines?: number};

export const FIRST_TOURNAMENT: Entry[] = [
  {rank: 1, name: 'Rapoport', zh: '以牙还牙', score: 504.5, nice: true, lines: 4},
  {rank: 2, name: 'Tideman & Chieruzzi', score: 500.4, nice: true},
  {rank: 3, name: 'Nydegger', score: 485.5, nice: true},
  {rank: 4, name: 'Grofman', score: 481.9, nice: true},
  {rank: 5, name: 'Shubik', score: 480.7, nice: true},
  {rank: 6, name: 'Stein & Rapoport', score: 477.8, nice: true},
  {rank: 7, name: 'Friedman', score: 473.4, nice: true},
  {rank: 8, name: 'Davis', score: 471.8, nice: true},
  {rank: 9, name: 'Graaskamp', score: 400.7, nice: false},
  {rank: 10, name: 'Downing', score: 390.6, nice: false},
  {rank: 11, name: 'Feld', score: 327.6, nice: false},
  {rank: 12, name: 'Joss', score: 304.4, nice: false},
  {rank: 13, name: 'Tullock', score: 300.5, nice: false},
  {rank: 14, name: '(匿名)', score: 282.2, nice: false},
  {rank: 15, name: 'RANDOM', zh: '随机', score: 276.3, nice: false},
];
