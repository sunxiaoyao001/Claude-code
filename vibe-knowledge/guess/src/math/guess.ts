/**
 * 猜平均数的 2/3：层级推理、纳什均衡与实验数据
 * ------------------------------------------------------------
 *  第 0 层：随便选，平均约 50；第 k 层：以为别人都在第 k−1 层，选 50 × (2/3)^k。
 *  一直想下去 → 0：所有人都选 0 时，目标也是 0，谁单独换数字都只会更远，这是唯一的纳什均衡。
 *  实验数据来自公开文献；示意数据（直方图、层级分布）在画面上标注“示意”。
 *  scripts/verify-math.ts 会打印校验。
 */

export const P = 2 / 3;
export const MAX = 100;

export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** 目标数 = 平均数 × 2/3 */
export const target = (xs: number[]) => mean(xs) * P;

/** 最接近目标的数字 */
export const closest = (xs: number[], t: number) => xs.reduce((best, x) => (Math.abs(x - t) < Math.abs(best - t) ? x : best), xs[0]);

/** 第 k 层推理会选的数 */
export const levelValue = (k: number) => 50 * Math.pow(P, k);

/** 规则举例：五个人 */
export const EXAMPLE = [10, 30, 50, 70, 90];

/** 所有人都选 0 时，任何人单独改选 x > 0 都不会更接近目标（纳什均衡检验） */
export const zeroIsEquilibrium = (n = 100) => {
  for (let x = 1; x <= MAX; x++) {
    const t = ((x + 0 * (n - 1)) / n) * P;
    if (Math.abs(x - t) <= Math.abs(0 - t)) return false;
  }
  return true;
};

/* ---------------- 文献数据 ---------------- */

/** Nagel (1995) AER：p = 2/3 的第一轮，67 人，平均 36.7，中位数 33，没有人选 0 */
export const NAGEL_1995 = {n: 67, mean: 36.7, median: 33};

/** 1997 年《金融时报》读者大赛（Thaler）：平均 18.91，目标 12.6，赢家选 13 */
export const FT_1997 = {mean: 18.91, winner: 13};

/** 2005 年丹麦《政治报》：19,196 人参加，正确答案（平均数的 2/3）21.6 */
export const POLITIKEN_2005 = {n: 19196, answer: 21.6};

/** Camerer, Ho & Chong (2004)：平均思考 1.5 层，各层人数服从泊松分布 */
export const TAU = 1.5;
const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));
export const poisson = (k: number, tau = TAU) => (Math.exp(-tau) * Math.pow(tau, k)) / fact(k);

/* ---------------- 示意数据（画面标注“示意”） ---------------- */

/** 各层人数（每 100 人），按 τ = 1.5 的泊松分布四舍五入：0～4 层 + 5 层以上 */
export const LEVEL_SHARE = [22, 33, 25, 13, 5, 2];

/** 第一轮选择的示意样本：67 个数，平均 36.7、中位数 33、没有 0，扎堆在 33 和 22 */
export const NAGEL_SAMPLE = [
  3, 5, 6, 8, 10, 11, 12, 13, 15, 16, 18, 19, 20, 21, 22, 22, 22, 22, 22, 23, 24, 25, 26, 27, 27, 28, 29, 30, 30, 31, 32, 33, 33, 33,
  33, 33, 33, 33, 33, 34, 34, 35, 36, 37, 38, 40, 40, 42, 44, 45, 48, 50, 50, 50, 52, 55, 58, 60, 62, 66, 70, 75, 80, 85, 90, 99, 100,
];
