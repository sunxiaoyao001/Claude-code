# 02 · 小程序 WebGL 渲染能力（同层渲染 / WebGL1 限制 / FBO 多 pass / 性能）

> 来源等级同 01：**[官方]** typings/官方文档，**[社区]**，**[推断]**，**[待真机]**。

## 结论

1. **canvas 类型** [官方]：`<canvas type="webgl">` ≥ 2.7.0，`type="2d"` ≥ 2.9.0；新版 Canvas 接口支持同层渲染。通过 `SelectorQuery...fields({node:true})` 拿 `Canvas` 节点，节点有 `getContext / createImage / requestAnimationFrame`（≥ 2.7.0）和 `toDataURL`（≥ 2.11.0）。
2. **WebGL2 无官方承诺** [社区]：官方文档只列 `webgl`；社区称 WebGL2 约从 2.15.0 逐步引入、低端 Android 可能退回 WebGL1。→ 与规格"只用 WebGL1 / GLSL ES 1.0"一致，**不改**。
3. **离屏 canvas** [官方]：`wx.createOffscreenCanvas({ type: 'webgl' | '2d', width, height })`（新签名 ≥ 2.16.1，旧签名只能建 webgl）。**类型不可混用**：webgl 离屏画布不能 `getContext('2d')`，图片对象必须用同一画布的 `createImage()`。
4. **导出链缺口** [官方]：`wx.canvasToTempFilePath` 的 `canvas` 参数文档写的是"传入 canvas 组件实例（type="2d" 时使用）"；typings 中 `OffscreenCanvas` 只有 `getContext / createImage`，**没有 `toDataURL`，也没有文档说明离屏 WebGL 可直接导出**。
   - 推荐链路：离屏 WebGL 渲染 → `gl.readPixels`（RGBA，注意 Y 翻转）→ 2D canvas `putImageData` → 同一 2D 画布绘制日期戳/边框 → `canvasToTempFilePath({ canvas: <2d 节点>, fileType: 'jpg', quality: 0.92 })`。
   - M2 第一件事做 spike：离屏 2D 画布能否直接喂给 `canvasToTempFilePath`；不行则用页面内隐藏的 `type="2d"` canvas（宽高属性设为出片尺寸，CSS 尺寸可极小）[待真机]。
5. **WebGL1 / GLSL ES 1.0 限制清单**（[官方 Khronos 规范] + 移动端经验）：

   | 限制 | 对本项目的写法 |
   |---|---|
   | 无 3D 纹理 | 33³ LUT 展开为 2D 纹理，B 通道两片手动 `mix`（见 03 / film-pipeline skill） |
   | 浮点渲染目标非必备（需 OES_texture_float/half_float + color_buffer 扩展） | 所有 FBO 用 RGBA8；halation 低分辨率 8-bit，合成时加 1/255 级抖动防色带 |
   | 片元 `highp` 可选（`GL_FRAGMENT_PRECISION_HIGH`） | 启动时 `getShaderPrecisionFormat(FRAGMENT_SHADER, HIGH_FLOAT).precision > 0` 检测；**`fract(sin(x)*43758.5453)` 在 mediump 下失效**，改用无 sin 的 hash（Dave Hoskins hash12）+ highp |
   | 无 `textureLod / texelFetch / 位运算 / #version 300 es` | shader-dev skill 里的 WebGL2 片段必须回移植（`texture()`→`texture2D()`，`out fragColor`→`gl_FragColor`） |
   | 循环上界须为常量表达式；数组索引受限 | 模糊核写死 5-tap/9-tap 常量权重；半径通过采样步长缩放而非循环次数 |
   | NPOT 纹理只能 CLAMP_TO_EDGE + 无 mipmap | 相机帧 480×640、LUT 198×198 都是 NPOT，统一 CLAMP + LINEAR，不生成 mipmap |
   | `MAX_TEXTURE_SIZE / MAX_RENDERBUFFER_SIZE / MAX_VIEWPORT_DIMS` 设备不同（老机常见 4096） | 运行时查询，出片尺寸取 min；超限时分块（tile）渲染 |

