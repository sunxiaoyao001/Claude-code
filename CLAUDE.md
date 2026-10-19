# Claude Code 项目提示词：开发「胶片相机」微信小程序

> 使用方法：在项目根目录新建 `CLAUDE.md` 并粘贴本文件全部内容（或直接把本文件作为首条消息发给 Claude Code），然后按里程碑逐段推进。占位符 `{{APP_NAME}}` 请先替换为产品名。
>
> **P0 研究反哺（已拍板，2026-10-19）**：`docs/research/conflicts.md` 中 C-01～C-23 全部按推荐方案通过，已回写到本文件对应条目（v6）。研究依据见 `docs/research/01`–`05`。

---

你现在是一位资深的微信小程序开发者 + WebGL 图形工程师 + 产品设计师，负责从零打造一款对标 **NOMO CAM / Dazz Cam / HUJI Cam** 的胶片模拟相机微信小程序：**{{APP_NAME}}**。

你不是在做"滤镜小程序"，而是在做一款**有仪式感的复古相机**。请始终记住四条产品原则：

1. **所见即所得**：取景器里实时预览的，就是出片效果（实时渲染，不是拍完才加滤镜）
2. **无后期哲学**：不给用户提供调参界面。风格属于"相机"，不属于用户——这是 NOMO 验证过的核心体验
3. **相机即内容**：每一款"相机" = 拟物 UI 皮肤 + 色彩科学（采样自真实胶卷）+ 特效参数，以配置包形式持续上新
4. **小程序 = 装在微信里的相机**：善用分享裂变（拍完一张卡片式分享给好友/群），规避 App 生态的账号、下载、审核成本

---

## 一、产品定义

- **产品名**：{{APP_NAME}}（占位，避开 NOMO/DAZZ/HUJI 等已注册商标）
- **平台**：微信小程序（仅此一端），原生框架 + TypeScript，基础库最低版本 ≥ 3.0.0（隐私接口需 ≥ 2.32.3；在公众平台「基础库最低版本设置」中配置）
- **相机阵容哲学**：**每款相机必须有真实原型（具体到机型 + 胶卷型号）**，如"徕卡 M3 + Ilford HP5"。产品显示名用原创中文昵称，真实原型写在 `inspiredBy` 字段并在详情页标注"致敬"——这是 NOMO/Dazz 的通行做法（指示性描述合法且降低沟通成本），但**产品名本身不得含商标词**（Kodak/Fuji/Polaroid/Leica/Contax/Portra/CineStill/Tri-X 等）
- **目标用户**：18-30 岁，喜欢胶片质感但不想付真胶片成本（¥80-150/卷）的 Gen Z / 年轻女性，主要在小红书/微信生态传播
- **语言**：代码与注释英文，UI 文案中文

## 二、技术栈（硬性约束，不得更换）

| 层 | 技术 |
|---|---|
| 框架 | 微信小程序**原生**（不用 Taro/uni-app——相机+WebGL 深度定制时原生可控性最好） |
| 语言 | TypeScript（`miniprogram-api-typings`），`tsc` 编译到 `dist/`，微信开发者工具指向 `dist/` |
| 相机 | `<camera>` 组件 + `cameraContext.onCameraFrame()`（CameraFrameListener，frame-size="medium"，实际约 480×640、由系统决定；M1 对比 medium/large 后定档） |
| 实时渲染 | 全屏 `canvas type="webgl"`（**WebGL1 / GLSL ES 1.0**——小程序无 WebGL2 稳定保障），帧回调上传纹理渲染 |
| 出片 | `takePhoto({quality:'original'})`（`wx.getImageInfo` 校验真实尺寸，失败/过小回退 `'high'`）→ 离屏 WebGL（`wx.createOffscreenCanvas({type:'webgl'})`）同一套 shader 重渲染 → `gl.readPixels` → 2D 画布（同画布绘制日期戳/边框）→ `wx.canvasToTempFilePath`（jpg）→ 小程序内相册；用户主动"存到手机"才 `wx.saveImageToPhotosAlbum` |
| 日期戳 | Canvas 路径绘制七段数码管（零字体资产、零许可风险）；OFL 字体（`wx.loadFontFace` 仅支持 https/Data URL，需 `scopes:['native']`）仅作备选 |
| 状态存储 | `wx.setStorageSync`（当前相机、免费额度、解锁状态、设置；单 key ≤ 1MB、总量 ≤ 10MB） |
| 构建/CI | `miniprogram-ci`（Linux 云端可跑，不依赖 Mac）：`build.sh` = lint + tsc + vitest + 构建复制 + 包体积门禁 + preview 生成预览二维码（缺密钥或网络不可达时明确跳过并说明原因） |
| 依赖 | 零**运行时** npm 依赖；devDependencies 仅 `typescript`、`miniprogram-api-typings`、`eslint`、`typescript-eslint`、`vitest`、`miniprogram-ci` |

**小程序相机能力边界**（写代码时必须遵守，不要试图突破）：
- `onCameraFrame` 供帧率与帧尺寸由系统决定（约 ≤ 30fps，medium 多为 480×640），帧数据为 RGBA ArrayBuffer
- `takePhoto` 输出分辨率由设备决定（社区实测 `high` 可低至 720×1280），Android 返回 JPG、iOS 返回 PNG
- 本地用户文件 + 缓存文件合计 ≤ 200MB（`USER_DATA_PATH` 共用此配额）
- 无 RAW、无手动白平衡/对焦点、无光圈模拟；`flash` 属性支持 auto/on/off/torch
- 保存相册每次弹系统确认（`scope.writePhotosAlbum`，拒绝后引导 `wx.openSetting`）——因此产品交互设计为：拍完先进**小程序内相册**（用户数据目录 `wx.env.USER_DATA_PATH`），用户主动点"存到手机"才写系统相册
- 页面栈保持浅：相机页、相册页、相机列表页、设置页共 4 页，相机页常驻

## 三、系统架构

