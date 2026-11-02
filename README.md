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
