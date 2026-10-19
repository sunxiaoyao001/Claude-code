# 技能安装记录与可引用要点（P0 · 11.1）

## 检索过程

| 渠道 | 方式 | 结果 |
|---|---|---|
| claude.ai 技能库 | `SearchSkills`（wechat miniprogram / 小程序 / webgl / glsl / typescript / vitest / eslint） | 无结果 |
| claude.ai 插件目录 | `SearchPlugins`（同上 + node） | 仅泛 TypeScript/后端类插件（TypeScript Patterns Enforcer、Fastify Backend Skills 等），与小程序/WebGL 无关，未装 |
| skills.sh 注册表 | `npx skills find <kw>` | 全部 "No skills found"——实为本容器网络策略拦截 `skills.sh`（代理 403），不是真的没有 |
| GitHub 直连 | Web 检索候选仓库 → `git clone` 到隔离目录审阅 → `npx skills add <repo> --skill <name> --agent claude-code --copy` | 成功安装 3 个（见下） |

安装纪律：每个 skill 安装前完整审阅 SKILL.md 与脚本，扫描可疑指令（越权、外传、`curl|sh` 等）——均未发现；安装后 `diff -r` 确认与审阅版本逐字节一致；版本哈希记录在仓库根 `skills-lock.json`。

## 已安装

### 1. `wechat-miniprogram` — 小程序框架/API 速查

- 来源：[joneqian/claude-skills-suite](https://github.com/joneqian/claude-skills-suite) `skills/wechat-miniprogram`（MIT，由官方文档抓取生成，~308KB）
- 用途：框架、组件、WXSS、分包、生命周期速查。**官方文档域名在本容器不可达时的离线替身。**
- 可直接引用的要点：
  - `references/framework.md` §18 WXSS：支持选择器仅 `.class / #id / element / ::before / ::after` 等 → **无 `:root`，令牌写 `page{}`**；`@import` 相对路径；`style` 只放动态样式。
  - §38 独立分包：独立分包不能依赖主包 js/wxss/组件、`getApp()` 可能为 undefined（`allowDefault`）——本项目不用独立分包，记录以免误用。
  - §44 弱网体验、§48 运行时性能概述：M6 打磨时参考。
- 局限：**不含** camera / onCameraFrame / WebGL / 激励视频 / 隐私接口的 API 细节（抓取覆盖不全）→ 这些以 `miniprogram-api-typings` 为准（见 01/02/04 笔记）。

### 2. `shader-dev` — GLSL 技法库

- 来源：[MiniMax-AI/skills](https://github.com/MiniMax-AI/skills) `skills/shader-dev`（MIT，36 个技法 + reference，~1.6MB）
- 用途：后处理（暗角/模糊/bloom/色差/颗粒）、多 pass ping-pong、程序噪声、纹理采样、WebGL 常见错误。
- 可直接引用的要点：
  - `techniques/post-processing.md`：暗角三种写法（乘法/径向/反二次衰减）；可分离高斯 121→22 次采样；"CA + Vignette + Grain = 镜头三件套"组合建议；Bayer 有序抖动消色带。
  - `techniques/multipass-buffer.md` Step 5：9-tap 可分离高斯（σ≈2）权重；同文件 Performance 节："Bilinear tap trick: 5 samples replace 9-tap Gaussian"。
  - `techniques/camera-effects.md`：亮度相关颗粒、smoothstep 暗角模板。
  - SKILL.md "GLSL Compilation Errors"：保留字（`sample`/`filter`/`input`/`output`…不可作变量名）、严格类型（`vec3 x = 1.0` 非法）——GLSL ES 1.0 同样适用。
- ⚠️ 局限：全部按 **WebGL2 / `#version 300 es`** 编写，大量使用 `textureLod`、`texelFetch`、位运算 → 本项目必须回移植到 GLSL ES 1.0（对照表见 `02-webgl-capability.md` 第 5 条）。ShaderToy 风格的 `fract(sin())` hash 在 mediump 下失效，改用无 sin hash。

### 3. `vitest` — 单测框架

- 来源：[antfu/skills](https://github.com/antfu/skills) `skills/vitest`（MIT，基于 Vitest 5.0.1 文档生成，2026-09-25）
- 用途：配置、mock、fixture、覆盖率。
- 可直接引用的要点：
  - `references/advanced-vi.md`：`vi.stubGlobal` 打桩 `wx` 全局；`vi.useFakeTimers` + `vi.setSystemTime` 测"免费额度跨日重置"。
  - `references/advanced-environments.md`：纯逻辑测试用 `environment: 'node'`。
  - `references/features-context.md`：`test.extend` 做 LUT/pack fixture。

## 未安装（记录在案，不硬凑）

| 名称 | 来源 | 未装原因 |
|---|---|---|
| `shader-programming-glsl` | sickn33/antigravity-awesome-skills | 内容过浅（基础语法 + 一个 raymarch 例子），与 shader-dev 重复 |
| `typescript-expert` | sickn33/antigravity-awesome-skills | 人设型提示词，含"遇到某类问题就建议切换子代理并停止"的指令，会打断自主推进；作者自标 risk: critical |
| `lint-and-validate` | sickn33/antigravity-awesome-skills | 通用"跑 lint 报结果"流程，无 ESLint 配置知识；作者自标 risk: critical |
| `tdesign-miniprogram` | joneqian/claude-skills-suite | 组件库技能；本项目 UI 全自绘（第七节设计合同），不用 TDesign |
| `miniprogram-development` | Tencent CloudBase（托管于 cnb.cool） | 偏云开发部署；首版无后端；且非 GitHub 托管，未能审阅 |
| ESLint 专项 / Node 构建工具链专项 | — | 各渠道均未找到可信技能 → 走 typescript-eslint 与 Node 官方文档（见 05 笔记） |

## 项目自有技能

- `.claude/skills/film-pipeline/`：渲染管线规格 + WebGL1 约束 + pack 格式 + 研究结论（含待拍板项索引），开发中随用随取。
