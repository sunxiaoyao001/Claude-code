# Claude-code

## {{APP_NAME}} · 胶片相机微信小程序

项目规格见 [`CLAUDE.md`](CLAUDE.md)（产品名 `{{APP_NAME}}` 待定）。当前阶段：**M3（Pack 系统 + A/B/C 三大系列 20 款 + 胶卷条换机 + 取景器皮肤）完成，等待真机确认后进入 M4**。

### 开发与构建

```bash
npm ci                 # Node >= 22.12
./build.sh             # lint → typecheck → test → GPU 对齐检查 → build(dist/) → 包体积门禁 → preview（无密钥/网络不通时自动跳过并说明原因）
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
- GPU 对齐检查（`npm run gl-check`）：在无头 Chromium 的 WebGL1 上跑真实 shader，与 TS 参考实现比对（LUT 精度、颗粒统计、光晕、漏光、预览 = 出片）；没有 Playwright/Chromium 时自动跳过。
- 预览图工具（需要 Playwright/Chromium，云端已具备）：
  - `npm run samples -- thumbs astronaut` 用真实管线重渲染 `miniprogram/assets/thumbs/*.jpg`（胶卷条缩略图）
  - `npm run samples -- sheet out.jpg astronaut [--ids a,b] [--columns 6] [--leak]` 输出系列对比样张
  - `npm run ui-preview -- <输出目录> [场景…]` 把相机页的真实 WXML/WXSS 渲染成网页、真实预览管线绘制取景器，模拟 iPhone 14 / SE / 安卓机身截图（字体为 Chromium 可用字体，非 PingFang）
  - 样张源照片在 `pack-tools/samples/`（CC0 / 公有领域，见其 README），上线前换成 §7.3 的人像/街景/夜景样张集
- 光谱 LUT（A/B 系列）：`pack-tools/spectral/gen_spectral_luts.py`（需人工装 `spectral_film_lut`，离线跑）导出 `.cube`，再用 `cube2png.mts` 入库
- LUT 工具（零依赖，Node ≥ 22）：
  - `node --experimental-strip-types pack-tools/gen-placeholder-luts.mts` 重新生成内置占位 LUT（`miniprogram/assets/luts/*.png`）
  - `node --experimental-strip-types pack-tools/cube2png.mts in.cube out.png` 把真实 33³ `.cube` 转成着色器读取的 6×6 瓦片 PNG

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

### M2 真机确认清单（人类执行）

| # | 操作 | 预期 |
| --- | --- | --- |
| 1 | 打开相机 | 状态行下方是 3:4 画框（上下深色留边），画面偏暖、四角略暗、细颗粒每 1/3 秒跳动；测试面板「滤镜」行显示「阳光罐头」，点「原始画面」可对比 |
| 2 | 测试面板点「导出自检」，等待结果 | 4 行：①LUT 精度 ≤3 ✓ ②导出 A ✓ ③导出 B（✓/✗ 都记录）④满尺寸行（渲染/读回/编码耗时 + 输出尺寸）——这是出片链路的真机 spike |
| 3 | 按快门，连拍 3 张（每张等缩略图出现） | 重震动 + 一瞬黑场；1–3 秒后左下角出现缩略图；面板出现「出片 W×H · 总 X ms」与分步耗时，预期总耗时 ≤ 2.5s |
| 4 | 点缩略图全屏查看 | 与取景器观感一致（暖调、暗角、颗粒），右下角橙色日期戳；多拍几张，约每 3 张有 1 张边缘漏光 |
| 5 | 点「存到手机」 | 首次弹相册权限 → 允许后中震动 + 提示「已存到手机相册」；拒绝后再点会弹「需要相册权限」引导去设置 |
| 6 | 切前摄拍一张 | 记录成片左右是否与取景一致 |
| 7 | 中端安卓持续取景 30 秒 | 面板「预览光晕」若变成 off，记录当时的渲染耗时行 |
| 8 | 横持手机拍一张（安卓重点） | 成片方向正确；面板「原图 … orientation」一行一起截图 |

回传：自检 4 行 + 3 次出片耗时的面板截图、2–3 张存到相册的原图、机型 + 微信版本。

### M3 真机确认清单（人类执行）

内置 20 款：A 日系彩色 8 款、B 街头黑白 6 款、C CCD 千禧 6 款；免费层 = 阳光罐头 / 月光机 / M3 黑白。其余 17 款卡片上的锁标**目前只是展示**，照常可拍（试拍额度与解锁在 M5 接入）。

| # | 操作 | 预期 | 不符合时回传 |
| --- | --- | --- | --- |
| 1 | 打开相机 | 顶部一行：左「36/36」（相机主题色）、中相机英文名、右画幅图标 + 「3:4」，位于胶囊按钮左侧不重叠；画框四角 L 线 + 淡三分线；底部是磨砂胶卷条，当前相机卡片上浮 + 主题色描边 | 截图 + 机型 |
| 2 | 点胶卷条上另一台相机 | 轻震动 → 取景器瞬间黑一下 → 新色调出现，框线淡入，相机名逐字打出；页面主题色（计数、描边）跟着变 | 录屏（看黑场与淡入节奏） |
| 3 | 横向拖动胶卷条后松手 | 停下约 0.15 秒后自动吸附到最近的卡片居中，并切换到这台相机；首尾卡片都能滚到正中 | 录屏 |
| 4 | 切到「M3 黑白」「街拍」「夜猫」 | 画框变成 2:3（左右留黑边），黑白画面，颗粒依次变粗 | 截图 |
| 5 | 切到「老录像」 | 画框变成横向 4:3（上下留黑），有细扫描线、边缘红蓝错位、彩色噪点 | 截图（放大看边缘） |
| 6 | 各拍一张 C 系列（如「冷白闪」） | 成片右下角有橙色日期；A 系列中阳光罐头 / 口袋金有日期，其余没有 | 2–3 张原图 |
| 7 | 拍 1 张后看计数 | 变成「35/36」；切到别的相机再切回来，计数仍是它自己那卷 | 截图 |
| 8 | 杀掉小程序重进 | 自动装回上次那台相机 | — |
| 9 | 快速连点 3 张不同的卡片 | 最终停在最后点的那台，中间不卡死、不串色 | 录屏 |
| 10 | 低端安卓机 | 胶卷条为不透明深色（无磨砂），其余同上 | 机型 + 截图 |
| 11 | 测试面板「滤镜」行 | 显示当前相机中文名；「导出自检」照常通过 | 面板截图 |

换机耗时目标：已缓存 < 300ms（内置相机都属于已缓存）。目前没有 CDN，远程下载（进度条、失败重试）的逻辑由单测覆盖，真机验证等 CDN 域名就绪后进行。

### M3 待拍板

1. `[待拍板]` **主包预算**：20 款 LUT + 缩略图已占主包 868KB / 2MB。按此算 49 款全内置约 2.4MB，会超限。建议 M4 起 D–H 系列（及非免费款）走 CDN 清单下载，零代码改动，只需上传文件 + 清单；CDN 域名就绪前，M4 先用分包承载 D–H 资源过渡。
2. `[待拍板]` **胶卷条交互**：按 §7.2「滚动停止即换机」实现（点卡片也可）。如果真机上觉得浏览时误切换太多，可改成「滚动只浏览、点击才换机」，改动很小。
3. **计数语义**（已按推荐实现）：每台相机各装一卷 36 张、倒计数；拍完第 36 张提示「这卷拍完了 · 已装上新卷」。成片记录卷号/张号，供 M5 相册「按胶卷」分组。

### 7.2 / 7.6 质感清单自查（取景器页）

- 7.2 布局 ✓ 状态行三段（倒计数 / 相机名 / 画幅图标）；一级可点元素 = 快门、胶卷条、闪光、翻转、上一张缩略图，共 5 个
- 7.2 框线 ✓ 四角 L 线（1px，暖白 40%）+ 三分线（15%），随画幅变化，换机先淡出再淡入 200ms
- 7.2 快门 ✓ 72px 同心圆、按下缩放 0.92 + 重震动 + 黑场 80ms（M2）
- 7.2 胶卷条 ✓ 88px 磨砂（低端机纯色）、64px 卡片、名称间距 6px、锁标半透明遮罩 + 角标、选中上浮 4px + 2px 主题色描边、吸附居中
- 7.2 换机 ✓ 黑场 ≥120ms → 新参数 → 框线淡入 → 相机名打字机
- 7.6-1 ✓ 自定义导航，底色铺满 · 7.6-2 ✓ 可点元素均有 hover-class · 7.6-3 ✓ 胶卷条惯性滚动、无露白 · 7.6-4 ✓ 无纯白/纯黑（令牌测试强制）· 7.6-5 ✓ 缩略图均有描边 · 7.6-7 ✓ 快门 heavy / 换机 light / 保存 medium
- 7.6-6 骨架屏、7.6-8 显影、7.6-9 过片动画：M4–M6

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
