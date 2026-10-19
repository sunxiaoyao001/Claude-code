# 04 · 变现与合规（激励视频 / 流量主 / 虚拟支付 / 诱导分享 / 隐私接口）

> 来源等级：**[官方]** typings/官方文档，**[公告]** 官方公告的媒体转载（原文无法直连），**[社区]**，**[推断]**。
> ⚠️ 本篇有两条结论直接推翻规格第八节的设计（Provider B、Provider C），已登记 `conflicts.md` C-01/C-02/C-03。

## 结论

### 1. 激励视频 RewardedVideoAd 生命周期 [官方]

```text
wx.createRewardedVideoAd({ adUnitId, multiton?, disableFallbackSharePage? })
   │   基础库：小程序端要求 ≥ 2.6.0；multiton ≥ 2.8.0；disableFallbackSharePage ≥ 3.7.7
   │   ★ 小程序端是「页面内单例」，单例对象不允许跨页面使用
   ├─ ad.onLoad(cb) / ad.onError(cb) / ad.onClose(cb)
   ├─ ad.show()  → Promise；失败时 ad.load().then(() => ad.show())
   ├─ onClose(res)：res.isEnded（≥ 2.1.0）为 true 才发奖励
   └─ ad.destroy() / offLoad / offError / offClose（页面卸载时解绑）
```

- 错误码：1000/1003 后端/内部错误（稍后重试）、1001 参数错误、1002 广告单元无效、**1004 无合适广告（正常情况，必须做形态兼容）**、1005/1006 审核中/被驳回、1007 被封禁、1008 广告单元已关闭。
- [社区] 流量主违规整理：**未看完（提前关闭）仍发奖励、看完不发承诺奖励**均属违规。→ 只以 `isEnded === true` 发放 72h。
- 解锁抽屉组件会出现在相机页与相机库页 → 每页各自创建实例，不能共享。

### 2. 流量主开通条件 [社区]

- 多数近期来源：**累计独立访客 UV ≥ 500** + 无刷量、无严重违规；仍有少量 2026 年教程写 1000。→ 以公众平台后台"流量主"页实际显示为准。
- 规格引用的"《流量主运营规范》禁止所有运营内容只能靠激励视频解锁"——**在可访问的来源中未能找到原文**；但"免费层永远真实可用"本身是良好实践，保留。

### 3. 虚拟支付：2026 年规则已变 [公告+官方]

- **2026-02-27 微信发布《小程序虚拟支付业务管理规范》更新公告**（多家媒体转载）：
  - 小程序内的**虚拟商品（含解锁功能、付费功能、会员、订阅内容等）购买和支付均需接入小程序虚拟支付**；
  - **iOS 端已全面支持虚拟支付**（iOS 费率约 15%，背景是 2025-11-13 Apple 推出 Mini Apps Partner Program）；
  - 涉及虚拟支付的小程序需在 **2026-04-01 前完成全终端（iOS / Android / Windows / 鸿蒙）接入**，逾期按违规处理（风险提醒 → 限制功能 → 暂停服务）；
  - 不得引导用户到 App、公众号、H5 等外部渠道支付。
- 接口 [官方]：`wx.requestVirtualPayment`（≥ 2.19.2），`mode: 'short_series_goods'（道具直购） | 'short_series_coin'（代币充值）`，入参含 `signData / paySig / signature` —— **签名必须在服务端用 AppKey 与 session_key 计算**，即需要 `wx.login` + 后端。
- 主体 [社区]：多篇 2026 年教程称**个人主体也可开通虚拟支付**（官方存在"虚拟支付：个人"文档页），月收款有限额；需在后台核实。
- → 规格 Provider B 的"微信支付（wx.requestPayment）、仅 Android、iOS 隐藏入口"**已不合规也不必要**：应改为"小程序虚拟支付、全终端、需后端签名"。

### 4. 诱导分享红线 [社区转述官方规范]

- 《微信小程序平台运营规范》诱导分享条款（旧版 5.1.x，现行常见拒绝情形页归在 3.2.1）明确列举：
  - "分享后方可**解锁功能或能力**"；
  - "分享后获得**奖励（含虚拟奖品）**"；
  - "以**邀请好友协助**（助力、砍价、加速等）诱导分享"；
  - 直接与间接诱导都算。
