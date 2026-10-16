/**
 * 三人决斗（Truel）的精确概率 + 可复现的蒙特卡洛模拟
 * ------------------------------------------------------------
 * 规则（视频中的版本）：
 *   甲 命中率 80%，乙 60%，丙 40%。
 *   开枪顺序：丙 → 乙 → 甲 → 丙 …（最弱的先开），死者跳过。
 *   每次一枪，目标自选，直到只剩一人。
 *
 * 理性策略：
 *   乙、甲 互为最大威胁，三人都在时一定先打对方；
 *   丙 的三种开局：打甲 / 打乙 / 朝天开枪。
 *
 * 视频里出现的所有数字都由本文件算出，scripts/verify-math.ts 会打印校验。
 */

import type {PlayerId} from '../timeline';

export const ACC: Record<PlayerId, number> = {jia: 0.8, yi: 0.6, bing: 0.4};

/** 两人轮流对射，first 先开枪，返回 first 获胜的概率 */
export const duelFirstWins = (pFirst: number, pSecond: number): number =>
  pFirst / (1 - (1 - pFirst) * (1 - pSecond));

const {jia: A, yi: B, bing: C} = ACC;

/** 丙打中甲后：乙先开枪的 1v1，丙存活率 */
export const bingAfterKillingJia = 1 - duelFirstWins(B, C); // ≈ 21.05%
/** 丙打中乙后：甲先开枪的 1v1，丙存活率 */
export const bingAfterKillingYi = 1 - duelFirstWins(A, C); // ≈ 9.09%

/**
 * 从“乙开枪”这一刻起（三人都在，乙打甲、甲打乙），
 * 到再次轮到丙之前，丙最终获胜的概率中“已结算”的部分，
 * 以及“又回到丙的回合”的概率。
 */
const fromYiTurn = () => {
  // 乙打中甲 → 丙先手对乙
  const yiHits = B * duelFirstWins(C, B);
  // 乙打空，甲打中乙 → 丙先手对甲
  const jiaHits = (1 - B) * A * duelFirstWins(C, A);
  // 两人都打空 → 回到丙
  const loop = (1 - B) * (1 - A);
  return {settled: yiHits + jiaHits, loop};
};

/** 丙每回合都朝天开枪时的最终存活率 */
export const bingAirShot = (() => {
  const {settled, loop} = fromYiTurn();
  return settled / (1 - loop); // ≈ 50.14%
})();

/** 丙每回合都瞄准甲时的最终存活率 */
export const bingShootJia = (() => {
  const {settled, loop} = fromYiTurn();
  // V = C·(打中甲后的存活率) + (1-C)·(settled + loop·V)
  return (C * bingAfterKillingJia + (1 - C) * settled) / (1 - (1 - C) * loop); // ≈ 37.92%
})();

/** 丙每回合都瞄准乙时的最终存活率 */
export const bingShootYi = (() => {
  const {settled, loop} = fromYiTurn();
  return (C * bingAfterKillingYi + (1 - C) * settled) / (1 - (1 - C) * loop); // ≈ 32.89%
})();

/** 朝天开枪策略下，三人各自的最终存活率（理论值） */
export const airShotOutcome = (() => {
  const loop = (1 - B) * (1 - A);
  const yi = (B * (1 - duelFirstWins(C, B))) / (1 - loop);
  const jia = ((1 - B) * A * (1 - duelFirstWins(C, A))) / (1 - loop);
  return {bing: bingAirShot, yi, jia}; // ≈ 50.1% / 30.9% / 19.0%
})();

/* ------------------------------------------------------------
 * 蒙特卡洛：固定种子，保证每次渲染画面完全一致
 * ---------------------------------------------------------- */
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

const ORDER: PlayerId[] = ['bing', 'yi', 'jia'];

/** 模拟一场“丙朝天开枪”的决斗，返回赢家 */
export const simulateOne = (rand: () => number): PlayerId => {
  const alive: Record<PlayerId, boolean> = {jia: true, yi: true, bing: true};
  let turn = 0;
  // 理论上可能无限循环，实际几轮内必然结束；加上上限防御
  for (let guard = 0; guard < 10000; guard++) {
    const shooter = ORDER[turn % 3];
    turn++;
    if (!alive[shooter]) continue;
    const others = ORDER.filter((p) => p !== shooter && alive[p]);
    if (others.length === 0) return shooter;
    let target: PlayerId | null;
    if (others.length === 2) {
      // 三人都在：丙朝天开枪；乙打甲；甲打乙
      target = shooter === 'bing' ? null : shooter === 'yi' ? 'jia' : 'yi';
    } else {
      target = others[0];
    }
    if (target && rand() < ACC[shooter]) alive[target] = false;
    const left = ORDER.filter((p) => alive[p]);
    if (left.length === 1) return left[0];
  }
  return 'bing';
};

export const SIM_N = 10000;
export const SIM_SEED = 20261052;

export type SimResult = {winners: PlayerId[]; counts: Record<PlayerId, number>};

let cached: SimResult | null = null;
export const runSimulation = (n = SIM_N, seed = SIM_SEED): SimResult => {
  if (cached && n === SIM_N && seed === SIM_SEED) return cached;
  const rand = mulberry32(seed);
  const winners: PlayerId[] = [];
  const counts: Record<PlayerId, number> = {jia: 0, yi: 0, bing: 0};
  for (let i = 0; i < n; i++) {
    const w = simulateOne(rand);
    winners.push(w);
    counts[w]++;
  }
  const res = {winners, counts};
  if (n === SIM_N && seed === SIM_SEED) cached = res;
  return res;
};

export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
