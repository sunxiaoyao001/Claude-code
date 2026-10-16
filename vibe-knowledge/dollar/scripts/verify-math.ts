/**
 * 校验视频中出现的数字：npm run math
 */
import {decision, finalResult, raiseIsBetter, standing} from '../src/math/auction';
import {FINAL_K} from '../src/timeline';

const s10 = standing(10);
console.log(`第 10 口：你 ${s10.you} / 他 ${s10.him} → 拍卖师已收 ${s10.revenue}`);
const s11 = standing(11);
console.log(`第 11 口：两人合计 ${s11.revenue}（> 100，拍卖师稳赚）`);

const d1 = decision(95, 100);
console.log(`\n你 95 vs 他 100：放弃 ${d1.quit}，加到 105 并赢下 ${d1.raiseAndWin}`);
const d2 = decision(100, 105);
console.log(`他 100 vs 你 105：放弃 ${d2.quit}，加到 110 并赢下 ${d2.raiseAndWin}`);

let always = true;
for (let k = 1; k < FINAL_K; k++) {
  const s = standing(k);
  const behind = Math.min(s.you, s.him);
  const ahead = Math.max(s.you, s.him);
  if (!raiseIsBetter(behind, ahead)) always = false;
}
console.log(`\n每一口都是“加价比放弃更划算”：${always}`);

const r = finalResult();
console.log(`\n成交：你付 ${r.winnerPaid}（净 ${r.youNet}），他付 ${r.loserPaid}（净 ${r.himNet}）`);
console.log(`拍卖师收入 ${r.revenue}，扣掉 100 元净赚 ${r.auctioneerNet}`);