```
{{APP_NAME}}/
├── project.config.json
├── build.sh                      # lint + tsc + miniprogram-ci preview
├── miniprogram/                  # TypeScript 源码
│   ├── app.ts / app.json
│   ├── pages/
│   │   ├── camera/               # ★ 相机页（常驻）：camera 组件 + WebGL canvas + 皮肤 UI
│   │   ├── rolls/                # 相机列表（相机库，按系列分组）
│   │   ├── gallery/              # 小程序内相册（本地文件系统）
│   │   └── settings/             # 设置、解锁、关于
│   ├── components/
│   │   ├── viewfinder-skin/      # 参数化取景器皮肤（系列皮肤 + delta 覆写）
│   │   ├── film-roll-strip/      # 底部胶卷条（换机）
│   │   └── unlock-modal/         # 解锁弹层（今日限免 / 激励视频 / 虚拟支付）
│   ├── styles/
│   │   └── tokens.wxss            # ★ 设计令牌（第七节 7.1，M0 落地，全局唯一视觉来源）
│   ├── core/
│   │   ├── camera/
│   │   │   ├── FrameFeed.ts     # onCameraFrame 封装：启动/暂停/帧率统计/降级
│   │   │   └── ShotCapture.ts    # takePhoto → 离屏全分辨率渲染 → 临时文件
│   │   ├── gl/
│   │   │   ├── GLRenderer.ts     # WebGL1 封装：program/texture/FBO 管理
│   │   │   ├── LutLoader.ts      # 二进制 LUT → 2D 打包纹理（WebGL1 无 3D 纹理！）
│   │   │   ├── Pipeline.ts       # 管线编排（预览低配 / 出片全配）
│   │   │   └── shaders/          # .frag 文件 + 运行时编译缓存
│   │   │       ├── lut.frag
│   │   │       ├── halation.frag # 阈值提取 + 双半径模糊（FBO ping-pong）+ 红移 screen
│   │   │       ├── grain.frag    # hash 噪声 + 亮度加权
│   │   │       ├── leak.frag     # 漏光纹理 screen 混合 + 边缘径向遮罩
│   │   │       ├── vignette.frag
│   │   │       └── composite.frag # 合并 pass（性能优化）
│   │   ├── pack/
│   │   │   ├── SeriesProfile.ts # 八份系列基础档案（常量）
│   │   │   ├── CameraPack.ts     # pack 模型 + series delta 继承合并器
│   │   │   ├── PackStore.ts      # 内置注册 + CDN 按需下载 + 本地缓存（LRU）
│   │   │   └── AssetCache.ts     # LUT/漏光纹理下载、校验、用户目录管理
│   │   ├── stamp/
│   │   │   └── DateStamp.ts      # 2D canvas 日期戳绘制（路径七段数码管 + 橙色 #FF9E2C）
│   │   └── storage/
│   │       ├── ShotStore.ts      # 拍摄记录（元数据 + 文件路径，不存像素；相册配额管理）
│   │       └── Entitlement.ts    # 解锁引擎：免费层/今日限免 + 激励视频 + 虚拟支付（默认关闭）
│   └── assets/
│       ├── luts/                  # 内置免费相机的二进制 LUT（其余走 CDN）
│       ├── leaks/                 # 通用漏光纹理（CC0，控制在 ~200KB）
│       └── fonts/                 # 备选：OFL 日期戳字体（默认不用，日期戳走路径绘制）
├── pack-tools/                    # Node 构建期工具（不上小程序，`node --experimental-strip-types` 直接运行）
│   ├── cube2bin.ts                # .cube → 紧凑二进制 LUT（33³×3 字节 ≈ 107KB/款）
│   ├── luts-spectral/             # spectral_film_lut 离线导出的 .cube（约 26 款有胶卷依据，入库；Python 仅人工离线使用，不进 CI）
│   └── gen-placeholder-luts.ts    # 其余款程序化占位 LUT + 49 张统一风格样张批量生成（真实胶卷采样后替换）
└── tests/                         # vitest：pack 继承合并、LUT 解析、随机种子、额度逻辑
```

**数据流（预览）**：
`camera` 组件 → `onCameraFrame`(RGBA ArrayBuffer) → 首帧 `texImage2D` 分配、之后 `texSubImage2D` 上传 → shader 链（LUT → grain+halation 合并 pass）→ WebGL canvas 全屏显示。**同一帧随机种子锁 333ms**（模拟"活"的颗粒），出片时重新随机。随机元素（漏光、暗房工艺变量、成片颗粒种子）在拍摄瞬间确定：预览展示"底片基调"，随机元素只在成片揭晓——这是"所见即所得"的有意例外（开盲盒）。

**数据流（出片）**：
`takePhoto` 原图（original → 回退 high）→ 离屏 WebGL 全链路（含完整 halation 多 pass）→ `readPixels` → 2D 画布合成日期戳/边框 → `canvasToTempFilePath`（jpg 0.92）→ 存入用户数据目录 + 记录 ShotStore → UI 播放过片动画。

**数据流（换相机）**：
选中 pack → 若资源未缓存 → `wx.downloadFile`（带进度）→ 渲染管线按 pack 参数重建 → 皮肤组件按 ui 字段换装。目标换机 < 800ms（已缓存时 < 300ms）。

## 四、渲染管线规格（核心，逐条实现）

**管线顺序固定**：暗角 → 3D LUT → halation → 颗粒 → 漏光 → 边框/日期戳（2D 合成）。

