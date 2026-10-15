// 从 Google Fonts 下载只包含本片用字的思源宋体/黑体子集（OFL 授权），生成 fonts/fonts.css
import fs from 'node:fs';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const chars = fs.readFileSync('fonts/charset.txt', 'utf8');
const faces = [
  ['Noto Serif SC', 300, 'ZG Serif'], ['Noto Serif SC', 600, 'ZG Serif'], ['Noto Serif SC', 900, 'ZG Serif'],
  ['Noto Sans SC', 400, 'ZG Sans'], ['Noto Sans SC', 500, 'ZG Sans'],
];
const chunks = []; const arr = [...chars]; for (let i = 0; i < arr.length; i += 160) chunks.push(arr.slice(i, i + 160).join(''));
let css = '/* 思源宋体 / 思源黑体（Noto Serif SC / Noto Sans SC，SIL OFL 1.1）按本片用字裁剪的子集 */\n';
let n = 0;
for (const [fam, wt, alias] of faces) {
  for (const [ci, text] of chunks.entries()) {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam)}:wght@${wt}&text=${encodeURIComponent(text)}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${fam} ${wt} chunk ${ci}: HTTP ${res.status}`);
    const body = await res.text();
    for (const block of body.split('@font-face').slice(1)) {
      const src = block.match(/url\((https:[^)]+)\)/)[1];
      const range = (block.match(/unicode-range:\s*([^;]+);/) || [])[1];
      const file = `${alias.replace(' ', '')}-${wt}-${ci}-${n++}.woff2`;
      const buf = Buffer.from(await (await fetch(src, { headers: { 'User-Agent': UA } })).arrayBuffer());
      fs.writeFileSync('fonts/' + file, buf);
      css += `@font-face{font-family:"${alias}";font-style:normal;font-weight:${wt};font-display:block;src:url(${file}) format("woff2");${range ? `unicode-range:${range};` : ''}}\n`;
    }
  }
}
fs.writeFileSync('fonts/fonts.css', css);
console.log('faces:', n);
