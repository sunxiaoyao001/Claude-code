# 05 · 工程链路（miniprogram-ci / 包体积 / tsc 工程 / 测试与 lint）

> 来源：`miniprogram-ci@2.1.31` npm 包 README（已下载阅读）、`miniprogram-api-typings@5.2.3`、本容器网络实测、社区资料。

## 结论

### 1. miniprogram-ci（2.1.31，从开发者工具抽离的编译/上传模块）[官方]

- **前置**：小程序管理员在公众平台「开发 → 开发设置」下载**代码上传密钥**，并配置 **IP 白名单**（README 原文："未配置IP白名单的，将无法使用 miniprogram-ci 进行预览和上传"；可选择不限制 IP，但需自担风险）。密钥平台不明文保存，遗失只能重置。
- **预览**（Node API）：`ci.preview({ project, desc, setting: { useProjectConfig: true }, qrcodeFormat: 'image', qrcodeOutputDest: 'dist/preview.jpg', robot: 1 })`；`bigPackageSizeSupport: true` 可在**预览时**把主包/分包上限放宽到 4M（仅预览，上传无效）。
- **CLI**：`miniprogram-ci preview --pp ./dist --pkp ./private.<appid>.key --appid <appid> --uv <ver> -r 1 --qrcode-format image --qrcode-output-dest ./preview.jpg`（upload 同理，另需 `--uv`）。
- 返回 `subPackageInfo`（`__APP__` 主包 / `__FULL__` 总包体积）→ **可用来在 build.sh 里做包体积门禁**。
- 其他能力：`pack-npm`（我们零运行时依赖，不需要）、`get-dev-source-map`、`checkCodeQuality`、代码静态依赖分析。
- 编译设置：`es7`（编译为 ES5）、`minifyJS/WXML/WXSS`、`autoPrefixWXSS`、`codeProtect`；`useProjectConfig: true` 时以 project.config.json 为准。

### 2. ★ 本云端环境的网络阻断 [实测]

- 本容器的网络策略对 `servicewechat.com`、`mp.weixin.qq.com`、`api.weixin.qq.com`、`open.weixin.qq.com`、`developers.weixin.qq.com` 等微信域名返回 **403（CONNECT 被策略拒绝）**。
- → **miniprogram-ci preview 目前无法在此云端环境生成二维码**（M0 验收项）。解决路径（C-16 [待拍板]）：
  1. 人类在云环境设置中放行微信相关域名（至少 `servicewechat.com` 及 miniprogram-ci 实际访问的 `*.weixin.qq.com`），**并在公众平台关闭 IP 白名单限制**（云端出口 IP 不固定）；或
  2. 云端只跑 lint + tsc + vitest + 包体积检查，`preview` 由人类在本地执行同一个 `build.sh preview`。
- 密钥管理：私钥**绝不入库**；`build.sh` 从环境变量读取（如 `MP_APPID`、`MP_PRIVATE_KEY`（内容）或 `MP_PRIVATE_KEY_PATH`），缺失时跳过 preview 并给出明确提示；`.gitignore` 加 `private.*.key`。

### 3. 包体积 [社区]

- **主包 ≤ 2MB、单个分包 ≤ 2MB**（超限报错示例："主包 2071KB 超过 2048KB"）；总包上限各来源说法不一（16MB / 20MB），以上传时提示为准。
- 本项目 4 个页面全部放主包即可（代码 + 3 款免费 LUT ≈ 3×107KB + 漏光 ~200KB + UI），无需分包；其余 46 款资源走 CDN。build.sh 用 `subPackageInfo.__APP__` 设 1.8MB 预警线。

### 4. TypeScript 工程模板 [官方+推断]

- 规格选择 `tsc → dist/`：tsc 只产出 .js，**.wxml/.wxss/.json/图片/二进制 LUT 需要 build 脚本复制到 dist**（零依赖可用 Node 内置 `fs.cpSync`）。
- 官方另有 `project.config.json` → `useCompilerPlugins: ["typescript"]` 由开发者工具/miniprogram-ci 编译 TS 的模式（miniprogram-ci 2.0.9 changelog 提到修复 ts 编译）。规格已定 tsc，保留；`dist/` 内不再启用编译插件，避免双重编译。
- 建议 tsconfig：`strict: true`、`module: "CommonJS"`（小程序运行时为 CommonJS `require`）、`target: "ES2017"`、`lib: ["ES2020"]`、`types: ["miniprogram-api-typings"]`、`noImplicitAny`、`noUncheckedIndexedAccess`；上传时 `es7: true` 再降到 ES5 兼容老机。
- **WXSS 不支持 `:root`**（支持的选择器：`.class / #id / element / ::before / ::after` 等）→ 设计令牌写在 `page { --bg-0: … }`；CSS 变量可继承进自定义组件；`--accent` 由页面根节点 `style="--accent: {{accent}}"` 动态注入（C-19）。
- `pack-tools/*.ts` 用 Node ≥ 22.6 的 `node --experimental-strip-types` 直接运行（本容器 Node 22.22），不引入 tsx/ts-node。

### 5. 测试与 lint [官方文档/skill]

- vitest：`environment: 'node'`，只测纯逻辑（pack 合并、LUT 解析、种子、额度）；`wx` 全局用 `vi.stubGlobal('wx', …)` 打桩（见已装 vitest skill `references/advanced-vi.md`）。shader 对齐测试用 TS 软光栅参考实现跑小图比统计量。
- ESLint 9 flat config + `typescript-eslint`：`@typescript-eslint/no-explicit-any: error`；生产构建 `no-console: error`（开发构建 warn）。
- "零 npm 依赖" → 明确为**零运行时依赖**；devDependencies：`typescript`、`miniprogram-api-typings`、`eslint`、`typescript-eslint`、`vitest`、`miniprogram-ci`（C-17）。

## 对本项目的影响

- M0 的 `build.sh` 设计为分段：`lint → typecheck → test → build(copy) → size-check → preview(可选)`，preview 段在缺密钥/网络不可达时**明确跳过并说明原因**，而不是假装成功。
- M0 验收"扫码打开空白页"依赖：真实 AppID + 上传密钥 + 网络放行（或人类本地执行）——属于 14.1 中人类侧事项，需提前准备。
- 包体积门禁、私钥环境变量、`.gitignore` 规则在 M0 一并落地。

## 参考链接

- miniprogram-ci：https://www.npmjs.com/package/miniprogram-ci · 官方说明 https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html
- 包体积/分包：https://developer.aliyun.com/article/1559848 · https://juejin.cn/post/7205092873326723109
- 分包加载（已装 skill）：`.claude/skills/wechat-miniprogram/references/framework.md` §38
- WXSS（已装 skill）：`.claude/skills/wechat-miniprogram/references/framework.md` §18
- Node 原生运行 TS：https://nodejs.org/api/typescript.html
- typescript-eslint：https://typescript-eslint.io/getting-started
- vitest（已装 skill）：`.claude/skills/vitest/SKILL.md`
- 云环境网络放行设置：https://code.claude.com/docs/en/cloud-environments#network-access