- **3D LUT（WebGL1 无 3D 纹理）**：`.cube`（33³）构建期转二进制（布局无关）；运行时展开为 **198×198 的 2D 纹理（6×6 瓦片，每瓦片 33×33，B 通道选瓦片、瓦片内 x=R / y=G）**，shader 内瓦片内双线性 + 相邻两片 `mix`（查表代码见 `.claude/skills/film-pipeline`）。**全链路按 sRGB 处理**（小程序无色域检测接口，WebGL canvas 无 colorSpace 配置）。
- **Halation（光晕）**：不是普通辉光。① 亮度软阈值（≈0.85，`smoothstep(t-0.1, t+0.1, luma)`）提取高光掩码写入低分辨率 FBO——**掩码从 LUT 之前的图像提取**（LUT 常压高光，之后取阈值不稳定），合成仍在 LUT 之后；② 掩码做 2 级高斯模糊（半径 ~8px 与 ~24px，可分离 FBO ping-pong，出片按分辨率缩放）；③ 模糊结果**向红色偏移**（权重约 `(1.0, 0.35, 0.08)`，参考 CineStill 800T 红晕）；④ screen 混合回原图。**性能降级开关**：按渲染耗时与丢帧率（相机供帧数 − 实际渲染数）判断，**不以相机供帧率判断**（供帧率由系统决定）；启动时用 `wx.getDeviceBenchmarkInfo` 档位初始化；超预算时预览自动关 halation（仅出片保留），`FrameFeed` 负责统计。
- **Grain（颗粒）**：**禁止静态噪点贴图**。无 sin 的 GLSL hash（需片元 highp，启动时检测）+ 帧种子；颗粒强度与亮度相关（中间调最重，`sin` 形权重）；**颗粒尺寸按图像高度归一**，保证预览（~640px）与出片观感一致。无 highp 的设备降级为"每帧随机偏移/翻转的噪声纹理"（非静态，仍是活颗粒）。pack 参数：`grain.size`, `grain.intensity`, `grain.lumaWeight`。
- **Light leak（漏光）**：CC0 预烘焙 PNG（橙/红/蓝紫）或程序化生成，每次拍摄随机选 1 张 + 随机翻转/位置/透明度，`lightLeak.probability` 控制出现概率（**随机性 = 开盲盒惊喜，HUJI 验证过的传播机制**）；screen 混合 + 径向边缘遮罩。
- **Date stamp**：右下角橙色 LED 数码管风格（`#FF9E2C`，**Canvas 路径绘制七段数码管**），格式 `yyyy/MM/dd` / `HH:mm`，**日期可自定义**（"告诉朋友你 20 年前来过"是 OldRoll 验证过的传播点）。
- **性能预算**：预览（相机帧约 480×640）shader 链 ≤ 20ms/帧（中端安卓机基准，真机调试验证）；出片长边 = `min(takePhoto 实测长边, 设备档位上限（低 2048 / 中 3072 / 高 4096）, GL 纹理与渲染缓冲上限)`，全链 ≤ 2.5s（按实测分辨率验收）；冷启动到取景器 < 2s。

## 五、CameraPack 系统：两层配置 + 资源按需下载

**配置分层**（支撑 49 款规模与后续每两周上新）：每款相机 = `series 基础档案（SeriesProfile 常量）` + `pack.json 个性 delta`。未声明字段自动继承系列档案。**新增一款相机 = CDN 上一个资源包 + 一条注册记录，零代码改动、零发版**。

```json
// pack.json 示例（属于 A 日系卷系列，大部分参数继承）
{
  "id": "pocket-gold",
  "name": "口袋金",
  "tagline": "日常 · 金色午后",
  "series": "jp-color",
  "inspiredBy": "Olympus mju-II + Kodak Gold 200",   // ★ 真实原型，详情页展示"致敬"
  "free": false,
  "filter": {                        // 只写 delta，未写项走 SeriesProfile
    "grain": { "intensity": 0.2 },
    "halation": { "strength": 0.25 },
    "lightLeak": { "probability": 0.3 }
  },
  "ui": { "shutterStyle": "mechanical-gold", "themeColor": "#E8C88A" }
}
```

**资源策略**（主包 2MB 硬限制）：
- 主包只放：代码 + 3 款免费相机的 LUT + 通用漏光 + UI（< 2MB；`build.sh` 1.8MB 预警、2MB 失败）
- 其余 46 款的 LUT/纹理/皮肤图放 **CDN**（`AssetCache` 下载到 `USER_DATA_PATH`，SHA256 校验，LRU 上限 50MB、按剩余空间动态收缩至最低 20MB），首次选用时下载（带进度条与失败重试）
- **本地 200MB 总配额**（用户文件 + 缓存共享）：相册用量达 80% 时相册顶部轻提示"已拍 N 张，存到手机后可清理"
- CDN 域名必须是 HTTPS 且已备案，在小程序后台配置 downloadFile 合法域名——**这是上线前置项**，写进 README checklist
- 为运营上新预留：`PackStore` 支持远程 pack 清单（版本号 + 资源 URL），本地无此 id 即按需拉取

## 六、首发相机阵容：八大系列 49 款（全部真实原型，NOMO 同级规模）

**每款必须对应真实存在的相机机型 + 胶卷（或工艺）**，`inspiredBy` 字段必填。产品名原创。以下为完整首发清单：

### A · 日系彩色 135（8 款）——免费旗舰在此系列

| id | 名称 | 真实原型 | 视觉关键词 |
|---|---|---|---|
| sunny-fun | 阳光罐头 ★免费 | Kodak FunSaver 一次性相机（内置 ISO 800） | 暖黄、轻漏光、日期戳（NOMO INS2 同原型） |
| pocket-gold | 口袋金 | Olympus mju-II + Kodak Gold 200 | 日常金调、优雅饱和（Dazz Classic M 同原型） |
| green-flash | 绿闪 | 富士 QuickSnap Flash + Superia X-TRA 400 | 绿倾向、清爽 |
| knight-t2 | 骑士 | Contax T2 + Agfa Vista 200 | 网红街机、蓝绿阴影 |
| moonlight | 月光机 ★免费 | 富士 NATURA S + Fujifilm Naturia 1600 | 夜拍高感、暖亮（NOMO 135 LUNE 同原型） |
| red-box | 红盒 | 美能达 TC-1 + Kodak Ektar 100 | 高饱和、浓郁 |
| sakura-premium | 绯樱 | Contax T3 + 富士 Superia Premium 400（日本本土版人像卷） | 日杂粉调、肤色通透 |
| pastel-160 | 盐系 | Yashica T4 + Kodak Portra 160 | 低饱和奶油色、清透日常（Terry Richardson 同机身） |

### B · 街头黑白（6 款）

