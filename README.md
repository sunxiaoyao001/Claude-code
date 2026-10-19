# Claude-code

## {{APP_NAME}} · 胶片相机微信小程序

项目规格见 [`CLAUDE.md`](CLAUDE.md)（产品名 `{{APP_NAME}}` 待定）。当前阶段：**M1（相机 + WebGL 原始帧预览）完成，等待真机确认后进入 M2**。

### 开发与构建

```bash
npm ci                 # Node >= 22.12
./build.sh             # lint → typecheck → test → build(dist/) → 包体积门禁 → preview（无密钥/网络不通时自动跳过并说明原因）
./build.sh check       # 只跑到包体积门禁
./build.sh preview     # 本地出预览码：缺密钥或网络失败即报错
```

| 环境变量 | 说明 |
| --- | --- |
| `MP_APPID` | 真实 AppID（`project.config.json` 里是开发者工具游客模式用的 `touristappid`） |
| `MP_PRIVATE_KEY_PATH` / `MP_PRIVATE_KEY` | 代码上传密钥的文件路径 / 内容（公众平台「开发 → 开发设置」下载；**绝不入库**，`.gitignore` 已屏蔽 `*.key`） |

- 目录：`miniprogram/` 是 TypeScript 源码，`dist/` 是构建产物（微信开发者工具与 miniprogram-ci 都指向它，`project.config.json` 的 `miniprogramRoot`）。
- 预览码输出到 `.preview/qrcode.jpg`；只有该 AppID 的开发者/体验成员能扫码打开。
- 设计令牌：`miniprogram/styles/tokens.wxss`；`tests/tokens.test.ts` 逐条校验 §7.1，并禁止页面 wxss 出现裸色值/px。

### M0 真机确认清单（人类执行）

1. 准备：拿到 AppID 与代码上传密钥；公众平台「开发设置」中关闭上传 IP 白名单（或加入本机出口 IP）；「基础库最低版本」设为 3.0.0。
2. 本地执行：`MP_APPID=wx... MP_PRIVATE_KEY_PATH=./private.wx....key ./build.sh preview`。
   - 预期：终端最后打印 `preview: QR code written to .../.preview/qrcode.jpg`，并列出 `__APP__` 包体积（应 < 10KB）。
3. 用开发者/体验成员的微信扫 `.preview/qrcode.jpg`。
   - 预期：全屏柔黑底（#0D0D0F，不是纯黑）、无系统导航栏，屏幕中央两行灰色小字 `FILM CAMERA · M0` 与 `SDK x.y.z`（大写、加字距，后者即基础库版本，应 ≥ 3.0.0）；页面不能上下拖动露白边。
4. 不符合时请回传：终端完整输出、手机截图（含 SDK 那行）、机型 + 微信版本（我 → 设置 → 关于微信）。

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

### M1 真机确认清单（人类执行）

生成预览码的方式同 M0（`./build.sh preview`）。提审前公众平台「用户隐私保护指引」需声明**摄像头**；未声明时不会弹隐私抽屉，其余流程照常。

| # | 操作 | 预期 |
| --- | --- | --- |
| 1 | 首次扫码打开 | 底部弹出「开拍之前」隐私抽屉 → 点「同意并继续」→ 系统询问相机权限 → 允许 → 全屏实时取景，画面不拉伸、无黑边 |
| 2 | 长按顶部「RAW PREVIEW」打开测试面板，点「灰度」 | 画面变黑白 = WebGL 层在相机之上生效；再点恢复彩色。**若不变灰**：说明 canvas 没盖住原生相机，请重点反馈 |
| 3 | 面板第 1–2 行静置 10 秒；再打开「GPU 计时」看第 2 行 | 记录 `帧 W×H · 供帧 · 渲染 · 丢` 与渲染耗时；frame-size 依次切 small / medium / large 各记一次。medium 预期供帧≈渲染≈25–30 fps、丢帧≈0 |
| 4 | 点右侧翻转键切前摄 | 画面像照镜子（举左手出现在画面左边），面板显示「镜像 开」；方向不对就点「旋转」直到正确并记下角度 |
| 5 | 后摄时点左侧闪光键 | 图标在 关 → 自动 → 开 之间循环；前摄时该键变暗不可点（闪光实际效果在 M2 拍照时体现） |
| 6 | 面板「takePhoto 实测」依次点 original / high / normal | 每次多一行：`尺寸 格式 大小 耗时`（或失败原因）——这就是出片分辨率天花板 |
| 7 | resolution 切 low / medium / high 后各再测一次 original | 记录照片尺寸是否随之变化 |
| 8 | 删除小程序后重进，相机权限点「拒绝」 | 显示「需要相机权限 / 去设置开启」；去设置打开摄像头，返回后自动恢复取景 |
| 9 | 删除小程序后重进，隐私抽屉点「暂不同意」 | 显示「还差一步 / 查看并同意」，点后可重新同意 |
| 10 | 切到后台再回来 | 取景恢复，面板「累计供帧」继续增长 |

回传：测试面板截图（3 种 frame-size 各一张、含拍照结果行）+ 机型 + 微信版本；有异常请附录屏。面板仅在开发版/体验版出现，正式版不显示（M6 前移除）。

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
