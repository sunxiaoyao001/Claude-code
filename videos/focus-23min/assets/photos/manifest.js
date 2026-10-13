/* =============================================================================
 * 真实照片清单（Shot List）
 * -----------------------------------------------------------------------------
 * 每一项对应 assets/photos/ 下的一张 JPG。文件存在就用真实照片，缺失时引擎会
 * 显示一块标注了文件名和拍摄要求的 "NO SIGNAL" 占位面板（便于排查缺图）。
 *
 * 当前照片全部来自 Google Open Images 数据集（原图在 Flickr），授权 CC BY 2.0：
 * 可免费商用，但必须署名。完整署名见 assets/photos/CREDITS.md，发布时请贴到视频简介。
 *
 * 字段说明：
 *   file    文件名（放进 assets/photos/）
 *   shot    画面要求（换图 / 补拍时照这个来）
 *   query   推荐的图库搜索词（Pexels / Unsplash，tools/fetch-photos.mjs 会用到）
 *   focus   画面焦点（归一化坐标 0~1，构图和 HUD 准星会对准这里，通常是眼睛或脸）
 *   face    人脸框（归一化 x, y, w, h，来自 Open Images 人工标注框），用于 HUD 追踪框
 *   min     建议最小尺寸（短边像素）
 *   credit  署名：作者 · 标题 · 原图地址 · 授权
 * 照片会在引擎内统一调色（赛博青 / 警报红 / 恢复绿），原图色调不影响整体风格。
 * ========================================================================== */
window.FX = window.FX || {};