| id | 名称 | 真实原型 | 视觉关键词 |
|---|---|---|---|
| m3-hp5 | M3 黑白 ★免费 | 徕卡 M3 + Ilford HP5 Plus 400 | 经典人文黑白（NOMO 135 M3 同原型） |
| street-gr | 街拍 | 理光 GR21 + Kodak Tri-X 400 | 森山大道式高反差粗颗粒 |
| night-3200 | 夜猫 | 尼康 FM2 + Ilford Delta 3200 | 夜拍黑白粗颗粒 |
| silver-50 | 银盐细语 | 禄来 35 + Ilford PAN F Plus 50 | 极细腻低反差 |
| ql17-street | 连动 | 佳能 Canonet QL17 G-III + Fuji Neopan 400 | 街头旁轴、柔和灰阶（"穷人徕卡"） |
| silk-xp2 | 绢黑 | 奥林巴斯 XA + Ilford XP2 Super（C-41 黑白） | 极平滑无颗粒黑白、口袋传奇机身 |

### C · CCD 千禧（6 款）——小红书引流系列

| id | 名称 | 真实原型 | 视觉关键词 |
|---|---|---|---|
| ccd-casio | 冷白闪 | 卡西欧 Exilim EX-S500（2005） | 冷白皮闪光、橙日期戳、屏幕补光 |
| ccd-sony | 蓝调 | 索尼 Cyber-shot DSC-T10（2006） | 蓝调倾向、低动态高光截断 |
| ccd-canon | 暖卡 | 佳能 Digital IXUS 860 IS（2007） | 暖调卡片机 |
| ccd-fuji | 冷萃 | 富士 FinePix F40fd（2007） | CCD 肤色口碑王、柔和高光 |
| ccd-nikon | 转方 | 尼康 Coolpix SQ（2003，旋转化身） | 千禧工业设计感、玩具艳色 |
| vhs-c | 老录像 | 索尼 Handycam（VHS-C 磁带） | 扫描线 + RGB 色差 + 磁带噪声 |

### D · 即时成像（6 款）

| id | 名称 | 真实原型 | 视觉关键词 |
|---|---|---|---|
| polaroid-600 | 白边 600 | Polaroid 600 + Time-Zero 胶片 | 白框方图、褪色 |
| instax-mini | 迷你相纸 | 富士 instax mini 90 | 窄白框、明亮清新 |
| sx-70 | 棕调 | Polaroid SX-70 | 暖棕泛黄、边缘棕化 |
| instax-wide | 宽纸 | 富士 instax WIDE 300 | 宽幅相纸 |
| spectra | 光谱 | Polaroid Spectra | 加宽画幅、冷调偏品红 |
| palm-go | 掌心 | Polaroid Go（2021，最小拍立得） | 极小相纸、圆角白框 |

**系列机制**：拍下后**显影动画 2.5s 渐显**（模拟拍立得显影，等待本身是仪式感）。

### E · 中画幅（5 款）

| id | 名称 | 真实原型 | 视觉关键词 |
|---|---|---|---|
| hasselblad-6x6 | 六六方图 | 哈苏 500C/M + Fujifilm Pro 400H | 6×6 方幅、奶油青绿日系 |
| mamiya-7 | 六七 | 玛米亚 7 II + Kodak Portra 400 | 6×7、细腻肤色层次（人像王组合） |
| rollei-acros | 双反黑白 | 禄来 Rolleiflex 2.8F + Fujifilm Acros 100 | 细腻黑白、层次丰富 |
| pentax-67 | 绢丝 | 宾得 67 + Kodak Portra 160 | 婚纱级肤色、丝滑过渡（写真馆传奇） |
| holga-120 | 塑料盒子 | Holga 120N | 塑料镜头、重暗角、随机漏光 |

### F · 电影与反转片（6 款）

| id | 名称 | 真实原型 | 视觉关键词 |
|---|---|---|---|
| xpan-wide | 宽幕 | 哈苏 XPan + Fujifilm Velvia 50 | 65:24 宽幅、浓烈反转片风光 |
| cinestill-800t | 夜电影 | CineStill 800T（Beaulieu 4008 电影机） | 钨光片、halation 红晕之王 |
| kodachrome | 柯达克罗姆 | Kodachrome 25 + 徕卡 M6 | 传奇停产反转片、复古浓烈 |
| super8 | 八毫米 | 柯达 Super-8 + Vision3 500T | 4:3 小窗、抖动框、粗颗粒 |
| vision-50d | 日光片场 | Kodak Vision3 50D（电影负片） | 极细颗粒、通透日光电影感 |
| e100-slide | 幻灯 | Kodak Ektachrome E100 + 尼康 F6 | 干净中性反转片、蓝调天光 |

### G · 玩具胶片（6 款）

| id | 名称 | 真实原型 | 视觉关键词 |
|---|---|---|---|
| lomo-purple | 紫卷 | Lomo LC-A + Lomochrome Purple | 紫→绿的换色狂想 |
| supersampler | 四格 | Lomo Supersampler | 一秒四连拍 2×2 拼图 |
| pen-half | 半格 | 奥林巴斯 Pen EE-3 | 半格、两拍一张 |
| pinhole | 针孔 | Holga WPC 120 针孔相机 | 极重暗角、超软焦 |
| soft-dream | 柔梦 | Diana F+（120 玩具相机） | 梦幻柔焦、边缘朦胧漏光 |
| red-shift | 红移 | Lomography Redscale XR 50-200 | 胶片背曝光的橘红反转 |

### H · 暗房工艺（6 款）——开盲盒系列

| id | 名称 | 真实原型 | 视觉关键词 |
|---|---|---|---|
| expired-roll | 过期卷 | 2005 年产过期富士 C200（胶片老化） | **每张随机色偏 + 灰雾**、对比衰减 |
| push-1600 | 迫冲 | Tri-X 400 按 EI 1600 迫冲 | 粗颗粒 0.6、高反差偏色 |
| cross-process | 反冲 | E6 反转片用 C-41 药水交叉冲洗 | 强烈青绿色偏、高光翻黄 |
| cinema-bulk | 分装电影卷 | Kodak Vision3 500T 分装（除碳不净） | 红晕、暗调（近年摄影圈热门） |
| aero-ir | 航空梦 | Kodak Aerochrome 094 彩色红外（停产军规传奇） | **红→粉、绿→红**的假色反转（天价胶卷的平替体验） |
| cyanotype | 蓝晒 | 蓝晒印相工艺（Cyanotype，1842） | 普鲁士蓝单色调、古典印相纸纹 |

**系列机制**：每张注入随机工艺变量（色相偏移 ±15°、灰雾量、对比衰减幅度）——开盲盒。

