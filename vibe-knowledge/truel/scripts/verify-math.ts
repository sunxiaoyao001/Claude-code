/**
 * 校验视频中出现的全部概率数字：npm run math
 */
import {
  airShotOutcome,
  bingAfterKillingJia,
  bingAfterKillingYi,
  bingAirShot,
  bingShootJia,
  bingShootYi,
  pct,
  runSimulation,
  SIM_N,
} from '../src/math/truel';

console.log('— 条件存活率（直觉陷阱段）—');
console.log('丙打中甲后，乙先手 1v1，丙存活：', pct(bingAfterKillingJia, 2));
console.log('丙打中乙后，甲先手 1v1，丙存活：', pct(bingAfterKillingYi, 2));

console.log('\n— 丙的三种开局（全程最优对手）—');
console.log('打甲：', pct(bingShootJia, 2));
console.log('打乙：', pct(bingShootYi, 2));
console.log('朝天开枪：', pct(bingAirShot, 2));

console.log('\n— 朝天开枪下三人最终存活率（理论）—');
console.log(
  '丙',
  pct(airShotOutcome.bing, 2),
  ' 乙',
  pct(airShotOutcome.yi, 2),
  ' 甲',
  pct(airShotOutcome.jia, 2),
  ' 合计',
  pct(airShotOutcome.bing + airShotOutcome.yi + airShotOutcome.jia, 2),
);

const sim = runSimulation();
console.log(`\n— 蒙特卡洛 ${SIM_N} 场（固定种子）—`);
console.log(
  '丙',
  sim.counts.bing,
  pct(sim.counts.bing / SIM_N, 2),
  ' 乙',
  sim.counts.yi,
  pct(sim.counts.yi / SIM_N, 2),
  ' 甲',
  sim.counts.jia,
  pct(sim.counts.jia / SIM_N, 2),
);
