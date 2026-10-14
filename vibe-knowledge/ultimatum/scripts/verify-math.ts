/**
 * 校验视频中的数字：npm run math
 */
import {binMean, binTotal, ENGEL_2011, OFFER_BINS, rationalOffer, TYPICAL} from '../src/math/ultimatum';

console.log(`理性解：给对方 ${rationalOffer()} 元，自己留 ${100 - rationalOffer()} 元`);
console.log(`\n示意分布：合计 ${binTotal()}%，平均出价 ${binMean().toFixed(1)}%（应落在三四成），众数区间 ${OFFER_BINS.reduce((a, b) => (b.share > a.share ? b : a)).label}`);
const low = OFFER_BINS.filter((b) => b.mid < TYPICAL.rejectBelow);
console.log(`低于 ${TYPICAL.rejectBelow}% 的区间拒绝率：${low.map((b) => b.reject).join(' / ')}（约一半）`);
console.log(`\n独裁者博弈：${ENGEL_2011.treatments} 组实验，平均 ${ENGEL_2011.mean}%，${ENGEL_2011.giveNothing}% 的人一分不给`);