### 运营节奏（写进 Roadmap，不进首版代码）

上线即 49 款（对标 NOMO 库存规模），之后每两周上新 1 款（CDN 发 pack 即生效，无需发版），第一年冲 75+。上新队列：季节限定（春樱/夏花火/秋枫/冬雪，配 `seasonal` 标签）→ 联名位（`collab` 字段预留）→ 数据反馈加产。

**占位 LUT 策略**：有胶卷依据的约 26 款（约 18 款精确 + 8 款近似，对照表见 `docs/research/03-film-emulation-oss.md`）用 spectral_film_lut（MIT，基于胶卷 datasheet 光谱模拟）离线导出 33³ .cube（sRGB in/out）入库；其余款由 `gen-placeholder-luts.ts` 按参数矩阵（色温/通道增益/饱和度/对比曲线）程序化生成，保证区分度；真实胶卷采样 LUT 量产前替换（采样流程写入 README：每款原型拍 ColorChecker → 数字化标定 → .cube）。

## 七、UI/UX 设计规格（顶流质感，逐条硬性执行）

**总纲**：你看不到 NOMO/Dazz 的截图，因此本节把视觉规格**写死到具体值**——照做，禁止自由发挥偏离。设计哲学对标顶流胶片 App 的共识：**取景器拟物、全局壳极简、动效克制、内容即装饰**。工具感退后，"这是一台相机"的感觉在前。

### 7.1 设计令牌（`styles/tokens.wxss`，M0 就建立，全部页面只引用令牌）

> WXSS 不支持 `:root`：令牌定义在 `page { … }` 上（CSS 变量可继承进自定义组件）；`--accent` 由页面根节点 `style="--accent: {{accent}}"` 动态注入。

```css
/* 色彩 */
--bg-0: #0D0D0F;          /* 全局底色（比纯黑柔，顶流惯用） */
--bg-1: #141416;          /* 卡片层 */
--bg-2: #1C1C20;          /* 按钮层 */
--line: #26262A;          /* 0.5px 描边 */
--text-0: #F5F4F0;        /* 主文字（暖白，不是纯白） */
--text-1: #8E8E93;        /* 次级 */
--text-2: #5A5A5E;        /* 弱化 */
--accent: 由当前 pack 的 ui.themeColor 注入（换相机时全局 accent 跟着变——细节即质感） */

/* 字体栈（不加载中文 webfont，包体吃不消） */
--font-sans: -apple-system, "PingFang SC", "HarmonyOS Sans", "Source Han Sans SC", sans-serif;
--font-latin-display: "Futura Now Headline" 不可用 → 用系统 + 大写 + 0.12em letter-spacing 拉出印刷感;
/* 英文点缀小字（如 "FILM NO.07 / PORTRA 400"）全大写 + 加字距，是顶流 App 的廉价高级感秘诀 */

/* 排版：8pt 网格 */
--fs-hero: 34px / --fs-title: 22px / --fs-body: 15px / --fs-caption: 12px;
--radius-s: 6px / --radius-m: 12px / --radius-l: 20px;

/* 动效 */
--dur-micro: 150ms; --dur-base: 300ms; --dur-develop: 2500ms;
--ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
```

### 7.2 取景器页（产品门面，精致度要求最高）

- **布局**：全屏黑。顶部一行状态（左：胶卷计数 `03/36` **倒计数**、中：当前相机名（英文小字）、右：格式图标），底部胶卷条，左右两侧竖排微型按钮（闪光/翻转）——**一级可点元素总数 ≤ 5**
- **取景框线**：随 pack 的 `aspectRatio` 实时变化（3:4 / 1:1 / 65:24 宽幅 letterbox），四角 L 形框线（1px，#F5F4F0 at 40%）+ 中心三分线（更淡 15%），切换相机时框线**先淡出再淡入**（200ms）
- **快门键**：直径 72px 同心圆（外环 3px 描边 + 内圆填充 #F5F4F0），按下：scale(0.92) + `wx.vibrateShort({type:'heavy'})` + 全屏黑场一帧 80ms（模拟反光板）——**触觉+视觉双反馈，缺一不可**
- **胶卷条（底部换机器）**：高 88px 磨砂条（默认 `rgba(20,20,22,0.72)` + `backdrop-filter: blur(20px)`；低档机或不支持的环境按平台与设备档位启发式切到 `rgba(20,20,22,0.92)` 纯色——`wx.getSystemInfoSync` 已于 2.20.1 废弃，改用 `getDeviceInfo` / `getAppBaseInfo` / `getDeviceBenchmarkInfo`，封装成工具函数），横向 snap-scroll，卡片 64×64 圆角样张缩略 + 底部 6px 相机名；锁定的相机盖**半透明 + 右上角锁形角标**；当前选中卡上浮 4px + 2px accent 描边
- **换机动作**：胶卷条滚动停止 → 取景器黑场 120ms → 新 pack 参数生效 + 框线/皮肤淡入 → 状态栏相机名打字机式更新——**整个换机像真的装了一卷新胶卷**

### 7.3 相机库页（`rolls`，第二门面——"逛"的乐趣）

- **结构**：顶部胶片计数条（`49 台相机 · 已解锁 12`，英文小字 + 中文大字两级排版）→ 按系列分节的**全宽大卡流**
- **系列 Section Header**：系列色点（10px 圆点用 series 主题色）+ 系列中文名（--fs-title）+ 一句话描述（--fs-caption，--text-1）+ 右侧英文小字（如 "SERIES A · COLOR NEGATIVE 135"）
- **相机卡**：全宽，比例 16:10 大样张（圆角 --radius-m，1px --line 描边，**占位阶段直接用 pack-tools 对同一组测试照片渲染生成**——保证 49 张卡风格统一且真实）+ 底部信息条（左：相机名 --fs-title + 原型小字 --fs-caption，右：免费徽标/锁标）+ 点击整卡进入详情
- **详情页（每款相机的"档案"）**：hero 全宽 3:4 大样张 → 原型故事卡（"致敬 Contax T2 + Agfa Vista 200" + 50 字背景，如"T2 是 90 年代旁轴奢华的代名词，Vista 的蓝绿阴影是千禧街拍的记忆色"——**胶片谈资是分享文案素材**）→ 参数徽标行（画幅/感光度/颗粒/光晕，4 个 icon+词的横排）→ 场景样张三连（人像/街景/夜景）→ 底部固定"装上这卷"大按钮（56px 高，accent 填充）

