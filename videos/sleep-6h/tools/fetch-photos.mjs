#!/usr/bin/env node
/* =============================================================================
 * 按照片清单自动下载真实照片（Pexels / Unsplash 官方 API，免费商用授权）
 * -----------------------------------------------------------------------------
 * 用法（任选其一，API Key 均可免费申请）：
 *   PEXELS_API_KEY=xxx      node tools/fetch-photos.mjs
 *   UNSPLASH_ACCESS_KEY=xxx node tools/fetch-photos.mjs
 * 选项：
 *   --only eye,deepWork     只下载指定 ID
 *   --pick 2                取第 N 个搜索结果（默认 1；不满意就换一个再跑）
 *   --force                 覆盖已存在的照片
 * 下载后：
 *   1. 照片保存为 assets/photos/<清单里的文件名>
 *   2. 作者署名写入 assets/photos/CREDITS.md
 *   3. 请打开预览检查构图，并在 manifest.js 里把 focus / face 改成人脸的实际位置
 *   注：自动搜索的结果不一定理想，正式发布前建议人工挑选。
 * ========================================================================== */
import { writeFile, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true; };
const ONLY = opt('only', null);
const PICK = Math.max(1, Number(opt('pick', 1)));
const FORCE = !!opt('force', false);
const PEXELS = process.env.PEXELS_API_KEY;
const UNSPLASH = process.env.UNSPLASH_ACCESS_KEY;

if (!PEXELS && !UNSPLASH) {
  console.error('请设置 PEXELS_API_KEY 或 UNSPLASH_ACCESS_KEY 环境变量（免费申请：pexels.com/api 或 unsplash.com/developers）');
  process.exit(1);
}

// 读取 manifest.js（普通浏览器脚本，用沙箱执行）
const sandbox = { window: {} };
sandbox.FX = sandbox.window.FX = {};
vm.runInNewContext(await readFile(path.join(ROOT, 'assets/photos/manifest.js'), 'utf8'), sandbox);
const PHOTOS = sandbox.FX.PHOTOS;

async function searchPexels(q, orientation) {
  const u = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${PICK}&orientation=${orientation}`;
  const r = await fetch(u, { headers: { Authorization: PEXELS } });
  if (!r.ok) throw new Error('Pexels ' + r.status);
  const p = (await r.json()).photos[PICK - 1];
  if (!p) return null;
  return { url: p.src.large2x || p.src.original, author: p.photographer, page: p.url, site: 'Pexels' };
}
async function searchUnsplash(q, orientation) {
  const u = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${PICK}&orientation=${orientation}`;
  const r = await fetch(u, { headers: { Authorization: 'Client-ID ' + UNSPLASH } });
  if (!r.ok) throw new Error('Unsplash ' + r.status);
  const p = (await r.json()).results[PICK - 1];
  if (!p) return null;
  // Unsplash API 规范：使用照片时需要触发 download_location
  fetch(p.links.download_location, { headers: { Authorization: 'Client-ID ' + UNSPLASH } }).catch(() => {});
  return { url: p.urls.raw + '&w=2000&q=85&fm=jpg', author: p.user.name, page: p.links.html, site: 'Unsplash' };
}

const credits = [];
for (const [id, m] of Object.entries(PHOTOS)) {
  if (ONLY && !String(ONLY).split(',').includes(id)) continue;
  if (m.optional) { console.log(`跳过 ${id}（需要授权的照片请手动放入）`); continue; }
  const file = path.join(ROOT, 'assets/photos', m.file);
  if (!FORCE && (await access(file).then(() => true, () => false))) { console.log(`已存在 ${m.file}（--force 覆盖）`); continue; }
  const orientation = m.min <= 400 ? 'square' : 'portrait';
  try {
    const hit = PEXELS ? await searchPexels(m.query, orientation) : await searchUnsplash(m.query, orientation);
    if (!hit) { console.log(`未找到：${id}（${m.query}）`); continue; }
    const img = Buffer.from(await (await fetch(hit.url)).arrayBuffer());
    await writeFile(file, img);
    credits.push(`| ${m.file} | ${hit.author} | ${hit.site} | ${hit.page} |`);
    console.log(`✓ ${m.file}  ${(img.length / 1024).toFixed(0)} KB  by ${hit.author} (${hit.site})`);
  } catch (e) {
    console.log(`✗ ${id}：${e.message}`);
  }
}
if (credits.length) {
  const f = path.join(ROOT, 'assets/photos/CREDITS.md');
  const head = '# 照片署名\n\n| 文件 | 作者 | 来源 | 链接 |\n|---|---|---|---|\n';
  const old = await readFile(f, 'utf8').catch(() => head);
  await writeFile(f, old + credits.join('\n') + '\n');
  console.log('署名 → assets/photos/CREDITS.md');
}
