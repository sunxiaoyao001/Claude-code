// Uploads dist/ as a preview build with miniprogram-ci and writes the QR code to .preview/qrcode.jpg.
//
// Credentials come from the environment, never from the repo:
//   MP_APPID              real AppID (falls back to project.config.json unless it is "touristappid")
//   MP_PRIVATE_KEY_PATH   path to the code-upload key, or
//   MP_PRIVATE_KEY        the key content itself (written to a 0600 temp file for the run)
//
// Without credentials, or when WeChat's servers are unreachable (e.g. a cloud sandbox whose network
// policy blocks servicewechat.com), the step is skipped with the reason printed. Pass --require to
// turn those skips into failures, as `./build.sh preview` does.
import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TIMEOUT_MS = 120_000;
const NETWORK_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH']);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const required = process.argv.includes('--require');

function skip(reason) {
  if (required) {
    console.error(`preview: FAILED, ${reason}`);
    process.exit(1);
  }
  console.log(`preview: SKIPPED, ${reason}`);
  process.exit(0);
}

const projectConfig = JSON.parse(readFileSync(join(root, 'project.config.json'), 'utf8'));
const appid = process.env.MP_APPID || (projectConfig.appid !== 'touristappid' ? projectConfig.appid : '');
if (!appid) skip('no AppID (set MP_APPID)');
if (!process.env.MP_PRIVATE_KEY_PATH && !process.env.MP_PRIVATE_KEY) {
  skip('no upload key (set MP_PRIVATE_KEY_PATH or MP_PRIVATE_KEY)');
}

let tempKeyDir = '';
let privateKeyPath = process.env.MP_PRIVATE_KEY_PATH ?? '';
if (!privateKeyPath) {
  tempKeyDir = mkdtempSync(join(tmpdir(), 'mp-key-'));
  privateKeyPath = join(tempKeyDir, `private.${appid}.key`);
  writeFileSync(privateKeyPath, process.env.MP_PRIVATE_KEY ?? '', { mode: 0o600 });
}

function removeTempKey() {
  if (tempKeyDir) rmSync(tempKeyDir, { recursive: true, force: true });
}

function describeBuild() {
  try {
    return `preview ${execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim()}`;
  } catch {
    return 'preview';
  }
}

function isNetworkError(error) {
  const text = String(error?.message ?? error);
  return NETWORK_CODES.has(error?.code) || /tunnel|socket hang up|timed out|getaddrinfo|\b403\b/i.test(text);
}

const outFile = join(root, '.preview', 'qrcode.jpg');
mkdirSync(dirname(outFile), { recursive: true });

try {
  const ci = createRequire(import.meta.url)('miniprogram-ci');
  const project = new ci.Project({
    appid,
    type: 'miniProgram',
    projectPath: root,
    privateKeyPath,
    ignores: ['node_modules/**/*'],
  });
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`timed out after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS).unref();
  });
  const result = await Promise.race([
    ci.preview({
      project,
      desc: describeBuild(),
      setting: { useProjectConfig: true },
      qrcodeFormat: 'image',
      qrcodeOutputDest: outFile,
      robot: 1,
    }),
    timeout,
  ]);
  for (const pkg of result?.subPackageInfo ?? []) {
    console.log(`preview: ${pkg.name} ${(pkg.size / 1024).toFixed(1)} KB`);
  }
  removeTempKey();
  console.log(`preview: QR code written to ${outFile}`);
} catch (error) {
  // process.exit() skips `finally`, so the temp key is removed before any exit path.
  removeTempKey();
  if (isNetworkError(error)) {
    skip(`WeChat servers unreachable (${String(error?.message ?? error)}). If this is the cloud sandbox, allow servicewechat.com in its network settings or run ./build.sh preview locally`);
  }
  console.error('preview: FAILED');
  console.error(error);
  process.exit(1);
}