### 7.4 相册页（`gallery`）

- 3 列瀑布流（卡片 4px 圆角 + 0.5px --line 描边），顶部 tab：「照片流 / 按胶卷」（按胶卷 = 同 pack 连拍分组，封面显示相机名 + 张数，模拟"一卷"的聚合）
- 大图查看：黑场全屏 + 横向 swipe + 双击缩放；底部操作条（保存到手机/分享/删除）
- **空状态**（新用户第一眼）：中央虚线框样张图 + "你的第一卷胶片，从这里开始" + 主按钮"去拍照"——空状态也是转化入口

### 7.5 分享卡与解锁弹层

- **分享卡**（`onShareAppMessage` 的 imageUrl）：**硬约束 5:4 比例（推荐 500×400），其他比例会被微信裁切**——canvas 按此规格绘制：出片 + 右下角小程序专属角标（相机名 + 产品 logo 水印，5% 透明度——不打扰成片）。分享路径带 `?pack=<id>`，好友打开直达"同款相机"；**不给分享者任何奖励、界面不出现"分享得 xx"类文案**（诱导分享红线）
- **留存抓手**：第 3 次拍摄完成后，出片页顶部轻提示条（非弹窗，不打断）"把这台相机放回桌面 · 添加到我的小程序"——小程序没有桌面图标的天然留存弱势，靠这个入口补
- **解锁弹层**：底部抽屉（非居中弹窗），84px 大样图 + 标题"解锁全部 49 台" + 价值条目（无限拍摄/49 台全开/持续上新）+ 主按钮按当前阶段切换文案（冷启动期"今日限免：<相机名> · 免费拍"/变现期"看一段视频 · 解锁 72 小时"）+ 次级"暂用免费 3 台"——**永远给退路，不劫持**

### 7.6 全局质感清单（验收时逐条过）

1. 状态栏/导航栏颜色随页面基底沉浸（`navigationStyle: custom` 全局自定义导航）
2. 每个可点元素有 `hover-class` 反馈（暗色系按压：--bg-2 → --line 渐变 + scale(0.97)）
3. 所有滚动区有 momentum 惯性（scroll-view 默认带）+ 无橡皮筋露底白边（底色铺满）
4. 文字禁用纯白 #FFF 与纯黑 #000（用暖白/柔黑，屏幕质感立刻"高级"）
5. 图片一律有 0.5-1px 描边或阴影（裸图贴在深底上 = 廉价感之源）
6. 骨架屏：样张位用 --bg-1 色块 + 呼吸透明度动画（1.2s 循环），禁止白屏等待
7. `wx.vibrateShort` 三档语义：快门 heavy / 换机 light / 保存 medium（type 仅支持 heavy / medium / light）
8. 显影动画（拍立得系）：出片后照片从右下滑入 + 2.5s 亮度对比渐显（CSS filter keyframes：brightness 0.4→1, contrast 0.6→1.05, saturate 0.5→1）——**D 系列的核心仪式感**
9. 过片动画（常规系）：拍完快门黑场 → 照片缩略从取景器"甩"到底部角落 300ms → 恢复

## 八、变现：解锁引擎（Provider 抽象，配置切换）

小程序的变现约束与 App 不同，方案必须同时兼容冷启动期与变现期：

- **免费层（合规底线，任何时候真实可用）**：sunny-fun / moonlight / m3-hp5 三款永久免费（暖调/夜拍/黑白三个流量方向）+ 每天其他相机试拍 3 张。"不能所有内容都只靠看广告解锁"是流量主合规的稳妥做法——免费层永不可削
- **冷启动期（`coldStart: true`，UV < 500、无广告库存时）**：① **今日限免**——每天轮换 1 台付费相机免费开放（每日回访理由，零后端）；② 每日试拍额度 3 → 10 张；③ 分享卡"同款相机"深链（见 7.5）。**严禁任何"分享/邀请得解锁或奖励"机制**——微信运营规范把"分享后解锁功能""分享得奖励（含虚拟奖品）""邀请好友助力"列为诱导分享，最重可封禁。裂变靠内容本身
- **Provider A · 激励视频**（流量主开通后启用，`coldStart: false`）：看 1 次激励视频 → 解锁全部相机 **72 小时**（OMO Roll 验证过的模式）。流量主开通条件：累计独立访客 **UV ≥ 500**（以公众平台后台显示为准）且无违规记录。`wx.createRewardedVideoAd` 在小程序端是**页面内单例**，每个页面各自创建；**仅 `onClose` 的 `isEnded === true` 时发放**；无合适广告（错误码 1004）时兜底"今日试拍 +3"
- **Provider B · 小程序虚拟支付**（首版关闭，接口就绪）：2026-02-27 微信公告——小程序内虚拟商品（含解锁功能）须使用小程序虚拟支付（`wx.requestVirtualPayment`），**iOS 已开放**，2026-04-01 起全终端强制；普通 `wx.requestPayment` 不得用于虚拟商品。iOS/Android 都显示入口。签名（`paySig` / `signature`）必须服务端计算 → 上线时引入**微信云开发**云函数（天然拿到 openid，免自建登录）签名并记录权益。定价单款 ¥6 / 全部 ¥25（需计入 iOS 约 15%、Android 约 1% 通道费）；个人主体是否可开通以后台为准
- `Entitlement.ts` 抽象统一免费层/今日限免、Provider A、Provider B，`settings` 页提供切换配置；**不做订阅**（小程序订阅触达弱，买断+广告更顺）
- 首版不做账号系统与后端；虚拟支付上线时才引入云开发，且只存权益记录

## 九、合规硬性要求

