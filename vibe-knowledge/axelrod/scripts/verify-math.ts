/**
 * 校验视频中出现的数字：npm run math
 */
import {evolve, EVO_GENERATIONS, EVO_IDS, playMatch, scoreMoves, tftAgainst, type Move} from '../src/math/ipd';

console.log('— 典型对局（200 回合）—');
for (const [a, b] of [
  ['tft', 'alld'],
  ['tft', 'tft'],
  ['tft', 'allc'],
  ['alld', 'allc'],
  ['tft', 'joss'],
  ['tft', 'random'],
] as const) {
  const m = playMatch(a, b);
  console.log(`${a} vs ${b}: ${m.scoreA} : ${m.scoreB}`);
}

// 定理：以牙还牙在任何对局中得分 ≤ 对手，且最多只少 5 分
let worst = 0;
let maxDiff = -Infinity;
const rand = Math.random;
for (let k = 0; k < 20000; k++) {
  const n = 1 + Math.floor(rand() * 60);
  const theirs: Move[] = Array.from({length: n}, () => (rand() < 0.5 ? 'C' : 'D'));
  const mine = tftAgainst(theirs);
  const [s1, s2] = scoreMoves(mine, theirs);
  worst = Math.min(worst, s2 - s1);
  maxDiff = Math.max(maxDiff, s2 - s1);
}
console.log(`\n随机对手 20000 局：对手领先分数 ∈ [${worst}, ${maxDiff}]（应为 [0, 5]）`);

const evo = evolve();
console.log(`\n— 演化 ${EVO_GENERATIONS} 代 —`);
for (const g of [0, 50, 100, 200, 400, 700, 1000]) {
  console.log(`第 ${String(g).padStart(4)} 代：` + EVO_IDS.map((id) => `${id} ${(evo[g][id] * 100).toFixed(1)}%`).join('  '));
}
const peak = evo.reduce((best, s, g) => (s.alld > best.v ? {g, v: s.alld} : best), {g: 0, v: 0});
console.log(`背叛者峰值：第 ${peak.g} 代 ${(peak.v * 100).toFixed(1)}%`);
