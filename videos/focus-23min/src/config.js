/* =============================================================================
 * 《23 分钟：一次分心的真实代价》 — 全局配置
 * -----------------------------------------------------------------------------
 * 所有"可调参数"集中在这里：画布尺寸、帧率、配色、字体、场景时间线、字幕。
 * 坐标系统一使用 1080×1920（9:16 竖屏），渲染缩放由引擎处理。
 * ========================================================================== */
window.FX = window.FX || {};

FX.CFG = {
  W: 1080,
  H: 1920,
  FPS: 60,            // 预览/导出帧率（render.mjs 可用 --fps 覆盖）
  DURATION: 80,       // 总时长（秒）
  BPM: 120,           // 配乐速度：1 拍 = 0.5s，1 小节 = 2s，所有场景切点都落在小节线上

  /* 抖音界面遮挡区（1080×1920 下的近似值）：顶部状态栏/频道栏、右侧互动按钮、底部标题区。
   * 关键文字必须落在安全区内，按 S 键可在预览中显示遮挡区。 */
  SAFE: { top: 170, bottom: 430, left: 64, right: 170 },

  /* 赛博 HUD 配色：深黑底 + 霓虹青 / 品红为主，红色只用于"警报"段落，绿色只用于"恢复"段落 */
  C: {
    bg: '#04050a',
    bg2: '#0a0f1c',
    ink: '#eaf8ff',
    dim: '#5d7286',
    cyan: '#00f0ff',
    cyan2: '#38bdff',
    magenta: '#ff2e88',
    violet: '#8a5cff',
    red: '#ff3043',
    amber: '#ffb020',
    green: '#3dffa8',
  },

  /* 字体：先用本地子集化字体（assets/fonts），缺失时回退到系统字体 */
  FONT: {
    cn: '"FX Sans", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "WenQuanYi Zen Hei", sans-serif',
    display: '"FX Display", "Orbitron", "Arial Black", sans-serif',
    mono: '"FX Mono", "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
  },

  /* 场景时间线（秒）。每段对应 scenes.js 里同名的绘制函数。 */
  SCENES: [
    { id: 'hook',     start: 0,  end: 6,  label: '钩子 · 47 秒' },
    { id: 'title',    start: 6,  end: 10, label: '片头 · 23 MIN' },
    { id: 'decline',  start: 10, end: 20, label: '现象 · 注意力缩水' },
    { id: 'climb',    start: 20, end: 30, label: '机制 · 专注爬坡' },
    { id: 'shatter',  start: 30, end: 36, label: '机制 · 一条消息清零' },
    { id: 'clock',    start: 36, end: 44, label: '代价 · 23 分 15 秒' },
    { id: 'residue',  start: 44, end: 50, label: '代价 · 注意力残留' },
    { id: 'twist',    start: 50, end: 58, label: '代价 · 更快但更累' },
    { id: 'ledger',   start: 58, end: 66, label: '账单 · 一天丢掉多少' },
    { id: 'recover',  start: 66, end: 76, label: '解法 · 三招抢回专注' },
    { id: 'cta',      start: 76, end: 80, label: '互动 · 评论区报数' },
  ],

  /* 章节条（顶部进度提示，提升长视频留存） */
  CHAPTERS: [
    { start: 10, end: 20, no: '01', name: '现象' },
    { start: 20, end: 36, no: '02', name: '机制' },
    { start: 36, end: 58, no: '03', name: '代价' },
    { start: 58, end: 66, no: '04', name: '账单' },
    { start: 66, end: 76, no: '05', name: '解法' },
  ],

  /* 字幕 = 配音台词（静音观看也能看懂）。hl 为高亮关键词。 */
  SUBS: [
    { s: 0.2,  e: 2.9,  t: '你盯着一块屏幕，平均只能坚持 47 秒', hl: ['47 秒'] },
    { s: 3.0,  e: 5.6,  t: '然后，就会切走。', hl: ['切走'] },
    { s: 6.3,  e: 9.6,  t: '今天聊聊：一次分心的真实代价', hl: ['真实代价'] },
    { s: 10.3, e: 14.9, t: '2004 年，这个数字还是两分半；2012 年，75 秒', hl: ['两分半', '75 秒'] },
    { s: 15.0, e: 19.6, t: '最近几年，只剩 47 秒', hl: ['47 秒'] },
    { s: 20.3, e: 24.8, t: '专注不是开关，而是一条慢慢爬升的曲线', hl: ['爬升的曲线'] },
    { s: 24.8, e: 29.2, t: '你要花很久，才能爬到最高处', hl: ['很久'] },
    { s: 30.4, e: 35.6, t: '然后，叮——一条消息，清零。', hl: ['清零'] },
    { s: 36.3, e: 39.5, t: '研究发现：被打断一次', hl: ['打断一次'] },
    { s: 39.6, e: 43.4, t: '平均要 23 分 15 秒，才能回到原来的任务', hl: ['23 分 15 秒'] },
    { s: 44.4, e: 46.7, t: '就算回来了', hl: [] },
    { s: 46.8, e: 49.6, t: '你的一部分注意力，还留在那条消息里', hl: ['还留在那条消息里'] },
    { s: 50.2, e: 53.4, t: '更反直觉的是：被打断的人，反而做得更快', hl: ['更快'] },
    { s: 53.6, e: 57.6, t: '代价是：更高的压力、挫败感和时间压力', hl: ['压力', '挫败感', '时间压力'] },
    { s: 58.2, e: 61.6, t: '假设你一天被打断 6 次', hl: ['6 次'] },
    { s: 61.7, e: 65.5, t: '就是 2 小时 18 分钟——超过工作日的四分之一', hl: ['2 小时 18 分钟', '四分之一'] },
    { s: 66.1, e: 66.95, t: '三招，抢回专注', hl: ['抢回专注'] },
    { s: 67.0, e: 69.7, t: '第一，专注时段开勿扰', hl: ['开勿扰'] },
    { s: 69.8, e: 72.5, t: '第二，消息集中回，别秒回', hl: ['集中回'] },
    { s: 72.6, e: 75.4, t: '第三，用番茄钟，25 分钟一轮', hl: ['番茄钟'] },
    { s: 76.3, e: 79.4, t: '你今天被打断了几次？评论区报个数', hl: ['几次', '报个数'] },
  ],

  /* 数据来源（画面角标 + README 引用） */
  SOURCES: {
    span: 'Gloria Mark《Attention Span》(2023)',
    resume: 'Gloria Mark 等 · UC Irvine 工作打断研究',
    residue: 'Sophie Leroy (2009) · Attention Residue',
    stress: 'Mark, Gudith & Klocke · CHI 2008',
  },
};