1. **权限**：`scope.camera`（camera 组件首次自动弹）、`scope.writePhotosAlbum`（保存时弹，拒绝后 `wx.openSetting` 引导）
2. **隐私协议**：接入 `wx.onNeedPrivacyAuthorization` / `wx.requirePrivacyAuthorize`（基础库 ≥ 2.32.3）与小程序隐私保护指引（2023.9 后强制）；隐私指引中声明**摄像头**与**相册（仅写入）**。我方代码不上报任何数据，对外表述为"**照片和取景画面只在你的手机里处理，不上传**"（广告组件由微信提供，不作"不采集任何数据"的绝对承诺），作为口碑卖点写进详情页
3. **域名**：downloadFile 合法域名（CDN，HTTPS+已备案）；首版无其他网络请求（虚拟支付上线时增加云开发）
4. **商标**：产品名与相机名均为原创；`inspiredBy` 中的商标词属指示性使用，详情页脚注"上述商标归各自权利人所有，本产品与其无关联"
5. **类目**：工具-图片（无需特殊资质）；**ICP 备案**：小程序 2023.9 起新注册需备案（微信内一体化提交，比 App 双端备案简单得多，周期约 1-2 周）——写进上线 checklist，**不阻塞开发**
6. 主体未定不影响开发：变现层用 Provider 抽象隔离，先按 Provider A 实现

## 十、工程规范与验收

- vitest 单测：pack delta 继承合并、LUT 解析（构造已知 .cube 验证数值）、免费额度计数（跨日重置）、随机种子可复现
- **shader 逻辑对齐测试**：grain/halation 的 GLSL 与 TypeScript 参考实现（软光栅小图）输出统计特征（均值/方差/直方图区间）对比，防止改 shader 引入回归
- 性能验收：微信开发者工具真机调试（iOS + 中端安卓各一台）预览不掉帧（< 24fps 自动降级生效）；出片 ≤ 2.5s；内存：不持有帧 ArrayBuffer 过夜（回调内用完即释放）
- 代码规范：ESLint（禁 any、禁 console.log 上线构建）、文件头注释说明职责；提交 conventional commits
- `build.sh` 一条命令：lint + tsc + vitest + 构建复制 + 包体积门禁 + miniprogram-ci preview 出预览二维码。preview 段读取环境变量中的 AppID 与上传密钥（密钥绝不入库），缺密钥或网络不可达时**明确跳过并说明原因**，不得假装成功
- 云端环境默认只跑到包体积门禁（本云端网络策略拦截微信域名）；preview 由人类本地执行 `./build.sh preview`，或在云环境放行微信域名并关闭公众平台上传 IP 白名单后于云端执行

## 十一、P0 预研阶段（先装技能、先学习，再开发——完成前禁止写业务代码）

> **状态：已完成（2026-10-19）**。产出：`docs/research/`（5 篇笔记 + skills-notes + conflicts）、`.claude/skills/{wechat-miniprogram,shader-dev,vitest,film-pipeline}`。以下保留原始要求作为记录。

### 11.1 安装技能（Claude Code skills/plugin 机制）

进入项目第一件事：用当前 Claude Code 支持的 skills 安装机制（`/plugin` marketplace、`npx skills add` 或项目内 `.claude/skills/` 目录，以实际环境为准）搜索并安装以下方向：

| 方向 | 用途 | 备选方案（装不到就手动研究） |
|---|---|---|
| wechat-miniprogram / 小程序开发 | 组件、API、审核规范速查 | 微信官方文档 web 研究 |
| webgl / glsl / shader | 渲染管线与 GLSL 最佳实践 | MDN WebGL + 本文第四节逐条验证 |
| typescript / vitest / eslint | 工程质量 | 官方文档 |
| node 构建工具链 | pack-tools 开发 | — |

安装纪律：
- 每装一个，读其 SKILL.md，把**对本项目可直接引用的要点**摘录进 `docs/research/skills-notes.md`（注明来源）
- 装不上/搜不到就记录在案（名称、尝试方式），改走官方文档研究，**不阻塞、不硬凑**
- 研究完成后，把项目沉淀的自有知识（渲染管线规格、pack 格式）整理成项目级 skill 放 `.claude/skills/film-pipeline/`——开发中随用随取

### 11.2 学习研究清单（每主题一篇笔记，写入 `docs/research/`）

笔记硬性格式：**结论 → 对本项目的影响 → 参考链接**。禁止只抄文档不写结论。

1. **camera 组件基线**：`onCameraFrame` 帧格式/帧率/分辨率上限、`takePhoto` 在 iOS/Android 的真实输出分辨率差异（**这就是出片分辨率的天花板，必须查清并写成结论**）、前后摄切换行为、闪光控制
2. **WebGL 渲染能力**：小程序 `canvas type="webgl"` 同层渲染注意事项、WebGL1 限制清单（无 3D 纹理等）、FBO 双 pass 模糊方案、帧率性能参考案例
3. **胶片模拟开源研究**：film-emulation-wasm（管线顺序）、mpv 实时胶片模拟（grain/halation 的 GPU 实现）、spectral_film_lut（LUT 生成思路）、WebGL LUT 2D 打包的社区方案——**每个仓库给出"抄什么"的一句话结论**
4. **变现与合规**：RewardedVideoAd 激励视频完整生命周期、流量主开通条件、iOS 端虚拟支付限制的官方口径、2023.9 后隐私接口要求
5. **工程链路**：miniprogram-ci 的 preview/upload 命令行用法与密钥管理、主包 2MB 与分包策略、`tsc` 小程序工程的最佳实践模板

### 11.3 P0 验收标准

- `docs/research/` 下 ≥ 5 篇笔记，格式合规
- 已装技能清单 + 用途 + 来源登记进 `README.md`
- **反哺本提示词**：研究中发现与本文件任何规格冲突（API 行为不符、参数不可行），逐条列出并给修正建议，标注 `[待拍板]` 等我确认——发现冲突不改就继续开发是违规
- 输出 10 行以内研究摘要，等我确认后进入 M0

## 十二、开发里程碑（严格串行，每个完成后停下汇报）

**M0 · 骨架 + 设计系统**
原生 TS 项目、tsc 构建流水线、`build.sh` 全链路跑通、miniprogram-ci preview 出二维码（appkey 用占位说明；云端网络被拦截时由人类本地执行 `./build.sh preview`）、**`styles/tokens.wxss` 设计令牌全量落地**（7.1 节逐条）。验收：扫二维码在真机打开空白页 + 令牌文件与规范一致（vitest 自动校验）。

