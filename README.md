# Claude-code

## {{APP_NAME}} · 胶片相机微信小程序

项目规格见 [`CLAUDE.md`](CLAUDE.md)（产品名 `{{APP_NAME}}` 待定）。当前阶段：**P0 预研完成，等待拍板后进入 M0**。

### P0 研究产出（`docs/research/`）

| 文件 | 内容 |
| --- | --- |
| [`01-camera-baseline.md`](docs/research/01-camera-baseline.md) | camera 组件：帧格式/帧尺寸、takePhoto 真实输出分辨率、前后摄/闪光、M1 真机测试矩阵 |
| [`02-webgl-capability.md`](docs/research/02-webgl-capability.md) | 小程序 WebGL：同层渲染、WebGL1 限制清单、FBO 多 pass、导出链、性能与内存 |
| [`03-film-emulation-oss.md`](docs/research/03-film-emulation-oss.md) | 胶片模拟开源项目"抄什么"、胶卷 ↔ 原型对照 |
| [`04-monetization-compliance.md`](docs/research/04-monetization-compliance.md) | 激励视频、流量主、虚拟支付（2026 新规）、诱导分享、隐私接口 |
| [`05-toolchain.md`](docs/research/05-toolchain.md) | miniprogram-ci、包体积、tsc 工程、测试与 lint、云端网络限制 |
| [`skills-notes.md`](docs/research/skills-notes.md) | 技能检索/安装记录与可引用要点 |
| [`conflicts.md`](docs/research/conflicts.md) | **与规格冲突的条目与修正建议（`[待拍板]`）** |

### 已安装技能（本项目 P0 安装，`.claude/skills/`）

| Skill | 来源 | 许可 | 用途 |
| --- | --- | --- | --- |
| `wechat-miniprogram` | [joneqian/claude-skills-suite](https://github.com/joneqian/claude-skills-suite) | MIT | 小程序框架/组件/WXSS/分包速查（官方文档离线替身；不含 camera/WebGL/广告细节） |
| `shader-dev` | [MiniMax-AI/skills](https://github.com/MiniMax-AI/skills) | MIT | GLSL 后处理、多 pass、噪声、纹理采样技法（WebGL2 写法，需回移植到 GLSL ES 1.0） |
| `vitest` | [antfu/skills](https://github.com/antfu/skills) | MIT | 单测配置、mock、fixture、假时钟 |
| `film-pipeline` | 本项目自有 | — | 渲染管线规格、WebGL1 约束、LUT 打包与查表、pack 格式与合并规则、研究结论汇总 |

安装方式：`npx skills add <owner/repo> --skill <name> --agent claude-code --copy`（锁定哈希见 [`skills-lock.json`](skills-lock.json)）；未安装项及原因见 `skills-notes.md`。

## 已安装的网站设计 Skills（`.claude/skills/`）

| Skill | 来源 | 用途 |
| --- | --- | --- |
| `impeccable` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 设计总指挥：`/impeccable init` 建立 PRODUCT.md，之后 `/impeccable polish·audit·critique·bolder·quieter·layout·typeset·animate…` 等 24 个命令；附带 4 个子代理（`.claude/agents/impeccable-*`）和自动设计检测 hooks（`.claude/settings.json`） |
| `design-taste-frontend` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Taste Skill v2 主技能：反 AI 模板感的落地页 / 作品集 / 改版 |
| `redesign-existing-projects` | taste-skill | 审计并升级已有网站，不破坏功能 |
| `high-end-visual-design` | taste-skill | 高端 agency 质感（字体、间距、阴影、动效） |
| `minimalist-ui` | taste-skill | 极简编辑风格 |
| `industrial-brutalist-ui` | taste-skill | 工业粗野主义风格 |
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) | Anthropic 官方前端设计技能 |
| `ui-ux-pro-max` | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 可检索的设计知识库（风格、配色、字体、落地页结构、UX 规范），`python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain style` |
| `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | 按 Vercel Web Interface Guidelines 审查 UI 代码（可访问性 / UX） |
| `webapp-testing` | anthropics/skills | 用 Playwright 启动本地站点、截图、验证前端行为 |

更新：重新克隆上游仓库并覆盖对应目录；Impeccable 也可用 `npx impeccable install --providers=claude --scope=project`。
