/**
 * 证明段辅助：复用动画工具 + 确定性洗牌（决定一万个点的点亮次序）
 */
import {mulberry32} from '../math/truel';

export {countUp, ease, envelope, prog} from '../lib/anim';

/** 返回 rank 数组：rank[i] 为元素 i 在随机序列中的位置 */
export const mulberryShuffle = (n: number, seed: number): Int32Array => {
  const rand = mulberry32(seed);
  const order = Array.from({length: n}, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const rank = new Int32Array(n);
  order.forEach((idx, pos) => (rank[idx] = pos));
  return rank;
};
