#!/usr/bin/env node
/* =============================================================================
 * 字体子集化下载：扫描源码里用到的全部字符，从 Google Fonts 拉取只含这些字的 woff2
 * -----------------------------------------------------------------------------
 * 修改了画面文字（尤其是新增汉字）后运行：  node tools/build-fonts.mjs
 * 字体均为 SIL Open Font License（可商用、可嵌入）：
 *   FX Sans    = Noto Sans SC（思源黑体）  400 / 700    （字幕 / 正文）
 *   FX Serif   = Noto Serif SC（思源宋体） 600 / 900    （标题）
 *   FX Display = Fraunces                  600 / 900    （数字 / 英文）
 *   FX Mono    = JetBrains Mono            400 / 700   （HUD 数据）
 * 依赖：curl（Windows 10+ / macOS / Linux 自带）
 * ========================================================================== */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function collectChars() {
  const files = [
    ...(await readdir(path.join(ROOT, 'src'))).map((f) => path.join(ROOT, 'src', f)),
    path.join(ROOT, 'assets/photos/manifest.js'),
  ];
  const set = new Set();
  for (let c = 32; c < 127; c++) set.add(String.fromCharCode(c));
  for (const f of files) {
    // 去掉注释，只保留画面里真正会出现的文字
    const src = (await readFile(f, 'utf8'))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\s\/\/\s.*$/gm, '');
    for (const ch of src) if (ch.codePointAt(0) > 127) set.add(ch);
  }
  return [...set].join('');
}

function curl(url, binary = false) {
  return execFileSync('curl', ['-sSfL', '-A', UA, url], { encoding: binary ? 'buffer' : 'utf8', maxBuffer: 64 << 20 });
}

const manifest = [];
/** 下载一个字重。字符太多时 URL 会超长，因此每 100 个字符切一块，每块带 unicode-range */
async function fetchFont(family, weight, text, alias, base) {
  const chars = [...text];
  for (let k = 0, part = 0; k < chars.length; k += 100, part++) {
    const chunk = chars.slice(k, k + 100).join('');
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(chunk)}&display=block`;
    const css = curl(url);
    const faces = [...css.matchAll(/url\((https:[^)]+)\)[\s\S]*?unicode-range:\s*([^;]+);/g)];
    if (!faces.length) throw new Error('未找到字体地址：' + family + ' ' + weight);
    for (const [, u, range] of faces) {
      const file = `${base}-${weight}-${part}${faces.length > 1 ? '-' + faces.indexOf(faces.find((f) => f[1] === u)) : ''}.woff2`;
      const data = curl(u, true);
      await writeFile(path.join(ROOT, 'assets/fonts', file), data);
      manifest.push([alias, file, String(weight), range.trim()]);
      console.log(`  ${file}  ${(data.length / 1024).toFixed(1)} KB`);
    }
  }
}

const all = await collectChars();
const ascii = all.replace(/[^\x20-\x7e]/g, '');
const symbols = '▶×≠↑↓▮·—–…→←≈';
console.log(`共 ${[...all].length} 个字符`);
for (const w of [400, 700]) await fetchFont('Noto Sans SC', w, all, 'FX Sans', 'fx-sans');
for (const w of [600, 900]) await fetchFont('Noto Serif SC', w, all, 'FX Serif', 'fx-serif');
for (const w of [600, 900]) await fetchFont('Fraunces', w, ascii, 'FX Display', 'fx-display');
for (const w of [400, 700]) await fetchFont('JetBrains Mono', w, ascii + symbols, 'FX Mono', 'fx-mono');
// 生成字体清单（普通 script，file:// 和 http:// 都能加载）
await writeFile(
  path.join(ROOT, 'assets/fonts/fonts.js'),
  '/* 由 tools/build-fonts.mjs 自动生成：[字体族, 文件, 字重, unicode-range] */\n' +
    'window.FX = window.FX || {};\nFX.FONT_FILES = ' + JSON.stringify(manifest, null, 0).replace(/\],\[/g, '],\n  [') + ';\n'
);
console.log(`完成：${manifest.length} 个字体文件`);
