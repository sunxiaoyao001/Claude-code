// 阅读时长自检（同 lemo-opuscar core/render/readcheck.mjs 的规则，MIT）：
// 每段字从完整出现起连续可见的时长 ≥ 汉字数 ÷ 4.5 + 其它字符数 ÷ 15 + 1.5 秒
import { openPage, closeServer } from './page.mjs';
const STEP = .05, CJK = 4.5, LAT = 15, PAD = 1.5;
const { browser, page } = await openPage();
// 只看"完整显示"：逐字入场时 TEXTS 一直报全文，所以这里按字的入场进度另算——取每段字最后一个字入场完成的时刻为起点
const res = await page.evaluate(STEP => {
  const seen = {};
  for (let t = 0; t <= window.DUR; t += STEP) {
    window.render(t);
    for (const b of window.TEXTS(t)) {
      const s = seen[b.id] ??= { id: b.id, text: b.text, first: t, last: t };
      s.last = t;
    }
  }
  return Object.values(seen);
}, STEP);
let bad = 0;
for (const s of res) {
  const cjk = [...s.text].filter(c => /[　-鿿＀-￯]/.test(c)).length, other = [...s.text].filter(c => !/\s/.test(c)).length - cjk;
  const need = cjk / CJK + other / LAT + PAD, reveal = [...s.text].length * .04 + .4, have = s.last - s.first - reveal;
  const ok = have >= need - .05;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'LOW'} ${s.id.padEnd(7)} 需要 ${need.toFixed(1)}s  实际 ${have.toFixed(1)}s  ${s.text}`);
}
await browser.close(); await closeServer();
process.exit(bad ? 1 : 0);
