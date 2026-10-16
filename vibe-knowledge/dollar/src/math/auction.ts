/**
 * 美元拍卖（Shubik, 1971）的数学
 * ------------------------------------------------------------
 *  拍品面值 FACE，起价与加价幅度 STEP；出价最高者付钱拿走拍品，第二名也要付出自己的报价。
 *  视频里的演示：第 k 口出价 = 5k 元，奇数口是“你”，偶数口是“他”。
 *  视频里所有数字都由本文件产生，scripts/verify-math.ts 会打印校验。
 */
import {FACE, FINAL_K, STEP} from '../timeline';

export type Who = 'you' | 'him';

export const bidOf = (k: number) => k * STEP;
export const bidderOf = (k: number): Who => (k % 2 === 1 ? 'you' : 'him');

/** 截至第 k 口时，两人各自的最高出价 */
export const standing = (k: number) => {
  const last = (who: Who) => {
    for (let i = k; i >= 1; i--) if (bidderOf(i) === who) return bidOf(i);
    return 0;
  };
  const you = last('you');
  const him = last('him');
  return {you, him, revenue: you + him, top: bidOf(k)};
};

/**
 * 落后的一方此刻的两个选择：
 *  放弃 → 亏掉自己已经喊出的价；
 *  再加一口并且赢下 → 净收益 = 面值 −（对方出价 + 加价幅度）
 */
export const decision = (mine: number, theirs: number) => ({
  quit: -mine,
  raiseAndWin: FACE - (theirs + STEP),
});

/** 加价比放弃更划算的条件：对方领先的差价 < 面值 − 加价幅度（每一步差价都只有 5，永远成立） */
export const raiseIsBetter = (mine: number, theirs: number) => {
  const d = decision(mine, theirs);
  return d.raiseAndWin > d.quit;
};

/** 最终结算 */
export const finalResult = () => {
  const s = standing(FINAL_K);
  return {
    winnerPaid: s.you, //       你：245
    loserPaid: s.him, //        他：240
    youNet: FACE - s.you, //    −145
    himNet: -s.him, //          −240
    auctioneerNet: s.revenue - FACE, // +385
    revenue: s.revenue, //      485
  };
};
