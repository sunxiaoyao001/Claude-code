/* =============================================================================
 * 真实照片清单（Shot List）
 * -----------------------------------------------------------------------------
 * 每一项对应 assets/photos/ 下的一张 JPG。文件存在就用真实照片，缺失时引擎会
 * 显示一块标注了文件名和拍摄要求的 "NO SIGNAL" 占位面板（便于排查缺图）。
 *
 * 字段说明：
 *   file    文件名（放进 assets/photos/）
 *   shot    画面要求（找图 / 拍摄时照这个来）
 *   query   推荐的图库搜索词（Unsplash / Pexels，均可免费商用）
 *   focus   画面焦点（归一化坐标 0~1，HUD 准星和构图会对准这里，通常是眼睛或脸）
 *   face    人脸框（归一化 x, y, w, h），用于 HUD 追踪框；物体照片可省略
 *   min     建议最小尺寸（短边像素）
 *   credit  署名（换图后请改成真实作者，片尾和 README 会引用）
 * 照片会在引擎内统一调色（赛博青 / 警报红 / 恢复绿），原图色调不影响整体风格。
 * ========================================================================== */
window.FX = window.FX || {};

FX.PHOTOS = {
  eye: {
    file: 'p01-eye.jpg',
    shot: '人眼极近特写，瞳孔清晰，最好有屏幕反光；竖构图或可裁成竖图',
    query: 'eye close up macro screen reflection',
    focus: { x: 0.5, y: 0.5 }, face: null, min: 1600, credit: '',
  },
  phoneDark: {
    file: 'p02-phone-dark.jpg',
    shot: '昏暗环境里，一个人低头看手机，脸被屏幕光照亮',
    query: 'person face lit by phone screen dark',
    focus: { x: 0.5, y: 0.38 }, face: { x: 0.36, y: 0.22, w: 0.28, h: 0.24 }, min: 1400, credit: '',
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
    query: 'focused man working laptop side profile night',
    focus: { x: 0.55, y: 0.36 }, face: { x: 0.44, y: 0.22, w: 0.22, h: 0.2 }, min: 1600, credit: '',
  },
  distracted: {
    file: 'p06-distracted.jpg',
    shot: '同一类场景：坐在办公桌前的人分心看手机，电脑还开着',
    query: 'office worker distracted looking at phone desk',
    focus: { x: 0.5, y: 0.35 }, face: { x: 0.38, y: 0.2, w: 0.24, h: 0.22 }, min: 1400, credit: '',
  },
  stressed: {
    file: 'p07-stressed.jpg',
    shot: '压力很大的上班族：双手抱头 / 揉太阳穴，桌上有电脑',
    query: 'stressed office worker hands on head laptop',
    focus: { x: 0.5, y: 0.34 }, face: { x: 0.36, y: 0.2, w: 0.28, h: 0.24 }, min: 1400, credit: '',
  },
  avBoss: {
    file: 'p09-avatar-boss.jpg',
    shot: '头像：中年职场男性正面半身照（通知卡片里的"老板"）',
    query: 'businessman portrait headshot',
    focus: { x: 0.5, y: 0.38 }, face: null, min: 400, credit: '',
  },
  avMom: {
    file: 'p10-avatar-mom.jpg',
    shot: '头像：中年女性正面照，亲切（通知卡片里的"妈妈"）',
    query: 'middle aged asian woman portrait smiling',
    focus: { x: 0.5, y: 0.38 }, face: null, min: 400, credit: '',
  },
  avColleague: {
    file: 'p11-avatar-colleague.jpg',
    shot: '头像：年轻女性职场照（通知卡片里的"同事"）',
    query: 'young professional woman headshot',
    focus: { x: 0.5, y: 0.38 }, face: null, min: 400, credit: '',
  },
  avFriend: {
    file: 'p12-avatar-friend.jpg',
    shot: '头像：年轻男性生活照（通知卡片里的"朋友"）',
    query: 'young man casual portrait',
    focus: { x: 0.5, y: 0.38 }, face: null, min: 400, credit: '',
  },
  phoneDown: {
    file: 'p13-phone-facedown.jpg',
    shot: '手机屏幕朝下扣在桌面上，旁边是笔记本 / 键盘（解法 1：开勿扰）',
    query: 'phone face down on desk keyboard',
    focus: { x: 0.5, y: 0.5 }, face: null, min: 1200, credit: '',
  },
  batch: {
    file: 'p14-batch-reply.jpg',
    shot: '一个人在休息时间（咖啡 / 窗边）放松地集中回复手机消息（解法 2：消息集中回）',
    query: 'person replying messages coffee break phone',
    focus: { x: 0.5, y: 0.4 }, face: { x: 0.38, y: 0.22, w: 0.24, h: 0.22 }, min: 1200, credit: '',
  },
  timer: {
    file: 'p15-tomato-timer.jpg',
    shot: '番茄钟 / 厨房计时器 / 沙漏，放在书桌上（解法 3：番茄钟）',
    query: 'tomato kitchen timer desk pomodoro',
    focus: { x: 0.5, y: 0.5 }, face: null, min: 1200, credit: '',
  },
};
