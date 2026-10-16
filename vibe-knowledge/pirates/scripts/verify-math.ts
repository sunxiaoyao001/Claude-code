/**
 * 数学校验：npm run math
 * 打印逆向归纳的每一轮分配、需要的票数，以及 1 号收买每一票的价码
 */
import {COINS, FINAL, PIRATES, PRICES, ROWS, needed} from '../src/math/pirates';

ROWS.forEach((row, k) => {
  const n = k + 1;
  const first = PIRATES - n + 1;
  const cells = row.map((v, i) => `${first + i}号:${v}`).join('  ');
  const yes = row.filter((v, i) => i === 0 || v > 0).length;
  console.log(`${n} 人：${cells}   需要 ${needed(n)} 票，赞成 ${yes} 票，合计 ${row.reduce((a, b) => a + b, 0)}`);
});
console.log(`\n最终方案：${FINAL.join(' : ')}（总数 ${COINS}）`);
console.log(`1 号视角的价码：${PRICES.map((p, i) => `${i + 2}号=${p}`).join('  ')} → 买最便宜的 2 票`);
