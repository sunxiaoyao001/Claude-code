# 自主战线 · Autonomous Front

网页端 AI 自主对战即时战略游戏。10v10 / 15v15 / 20v20 的步兵与坦克在程序化生成的沙漠、雪原、城市巷战地图上自主作战；玩家只是**观察者**：拖动、缩放视角，点击任意单位查看它此刻的状态与行为树决策。

A web RTS where AI armies fight on their own. Pick a battlefield and scale, then watch squads take cover, dodge and throw back grenades, smoke-screen rescues and advance behind tanks — click any unit to see its live behaviour tree.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # simulation + AI + navigation tests
npm run build      # static build in dist/ (relative paths, host anywhere)
```

## 玩法与操作

| 操作 | 说明 |
| --- | --- |
| 拖动 / WASD / 方向键 | 平移视角（可在设置中开启屏幕边缘滚动） |
| 滚轮 / Q / E / 双指捏合 | 以光标为中心缩放 |
| 单击单位 / 双击单位 | 查看单位详情 / 跟随该单位 |
| Tab / Shift+Tab | 在存活单位间切换并跟随 |
| 空格 / `.` | 暂停 / 暂停时单步推进一帧逻辑 |
| 1 2 3 4 | 0.5× / 1× / 2× / 4× 倍速 |
| F · I · H · B | 跟随开关 · 战场统计 · 血条模式 · AI 调试叠加 |
| Esc | 取消选择 / 打开战斗菜单 |
| 小地图 | 点击或拖动跳转视角 |

开战前可设置：地图类型、对战规模、每方坦克数量（0–3）、双方各自的 AI 难度（新兵 / 正规军 / 老兵 / 精锐）、胜利条件（占领战 / 歼灭战）、时间限制和地图种子（相同种子 + 设置可完全复现一场战斗）。

## 功能一览

**AI 单位系统（行为树）** —— 每个士兵与坦克都运行独立的行为树，分为三层：

- **感知**：视野锥 + 视线检测（墙体、树木、烟雾都会遮挡），姿态与室内隐蔽影响被发现距离，枪声暴露位置，小队之间无线电共享敌情，手雷按技能等级有反应延迟。
- **决策**：优先级选择器依次评估——倒地爬向掩体 → 手雷反应（来得及就**反扔手雷**，否则扑倒躲避）→ 反装甲（火箭兵攻击坦克、其他人规避）→ **救援倒地战友**（战友暴露时先投**烟雾弹**掩护）→ 战斗（找掩体、换弹、被压制时放烟后撤、手雷攻击、火箭弹攻坚、班长放烟掩护推进、**依托坦克作为移动护盾**、依托掩体射击、侧翼包抄、警戒、交替跃进）→ 治疗伤员 / 搜刮弹药 → 执行小队命令。射击由并行的"火力控制"分支独立完成。
- **行动**：A* 寻路 + 时间切片路径服务、转向与分离、压制、换弹、投掷物理、救治读条等。
- **指挥层**：团队指挥官按据点价值与敌我兵力给小队分配占领 / 防守 / 突击命令；救援协调为倒地士兵指派最近的医疗兵。
- 每个单位都有独立状态：生命值、弹药（弹匣 + 备弹）、手雷 / 烟雾弹 / 火箭弹、位置、压制值，以及 正常 / 受伤 / 倒地 / 阵亡 状态。

**战场系统**

- 三种程序化地图（180° 中心对称，保证公平）：沙漠（土坯院落、岩石、棕榈）、雪原（松林、冰湖、木屋、石砌山屋）、城市巷战（街区、砖混建筑、车辆残骸、路障）。带门窗的建筑、室内隔墙、废墟、沙袋工事，并自动修复连通性。
- 物理破坏（Matter.js）：墙体有生命值，可被子弹啃坏、被爆炸摧毁并飞出碎块；坦克能**撞穿建筑**；承重墙损毁过多会导致屋顶坍塌；坦克残骸成为新的掩体。
- 投射物：手雷在墙面和地面真实弹跳、会滚动；烟雾弹形成逐渐扩散的烟云，真实阻挡视线；火箭弹与坦克炮弹按弹道飞行；爆炸有冲击波，会推开碎块、手雷与士兵；坦克装甲区分正面 / 侧面 / 后部。

**观察系统与界面**

- 2.5D 等距视角；所有士兵（5 种兵种 × 13 种姿态 × 8/16 方向）、坦克（32 方向）、墙体、道具都在启动时由程序化"体素"渲染器生成，无外部美术资源。
- 单位检视面板：生命 / 弹药 / 压制 / 掩护度，感知 → 决策 → 行动 流水线，以及**实时行为树**（决策路径或完整树，运行中 / 成功 / 失败 / 未评估）。
- 选中单位时可显示路径、视野锥、目标线、选定掩体与已知敌情；被遮挡的单位以轮廓透视显示，屋顶在有人时自动淡出。
- 战场统计面板（伤亡、命中率、各项战术次数、兵力变化曲线）、小地图、战斗日志、战术提示、战后报告与最佳表现。
- 中英双语，设置自动保存。

## 架构

```
src/game/sim/        与渲染无关的确定性模拟（Node 中可跑测试）
  Simulation.ts      30 Hz 固定步长主循环：感知 → 指挥 → 行为树 → 动作 → 物理 → 投射物 → 据点/胜负
  ai/bt/             行为树运行时（Selector / Sequence / MemSequence / Parallel / 装饰器，记录每帧状态）
  ai/                soldierTree、tankTree、perception、tactics（掩体评分、投弹判断…）、commander、locomotion
  combat/            hitscan 射击与掩体遮挡、伤害/倒地/救援、手雷/烟雾/火箭/炮弹/爆炸/建筑破坏
  map/ nav/          地图数据与生成器、掩体图、A* 寻路、视线
  PhysicsWorld.ts    Matter.js 封装（静态墙体、士兵、坦克、手雷、碎块）
src/game/render/     Phaser 3 等距渲染（插值显示，与逻辑解耦）、程序化纹理、特效、相机
src/game/GameController.ts  固定步长循环 + 速度控制 + 向 React（Zustand）发布 HUD 快照
src/screens  src/hud 界面（React + Tailwind + shadcn 风格组件 / Radix）
src/i18n             中文 / English
```

扩展方式：新增行为只需在 `soldierTree.ts` 中组合新的条件 / 动作节点（检视面板会自动显示）；新增地图类型在 `map/generate.ts` 中写一个生成函数；武器、兵种与难度参数集中在 `sim/config.ts`。

## 调试与平衡工具

```bash
npm run sim:batch            # 多种子 × 三种地图批量对战，输出时长、胜负与战术统计
CFG='{"scale":20,"tanks":3}' npm run sim:batch
npm run sim:nodes            # 行为树各节点成功/失败/运行次数直方图
IDS='[3,6]' npm run sim:trace  # 逐帧追踪指定单位的决策路径
```

浏览器控制台中可用 `__ctl`（游戏控制器）、`__store`（状态）与 `__game`（Phaser 实例）。

## 发布

`npm run build` 产出纯静态站点（`base: './'`，可部署在任意路径）。仓库已包含 GitHub Actions：

- `ci.yml`：类型检查、测试、构建；
- `deploy.yml`：推送到 `main` 后自动发布到 GitHub Pages（首次需在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**）。

## 设计工具

仓库同时安装了一组网站设计 Skills（`.claude/skills/`：impeccable、frontend-design、ui-ux-pro-max 等），用于界面设计与审查。