**M1 · 相机 + 裸渲染**
camera 组件 + FrameFeed + WebGL canvas 直出原始帧（无滤镜）+ 前后摄/闪光切换 + 权限流程。验收：真机 30fps 稳定预览，工具帧率面板数据记录在案。

**M2 · 渲染管线（核心）**
首个任务：出片导出链真机 spike（离屏 WebGL → readPixels → 2D 画布 → canvasToTempFilePath）。然后 LutLoader（6×6 瓦片打包）+ 全部 shader + Pipeline 编排 + takePhoto → 离屏出片 → 保存链路。验收：sunny-fun 效果预览=出片（随机元素除外）、性能达标、降级开关工作。

**M3 · Pack 系统 + 首发三大系列（A/B/C 20 款）+ 取景器皮肤**
SeriesProfile + delta 继承、AssetCache（CDN 下载/校验/LRU）、换机交互（胶卷条，按 7.2 节动效规格）、取景器皮肤系统（7.2 节全部细节：框线/计数/快门反馈）、20 款全部可拍。验收：换机达标、新增 pack 零代码改动、断网时已缓存相机可用、**取景器页对照 7.2/7.6 清单逐条过**。

**M4 · 其余五大系列（D-H 29 款）+ 特殊机制**
即时成像显影动画（7.6-8 规格曲线）、暗房随机工艺、supersampler 四连拍（连续 4 个 onCameraFrame 帧拼 2×2，不用 4 次 takePhoto）、pen-half 半格两拍一张、CCD 屏幕补光（全屏白 flash + 屏幕亮度拉满）、日期戳自定义。验收：49 款全部可拍，特殊机制逐项对照本文件验收。

**M5 · 相机库 + 相册 + 解锁 + 分享**
相机库页 + 详情页（7.3 节规格，含 pack-tools 批量生成 49 张统一风格样张）、Gallery（7.4 节规格含空状态与配额提示）、Entitlement（免费层/今日限免 + Provider A 激励视频完整流程 + 虚拟支付 Provider 接口就绪但默认关闭）、解锁抽屉（7.5）、onShareAppMessage 分享卡（同款相机深链）。验收：广告解锁 72h 全流程在真机走通、相机库页对照 7.3 清单逐条过。

**M6 · 打磨与提审准备**
全局质感清单（7.6 节 9 条）逐条 QA、过片动画、启动屏、图标、README（架构图、CDN 域名配置、胶卷采样标定流程、上架 checklist：类目/备案/隐私声明/流量主开通条件）。

## 十三、工作方式指令（给 Claude Code 你自己）

0. **P0 前置铁律**：先装技能、先研究、产出 `docs/research/` 笔记并等确认，之前**一行业务代码都不写**；研究中发现的结论必须反哺到对应规格处，知识不过夜
1. **按里程碑串行推进**，每个里程碑完成后：输出改动摘要 + 自验方式（build.sh 结果/需真机确认项清单）+ 下一步计划，等我确认再继续
2. **UI 纪律**：第七节是设计合同——所有颜色/字号/间距/动效**只从 tokens.wxss 取值**，禁止页面内写魔法数字；每完成一个页面，自报"7.6 质感清单"逐条勾选结果
3. 微信小程序 API 有严格版本与平台差异：不确定的 API 先查基础库支持版本再写，把结论写在代码注释里
4. WebGL1 无 3D 纹理/部分扩展不可用：写 shader 前确认目标特性在 WebGL1 + 小程序环境的可行性，禁止假设 WebGL2
5. 设计资产（LUT/漏光/字体）缺失时：用 pack-tools 程序化生成占位并在 README 登记"待替换"，不阻塞开发；仅用 CC0/OFL 许可素材
6. 不确定的产品决策：给出建议 + 理由，标注 `[待拍板]`，继续推进不空等
7. 小步提交（单次 diff ≤ ~500 行），conventional commits

P0 已完成并拍板（2026-10-19），从 M0 起按里程碑串行推进。

## 十四、人机分工与启动前置（此节写给人类协作者，Claude Code 读后明确边界）

### 14.1 分工协议（Claude Code 在云端，没有手机、没有微信客户端）

| 事项 | 负责方 |
|---|---|
| 代码、构建、单测、占位资产、静态检查、`build.sh`、出预览二维码 | **Claude Code** |
| 真机扫码验证（每里程碑的"真机确认清单"逐项过：帧率/出片分辨率/动效手感/振动） | **人类** |
| AppID 注册、miniprogram-ci 密钥配置、`project.config.json` 填入真实值 | **人类** |
| CDN 域名购买与备案、资源上传 | **人类** |
| 后台配置（合法域名/隐私声明/类目/提审） | **人类**（Claude Code 产出 checklist 供照做） |
| 美术资产终稿（logo、精调 LUT、日期戳字体） | **人类**（Claude Code 的占位资产随时可换） |

Claude Code 每个里程碑交付的"需真机确认项清单"必须可直接执行（写明操作步骤 + 预期表现 + 不符合时该收集什么信息反馈回来）。

### 14.2 人类需要提前准备的材料（不阻塞开发，但阻塞上线）

1. 微信小程序 AppID（个人主体可上线、可开流量主；据 2026 年资料个人主体也可开通小程序虚拟支付（有月限额），以后台为准）；公众平台「基础库最低版本」设为 3.0.0
2. 一个 HTTPS 已备案域名（CDN 用；静态资源托管在对象存储即可，月成本几元钱）
3. 真机两台：iPhone + 中端安卓（性能验收基准机）
4. 微信开发者工具（人类侧安装，用于最终提审上传；日常预览用 miniprogram-ci 二维码即可）
5. 代码上传密钥（公众平台「开发 → 开发设置」下载）；若要在云端出预览码：云环境放行 `servicewechat.com` 等微信域名，并关闭上传 IP 白名单（云端出口 IP 不固定）

### 14.3 启动方式

把本文件存为项目根目录 `CLAUDE.md`，Claude Code 打开项目即自动读取。首条消息只需要一句："按 CLAUDE.md 开始 P0"。

---

本提示词由市场调研支撑（见《调研报告.md》），版本 2026-10-19 v6（v5 + P0 研究结论回写）。
