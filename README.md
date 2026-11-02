# Claude-code
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
| `auteur` | [agiwhitelist/auteur](https://github.com/agiwhitelist/auteur)（★1k） | 把网站当电影来导：分镜 → 决策单 → 搭建 → `slopscan` 反 AI 味检查 → 截图验收；带滚动电影配方库（GSAP + Lenis、钉住场景、转场） |
| `awwwards` / `jury` | [juliobsz/skills](https://github.com/juliobsz/skills)（★1k） | 以 Awwwards 年度站点为标准一句话出站；`jury` 按 Awwwards 评审维度给网站打分 |
| `gsap-core` · `gsap-timeline` · `gsap-scrolltrigger` · `gsap-plugins` · `gsap-utils` · `gsap-performance` · `gsap-react` · `gsap-frameworks` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills)（★17.7k，GSAP 官方） | 正确使用 GSAP 的官方规范：时间轴、ScrollTrigger 钉住与 scrub、SplitText 等插件、性能 |

更新：重新克隆上游仓库并覆盖对应目录；Impeccable 也可用 `npx impeccable install --providers=claude --scope=project`。

## 示例：一握青蒿（`tu-youyou/`）

用上面的 auteur（direct 电影模式）+ GSAP 官方技能做的屠呦呦介绍页，单个 HTML 文件，直接在浏览器打开 `tu-youyou/index.html` 即可。

- `design/COMMIT-SHEET.md`、`design/STORYBOARD.md`：动手前写下的设计决策和六场分镜。
- 高潮场：钉住滚动 420vh，190 个样品编号被划掉 → 葛洪原句竖排浮现、朱笔圈出“渍” → 温度从 100°C 滚到 34.6°C → 盖下“191”印章。
- 植物线描按黄花蒿形态程序生成；青蒿素结构式的连接方式用 RDKit 校验过分子式 C15H22O5。
- 系统设置了“减少动态效果”时，页面切换为静态排版，所有内容照常可读。

## 示例：死亡商人（`nobel/`）

阿尔弗雷德·诺贝尔的插画长卷，用 auteur（direct 模式）+ GSAP 官方技能 + Remotion 搭建。本地预览需要支持 HTTP Range 的静态服务器（视频拖动依赖分段请求），例如 `npx http-server nobel`。

- **插图**：诺贝尔与路德维希的肖像、肖像铜章、温特维肯与博福斯工厂、海勒内堡旧屋，全部是百年以上的历史图像，统一处理成铜版线刻；显微镜一章用海克尔 1904 年的硅藻图版。
- **Remotion 动画**（源码在 `nobel/remotion/`）：
  - `Explosion`：4 C₃H₅N₃O₉ → 12 CO₂ + 10 H₂O + 6 N₂ + O₂，80 个原子逐一飞进 29 个气体分子，页面上随滚动逐帧推进；
  - `Journey`：水线刻法的欧洲地图上，诺贝尔 1833–1896 年的 11 站行迹。
  - 重新渲染：`cd nobel/remotion && npm i && npx remotion render src/index.ts Explosion out/explosion-raw.mp4`。
- **字体**：思源宋体标题、思源黑体正文、霞鹜文楷引文、Cormorant Garamond 西文。
- **闯关**（`nobel/game.js`）：每章末尾一道关卡题，共 7 关（选择、配平方程式、拖进烧杯、按时间顺序点击、多选）。正文随时能读；答对得到一颗宝石，触发授予仪式，并打开下一关。集齐七颗后打开终章，可以生成写有小组名的通关纪念卡。
- **情景剧场**（`nobel/theatre.js`）：正文里的四张情景卡，点开后从卡片展开成全屏剧场，有黑边、地名字幕、布景、道具动画和诺贝尔的肖像。实验台用拉瓦锡《化学基础论》（1789）图版里的玻璃器皿做道具，摇晃或加热会引发完整的爆炸动画；另外三场是读讣告、伯尔尼的信、签遗嘱（羽毛笔跟随签名，盖火漆印）。
- **特效**（`nobel/fx.js`）：粒子引擎（爆炸、火焰、火花、玻璃碎片、浓烟、宝石闪光）、墨迹蒙版、合成音效。
- **汇报用**：右上角宝石匣里有“演示模式：七关全部打开”和“清空进度”。进度只存在当前浏览器里。
- 第一版（简笔线描版）在 git 历史里。
