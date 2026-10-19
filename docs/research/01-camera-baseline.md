# 01 · camera 组件基线（帧数据 / 拍照分辨率 / 前后摄 / 闪光）

> 研究方式说明：本容器网络策略拦截了 `developers.weixin.qq.com`，官方文档无法直接打开。
> 一手依据 = 官方 npm 包 `miniprogram-api-typings@5.2.3`（JSDoc 由官方文档生成，API 定义同步到基础库 3.17.0）+ 已克隆仓库源码；
> 其余为搜索引擎对官方/社区页面的摘要。每条结论标注来源等级：**[官方]** typings/官方文档，**[社区]** 开放社区或博客实测，**[推断]** 我的推理，**[待真机]** 必须在 M1 真机确认。

## 结论

1. **帧数据格式** [官方]：`CameraContext.onCameraFrame(cb)`（基础库 ≥ 2.7.0，插件内不支持）回调 `{ width, height, data: ArrayBuffer }`，`data` 为一维 RGBA（每 4 字节一个像素）。必须在 `<camera>` 上声明 `frame-size` 才会出帧。`listener.start({ worker })` 的 `worker` 参数（≥ 2.25.1）仅用于 iOS ExperimentalWorker 内取帧。
2. **帧尺寸不是 720p** [官方+社区]：`frame-size` 只有 `small / medium / large`（默认 medium，≥ 2.7.0），官方明确"实际像素值由系统决定"。社区实测 **medium 多为 480×640**；small/large 无可靠数据。→ 代码只能读 `frame.width/height`，不能硬编码。
3. **帧率无官方数字** [社区]：无官方 fps 上限说明，"~30fps"是经验值；供帧率由系统决定，可能低于 30。逐像素 JS 处理会严重卡顿，唯一可行路径是 GPU（WebGL）。
4. **takePhoto 输出** [官方]：`quality: 'high' | 'normal' | 'low' | 'original'`；`selfieMirror`（≥ 2.22.0）；`captureMetadata`（≥ 3.15.0）。返回 `tempImagePath`，**Android 为 JPG，iOS 为 PNG**（typings 原文："安卓是jpg图片格式，ios是png"）。
5. **出片分辨率天花板 = 设备决定，官方未承诺** [社区]：开放社区多帖反馈 `quality:'high'` 无效——iPhone 7 Plus 系统相机 3024×4032，`takePhoto` 只有 **720×1280**；另有"high 只有 ~100KB"的反馈。`'original'` 值已进入最新 typings（未标注起始版本），是唯一可能拿到传感器原尺寸的选项 [待真机]。
   - **结论写死**：出片分辨率无法预设为 4000px；必须"请求 original → `wx.getImageInfo` 读真实宽高 → 失败/过小回退 high"，并在 M1 用两台基准机记录真实输出。
   - iOS 返回 PNG：12MP PNG 文件体积大、解码慢（[推断] 十几 MB 级），出片链必须重编码为 JPG。
6. **`resolution` 属性** [官方+社区]：`low / medium / high`（≥ 2.10.0，默认 medium，**不可动态修改**）。是否仅 Android 生效、是否影响 takePhoto 尺寸——各来源说法不一 [待真机]。
7. **前后摄与闪光** [官方]：`device-position: front | back`；`flash: auto | on | off | torch`；`setZoom`（≥ 2.10.0）。一个页面只能有一个 camera；camera 是原生组件，支持同层渲染，因此 WebGL canvas 可以盖在 camera 之上 [待真机：camera 被完全遮挡/缩小时是否仍出帧]。
8. **镜像语义** [推断+官方]：onCameraFrame 的前摄帧与 takePhoto（受 `selfieMirror` 控制）的镜像方向可能不一致 → shader 侧按 `device-position` 单独做 U 翻转，M1 真机确认"预览 = 出片"。
9. **VisionKit 备选方案** [官方]：`wx.createVKSession` → `VKFrame.getCameraTexture(gl)`（≥ 2.20.0）直接给 **YUV GPU 纹理**，省掉 CPU→GPU 的 RGBA 上传；但它是 AR 会话（页面单例、`v1/v2` 机型限制、主要后摄），没有拍照接口。仅作为 onCameraFrame 上传瓶颈时的 Plan B，不进首版。
10. **本地存储配额** [官方+腾讯云镜像]：`wx.setStorage` 单 key ≤ 1MB、总量 ≤ 10MB；本地用户文件 + 缓存文件**合计 ≤ 200MB**（`USER_DATA_PATH` 共享这一配额）。

