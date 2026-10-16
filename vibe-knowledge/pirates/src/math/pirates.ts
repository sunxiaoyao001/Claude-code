/**
 * 海盗分金：逆向归纳
 * ------------------------------------------------------------
 *  规则（Ian Stewart, Scientific American 1999 的版本）：
 *   - 资历最高的海盗提出分配方案，所有人（含提案人）投票；
 *   - 赞成票不少于一半就通过，否则提案人被扔下海，由下一位接着提；
 *   - 海盗的偏好：先保命，再要钱；钱一样多时，宁可把人扔下海。
 *  逆向归纳：每一票的价码 = 那个人在下一轮能拿到的金币 + 1，
 *  提案人只买最便宜的那几票，凑够一半即可。
 *  scripts/verify-math.ts 会打印每一轮的分配。
 */

export const COINS = 100;
export const PIRATES = 5;

/** 需要的赞成票（含自己）：不少于一半 */
export const needed = (n: number) => Math.ceil(n / 2);

/** 某个人数 n 下的分配：数组下标 0 = 当前提案人，依次往后 */
export const plan = (n: number, coins = COINS): number[] => {
  if (n === 1) return [coins];
  const next = plan(n - 1, coins); // 如果提案人死了，剩下的人会怎么分
  // 每个人的价码：比下一轮多 1 枚（钱一样多时他会选择把提案人扔下海）
  const prices = next.map((v, i) => ({i: i + 1, price: v + 1}));
  const bought = [...prices].sort((a, b) => a.price - b.price || a.i - b.i).slice(0, needed(n) - 1);
  const out = new Array(n).fill(0);
  for (const b of bought) out[b.i] = b.price;
  out[0] = coins - bought.reduce((a, b) => a + b.price, 0);
  return out;
};

/** 从 1 人到 5 人的全部方案；rows[k] 是 k+1 个人时的分配，对应海盗编号 (PIRATES-k)…PIRATES */
export const ROWS = Array.from({length: PIRATES}, (_, k) => plan(k + 1));

/** 5 人方案里，每个人（1～5 号）各拿多少 */
export const FINAL = plan(PIRATES); // [98, 0, 1, 0, 1]

/** 每一票的价码（1 号视角）：2～5 号在 4 人方案里能拿的 + 1 */
export const PRICES = plan(PIRATES - 1).map((v) => v + 1); // [100, 1, 2, 1]
