# 03 · 胶片模拟开源研究（管线顺序 / grain & halation GPU 实现 / LUT 生成 / 2D LUT 打包）

> 规格点名的 "film-emulation-wasm" 与 "mpv 实时胶片模拟" 在 GitHub 上**没有找到同名、可核实的仓库**（已用多组关键词检索）。
> 下表用实际存在且已阅读源码的项目替代，未克隆核实的项目单独标注。

## 结论（每个仓库一句话"抄什么"）

| 项目 | 许可 | 核实方式 | 抄什么（一句话） |
|---|---|---|---|
| [artzox/Film-Standalone](https://github.com/artzox/Film-Standalone)（ReShade，3021 行） | MIT | 已克隆读源码 | **抄 halation 三 pass 结构与参数**：半分辨率提取 → 软阈值 `smoothstep(0.45,0.95,luma)` → 红偏权重 `(r, g×0.35, b×0.08)` → 9-tap 可分离高斯 H/V → 在胶片色彩处理**之前**以线性相加注入；grain 放在整条管线最后。 |
| [JanLohse/spectral_film_lut](https://github.com/JanLohse/spectral_film_lut)（Python） | MIT | 已克隆读目录与 README | **抄 LUT 来源**：基于胶卷 datasheet 光谱模拟（负片→相纸/反转片），离线导出 .cube；内置胶卷与我们 49 款原型约 18 款精确对应 + 约 8 款近似（见下表）。 |
| [mattdesl/glsl-lut](https://github.com/mattdesl/glsl-lut) | MIT | 已克隆读 shader | **抄 2D 打包 LUT 查表思路**：64³ 排成 512×512 的 8×8 瓦片，B 通道取相邻两片 `mix`，半像素内缩防串片。 |
| [three.js LUTPass r160](https://github.com/mrdoob/three.js/blob/r160/examples/jsm/postprocessing/LUTPass.js) | MIT | 已下载读源码 | **抄 WebGL1 回退路径的防串片细节**：G 偏移 `clamp(g*sliceH, halfPx, sliceH-halfPx)`，输入先做 `halfPixel + rgb*(1-pixel)` 映射到纹素中心。 |
| [PlayCanvas ColorLUT](https://api.playcanvas.com/engine/interfaces/ColorLUT.html) | MIT | 文档 | 抄"N×N×N LUT 用 N²×N 条带"的约定（备选布局）。 |
| mpv 内置 grain shader（见 awesome-mpv 汇总） | — | 二手摘要，未读源码 | 抄"颗粒只加在亮度通道 + 对白噪声再做一次轻模糊来塑形颗粒尺寸"的思路。 |
| [sup3rflyer/Wicket-shaders](https://github.com/sup3rflyer/Wicket-shaders)（mpv） | — | 二手摘要，未读源码 | 抄"每通道独立的尺寸/强度/亮度响应曲线"这一参数化方式（用于彩色颗粒款）。 |
| [Filmr](https://lib.rs/crates/filmr) / [fgrain](https://github.com/GuyNguyen/fgrain)（Rust） | — | 二手摘要，未读源码 | 物理级模拟，离线/科研向，**不抄实现**，仅作为颗粒随亮度变化曲线的参考。 |

### 管线顺序的共识与对规格的意见

- Film-Standalone 的物理顺序：**halation 提取（基于未调色的场景图）→ 胶片色彩/曲线（≈ 我们的 LUT）→ 镜头（暗角等）→ 片门 → … → 颗粒最后**。
- 规格顺序 "暗角 → LUT → halation → 颗粒 → 漏光 → 日期戳" 作为**合成顺序**可以保留；唯一建议：**halation 的高光掩码从 LUT 之前的图像提取**（LUT 常会压高光，之后再取阈值会让光晕忽有忽无），合成仍在 LUT 之后（不改规格顺序，写入 film-pipeline skill 作为实现细则）。
- 颗粒强度随亮度：Film-Standalone 和多数实现都给阴影更多颗粒（"Shadow Grain Boost"）；规格要求"中间调最重（sin 形）"——两者都合理，保留规格，`grainLumaWeight` 控制曲线强度即可。

### spectral_film_lut 胶卷 ↔ 本项目原型对照

| 本项目原型 | spectral_film_lut 胶卷 | 对应 |
|---|---|---|
| pocket-gold（Gold 200） | `kodak_gold_200` | 精确 |
| green-flash（Superia X-TRA 400） | `fuji_superia_xtra_400` | 精确 |
| moonlight（Natura 1600） | `fuji_natura_1600` | 精确 |
| red-box（Ektar 100） | `kodak_ektar_100` | 精确 |
| pastel-160 / pentax-67（Portra 160） | `kodak_portra_160` | 精确 |
| mamiya-7（Portra 400） | `kodak_portra_400` | 精确 |
| hasselblad-6x6（Pro 400H） | `fuji_pro_400h` | 精确 |
| xpan-wide（Velvia 50） | `fuji_velvia_50` | 精确 |
| cinestill-800t / super8 / cinema-bulk（Vision3 500T） | `kodak_5219` | 精确（CineStill = 去 remjet 的 5219，红晕另加） |
| vision-50d（Vision3 50D） | `kodak_5203` | 精确 |
| instax-mini / instax-wide | `fuji_instax_color` | 精确 |
| expired-roll（C200） | `fuji_c200` | 精确（再叠加随机老化） |
| street-gr / push-1600（Tri-X 400） | `kodak_trix_400` | 精确 |
| sunny-fun（FunSaver 800） | `kodak_ultramax_400` / `kodak_portra_800` | 近似 |
| knight-t2（Vista 200） | `agfa_vista_100` | 近似 |
| sakura-premium（Superia Premium 400） | `fuji_superia_reala` / `fuji_superia_xtra_400` | 近似 |
| kodachrome（Kodachrome 25） | `kodachrome_64` | 近似 |
| e100-slide（Ektachrome E100） | `kodak_ektachrome_100d` | 近似 |
| aero-ir（Aerochrome 094） | `kodak_aerochrome_iii` | 近似 |
| m3-hp5 / night-3200 等黑白款 | `kodak_trix_400` / `kodak_5222` | 近似（黑白 LUT 本身简单，程序化也可） |
| CCD 系列 / 拍立得（宝丽来）/ Lomo 紫卷 / 红移 / 蓝晒 / 针孔 / Holga | 无 | 程序化生成 |

## 对本项目的影响

- **占位 LUT 策略升级（C-18 [待拍板]）**：`pack-tools` 中新增一步"离线用 spectral_film_lut 导出 .cube（sRGB in/out，33³）→ `cube2bin`"，对照表中"精确/近似"的约 26 款直接得到有胶卷依据的 LUT；其余走 `gen-placeholder-luts.ts` 程序化。Python 只作为人工离线工具，不进 `build.sh`/CI，生成的 .cube 入库。需验证：该工具能否无 GUI 脚本化调用（源码 `utils.py:create_lut` 是候选入口）。
- **halation 参数默认值**直接采用 Film-Standalone 的红偏权重与软阈值形态，pack 参数只暴露 `strength / radius / threshold`。
- **LUT 查表 shader** 以 three.js 的防串片写法为蓝本，布局改为 6×6 瓦片（见 02 / C-06），代码收录在 `.claude/skills/film-pipeline/SKILL.md`。
- 漏光与日期戳为纯 2D 合成，开源实现无特别可抄之处；漏光纹理需 CC0 素材或程序化生成（径向渐变 + 噪声扰动）。

## 参考链接

- Film-Standalone：https://github.com/artzox/Film-Standalone
- spectral_film_lut：https://github.com/JanLohse/spectral_film_lut · 文档 https://janlohse.github.io/spectral_film_lut/ · ART 集成说明 https://artraweditor.github.io/SpectralFilmSimHowto.html
- glsl-lut：https://github.com/mattdesl/glsl-lut
- three.js LUTPass（r160）：https://github.com/mrdoob/three.js/blob/r160/examples/jsm/postprocessing/LUTPass.js
- PlayCanvas ColorLUT：https://api.playcanvas.com/engine/interfaces/ColorLUT.html
- GitHub film-emulation 话题：https://github.com/topics/film-emulation
- awesome-mpv shader 汇总（含内置 grain 说明）：https://deepwiki.com/stax76/awesome-mpv/5-shaders-and-video-processing
- Wicket-shaders：https://github.com/sup3rflyer/Wicket-shaders
- Filmr：https://lib.rs/crates/filmr · fgrain：https://github.com/GuyNguyen/fgrain