FX.PHOTOS = {
  eye: {
    file: 'p01-eye.jpg',
    shot: '人眼极近特写，瞳孔清晰，暗调；竖构图或可裁成竖图',
    query: 'eye close up macro dark',
    focus: { x: 0.44, y: 0.47 }, face: null, min: 1600,
    credit: 'Lucky Lynda ·「lynda olsen Green EYE-1-11」· https://www.flickr.com/photos/olsenart/14828590358 · CC BY 2.0',
  },
  phoneDark: {
    file: 'p02-phone-dark.jpg',
    shot: '昏暗环境里，一个人低头看手机，脸被屏幕照亮',
    query: 'person looking at phone dark room',
    focus: { x: 0.57, y: 0.45 }, face: { x: 0.63, y: 0.28, w: 0.11, h: 0.2 }, min: 1400,
    credit: 'Simon Bierwald ·「4SQcamp-Dortmund-4071」· https://www.flickr.com/photos/simsullen/12133864135/ · CC BY 2.0',
  },
  researcher: {
    file: 'p03-researcher.jpg',
    shot: '可选：研究者 Gloria Mark 的肖像照（必须有明确授权，如官方新闻照或 CC 授权）。缺失时自动改用文字档案卡',
    query: 'Gloria Mark UC Irvine portrait (需授权)',
    focus: { x: 0.5, y: 0.4 }, face: { x: 0.3, y: 0.18, w: 0.4, h: 0.4 }, min: 600, credit: '', optional: true,
  },
  deepWork: {
    file: 'p04-deep-work.jpg',
    shot: '主角：一个人在电脑前专注工作，侧脸或 3/4 侧脸，神情投入（第 20s、44s、75s 会复用，作为同一个主角）',
    query: 'focused man working laptop night',
    focus: { x: 0.5, y: 0.34 }, face: { x: 0.457, y: 0.15, w: 0.123, h: 0.291 }, min: 1600,
    credit: 'Eelke ·「#dotmov menno」· https://www.flickr.com/photos/eelkedekker/4276985783 · CC BY 2.0',
  },
  distracted: {
    file: 'p06-distracted.jpg',
    shot: '坐在办公桌前的人分心看手机，桌上有文件',
    query: 'office worker distracted looking at phone desk',
    focus: { x: 0.6, y: 0.4 }, face: { x: 0.62, y: 0.16, w: 0.12, h: 0.25 }, min: 1400,
    credit: 'KOMUnews ·「Hallsville School District Goes Mobile」· https://www.flickr.com/photos/komunews/11182424745 · CC BY 2.0',
  },
  stressed: {
    file: 'p07-stressed.jpg',
    shot: '压力很大的人：手扶着脸、眉头紧锁',
    query: 'stressed man hand on face',
    focus: { x: 0.5, y: 0.42 }, face: { x: 0.12, y: 0.12, w: 0.76, h: 0.72 }, min: 1400,
    credit: 'danilo mistroni ·「paolo」· https://www.flickr.com/photos/danilo-mistroni/3635333399 · CC BY 2.0',
  },
  avBoss: {
    file: 'p09-avatar-boss.jpg',
    shot: '头像：中年职场男性正面半身照（通知卡片里的"李经理"）',
    query: 'businessman portrait headshot',
    focus: { x: 0.47, y: 0.37 }, face: { x: 0.23, y: 0.153, w: 0.478, h: 0.442 }, min: 400,
    credit: 'profumo_1997 ·「Foto curriculum vitae」· https://www.flickr.com/photos/127670386@N08/15318217144 · CC BY 2.0',
  },
  avMom: {
    file: 'p10-avatar-mom.jpg',
    shot: '头像：中年女性，笑容亲切（通知卡片里的"妈妈"）',
    query: 'middle aged woman portrait smiling',
    focus: { x: 0.56, y: 0.58 }, face: { x: 0.246, y: 0.278, w: 0.623, h: 0.615 }, min: 400,
    credit: 'Delaina Haslam ·「Mel\'n\'Nige\'s wedding_Rom」· https://www.flickr.com/photos/delainahaslam/18913803983 · CC BY 2.0',
  },
  avColleague: {
    file: 'p11-avatar-colleague.jpg',
    shot: '头像：年轻女性（通知卡片里的同事"周雨晴"）',
    query: 'young woman headshot smiling',
    focus: { x: 0.47, y: 0.52 }, face: { x: 0.23, y: 0.142, w: 0.469, h: 0.858 }, min: 400,
    credit: 'Bro. Jeffrey Pioquinto, SJ · https://www.flickr.com/photos/90412460@N00/13162131643 · CC BY 2.0',
  },
  avFriend: {
    file: 'p12-avatar-friend.jpg',
    shot: '头像：年轻男性（通知卡片里的朋友"阿杰"）',
    query: 'young man casual portrait',
    focus: { x: 0.62, y: 0.5 }, face: { x: 0.349, y: 0.139, w: 0.535, h: 0.743 }, min: 400,
    credit: 'Lemuel Cantos ·「Ken」· https://www.flickr.com/photos/lemuelinchrist/252845529 · CC BY 2.0',
  },
  phoneDown: {
    file: 'p13-phone-facedown.jpg',
    shot: '手机屏幕朝下扣在桌面上，旁边是笔记本电脑（解法 1：开勿扰）',
    query: 'phone face down on desk laptop',
    focus: { x: 0.5, y: 0.55 }, face: null, min: 1000,
    credit: 'Johan Larsson ·「Untitled」· https://www.flickr.com/photos/johanl/8289357966 · CC BY 2.0',
  },
  batch: {
    file: 'p14-batch-reply.jpg',
    shot: '一个人在休息时间放松地回复手机消息（解法 2：消息集中回）',
    query: 'woman smiling texting phone relaxed',
    focus: { x: 0.62, y: 0.55 }, face: { x: 0.507, y: 0.294, w: 0.252, h: 0.342 }, min: 1000,
    credit: 'mirjoran ·「@hannawekell」· https://www.flickr.com/photos/mirjoran/7316189614 · CC BY 2.0',
  },
  timer: {
    file: 'p15-tomato-timer.jpg',
    shot: '机械定时器 / 番茄钟（解法 3：番茄钟）',
    query: 'kitchen timer pomodoro desk',
    focus: { x: 0.5, y: 0.55 }, face: null, min: 1000,
    credit: 'digicla ·「Time\'s Up!」· https://www.flickr.com/photos/ephotion/83290240 · CC BY 2.0',
  },
};