6. **纹理上传** [推断+社区]：运行期反复 `texImage2D` 重新分配显存会引起卡顿 → 首帧 `texImage2D` 分配，后续 `texSubImage2D(…, new Uint8Array(frame.data))`。
7. **halation 多 pass 方案**（参考 Film-Standalone 源码，见 03）：
   - 提取：1/2～1/4 分辨率 FBO，亮度软阈值 `smoothstep(t-0.1, t+0.1, luma)`（t≈0.85），红偏权重约 `(1.0, 0.35, 0.08)`；
   - 模糊：可分离高斯 H→V ping-pong（9-tap，可用线性采样技巧压到 5 次采样）；小半径链在 1/4 分辨率、大半径链在 1/8 分辨率，两链加权相加；
   - 合成：screen 混合回主图（8-bit 下不会溢出）。
   - 预览 480×640 时 1/4 分辨率仅 120×160，代价很低。
8. **性能参考** [推断]：无官方"camera + WebGL"帧率数据。预览一帧 ≈ 0.3MP，1 个合成 pass + 3 个小尺寸 pass，GPU 负载远低于 20ms 预算；**真正风险在 CPU 侧**（每帧 1.2MB ArrayBuffer 拷贝上传 + JS 回调调度）。M1 必须实测"相机供帧数 vs 实际渲染帧数"。
9. **出片内存** [推断]：3000×4000 RGBA8 = 48MB/张纹理；输入纹理 + 输出 FBO + readPixels 缓冲 + ImageData ≈ 200MB 峰值 → 低端 Android 有被杀风险。需按设备档位（`wx.getDeviceBenchmarkInfo`，≥ 3.4.5，`canIUse` 兜底）限制出片尺寸，并监听 `wx.onMemoryWarning` 释放资源。
10. **色彩空间** [官方+推断]：`WindowInfo` 只有 `pixelRatio / screen* / window* / safeArea / statusBarHeight` 等字段，**没有色域信息**；小程序 WebGL canvas 也没有 colorSpace 配置接口 → 全链路按 **sRGB** 处理，规格中的 "Display P3 + getWindowInfo 检测" 不可实现（C-07）。
11. **字体** [官方]：`wx.loadFontFace` 的 `source` 只能是 **https 链接或 Data URL**（不能直接用包内路径）；`scopes` 设 `native` 才能在 Canvas 2D 中使用；`global` ≥ 2.10.0。

## 对本项目的影响

- `GLRenderer` 启动自检：`highp` 支持、`MAX_TEXTURE_SIZE`、`MAX_RENDERBUFFER_SIZE`、扩展列表 → 生成 `GLCaps`，Pipeline 据此选档。
- `ShotCapture` 导出链按结论 4 实现，日期戳直接画在 2D 导出画布上（DateStamp 与导出共用画布，省一次合成）。
- `LutLoader`：二进制 33³×3 字节与纹理布局解耦；运行时展开为 **198×198（6×6 瓦片）** RGBA 纹理——比 1089×33 条带对 mediump 坐标精度更友好（C-06）。
- 规格中"预览帧率 < 24fps 关 halation"的判据需要改为渲染耗时/丢帧率（C-13），否则会把相机供帧不足误判为渲染过载。
- shader 一律写 GLSL ES 1.0；从 shader-dev skill 引用片段时必须按上表回移植。

## 参考链接

- canvas 组件：https://developers.weixin.qq.com/miniprogram/dev/component/canvas.html
- wx.createOffscreenCanvas：https://developers.weixin.qq.com/miniprogram/dev/api/canvas/wx.createOffscreenCanvas.html
- wx.canvasToTempFilePath：https://developers.weixin.qq.com/miniprogram/dev/api/canvas/wx.canvasToTempFilePath.html
- wx.loadFontFace：https://developers.weixin.qq.com/miniprogram/dev/api/ui/font/wx.loadFontFace.html
- wx.getDeviceBenchmarkInfo：https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getDeviceBenchmarkInfo.html
- 社区：小程序 WebGL2 支持情况问答：https://ask.csdn.net/questions/8760006
- 用 2D 纹理模拟 3D 纹理（webglfundamentals）：https://webglfundamentals.org/webgl/lessons/webgl-qna-how-to-simulate-a-3d-texture-in-webgl.html
- Hash without Sine（Dave Hoskins）：https://www.shadertoy.com/view/4djSRW
- GLSL ES 1.0 规范（附录 A 限制）：https://registry.khronos.org/OpenGL/specs/es/2.0/GLSL_ES_Specification_1.00.pdf
- 已装 skill：`.claude/skills/shader-dev/techniques/{post-processing,multipass-buffer,webgl-pitfalls}.md`