## 对本项目的影响

- **规格修正**（见 `conflicts.md` C-04 / C-05）：
  - "frame-size=medium ≈ 720p" → 改为"≈ 480×640（系统决定）"；M1 对比 medium/large 的画质与供帧率再定。
  - "出片 4000px 长边" → 改为"长边 = min(takePhoto 实测长边, 设备档位上限, GL 纹理上限)"，2.5s 预算按实测分辨率验收。
- `FrameFeed`：首帧按 `frame.width/height` 建纹理，之后 `texSubImage2D` 复用；尺寸变化才重建。回调里只做上传，不持有 `ArrayBuffer`。
- `ShotCapture`：`takePhoto({quality:'original'})` → `getImageInfo` 校验 → 回退 `'high'`；iOS PNG 解码耗时计入出片预算。
- **supersampler（四格）**：4 次 takePhoto 串行太慢（[推断] 每次数百 ms）→ 用连续 4 个 onCameraFrame 帧（本就低清，贴合原机玩具感）拼 2×2。
- **CCD 屏幕补光**：前摄时全屏白 + `wx.setScreenBrightness` 拉满，拍完恢复。
- **相册配额**（C-14）：200MB 总配额 − 50MB 资源 LRU ≈ 150MB 给照片，按 1–2MB/张约 75–150 张 → 需要配额提示与"存到手机后清理"流程。

## M1 真机测试矩阵（人类执行，结果回填本文件）

| 项 | 操作 | 记录 |
|---|---|---|
| frame-size | small / medium / large 各开 10s | `frame.width×height`、每秒回调次数 |
| takePhoto | `original` / `high` / `normal` 各拍 1 张 | `getImageInfo` 宽高、文件大小、格式、耗时 |
| resolution | low / medium / high（各自重进页面） | 对 takePhoto 尺寸是否有影响 |
| 遮挡 | camera 被全屏 canvas 盖住 / 缩到 1px | 是否仍持续出帧 |
| 前摄镜像 | 前摄对着文字拍 | 预览与成片左右是否一致 |

不符合预期时请回传：机型 + 微信版本 + 基础库版本（`wx.getAppBaseInfo().SDKVersion`）+ 上表数值截图。

## 参考链接

- 官方 typings（一手依据）：https://www.npmjs.com/package/miniprogram-api-typings · https://github.com/wechat-miniprogram/api-typings
- camera 组件：https://developers.weixin.qq.com/miniprogram/dev/component/camera.html
- onCameraFrame：https://developers.weixin.qq.com/miniprogram/dev/api/media/camera/CameraContext.onCameraFrame.html
- takePhoto：https://developers.weixin.qq.com/miniprogram/dev/api/media/camera/CameraContext.takePhoto.html
- 社区：takePhoto quality 设置无效（720×1280）：https://developers.weixin.qq.com/community/develop/doc/000ec8674cc1a025e8fd602ef5b400
- 社区：takePhoto 成像质量太低：https://developers.weixin.qq.com/community/develop/doc/000c4cf3f600e86fc8760bc5453c00
- medium 帧多为 480×640（腾讯云开发者社区）：https://cloud.tencent.cn/developer/article/2135297
- VisionKit getCameraTexture：https://developers.weixin.qq.com/miniprogram/en/dev/api/ai/visionkit/VKFrame.getCameraTexture.html
- 文件系统 200MB 配额（腾讯云镜像文档）：https://www.tencentcloud.com/document/product/1219/57689