- → 规格 Provider C"分享给好友（新用户）双方各得 24h 解锁、每邀请 1 人 +24h"**同时命中"分享解锁"和"邀请奖励"两条**，属于高风险违规（处罚可到封禁）。
- 技术上也不成立：`onShareAppMessage` 自 2018 年起不再返回分享成功回调；判断"被邀请者是新用户"并给邀请者记账必须有后端与用户标识。

### 5. 隐私合规 [官方]

- `wx.requirePrivacyAuthorize` / `wx.onNeedPrivacyAuthorization` 需要**基础库 ≥ 2.32.3**；同意按钮 `<button open-type="agreePrivacyAuthorization">`。`requirePrivacyAuthorize` 是辅助接口（模拟隐私接口调用以提前弹窗），非必调。
- 需在公众平台《用户隐私保护指引》声明：**摄像头**（camera 组件）、**相册（仅写入）**（`saveImageToPhotosAlbum`）。不使用 chooseMedia 则无需声明"选中的照片"。
- [社区] 未完成隐私指引配置的小程序无法通过审核。
- 激励视频广告组件是否需要单独声明：未找到依据 → 提审前在后台核对。
- "不采集任何数据"的绝对化表述有风险（广告组件由微信提供，非我方可控）→ 建议文案改为"照片和取景画面只在你的手机里处理，不上传"。

## 对本项目的影响

| 规格 | 研究结论 | 建议（详见 conflicts.md） |
|---|---|---|
| Provider A 激励视频 72h | 可行；页面内单例；isEnded 才发奖；1004 需兜底 | 保留；每页一个实例；无广告时给"今日试拍 +3"兜底 |
| Provider B 微信支付仅 Android | **不合规**：虚拟商品须走虚拟支付且 iOS 已开放；需后端签名 | 改为 VirtualPaymentProvider，首版关闭，后续用云开发云函数签名（C-02/C-03） |
| Provider C 邀请裂变解锁 | **诱导分享违规** + 需后端 | 删除邀请奖励；冷启动改为"今日限免一台 + 每日试拍加量"，分享卡只做"同款相机"深链、不给分享者任何奖励（C-01） |
| 基础库 ≥ 2.30.0 | 隐私接口需 2.32.3 | 最低基础库提到 ≥ 3.0.0（或至少 2.32.3）（C-09） |
| "不采集任何数据" | 广告组件不可控 | 改为"照片不出手机"类表述（C-22） |

## 参考链接

- 激励视频 API：https://developers.weixin.qq.com/miniprogram/dev/api/ad/wx.createRewardedVideoAd.html
- 流量主 UV 500：https://www.gongrenapp.com/a/5373.html · 2026 教程：https://blog.csdn.net/qq_65966646/article/details/163907203
- 虚拟支付（企业/个体）：https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html
- 虚拟支付（个人）：https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment/person.html
- wx.requestVirtualPayment：https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestVirtualPayment.html
- 2026-02-27 公告转载：https://www.mpaypass.com.cn/news/202603/02164733.html · https://www.ixunke.com/article/845 · https://www.csweigou.com/article/3389.html
- Apple Mini Apps Partner Program：https://www.igeeksblog.com/apple-mini-apps-partner-program-15-percent-commission/ · https://www.ctol.digital/news/apple-lowers-app-store-commission-15-percent-mini-apps-wechat-deal/
- 运营规范镜像（2019 版，含 5.1 诱导分享）：https://wdk-docs.github.io/wxa-docs/product/index.html
- 常见拒绝情形（3.2.1 诱导分享）：https://developers.weixin.qq.com/minigame/product/reject.html
- 小程序如何判定诱导分享（知乎）：https://www.zhihu.com/question/267571661
- 隐私协议开发指南：https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html
- wx.requirePrivacyAuthorize：https://developers.weixin.qq.com/miniprogram/dev/api/open-api/privacy/wx.requirePrivacyAuthorize.html