/* 关键事件时间点（画面与音效共用，保证声画同步） */
FX.CFG.EV = {
  storm: { start: 3.0, step: 0.17, n: 14 },     // 通知风暴：每张卡片一声"叮"
  stormOut: 5.25,                               // 卡片冲出镜头
  declineBars: [10.8, 12.7, 14.6],              // 三根数据条出现
  researcher: 16.4,                             // 研究者档案卡
  heartbeats: [28.0, 28.75, 29.3],              // 心跳（打断前的紧张）
  banner: 29.35,                                // 通知横幅开始滑入
  impact: 30.0,                                 // 叮 —— 碎裂
  clockLock: 39.6,                              // 23:15 锁定
  twistFast: 51.1,                              // "反而做得更快"
  twistSwitch: 53.5,                            // 切到代价
  gauges: [54.2, 54.8, 55.4],                   // 三个仪表冲上红区
  neq: 56.2,                                    // 更快 ≠ 更好
  ledgerScan: [58.6, 63.6],                     // 一天时间轴扫描（09:00 → 18:00）
  ledgerHours: [9.67, 10.92, 11.5, 14.17, 15.42, 16.83], // 6 次打断发生的钟点
  formula: 64.2,                                // 6 × 23 = 2 小时 18 分
  recover: 66.0,
  cards: [67.0, 69.8, 72.6],                    // 三招
  restored: 75.0,
};
/** 时间轴上某个钟点对应的视频时间 */
FX.CFG.ledgerT = (h) => FX.CFG.EV.ledgerScan[0] + ((h - 9) / 9) * (FX.CFG.EV.ledgerScan[1] - FX.CFG.EV.ledgerScan[0]);

/* 根据秒数取当前场景 */
FX.sceneAt = function (t) {
  const list = FX.CFG.SCENES;
  for (let i = 0; i < list.length; i++) if (t >= list[i].start && t < list[i].end) return list[i];
  return list[list.length - 1];
};
