/**
 * 数学校验：npm run math
 * 打印层级推理的数列、规则举例、纳什均衡检验，以及示意数据的统计量
 */
import {EXAMPLE, FT_1997, LEVEL_SHARE, NAGEL_1995, NAGEL_SAMPLE, POLITIKEN_2005, P, closest, levelValue, mean, median, poisson, target, zeroIsEquilibrium} from '../src/math/guess';

console.log('层级推理：', Array.from({length: 10}, (_, k) => `L${k}=${levelValue(k).toFixed(1)}`).join('  '));
console.log(`规则举例：${EXAMPLE.join(', ')} → 平均 ${mean(EXAMPLE)} → ×2/3 = ${target(EXAMPLE).toFixed(1)} → 赢家 ${closest(EXAMPLE, target(EXAMPLE))}`);
console.log('全员选 0 是纳什均衡：', zeroIsEquilibrium());
console.log(`\n示意样本：n=${NAGEL_SAMPLE.length}（文献 ${NAGEL_1995.n}），平均 ${mean(NAGEL_SAMPLE).toFixed(2)}（文献 ${NAGEL_1995.mean}），中位数 ${median(NAGEL_SAMPLE)}（文献 ${NAGEL_1995.median}），选 0 的人 ${NAGEL_SAMPLE.filter((x) => x === 0).length}`);
console.log(`  33~34 的人：${NAGEL_SAMPLE.filter((x) => x >= 33 && x <= 34).length}，21~23 的人：${NAGEL_SAMPLE.filter((x) => x >= 21 && x <= 23).length}`);
console.log(`\n金融时报 1997：平均 ${FT_1997.mean} × 2/3 = ${(FT_1997.mean * P).toFixed(2)} → 赢家 ${FT_1997.winner}`);
console.log(`政治报 2005：${POLITIKEN_2005.n} 人，正确答案 ${POLITIKEN_2005.answer} → 对应平均约 ${(POLITIKEN_2005.answer / P).toFixed(1)}`);
const ps = [0, 1, 2, 3, 4].map((k) => poisson(k) * 100);
console.log(`\n泊松 τ=1.5：${ps.map((p) => p.toFixed(1)).join(' / ')} / 5+ ${(100 - ps.reduce((a, b) => a + b, 0)).toFixed(1)}  → 取整 ${LEVEL_SHARE.join(' / ')}（合计 ${LEVEL_SHARE.reduce((a, b) => a + b, 0)}）`);
